from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import FoodDonation, NGO, Allocation
from .serializers import FoodDonationSerializer, NGOSerializer, AllocationSerializer
from .utils import haversine
from .ml_model.predict import predict


# =========================
# CRUD VIEWSETS
# =========================

class FoodDonationViewSet(viewsets.ModelViewSet):
    queryset = FoodDonation.objects.all()
    serializer_class = FoodDonationSerializer


class NGOViewSet(viewsets.ModelViewSet):
    queryset = NGO.objects.all()
    serializer_class = NGOSerializer


class AllocationViewSet(viewsets.ModelViewSet):
    queryset = Allocation.objects.all()
    serializer_class = AllocationSerializer


# =========================
# AUTO ALLOCATION API (AI)
# =========================

@api_view(['POST'])
def auto_allocate(request):
    try:
        donation_id = request.data.get('donation_id')

        if not donation_id:
            return Response({"error": "donation_id is required"}, status=400)

        # Get food donation
        food = FoodDonation.objects.get(id=donation_id)

        # Get all NGOs
        ngos = NGO.objects.all()

        # Dummy environmental data (can improve later)
        temperature = 30
        humidity = 60
        time_since_cooked = 2

        # ML prediction
        features = [
            food.quantity,
            temperature,
            humidity,
            time_since_cooked
        ]

        predicted_expiry = predict(features)

        # Convert to urgency
        urgency = 1 / (predicted_expiry + 0.1)

        # Priority label (optional)
        if predicted_expiry < 10:
            priority = "HIGH"
        else:
            priority = "NORMAL"

        best_ngo = None
        best_score = -1
        best_distance = None

        # Loop through NGOs
        for ngo in ngos:

            # Skip NGOs with no capacity
            if ngo.capacity <= 0:
                continue

            # Skip if coordinates missing
            if None in [food.latitude, food.longitude, ngo.latitude, ngo.longitude]:
                continue

            # Calculate distance
            distance = haversine(
                food.latitude,
                food.longitude,
                ngo.latitude,
                ngo.longitude
            )

            # Scoring components
            distance_score = 1 / (distance + 0.1)
            capacity_score = ngo.capacity / 100

            # Final score
            score = (
                0.5 * distance_score +
                0.3 * urgency +
                0.2 * capacity_score
            )

            # Debug logs (IMPORTANT)
            print(f"NGO: {ngo.name}")
            print(f"Distance: {distance}")
            print(f"Capacity: {ngo.capacity}")
            print(f"Score: {score}")
            print("----------------------")

            # Select best NGO
            if score > best_score:
                best_score = score
                best_ngo = ngo
                best_distance = distance

        # If no NGO found
        if not best_ngo:
            return Response({"error": "No suitable NGO found"}, status=400)

        # Create allocation
        allocation = Allocation.objects.create(
            food=food,
            ngo=best_ngo,
            status="allocated"
        )

        # Reduce NGO capacity
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
from rest_framework import generics
from .serializers import RegisterSerializer

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer