from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FoodDonationViewSet, NGOViewSet, AllocationViewSet, auto_allocate, RegisterView
from rest_framework_simplejwt.views import TokenObtainPairView

router = DefaultRouter()
router.register(r'donations', FoodDonationViewSet)
router.register(r'ngos', NGOViewSet)
router.register(r'allocations', AllocationViewSet)

urlpatterns = [
    path('', include(router.urls)),

    # 🔐 AUTH
    path('register/', RegisterView.as_view()),
    path('login/', TokenObtainPairView.as_view()),

    # 🤖 AI
    path('auto-allocate/', auto_allocate),
]