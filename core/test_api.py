"""
Full live API test suite — hits the running Django server at http://127.0.0.1:8000
Run with: python test_api.py
Make sure: python manage.py runserver is running in another terminal.
"""
import sys
import requests
import os
import secrets
import django

# Set up django environment to query DB and perform Django operations
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.contrib.auth import get_user_model
from api.models import FoodDonation

# Clean up previous test users and donations
User = get_user_model()
User.objects.filter(username__in=["apitest_donor", "apitest_ngo"]).delete()
FoodDonation.objects.filter(food_type="Paneer Tikka").delete()

BASE = "http://127.0.0.1:8000/api"
results = []

# Auto-generate test passwords (not stored in git)
TEST_DONOR_PASS = os.environ.get('TEST_DONOR_PASSWORD', secrets.token_urlsafe(12))
TEST_NGO_PASS = os.environ.get('TEST_NGO_PASSWORD', secrets.token_urlsafe(12))
TEST_ADMIN_PASS = os.environ.get('TEST_ADMIN_PASSWORD', secrets.token_urlsafe(12))

def check(label, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    results.append((status, label, detail))
    icon = "[+]" if condition else "[X]"
    print(f"  {icon}  {label}" + (f"  ({detail})" if detail else ""))

def post(path, data, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    try:
        return requests.post(f"{BASE}{path}", json=data, headers=headers, timeout=5)
    except requests.ConnectionError:
        print("\n  ERROR: Cannot connect to http://127.0.0.1:8000")
        print("  Make sure Django server is running: python manage.py runserver\n")
        sys.exit(1)

def get(path, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.get(f"{BASE}{path}", headers=headers, timeout=5)

def patch(path, data, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    return requests.patch(f"{BASE}{path}", json=data, headers=headers, timeout=5)

print("\n  FoodRescue Intelligence -- Full API Test Suite")
print("  " + "="*53)

# ── 1. REGISTRATION ──────────────────────────────────
print("\n  [1] REGISTRATION")
r = post("/register/", {"username": "apitest_donor", "password": TEST_DONOR_PASS, "role": "donor"})
check("Register new donor", r.status_code == 201, f"status={r.status_code}")

r = post("/register/", {"username": "apitest_ngo", "password": TEST_NGO_PASS, "role": "ngo"})
check("Register new NGO", r.status_code == 201, f"status={r.status_code}")

r = post("/register/", {"username": "donor1", "password": TEST_DONOR_PASS, "role": "donor"})
check("Duplicate username rejected", r.status_code == 400, f"status={r.status_code}")

# ── 2. LOGIN ──────────────────────────────────────────
print("\n  [2] LOGIN / JWT")
# NOTE: These test logins require that seed_test_data.py was run first to create these accounts.
# Set SEED_DONOR_PASSWORD and SEED_NGO_PASSWORD env vars to match the passwords printed by seed_test_data.py
SEED_DONOR_PASS = os.environ.get('SEED_DONOR_PASSWORD', '')
SEED_NGO_PASS = os.environ.get('SEED_NGO_PASSWORD', '')
r = post("/login/", {"username": "donor1", "password": SEED_DONOR_PASS})
check("Donor login succeeds", r.status_code == 200, f"status={r.status_code}")
donor_data = r.json()
check("Login returns access token", "access" in donor_data)
check("Login returns role=donor", donor_data.get("role") == "donor", f"role={donor_data.get('role')}")
check("Login returns username", donor_data.get("username") == "donor1", f"username={donor_data.get('username')}")
DONOR_TOKEN = donor_data.get("access", "")

r = post("/login/", {"username": "HopeTrust", "password": SEED_NGO_PASS})
check("NGO login succeeds", r.status_code == 200)
ngo_data = r.json()
check("NGO role=ngo returned", ngo_data.get("role") == "ngo", f"role={ngo_data.get('role')}")
NGO_TOKEN = ngo_data.get("access", "")

r = post("/login/", {"username": "donor1", "password": secrets.token_urlsafe(8)})
check("Wrong password rejected (401)", r.status_code == 401, f"status={r.status_code}")

# ── 3. FOOD DONATIONS ────────────────────────────────
print("\n  [3] FOOD DONATIONS")
r = post("/donations/", {
    "food_type": "Paneer Tikka",
    "quantity": 60,
    "expiry_time": "2026-06-03T22:00:00Z",
    "location": "Rajiv Chowk, New Delhi",
    "latitude": 28.6328,
    "longitude": 77.2197,
    "donor_name": "donor1",
}, token=DONOR_TOKEN)
check("Donor can create donation", r.status_code == 201, f"status={r.status_code}")
d = r.json()
check("created_by auto-set", d.get("created_by") is not None, f"created_by={d.get('created_by')}")
check("donor_name auto-set", d.get("donor_name") == "donor1", f"donor_name={d.get('donor_name')}")
NEW_DONATION_ID = d.get("id")

r = get("/donations/", token=DONOR_TOKEN)
check("Donor sees own donations", r.status_code == 200, f"count={len(r.json())}")

r = post("/donations/", {
    "food_type": "Rice", "quantity": 10,
    "expiry_time": "2026-06-03T20:00:00Z", "location": "Delhi"
}, token=NGO_TOKEN)
check("NGO CANNOT create donation (403)", r.status_code == 403, f"status={r.status_code}")

r = get("/donations/")
check("Unauthenticated BLOCKED from donations (401)", r.status_code == 401, f"status={r.status_code}")

# ── 4. NGO LIST ───────────────────────────────────────
print("\n  [4] NGO LISTING")
r = get("/ngos/", token=DONOR_TOKEN)
check("Authenticated can list NGOs", r.status_code == 200, f"count={len(r.json())}")
ngos = r.json()
check("All NGOs have coordinates", all(n["latitude"] is not None for n in ngos), f"ngos={len(ngos)}")

# ── 5. AI AUTO-ALLOCATION ────────────────────────────
print("\n  [5] AI AUTO-ALLOCATION ENGINE")
r = post("/auto-allocate/", {
    "donation_id": NEW_DONATION_ID,
    "temperature": 28,
    "humidity": 65,
    "time_since_cooked": 1.5,
}, token=DONOR_TOKEN)
check("Auto-allocate succeeds", r.status_code == 200, f"status={r.status_code}")
if r.status_code == 200:
    a = r.json()
    check("Returns allocated_to (NGO name)", "allocated_to" in a, f"ngo={a.get('allocated_to')}")
    check("Returns distance_km", "distance_km" in a, f"{a.get('distance_km')} km")
    check("Returns AI score", "score" in a, f"score={a.get('score')}")
    check("Returns priority (HIGH/NORMAL)", a.get("priority") in ["HIGH","NORMAL"], f"priority={a.get('priority')}")
    check("Returns all_ngo_scores list", len(a.get("all_ngo_scores",[])) > 0, f"{len(a.get('all_ngo_scores',[]))} NGOs ranked")
    check("Returns allocation_id", "allocation_id" in a, f"id={a.get('allocation_id')}")
    ALLOCATION_ID = a.get("allocation_id")
    print(f"\n        AI picked: {a.get('allocated_to')} ({a.get('distance_km')} km away, score={a.get('score')})")
    print(f"        Priority:  {a.get('priority')} | Expiry prediction: {a.get('predicted_expiry')}h")
    if a.get("all_ngo_scores"):
        print("        NGO Rankings:")
        for i, n in enumerate(a["all_ngo_scores"]):
            print(f"          {i+1}. {n['ngo']}  score={n['score']}  dist={n['distance_km']}km")
else:
    print(f"        Error: {r.json()}")
    ALLOCATION_ID = None

r2 = post("/auto-allocate/", {"donation_id": NEW_DONATION_ID}, token=DONOR_TOKEN)
check("Re-allocating same donation rejected (400)", r2.status_code == 400, f"status={r2.status_code}")

r3 = post("/auto-allocate/", {"donation_id": NEW_DONATION_ID}, token=NGO_TOKEN)
check("NGO CANNOT trigger allocation (403)", r3.status_code == 403, f"status={r3.status_code}")

r4 = post("/auto-allocate/", {"donation_id": 1})
check("Unauthenticated BLOCKED from allocation (401)", r4.status_code == 401, f"status={r4.status_code}")

# ── 6. ALLOCATIONS ───────────────────────────────────
print("\n  [6] ALLOCATION MANAGEMENT")
r = get("/allocations/", token=NGO_TOKEN)
check("NGO can list allocations", r.status_code == 200, f"count={len(r.json())}")
if r.json():
    alloc = r.json()[0]
    check("food_detail is nested object", isinstance(alloc.get("food_detail"), dict), f"food_type={alloc.get('food_detail',{}).get('food_type')}")
    check("food_detail has quantity", alloc.get("food_detail",{}).get("quantity") is not None)
    check("ngo_detail is nested object", isinstance(alloc.get("ngo_detail"), dict), f"ngo={alloc.get('ngo_detail',{}).get('name')}")
    check("score stored on allocation", alloc.get("score") is not None, f"score={alloc.get('score')}")
    check("priority stored", alloc.get("priority") is not None, f"priority={alloc.get('priority')}")
    aid = alloc["id"]
    r2 = patch(f"/allocations/{aid}/", {"status": "accepted"}, token=NGO_TOKEN)
    check("NGO can accept allocation", r2.status_code == 200, f"new_status={r2.json().get('status')}")

# ── 7. STATS ─────────────────────────────────────────
print("\n  [7] STATS ENDPOINT")
r = get("/stats/", token=DONOR_TOKEN)
check("Stats endpoint works", r.status_code == 200)
s = r.json()
check("Has total_donations", "total_donations" in s, f"val={s.get('total_donations')}")
check("Has allocated count", "allocated" in s, f"val={s.get('allocated')}")
check("Has active_ngos", "active_ngos" in s, f"val={s.get('active_ngos')}")
check("Has total_allocations", "total_allocations" in s, f"val={s.get('total_allocations')}")

# ── 8. SECURITY ───────────────────────────────────────
print("\n  [8] SECURITY")
r = get("/stats/")
check("Stats blocked without token (401)", r.status_code == 401, f"status={r.status_code}")
r = post("/auto-allocate/", {"donation_id": 999})
check("Allocation blocked without token (401)", r.status_code == 401, f"status={r.status_code}")

# ── SUMMARY ──────────────────────────────────────────
passed = sum(1 for s,_,_ in results if s == "PASS")
failed = sum(1 for s,_,_ in results if s == "FAIL")
total  = len(results)

print("\n  " + "="*53)
print(f"  RESULTS:  {passed}/{total} PASSED   |   {failed} FAILED")
if failed:
    print("\n  Failed tests:")
    for s, label, detail in results:
        if s == "FAIL":
            print(f"    [X] {label}: {detail}")
else:
    print("  All tests passed!")
print("  " + "="*53 + "\n")
