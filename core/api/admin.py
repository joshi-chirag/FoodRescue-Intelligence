from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, FoodDonation, NGO, Allocation


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'role', 'email', 'is_active', 'date_joined']
    list_filter = ['role', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role', {'fields': ('role',)}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role', {'fields': ('role',)}),
    )


@admin.register(FoodDonation)
class FoodDonationAdmin(admin.ModelAdmin):
    list_display = ['food_type', 'quantity', 'donor_name', 'location', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['food_type', 'donor_name', 'location']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(NGO)
class NGOAdmin(admin.ModelAdmin):
    list_display = ['name', 'location', 'capacity', 'is_active', 'latitude', 'longitude']
    list_filter = ['is_active']
    search_fields = ['name', 'location']


@admin.register(Allocation)
class AllocationAdmin(admin.ModelAdmin):
    list_display = ['food', 'ngo', 'status', 'score', 'distance_km', 'priority', 'allocated_at']
    list_filter = ['status', 'priority']
    readonly_fields = ['allocated_at', 'score', 'distance_km', 'predicted_expiry', 'priority']