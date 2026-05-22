from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import FoodDonation

class Command(BaseCommand):
    help = 'Automatically marks donations as expired if they have passed their expiry time and are still pending/allocated'

    def handle(self, *args, **options):
        now = timezone.now()
        expired_donations = FoodDonation.objects.filter(
            expiry_time__lt=now,
            status__in=['pending', 'allocated']
        )
        count = expired_donations.count()
        
        # Transition status to 'expired'
        for donation in expired_donations:
            donation.status = 'expired'
            donation.save()
            
        self.stdout.write(self.style.SUCCESS(f'Successfully marked {count} expired donations.'))
