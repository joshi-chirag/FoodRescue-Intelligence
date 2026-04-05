from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FoodDonationViewSet, NGOViewSet, AllocationViewSet, auto_allocate

# Router setup
router = DefaultRouter()
router.register(r'donations', FoodDonationViewSet)
router.register(r'ngos', NGOViewSet)
router.register(r'allocations', AllocationViewSet)

# URL patterns
urlpatterns = [
    path('auto-allocate/', auto_allocate),  # 🤖 ML-based allocation
    path('', include(router.urls)),         # CRUD APIs
]
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]