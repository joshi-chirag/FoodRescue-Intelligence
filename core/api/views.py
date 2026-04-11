from rest_framework import viewsets, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import FoodDonation, NGO, Allocation
from .serializers import FoodDonationSerializer, NGOSerializer, AllocationSerializer, RegisterSerializer
from .utils import haversine
from .ml_model.predict import predict
from .permissions import IsDonor, IsNGO


# =========================
# AUTH REGISTER VIEW
# =========================

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer


# =========================
# FOOD DONATION VIEWSET
# =========================

class FoodDonationViewSet(viewsets.ModelViewSet):
    queryset = FoodDonation.objects.all()
    serializer_class = FoodDonationSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsDonor()]
        return [IsAuthenticated()]


# =========================
# NGO VIEWSET
# =========================

class NGOViewSet(viewsets.ModelViewSet):
    queryset = NGO.objects.all()
    serializer_class = NGOSerializer
    permission_classes = [IsAuthenticated]


# =========================
# ALLOCATION VIEWSET
# =========================

class AllocationViewSet(viewsets.ModelViewSet):
    queryset = Allocation.objects.all()
    serializer_class = AllocationSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), IsNGO()]
        return [IsAuthenticated()]


# =========================
# AUTO ALLOCATION API (AI)
# =========================

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsDonor])
def auto_allocate(request):
    try:
        donation_id = request.data.get('donation_id')

        if not donation_id:
            return Response({"error": "donation_id is required"}, status=400)

        food = FoodDonation.objects.get(id=donation_id)
        ngos = NGO.objects.all()

        # ML input
        features = [food.quantity, 30, 60, 2]
        predicted_expiry = predict(features)

        urgency = 1 / (predicted_expiry + 0.1)
        priority = "HIGH" if predicted_expiry < 10 else "NORMAL"

        best_ngo = None
        best_score = -1
        best_distance = None

        for ngo in ngos:
            if ngo.capacity <= 0:
                continue

            if None in [food.latitude, food.longitude, ngo.latitude, ngo.longitude]:
                continue

            distance = haversine(
                food.latitude,
                food.longitude,
                ngo.latitude,
                ngo.longitude
            )

            distance_score = 1 / (distance + 0.1)
            capacity_score = ngo.capacity / 100

            score = (
                0.5 * distance_score +
                0.3 * urgency +
                0.2 * capacity_score
            )

            print(f"NGO: {ngo.name}")
            print(f"Distance: {distance}")
            print(f"Score: {score}")
            print("----------------------")

            if score > best_score:
                best_score = score
                best_ngo = ngo
                best_distance = distance

        if not best_ngo:
            return Response({"error": "No suitable NGO found"}, status=400)

        allocation = Allocation.objects.create(
            food=food,
            ngo=best_ngo,
            status="allocated"
        )

        best_ngo.capacity -= 1
        best_ngo.save()

        return Response({
            "message": "Allocation successful",
            "predicted_expiry": float(predicted_expiry),
            "priority": priority,
            "allocated_to": best_ngo.name,
            "distance_km": round(best_distance, 2),
            "score": round(best_score, 4)
        })

    except FoodDonation.DoesNotExist:
        return Response({"error": "Food donation not found"}, status=404)

    except Exception as e:
        return Response({"error": str(e)}, status=500)