# FoodRescue Intelligence 🌱

> AI-driven food redistribution platform that automatically allocates food donations to NGOs using machine learning, geolocation analysis, and role-based decision-making.

---

## 🚀 Quick Start (Local Development)

### 1. Backend (Django)

```bash
cd core

# Activate virtual environment
.venv\Scripts\activate       # Windows
source .venv/bin/activate    # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env        # then edit .env

# Run migrations
python manage.py migrate

# Create admin user (optional)
python manage.py createsuperuser

# Start server
python manage.py runserver
```

Backend runs at: **http://127.0.0.1:8000**
Admin panel: **http://127.0.0.1:8000/admin**

---

### 2. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register/` | None | Register user (donor/ngo) |
| POST | `/api/login/` | None | Login → returns JWT + role |
| POST | `/api/token/refresh/` | None | Refresh access token |
| GET | `/api/donations/` | JWT | List donations (donor: own only) |
| POST | `/api/donations/` | Donor | Create donation |
| GET | `/api/ngos/` | JWT | List NGOs |
| POST | `/api/ngos/` | JWT | Create NGO |
| GET | `/api/allocations/` | JWT | List allocations |
| POST | `/api/auto-allocate/` | Donor | AI allocation engine |
| GET | `/api/stats/` | JWT | Platform statistics |

---

## 🤖 AI Engine

The allocation uses a weighted scoring formula:

```
score = 0.5 × distance_score + 0.3 × urgency_score + 0.2 × capacity_score
```

- **Distance score**: Haversine formula, closer NGO = higher score
- **Urgency score**: RandomForest ML model predicting food freshness
- **Capacity score**: NGO's available capacity

---

## 🌍 Deployment

### Backend → [Railway](https://railway.app)

1. Push to GitHub
2. Create Railway project → Deploy from GitHub repo
3. Add PostgreSQL plugin (auto-sets `DATABASE_URL`)
4. Add Redis plugin if using Celery
5. Set environment variables:
   ```
   SECRET_KEY=<generate a new one>
   DEBUG=False
   ALLOWED_HOSTS=your-app.railway.app
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
   DATABASE_URL=<auto-set by Railway>
   ```
6. Railway uses `Procfile` automatically:
   ```
   web: gunicorn core.wsgi:application --bind 0.0.0.0:$PORT
   ```
7. Run migrations via Railway console:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

### Frontend → [Vercel](https://vercel.com)

1. Import GitHub repo on Vercel
2. Set **Root Directory** to `frontend/`
3. Set environment variable:
   ```
   VITE_API_URL=https://your-app.railway.app
   ```
4. Vercel auto-deploys on every push to `main`

---

## 🗂️ Project Structure

```
FoodRescue-Intelligence/
├── core/                    # Django backend
│   ├── api/
│   │   ├── models.py        # User, FoodDonation, NGO, Allocation
│   │   ├── views.py         # All viewsets + AI engine
│   │   ├── serializers.py   # DRF serializers (nested)
│   │   ├── permissions.py   # IsDonor, IsNGO
│   │   ├── urls.py          # API routes
│   │   └── ml_model/        # RandomForest + training data
│   ├── core/
│   │   └── settings.py      # django-environ powered config
│   ├── .env                 # Local env (not committed)
│   ├── .env.example         # Template
│   ├── requirements.txt
│   └── Procfile             # Railway deployment
│
└── frontend/                # React + Vite
    └── src/
        ├── api.js           # Axios instance (auto-auth)
        ├── App.jsx          # Routes
        ├── components/
        │   └── Navbar.jsx
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx     # Donor
            └── NGODashboard.jsx  # NGO
```

---

## 🔮 Future Enhancements

- [ ] Leaflet.js map view showing donors + NGOs
- [ ] Celery + Redis for background expiry monitoring
- [ ] Email notifications to NGOs on allocation
- [ ] PWA support for mobile use by NGO field workers
- [ ] Analytics dashboard with charts (Recharts)
