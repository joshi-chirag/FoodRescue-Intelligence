from rest_framework import viewsets
from .models import FoodDonation, NGO
from .serializers import FoodDonationSerializer, NGOSerializer

class FoodDonationViewSet(viewsets.ModelViewSet):
    queryset = FoodDonation.objects.all()
    serializer_class = FoodDonationSerializer


class NGOViewSet(viewsets.ModelViewSet):
    queryset = NGO.objects.all()
    serializer_class = NGOSerializer
from datetime import datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import FoodDonation, NGO, Allocation
from .ml_model.predict import predict

@api_view(['POST'])
def auto_allocate(request):
    donation_id = request.data.get('donation_id')

    food = FoodDonation.objects.get(id=donation_id)
    ngos = NGO.objects.all()

    # Dummy values (can improve later)
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

    # 🔥 DECISION LOGIC
    if predicted_expiry < 10:
        # URGENT → choose NGO with highest capacity
        best_ngo = ngos.order_by('-capacity').first()
        priority = "HIGH"
    else:
        # Normal → any NGO
        best_ngo = ngos.first()
        priority = "NORMAL"

    allocation = Allocation.objects.create(
        food=food,
        ngo=best_ngo,
        status="allocated"
    )

    return Response({
        "predicted_expiry": float(predicted_expiry),
        "priority": priority,
        "allocated_to": best_ngo.name
    })