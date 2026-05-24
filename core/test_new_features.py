import os
import sys
import django
import requests
import io

BASE = "http://127.0.0.1:8000/api"

# Set up django environment to query DB and perform Django operations
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.conf import settings
from api.models import FoodDonation

# Helper print
def check(label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    icon = "[+]" if condition else "[X]"
    print(f"  {icon}  {label}" + (f"  ({detail})" if detail else ""))
    if not condition:
        sys.exit(1)

print("\n  FoodRescue Intelligence -- Testing New Production Features")
print("  " + "="*58)

# Clean up from previous potential aborted runs
get_user_model().objects.filter(username="pwreset_user").delete()
FoodDonation.objects.filter(food_type="Gulab Jamun").delete()

# 1. TEST PASSWORD RESET FLOW
print("\n  [1] TESTING PASSWORD RESET FLOW")
# Register temporary user
r = requests.post(f"{BASE}/register/", json={"username": "pwreset_user", "password": "oldpassword123", "role": "donor"})
check("Register temporary user", r.status_code == 201, f"status={r.status_code}")

# Request reset OTP
r = requests.post(f"{BASE}/password-reset/request/", json={"username": "pwreset_user"})
check("OTP Request status code 200", r.status_code == 200, f"status={r.status_code}")

# Get the OTP directly from the DB for testing verification
User = get_user_model()
user = User.objects.get(username="pwreset_user")
otp = user.reset_otp
check("OTP successfully saved in DB", otp is not None, f"otp={otp}")

# Confirm Password Reset
r = requests.post(f"{BASE}/password-reset/confirm/", json={
    "username": "pwreset_user",
    "otp": otp,
    "new_password": "newpassword123"
})
check("Confirm Reset status code 200", r.status_code == 200, f"status={r.status_code}")

# Login with new password
r = requests.post(f"{BASE}/login/", json={"username": "pwreset_user", "password": "newpassword123"})
check("Login with new password succeeds", r.status_code == 200, f"status={r.status_code}")
donor_token = r.json().get("access")

# 2. TEST MOCK IMAGE UPLOAD
print("\n  [2] TESTING MULTIPART FOOD PHOTO UPLOAD")
# Create a dummy image file in memory using Pillow
from PIL import Image
img = Image.new('RGB', (10, 10), color='green')
img_data = io.BytesIO()
img.save(img_data, format='PNG')
img_data.seek(0)
files = {"image": ("test_food.png", img_data, "image/png")}
payload = {
    "food_type": "Gulab Jamun",
    "quantity": 30,
    "expiry_time": "2026-06-04T12:00:00Z",
    "location": "Connaught Place, New Delhi",
    "latitude": 28.6304,
    "longitude": 77.2177,
}
headers = {"Authorization": f"Bearer {donor_token}"}
r = requests.post(f"{BASE}/donations/", data=payload, files=files, headers=headers)
check("Create donation with image succeeds", r.status_code == 201, f"status={r.status_code} error={r.text}")
don_data = r.json()
check("Image URL returned in serializer", "image" in don_data and don_data["image"] is not None, f"url={don_data.get('image')}")

# Verify file exists on disk
img_path = don_data.get("image").split("/media/")[-1]
full_path = os.path.join(settings.MEDIA_ROOT, img_path)
check("Image file saved on disk in media folder", os.path.exists(full_path), f"path={full_path}")

# 3. TEST ADMIN MANAGEMENT
print("\n  [3] TESTING ADMIN ENDPOINTS")
# Make the user an admin by reloading from the DB first to avoid overwriting password hash
user = User.objects.get(username="pwreset_user")
user.role = "admin"
user.save()

# Login again to get token with admin role
r = requests.post(f"{BASE}/login/", json={"username": "pwreset_user", "password": "newpassword123"})
check("Admin login post succeeds", r.status_code == 200, f"status={r.status_code} response={r.text}")
admin_token = r.json().get("access")
headers = {"Authorization": f"Bearer {admin_token}"}

# Fetch Users
r = requests.get(f"{BASE}/admin/users/", headers=headers)
check("Admin can fetch users list", r.status_code == 200, f"status={r.status_code} error={r.text}")

# Fetch NGOs
r = requests.get(f"{BASE}/admin/ngos/", headers=headers)
check("Admin can fetch NGOs list", r.status_code == 200, f"count={len(r.json())}")
ngo_id = r.json()[0]["id"]
ngo_name = r.json()[0]["name"]
original_capacity = r.json()[0]["capacity"]

# Update NGO capacity
r = requests.patch(f"{BASE}/admin/ngos/{ngo_id}/", json={"capacity": 500}, headers=headers)
check("Admin can adjust NGO capacity", r.status_code == 200, f"status={r.status_code}")
check("Capacity updated successfully", r.json()["ngo"]["capacity"] == 500)

# Restore capacity
r = requests.patch(f"{BASE}/admin/ngos/{ngo_id}/", json={"capacity": original_capacity}, headers=headers)

# Test Expiry Cleanup API
from django.utils import timezone
from datetime import timedelta
expired_donation = FoodDonation.objects.create(
    created_by=user,
    donor_name=user.username,
    food_type="Expired Chole",
    quantity=10,
    expiry_time=timezone.now() - timedelta(seconds=5),
    location="Delhi",
    status="pending"
)

r = requests.post(f"{BASE}/admin/cleanup-expired/", headers=headers)
check("Admin can trigger cleanup API", r.status_code == 200, f"status={r.status_code}")
check("Cleanup reports at least 1 donation processed", r.json()["count"] >= 1, f"count={r.json().get('count')}")

expired_donation.refresh_from_db()
check("Donation status transitioned to expired", expired_donation.status == "expired", f"status={expired_donation.status}")

# Clean up created objects
expired_donation.delete()

FoodDonation.objects.filter(food_type="Gulab Jamun").delete()
user.delete()

# Remove mock image file from disk
if os.path.exists(full_path):
    os.remove(full_path)

print("\n  " + "="*58)
print("  ALL NEW PRODUCTION FEATURES TESTED SUCCESSFULLY!")
print("  " + "="*58 + "\n")
