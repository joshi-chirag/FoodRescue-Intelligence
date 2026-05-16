from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser


# =========================
# CUSTOM USER MODEL
# =========================

class User(AbstractUser):
    ROLE_CHOICES = (
        ('donor', 'Donor'),
        ('ngo', 'NGO'),
        ('admin', 'Admin'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='donor')
    
    # Password Reset OTP
    reset_otp = models.CharField(max_length=6, null=True, blank=True)
    reset_otp_expiry = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


# =========================
# FOOD DONATION MODEL
# =========================

class FoodDonation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('allocated', 'Allocated'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='donations',
        null=True,
        blank=True
    )
    donor_name = models.CharField(max_length=100)
    food_type = models.CharField(max_length=100)
    quantity = models.IntegerField()
    expiry_time = models.DateTimeField()
    location = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    image = models.ImageField(upload_to='food_photos/', null=True, blank=True)

    # Coordinates
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return f"{self.food_type} ({self.quantity} units) by {self.donor_name}"


# =========================
# NGO MODEL
# =========================

class NGO(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    capacity = models.IntegerField(default=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    is_active = models.BooleanField(default=True)

    # Coordinates
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        return self.name


# =========================
# ALLOCATION MODEL
# =========================

class Allocation(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]

    food = models.ForeignKey(FoodDonation, on_delete=models.CASCADE, related_name='allocations')
    ngo = models.ForeignKey(NGO, on_delete=models.CASCADE, related_name='allocations')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Scoring info stored for transparency
    score = models.FloatField(null=True, blank=True)
    distance_km = models.FloatField(null=True, blank=True)
    predicted_expiry = models.FloatField(null=True, blank=True)
    priority = models.CharField(max_length=10, blank=True, null=True)

    allocated_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        return f"{self.food} → {self.ngo} [{self.status}]"