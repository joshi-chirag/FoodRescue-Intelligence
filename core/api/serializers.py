from rest_framework import serializers
from .models import FoodDonation, NGO, Allocation

class FoodDonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodDonation
        fields = '__all__'


class NGOSerializer(serializers.ModelSerializer):
    class Meta:
        model = NGO
        fields = '__all__'


class AllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Allocation
        fields = '__all__'
class FoodDonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodDonation
        fields = '__all__'


class NGOSerializer(serializers.ModelSerializer):
    class Meta:
        model = NGO
        fields = '__all__'
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'password', 'role']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)