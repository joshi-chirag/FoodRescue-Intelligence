from rest_framework import viewsets, generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import FoodDonation, NGO, Allocation
from .serializers import (
    FoodDonationSerializer,
    NGOSerializer,
    AllocationSerializer,
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
)
from .utils import haversine, auto_expire_donations, send_allocation_email
from .ml_model.predict import predict
from .permissions import IsDonor, IsNGO


# =========================
# CUSTOM JWT LOGIN VIEW
# =========================

class CustomTokenObtainPairView(TokenObtainPairView):
    """Returns access token + role + username on login."""
    serializer_class = CustomTokenObtainPairSerializer


# =========================
# AUTH REGISTER VIEW
# =========================

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


# =========================
# FOOD DONATION VIEWSET
# =========================

class FoodDonationViewSet(viewsets.ModelViewSet):
    serializer_class = FoodDonationSerializer

    def get_queryset(self):
        auto_expire_donations()
        user = self.request.user
        # Donors see only their own donations; NGOs and admins see all
        if user.is_authenticated and user.role == 'donor':
            return FoodDonation.objects.filter(created_by=user).order_by('-created_at')
        return FoodDonation.objects.all().order_by('-created_at')

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsDonor()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(
            created_by=user,
            donor_name=user.username
        )


# =========================
# NGO VIEWSET
# =========================

class NGOViewSet(viewsets.ModelViewSet):
    queryset = NGO.objects.filter(is_active=True).order_by('name')
    serializer_class = NGOSerializer
    permission_classes = [IsAuthenticated]


# =========================
# ALLOCATION VIEWSET
# =========================

class AllocationViewSet(viewsets.ModelViewSet):
    serializer_class = AllocationSerializer

    def get_queryset(self):
        auto_expire_donations()
        user = self.request.user
        if user.is_authenticated and user.role == 'ngo':
            qs = Allocation.objects.filter(ngo__name=user.username).order_by('-allocated_at')
        else:
            qs = Allocation.objects.all().order_by('-allocated_at')

        # Filter by status query param e.g. ?status=accepted
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Filter by food (donation) id e.g. ?food=3
        food_id = self.request.query_params.get('food')
        if food_id:
            qs = qs.filter(food_id=food_id)

        return qs

    def get_permissions(self):
        return [IsAuthenticated()]

    def partial_update(self, request, *args, **kwargs):
        """Allow NGOs to update allocation status (accept/reject/completed)."""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

# =========================
# NGO SELF-PROFILE
# =========================

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def my_ngo(request):
    """GET or PATCH the NGO profile for the currently logged-in NGO user."""
    if request.user.role != 'ngo':
        return Response({"error": "Only NGO accounts can access this endpoint."}, status=403)

    try:
        ngo = NGO.objects.get(name=request.user.username)
    except NGO.DoesNotExist:
        return Response({"error": "NGO profile not found. Contact admin."}, status=404)

    if request.method == 'GET':
        return Response(NGOSerializer(ngo).data)

    # PATCH — update location fields
    allowed = ['location', 'latitude', 'longitude', 'capacity']
    for field in allowed:
        if field in request.data:
            setattr(ngo, field, request.data[field])
    ngo.save()
    return Response({
        "message": "NGO profile updated successfully.",
        "ngo": NGOSerializer(ngo).data,
    })


# =========================
# CANCEL DONATION
# =========================

@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsDonor])
def cancel_donation(request, pk):
    """Donor cancels a pending donation."""
    try:
        food = FoodDonation.objects.get(id=pk, created_by=request.user)
        if food.status != 'pending':
            return Response({"error": "Only pending donations can be cancelled."}, status=400)
        food.status = 'cancelled'
        food.save()
        return Response({"message": "Donation cancelled.", "id": food.id, "status": food.status})
    except FoodDonation.DoesNotExist:
        return Response({"error": "Donation not found."}, status=404)


# =========================
# MAP DATA API
# =========================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def map_data(request):
    """Returns all data needed to render the map."""
    auto_expire_donations()
    user = request.user

    # Donors see their own donations; NGOs & admins see all
    if user.role == 'donor':
        donations = FoodDonation.objects.filter(
            created_by=user
        ).exclude(latitude=None).exclude(longitude=None)
    else:
        donations = FoodDonation.objects.exclude(
            latitude=None
        ).exclude(longitude=None)

    ngos = NGO.objects.filter(is_active=True).exclude(
        latitude=None
    ).exclude(longitude=None)

    # Get allocations that link donations to NGOs
    food_ids = donations.values_list('id', flat=True)
    allocations = Allocation.objects.filter(
        food_id__in=food_ids
    ).select_related('food', 'ngo').values(
        'id', 'food_id', 'ngo_id', 'status', 'score', 'distance_km', 'priority'
    )

    return Response({
        'donations': FoodDonationSerializer(donations, many=True).data,
        'ngos': NGOSerializer(ngos, many=True).data,
        'allocations': list(allocations),
    })


# =========================
# STATS API
# =========================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stats(request):
    """Returns platform-wide statistics."""
    auto_expire_donations()
    total_donations = FoodDonation.objects.count()
    allocated = FoodDonation.objects.filter(status='allocated').count()
    pending = FoodDonation.objects.filter(status='pending').count()
    active_ngos = NGO.objects.filter(is_active=True).count()
    total_allocations = Allocation.objects.count()

    return Response({
        'total_donations': total_donations,
        'allocated': allocated,
        'pending': pending,
        'active_ngos': active_ngos,
        'total_allocations': total_allocations,
    })


# =========================
# AUTO ALLOCATION API (AI ENGINE)
# =========================

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDonor])
def auto_allocate(request):
    try:
        donation_id = request.data.get('donation_id')

        if not donation_id:
            return Response({"error": "donation_id is required"}, status=400)

        food = FoodDonation.objects.get(id=donation_id)

        if food.status == 'allocated':
            return Response({"error": "This donation is already allocated"}, status=400)

        ngos = NGO.objects.filter(is_active=True)

        # ML input — accept from request or use smart defaults
        temperature = float(request.data.get('temperature', 30))
        humidity = float(request.data.get('humidity', 60))
        time_since_cooked = float(request.data.get('time_since_cooked', 2))

        features = [food.quantity, temperature, humidity, time_since_cooked]
        predicted_expiry = float(predict(features))

        urgency = 1 / (predicted_expiry + 0.1)
        priority = "HIGH" if predicted_expiry < 10 else "NORMAL"

        best_ngo = None
        best_score = -1
        best_distance = None
        ngo_scores = []

        for ngo in ngos:
            if ngo.capacity <= 0:
                continue

            if None in [food.latitude, food.longitude, ngo.latitude, ngo.longitude]:
                continue

            distance = haversine(
                food.latitude, food.longitude,
                ngo.latitude, ngo.longitude
            )

            distance_score = 1 / (distance + 0.1)
            capacity_score = ngo.capacity / 100

            score = (
                0.5 * distance_score +
                0.3 * urgency +
                0.2 * capacity_score
            )

            ngo_scores.append({
                'ngo': ngo.name,
                'distance_km': round(distance, 2),
                'score': round(score, 4),
            })

            if score > best_score:
                best_score = score
                best_ngo = ngo
                best_distance = distance

        if not best_ngo:
            return Response(
                {"error": "No suitable NGO found. Ensure NGOs have valid coordinates and available capacity."},
                status=400
            )

        # Create allocation with full scoring data
        allocation = Allocation.objects.create(
            food=food,
            ngo=best_ngo,
            status="pending",
            score=round(best_score, 4),
            distance_km=round(best_distance, 2),
            predicted_expiry=round(predicted_expiry, 2),
            priority=priority,
        )

        # Update food status and NGO capacity
        food.status = 'allocated'
        food.save()

        best_ngo.capacity = max(0, best_ngo.capacity - food.quantity)
        best_ngo.save()

        # Send email notification to NGO
        send_allocation_email(allocation)

        return Response({
            "message": "Allocation successful",
            "allocation_id": allocation.id,
            "predicted_expiry": round(predicted_expiry, 2),
            "priority": priority,
            "allocated_to": best_ngo.name,
            "ngo_location": best_ngo.location,
            "distance_km": round(best_distance, 2),
            "score": round(best_score, 4),
            "all_ngo_scores": sorted(ngo_scores, key=lambda x: x['score'], reverse=True),
        })

    except FoodDonation.DoesNotExist:
        return Response({"error": "Food donation not found"}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# =========================
# REAL-TIME TRACKING API
# =========================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def track_donation(request, pk):
    """Returns full delivery tracking info for a donation — poll every few seconds."""
    auto_expire_donations()
    try:
        donation = FoodDonation.objects.get(id=pk)
    except FoodDonation.DoesNotExist:
        return Response({"error": "Donation not found."}, status=404)

    # Donors can only track their own donations
    if request.user.role == 'donor' and donation.created_by != request.user:
        return Response({"error": "Not found."}, status=404)

    allocation = donation.allocations.select_related('ngo').first()
    alloc_status = allocation.status if allocation else None

    # ── Build step timeline ────────────────────────────
    steps = [
        {
            "step":        "submitted",
            "icon":        "🍱",
            "label":       "Donation Submitted",
            "description": f"{donation.quantity} units of {donation.food_type} from {donation.location}",
            "done":        True,
            "time":        donation.created_at.strftime("%d %b, %I:%M %p") if donation.created_at else None,
        },
        {
            "step":        "matched",
            "icon":        "🤖",
            "label":       "AI Matched Best NGO",
            "description": (
                f"Matched to {allocation.ngo.name} · Score {allocation.score}"
                if allocation else "Searching for the nearest NGO…"
            ),
            "done":        allocation is not None,
            "time":        allocation.allocated_at.strftime("%d %b, %I:%M %p") if allocation and allocation.allocated_at else None,
        },
        {
            "step":        "accepted",
            "icon":        "✅",
            "label":       "NGO Accepted",
            "description": (
                f"{allocation.ngo.name} confirmed the pickup"
                if alloc_status in ("accepted", "completed")
                else "Waiting for NGO to confirm…"
            ),
            "done":        alloc_status in ("accepted", "completed"),
            "time":        None,
        },
        {
            "step":        "collecting",
            "icon":        "🚚",
            "label":       "Collection in Progress",
            "description": (
                f"NGO volunteers heading to {donation.location}"
                if alloc_status in ("accepted", "completed")
                else "Awaiting collection…"
            ),
            "done":        alloc_status == "completed",
            "time":        None,
        },
        {
            "step":        "delivered",
            "icon":        "🎉",
            "label":       "Food Delivered!",
            "description": (
                f"Successfully distributed by {allocation.ngo.name}"
                if alloc_status == "completed"
                else "Awaiting delivery…"
            ),
            "done":        alloc_status == "completed",
            "time":        None,
        },
    ]

    # ── Overall status key ─────────────────────────────
    if donation.status == "cancelled":
        overall = "cancelled"
    elif alloc_status == "completed":
        overall = "delivered"
    elif alloc_status == "accepted":
        overall = "collecting"
    elif alloc_status == "pending":
        overall = "matched"
    elif alloc_status == "rejected":
        overall = "rejected"
    else:
        overall = "pending"

    # ── Progress percentage ────────────────────────────
    done_count  = sum(1 for s in steps if s["done"])
    progress_pct = int((done_count / len(steps)) * 100)

    return Response({
        "donation": {
            "id":         donation.id,
            "food_type":  donation.food_type,
            "quantity":   donation.quantity,
            "location":   donation.location,
            "status":     donation.status,
            "latitude":   float(donation.latitude)  if donation.latitude  else None,
            "longitude":  float(donation.longitude) if donation.longitude else None,
        },
        "allocation": {
            "ngo_name":      allocation.ngo.name,
            "ngo_location":  allocation.ngo.location,
            "ngo_latitude":  float(allocation.ngo.latitude)  if allocation.ngo.latitude  else None,
            "ngo_longitude": float(allocation.ngo.longitude) if allocation.ngo.longitude else None,
            "haversine_km":  allocation.distance_km,   # straight-line (already stored)
            "score":         allocation.score,
            "status":        allocation.status,
            "priority":      allocation.priority,
        } if allocation else None,
        "overall_status": overall,
        "progress_pct":   progress_pct,
        "steps":          steps,
    })


# =========================
# PASSWORD RESET API
# =========================

import random
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """Generates an OTP and sends it via console/email to reset the password."""
    username = request.data.get('username')
    email = request.data.get('email')
    
    if not username and not email:
        return Response({"error": "Username or email is required."}, status=400)
        
    try:
        if username:
            user = User.objects.get(username=username)
        else:
            user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Return generic success to prevent user enumeration
        return Response({"message": "If the account exists, a password reset code has been sent."})
        
    # Generate 6-digit OTP
    otp = f"{random.randint(100000, 999999)}"
    user.reset_otp = otp
    user.reset_otp_expiry = timezone.now() + timedelta(minutes=15)
    user.save()
    
    # Send email (prints to console in local development)
    subject = "🔑 FoodRescue Password Reset Code"
    message = f"""Hi {user.username},

You requested a password reset for your FoodRescue Intelligence account.

Your password reset code (OTP) is: {otp}

This code is valid for 15 minutes. If you did not request this, please ignore this email.

Best,
FoodRescue Team
"""
    try:
        from django.core.mail import send_mail
        from django.conf import settings
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email or "user@example.com"],
            fail_silently=True
        )
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        
    print(f"\n[PASSWORD RESET OTP FOR USER {user.username} IS: {otp}]\n")
    
    return Response({"message": "Password reset code sent."})


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """Validates OTP and changes password."""
    username = request.data.get('username')
    email = request.data.get('email')
    otp = request.data.get('otp')
    new_password = request.data.get('new_password')
    
    if not otp or not new_password:
        return Response({"error": "OTP and new password are required."}, status=400)
        
    try:
        if username:
            user = User.objects.get(username=username)
        else:
            user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"error": "Invalid request or expired code."}, status=400)
        
    if not user.reset_otp or user.reset_otp != otp:
        return Response({"error": "Invalid verification code."}, status=400)
        
    if timezone.now() > user.reset_otp_expiry:
        return Response({"error": "Reset code has expired."}, status=400)
        
    # Change password
    user.set_password(new_password)
    user.reset_otp = None
    user.reset_otp_expiry = None
    user.save()
    
    return Response({"message": "Password updated successfully."})


# =========================
# ADMIN UI ENDPOINTS
# =========================

def check_admin(request):
    """Helper to check if request user is an admin."""
    return request.user.is_authenticated and (request.user.role == 'admin' or request.user.is_staff)


@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def admin_users(request, pk=None):
    """Manage users in the system."""
    if not check_admin(request):
        return Response({"error": "Access denied. Admin role required."}, status=403)
        
    if request.method == 'GET':
        users = User.objects.all().order_by('-date_joined')
        data = [{
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "is_staff": u.is_staff,
            "date_joined": u.date_joined.strftime("%d %b %Y, %I:%M %p") if u.date_joined else None
        } for u in users]
        return Response(data)
        
    elif request.method == 'PATCH':
        if not pk:
            return Response({"error": "User ID required for update."}, status=400)
        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)
            
        role = request.data.get('role')
        is_active = request.data.get('is_active')
        
        if role is not None:
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        user.save()
        
        return Response({
            "message": "User updated successfully.",
            "user": {
                "id": user.id,
                "username": user.username,
                "role": user.role,
                "is_active": user.is_active
            }
        })
        
    elif request.method == 'DELETE':
        if not pk:
            return Response({"error": "User ID required for deletion."}, status=400)
        try:
            user = User.objects.get(id=pk)
            if user == request.user:
                return Response({"error": "Cannot delete your own account."}, status=400)
            user.delete()
            return Response({"message": "User deleted successfully."})
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=404)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def admin_ngos(request, pk=None):
    """Manage NGOs capacity and active status."""
    if not check_admin(request):
        return Response({"error": "Access denied. Admin role required."}, status=403)
        
    if request.method == 'GET':
        ngos = NGO.objects.all().order_by('name')
        data = [{
            "id": n.id,
            "name": n.name,
            "location": n.location,
            "capacity": n.capacity,
            "phone": n.phone,
            "email": n.email,
            "is_active": n.is_active,
            "latitude": n.latitude,
            "longitude": n.longitude
        } for n in ngos]
        return Response(data)
        
    elif request.method == 'PATCH':
        if not pk:
            return Response({"error": "NGO ID required for update."}, status=400)
        try:
            ngo = NGO.objects.get(id=pk)
        except NGO.DoesNotExist:
            return Response({"error": "NGO not found."}, status=404)
            
        capacity = request.data.get('capacity')
        is_active = request.data.get('is_active')
        location = request.data.get('location')
        
        if capacity is not None:
            ngo.capacity = int(capacity)
        if is_active is not None:
            ngo.is_active = is_active
        if location is not None:
            ngo.location = location
            
        ngo.save()
        return Response({
            "message": "NGO updated successfully.",
            "ngo": {
                "id": ngo.id,
                "name": ngo.name,
                "capacity": ngo.capacity,
                "is_active": ngo.is_active
            }
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_cleanup_expired(request):
    """Scan and mark expired donations as 'expired'."""
    if not check_admin(request):
        return Response({"error": "Access denied. Admin role required."}, status=403)
        
    now = timezone.now()
    expired_donations = FoodDonation.objects.filter(
        expiry_time__lt=now,
        status__in=['pending', 'allocated']
    )
    count = expired_donations.count()
    
    for donation in expired_donations:
        donation.status = 'expired'
        donation.save()
        
    return Response({
        "message": "Successfully processed expiry cleanup.",
        "count": count
    })