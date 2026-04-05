from django.contrib import admin
from .models import FoodDonation, NGO, Allocation

admin.site.register(FoodDonation)
admin.site.register(NGO)
admin.site.register(Allocation)