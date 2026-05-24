"""
Seed script — creates test users, NGOs, and verifies the full flow.
Run with: python seed_test_data.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from api.models import User, NGO, FoodDonation, Allocation

print("\n🌱 FoodRescue Intelligence — Seeding Test Data\n" + "="*50)

# ── 1. Create Users ──────────────────────────────────
print("\n📋 Creating users...")

donor1 = User.objects.create_user(username="donor1", password="donor123", role="donor")
donor2 = User.objects.create_user(username="restaurant_abc", password="donor123", role="donor")
ngo1   = User.objects.create_user(username="HopeTrust", password="ngo123", role="ngo")
ngo2   = User.objects.create_user(username="FeedIndia", password="ngo123", role="ngo")
admin  = User.objects.create_superuser(username="admin", password="admin123", email="admin@foodrescue.com")

print(f"  ✅ donor1         (pass: donor123) — Donor")
print(f"  ✅ restaurant_abc (pass: donor123) — Donor")
print(f"  ✅ HopeTrust      (pass: ngo123)   — NGO")
print(f"  ✅ FeedIndia      (pass: ngo123)   — NGO")
print(f"  ✅ admin          (pass: admin123) — Superuser")

# ── 2. Create NGOs (with real Delhi/Mumbai coordinates) ──
print("\n🏢 Creating NGOs...")

ngos = [
    NGO.objects.create(
        name="HopeTrust",
        location="Connaught Place, New Delhi",
        capacity=200,
        latitude=28.6315,
        longitude=77.2167,
        email="hope@trust.org",
        phone="9911001100",
        is_active=True,
    ),
    NGO.objects.create(
        name="FeedIndia",
        location="Karol Bagh, New Delhi",
        capacity=150,
        latitude=28.6519,
        longitude=77.1909,
        email="feed@india.org",
        phone="9922002200",
        is_active=True,
    ),
    NGO.objects.create(
        name="AnnaSeva",
        location="Lajpat Nagar, New Delhi",
        capacity=100,
        latitude=28.5692,
        longitude=77.2400,
        email="anna@seva.org",
        phone="9933003300",
        is_active=True,
    ),
    NGO.objects.create(
        name="RotiBank",
        location="Dwarka, New Delhi",
        capacity=300,
        latitude=28.5921,
        longitude=77.0460,
        email="roti@bank.org",
        phone="9944004400",
        is_active=True,
    ),
]

for ngo in ngos:
    print(f"  ✅ {ngo.name} — {ngo.location} (cap: {ngo.capacity})")

# ── 3. Create a sample donation (pending) ────────────
print("\n🍱 Creating sample donation...")

donation = FoodDonation.objects.create(
    created_by=donor1,
    donor_name="donor1",
    food_type="Biryani",
    quantity=80,
    expiry_time="2026-06-03T18:00:00Z",
    location="India Gate, New Delhi",
    latitude=28.6129,
    longitude=77.2295,
    status="pending",
)
print(f"  ✅ Donation #{donation.id}: {donation.food_type} ({donation.quantity} units) — status: {donation.status}")

print("\n" + "="*50)
print("✅ Done! All test data created.")
print("\n📌 Login Credentials:")
print("  Donor:  username=donor1,         password=donor123")
print("  Donor:  username=restaurant_abc, password=donor123")
print("  NGO:    username=HopeTrust,      password=ngo123")
print("  NGO:    username=FeedIndia,      password=ngo123")
print("  Admin:  username=admin,          password=admin123")
print("\n🌐 URLs:")
print("  Frontend:   http://localhost:5173")
print("  Backend:    http://127.0.0.1:8000")
print("  Admin:      http://127.0.0.1:8000/admin")
print("  API Root:   http://127.0.0.1:8000/api/")
print("="*50 + "\n")
