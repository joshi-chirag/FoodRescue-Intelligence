"""
Seed script — creates test users, NGOs, and verifies the full flow.
Run with: python seed_test_data.py

⚠️ FOR LOCAL DEVELOPMENT ONLY — Do not use in production.
"""
import os
import sys
import secrets
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from api.models import User, NGO, FoodDonation, Allocation


def generate_password():
    """Generate a secure random password for test accounts."""
    return secrets.token_urlsafe(12)


print("\n🌱 FoodRescue Intelligence — Seeding Test Data\n" + "="*50)

# Generate secure passwords for each test account
donor_pass = generate_password()
ngo_pass = generate_password()
admin_pass = generate_password()

# ── 1. Create Users ──────────────────────────────────
print("\n📋 Creating users...")

donor1 = User.objects.create_user(username="donor1", password=donor_pass, role="donor")
donor2 = User.objects.create_user(username="restaurant_abc", password=donor_pass, role="donor")
ngo1   = User.objects.create_user(username="HopeTrust", password=ngo_pass, role="ngo")
ngo2   = User.objects.create_user(username="FeedIndia", password=ngo_pass, role="ngo")
admin  = User.objects.create_superuser(username="admin", password=admin_pass, email="admin@foodrescue.com")

print(f"  ✅ donor1         — Donor")
print(f"  ✅ restaurant_abc — Donor")
print(f"  ✅ HopeTrust      — NGO")
print(f"  ✅ FeedIndia      — NGO")
print(f"  ✅ admin          — Superuser")

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
print("\n📌 Login Credentials (auto-generated — use these locally):")
print(f"  Donor:  username=donor1,         password={donor_pass}")
print(f"  Donor:  username=restaurant_abc, password={donor_pass}")
print(f"  NGO:    username=HopeTrust,      password={ngo_pass}")
print(f"  NGO:    username=FeedIndia,      password={ngo_pass}")
print(f"  Admin:  username=admin,          password={admin_pass}")
print("\n🌐 URLs:")
print("  Frontend:   http://localhost:5173")
print("  Backend:    http://127.0.0.1:8000")
print("  Admin:      http://127.0.0.1:8000/admin")
print("  API Root:   http://127.0.0.1:8000/api/")
print("="*50 + "\n")

