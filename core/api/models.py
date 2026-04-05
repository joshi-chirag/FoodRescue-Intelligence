from django.db import models

class FoodDonation(models.Model):
    donor_name = models.CharField(max_length=100)
    food_type = models.CharField(max_length=100)
    quantity = models.IntegerField()
    expiry_time = models.DateTimeField()
    location = models.CharField(max_length=255)

    def __str__(self):
        return self.food_type


class NGO(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=255)
    capacity = models.IntegerField()

    def __str__(self):
        return self.name


class Allocation(models.Model):
    food = models.ForeignKey(FoodDonation, on_delete=models.CASCADE)
    ngo = models.ForeignKey(NGO, on_delete=models.CASCADE)
    status = models.CharField(max_length=50, default="pending")

    def __str__(self):
        return f"{self.food} → {self.ngo}"