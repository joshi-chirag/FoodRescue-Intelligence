from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import FoodDonation, NGO, Allocation

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['role'] = self.user.role
        data['username'] = self.user.username
        return data


class NGOSerializer(serializers.ModelSerializer):
    class Meta:
        model = NGO
        fields = '__all__'


class AllocationInfoSerializer(serializers.ModelSerializer):
    """Lightweight allocation info embedded inside FoodDonation."""
    ngo_name = serializers.CharField(source='ngo.name', read_only=True)
    ngo_location = serializers.CharField(source='ngo.location', read_only=True)
    ngo_latitude = serializers.FloatField(source='ngo.latitude', read_only=True)
    ngo_longitude = serializers.FloatField(source='ngo.longitude', read_only=True)

    class Meta:
        model = Allocation
        fields = ['id', 'status', 'ngo_name', 'ngo_location',
                  'ngo_latitude', 'ngo_longitude',
                  'score', 'distance_km', 'priority', 'allocated_at']


class FoodDonationSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    allocation_info = serializers.SerializerMethodField()

    def get_allocation_info(self, obj):
        allocation = obj.allocations.select_related('ngo').first()
        if allocation:
            return AllocationInfoSerializer(allocation).data
        return None

    class Meta:
        model = FoodDonation
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at', 'donor_name']


class FoodDonationMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodDonation
        fields = ['id', 'food_type', 'quantity', 'location',
                  'expiry_time', 'status', 'latitude', 'longitude', 'image']


class NGOMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = NGO
        fields = ['id', 'name', 'location', 'capacity', 'latitude', 'longitude']


class AllocationSerializer(serializers.ModelSerializer):
    food_detail = FoodDonationMiniSerializer(source='food', read_only=True)
    ngo_detail = NGOMiniSerializer(source='ngo', read_only=True)

    class Meta:
        model = Allocation
        fields = '__all__'
        read_only_fields = ['allocated_at', 'score', 'distance_km', 'predicted_expiry', 'priority']