import math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in KM

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)
    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    return R * c  # Distance in KM

def auto_expire_donations():
    """Checks for pending or allocated donations past their expiry time, marks them expired, and updates relevant allocations."""
    from django.utils import timezone
    from .models import FoodDonation, Allocation
    
    now = timezone.now()
    # Find all donations that are pending or allocated, and past expiry time
    expired_donations = FoodDonation.objects.filter(
        status__in=['pending', 'allocated'],
        expiry_time__lt=now
    )
    
    expired_count = expired_donations.count()
    if expired_count > 0:
        # Mark donations as expired
        expired_donations.update(status='expired')
        # Mark any pending allocations for these expired donations as rejected
        Allocation.objects.filter(
            food__status='expired',
            status='pending'
        ).update(status='rejected')

def send_allocation_email(allocation):
    """Sends an email notification to the NGO when a new food donation is allocated to them."""
    from django.core.mail import send_mail
    from django.conf import settings
    
    ngo = allocation.ngo
    food = allocation.food
    if not ngo.email:
        return
        
    subject = f"🚨 New Food Donation Allocated: {food.food_type}"
    message = f"""Hi {ngo.name},

A new food donation has been matched and allocated to you by our AI Rescue system!

Details:
- Food Type: {food.food_type}
- Quantity: {food.quantity} units
- Donor Location: {food.location}
- Distance: {allocation.distance_km} km
- Estimated Expiry: {allocation.predicted_expiry} hours
- Priority: {allocation.priority}

Please log into your dashboard to accept or reject this donation.
Track link: http://localhost:5173/track/{food.id}

Best,
FoodRescue Intelligence Team
"""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[ngo.email],
            fail_silently=True
        )
    except Exception as e:
        print(f"Error sending email: {e}")