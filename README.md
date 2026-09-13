# ShelterX

Emergency Shelter Capacity Prediction and Redistribution System — an MVP that helps
disaster-management authorities see shelter overload coming and redirect people before it
happens.

**Stack:** React (Vite) · Flask · MySQL

---

## What's included

- **Auth** with 3 roles: `admin`, `manager`, `user` (authority)
- **Shelter CRUD** (admin)
- **Occupancy tracking** with a running log per shelter (manager)
- **Prediction** — a simple trend-based projection of when a shelter will hit capacity
- **Redistribution suggestions** — nearest shelters with free capacity, ranked by distance
- **Redistribution confirmation log** — records who redirected people where
- **Pages:** Home, Login, Signup, Admin dashboard, Manager dashboard, Authority dashboard,
  Shelter detail (occupancy trend), Redistribution action view

---

## Project structure

```
shelterx/
├── backend/          Flask API
│   ├── app.py
│   ├── config.py
│   ├── db.py
│   ├── schema.sql
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/       auth, shelters, occupancy, predict, redistribute, users
│   └── utils/        JWT auth helpers/decorators
└── frontend/         React (Vite) app
    ├── src/
    │   ├── pages/     Home, Login, Signup, AdminDashboard, ManagerDashboard,
    │   │              AuthorityDashboard, ShelterDetail, RedistributeAction
    │   ├── components/ Navbar, ProtectedRoute
    │   ├── context/    AuthContext
    │   ├── api.js      fetch wrapper for the backend
    │   └── App.jsx      routing
    └── .env.example
```

---

## 1. Set up the database

Make sure MySQL is running locally, then:

```bash
mysql -u root -p < backend/schema.sql
```

This creates the `shelterx` database, its tables, and seeds 3 sample shelters.

If the database was created before the `people_count` redistribution field was
added, run this one-time migration instead of recreating it:

```bash
mysql -u root -p shelterx < backend/migrations/001_add_redistribution_people_count.sql
```

## 2. Run the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # then edit .env with your MySQL password, etc.

python app.py
```

The API runs at `http://localhost:5000`. Check it's alive:

```bash
curl http://localhost:5000/api/health
```

Create your first account (any role) via:

```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@shelterx.com","password":"Admin@123","role":"admin"}'
```

## 3. Run the frontend

In a separate terminal:

```bash
cd frontend
npm install

cp .env.example .env            # defaults already point at http://localhost:5000/api

npm run dev
```

The app runs at `http://localhost:5173`.

---

## Trying it out

1. Sign up as an **admin** (or use the curl command above).
2. Log in as admin → add a couple of shelters → sign up a second account as a **manager** →
   assign that manager to a shelter from the admin dashboard.
3. Log in as the manager → update the shelter's occupancy a few times (this builds the
   occupancy log the prediction logic reads from).
4. Sign up a third account as **user** (authority) → log in → see the region-wide dashboard
   color-coded by risk, click into a shelter to see its trend, and — once it's flagged
   medium/high risk — view and confirm redistribution suggestions.

---

## Notes on the MVP scope

- **Prediction** is a simple linear trend calculation over recent occupancy logs, not a
  trained ML model. It's structured so a real model can be swapped in later
  (`backend/routes/predict.py`, `calculate_prediction()`) without touching the rest of the app.
- **Redistribution** uses straight-line (haversine) distance between shelters, not real road
  routing — good enough to demonstrate the concept.
- No map library is wired in yet; shelters are shown as a list/cards. Adding Leaflet.js later
  is a frontend-only change.
- Signup lets you pick any role directly, which is intentionally insecure and meant only for
  demoing all three dashboards quickly. In a real deployment, only an admin should be able to
  create manager/authority accounts.
