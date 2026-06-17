# Clinic Management System (MVP)

A single-user clinic management web app: patients, appointments, consultations with
printable prescription PDFs, and basic billing. Built with Flask + SQLite (backend)
and React + Vite + Tailwind (frontend), packaged for cloud deployment with Docker.

> ⚠️ **Before using with real patient data**, read the "Data privacy" note at the
> bottom. This MVP includes security *mechanisms* but compliance is an operational
> responsibility.

---

## What's included

- **Login** — single account, JWT-based session (default: `admin` / `admin123`)
- **Dashboard** — patient count, today's/upcoming appointments, monthly revenue, unpaid invoices, recent consultations
- **Patients** — create, edit, archive, search; full demographic + medical fields
- **Appointments** — list, status workflow (Scheduled → Confirmed → Completed / Cancelled / No Show), filters
- **Consultations** — chief complaint, vitals, diagnosis, treatment, follow-up; auto-added to patient history
- **Prescriptions** — attached to consultations, exported as a printable PDF
- **Billing** — invoices, discounts, partial/full payments, payment methods (Cash, GCash, Bank Transfer, Credit Card)

Deferred for later phases: separate Admin/Doctor roles, SMS reminders, medical
certificates, file uploads, reports, audit logs, PostgreSQL.

---

## Project structure

```
clinic/
├── backend/
│   ├── app.py            # Flask app: routes, auth, PDF, seed
│   ├── models.py         # SQLAlchemy models
│   ├── requirements.txt
│   └── static/           # built frontend lands here
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # routing + login + layout
│   │   ├── api.js        # API client
│   │   └── pages/        # Dashboard, Patients, PatientDetail, Appointments, Billing
│   ├── vite.config.js
│   └── package.json
├── Dockerfile            # multi-stage: builds frontend, serves via gunicorn
├── render.yaml           # one-click Render deploy
├── .env.example
└── README.md
```

---

## Run locally (development)

You need Python 3.12+ and Node 22+.

**1. Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py                   # seeds the DB and runs on http://localhost:5000
```

**2. Frontend (separate terminal)**
```bash
cd frontend
npm install
npm run dev                     # runs on http://localhost:5173, proxies /api to :5000
```

Open http://localhost:5173 and log in with `admin` / `admin123`.

---

## Run locally as production (single server)

This mimics what the container does — Flask serves the built frontend:

```bash
cd frontend && npm install && npm run build   # outputs into backend/static
cd ../backend
source venv/bin/activate
gunicorn -b 0.0.0.0:5000 app:app
```

Open http://localhost:5000.

---

## Deploy to Render

1. Push this folder to a GitHub repository.
2. In Render, click **New → Blueprint** and point it at your repo. It reads `render.yaml`.
3. Render builds the Dockerfile, attaches a 1 GB persistent disk for the SQLite database,
   and generates a strong `SECRET_KEY` automatically.
4. After deploy, open the service URL and log in.

**Change the default password immediately** (see below). The free plan sleeps after
inactivity; the first request after sleeping takes a few seconds to wake.

(Railway / Fly.io work the same way — both accept the Dockerfile directly.)

---

## First things to do after deploying

1. **Change the admin password.** The seed sets `admin` / `admin123`. Open a shell
   on your host (or temporarily add a one-off route) and update it:
   ```python
   from app import app, db
   from models import User
   from werkzeug.security import generate_password_hash
   with app.app_context():
       u = User.query.filter_by(username="admin").first()
       u.password_hash = generate_password_hash("YOUR-NEW-PASSWORD")
       db.session.commit()
   ```
2. **Confirm HTTPS is on** (Render provides it automatically on the service URL).
3. **Set your own `SECRET_KEY`** if you didn't let the host generate one.

---

## Test account & sample data

- Login: `admin` / `admin123`
- Two sample patients (Maria Santos, Juan dela Cruz), one appointment, one
  consultation with a prescription, and one invoice are seeded on first run.

---

## Security included vs. your responsibility

**In the code:** password hashing (Werkzeug), JWT auth on every API route, role check
on the single user, server-side input validation on create endpoints, parameterized
queries via SQLAlchemy (SQL-injection safe), and React's default output escaping (XSS safe).

**Your responsibility (Data Privacy Act of 2012):** Health records are *sensitive
personal information*. Before storing real patients you should: register a Data
Protection Officer, obtain patient consent, ensure encryption in transit (HTTPS) and
at rest, keep access limited, and maintain backups. Hosting choice and these
operational controls — not the code alone — are what make a deployment compliant.

---

## Moving to PostgreSQL later (Phase 2)

The backend uses SQLAlchemy, so migrating is mostly a config change:
1. Provision a Postgres database (Render offers managed Postgres).
2. Set `DATABASE_URL` to the connection string Render gives you.
3. Add `psycopg2-binary` to `requirements.txt`.
No model changes are required.
