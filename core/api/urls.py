from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    FoodDonationViewSet,
    NGOViewSet,
    AllocationViewSet,
    auto_allocate,
    cancel_donation,
    map_data,
    my_ngo,
    track_donation,
    RegisterView,
    CustomTokenObtainPairView,
    stats,
    password_reset_request,
    password_reset_confirm,
    admin_users,
    admin_ngos,
    admin_cleanup_expired,
)

router = DefaultRouter()
router.register(r'donations', FoodDonationViewSet, basename='donation')
router.register(r'ngos', NGOViewSet, basename='ngo')
router.register(r'allocations', AllocationViewSet, basename='allocation')

urlpatterns = [
    path('', include(router.urls)),

    # 🔐 AUTH
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('password-reset/request/', password_reset_request, name='password_reset_request'),
    path('password-reset/confirm/', password_reset_confirm, name='password_reset_confirm'),

    # 📊 STATS
    path('stats/', stats, name='stats'),

    # 🗺️ MAP DATA
    path('map-data/', map_data, name='map_data'),

    # 🤖 AI ENGINE
    path('auto-allocate/', auto_allocate, name='auto_allocate'),

    # ❌ CANCEL DONATION
    path('donations/<int:pk>/cancel/', cancel_donation, name='cancel_donation'),

    # 🏢 NGO SELF-PROFILE
    path('my-ngo/', my_ngo, name='my_ngo'),

    # 📍 REAL-TIME TRACKING
    path('donations/<int:pk>/track/', track_donation, name='track_donation'),

    # ⚙️ ADMIN MANAGEMENT
    path('admin/users/', admin_users, name='admin_users'),
    path('admin/users/<int:pk>/', admin_users, name='admin_users_detail'),
    path('admin/ngos/', admin_ngos, name='admin_ngos'),
    path('admin/ngos/<int:pk>/', admin_ngos, name='admin_ngos_detail'),
    path('admin/cleanup-expired/', admin_cleanup_expired, name='admin_cleanup_expired'),
]