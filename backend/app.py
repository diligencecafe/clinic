import os
import jwt
import datetime
from functools import wraps
from io import BytesIO

from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from reportlab.lib.pagesizes import A5
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from models import (db, User, Patient, Appointment, Consultation, Prescription,
                    Invoice, Setting, MedicalCertificate, DEFAULT_SETTINGS)

SECRET = os.environ.get("SECRET_KEY", "dev-secret-change-me")

app = Flask(__name__, static_folder=None)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///clinic.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)
CORS(app)


# ── Auth helpers ─────────────────────────────────────────────────────
def make_token(user):
    payload = {
        "uid": user.id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def auth_required(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        hdr = request.headers.get("Authorization", "")
        if not hdr.startswith("Bearer "):
            return jsonify({"error": "Missing token"}), 401
        try:
            data = jwt.decode(hdr[7:], SECRET, algorithms=["HS256"])
            request.user = User.query.get(data["uid"])
            if not request.user:
                return jsonify({"error": "Invalid user"}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return wrap


# ── Auth routes ──────────────────────────────────────────────────────
@app.post("/api/login")
def login():
    body = request.get_json(force=True)
    user = User.query.filter_by(username=(body.get("username") or "").strip()).first()
    if not user or not check_password_hash(user.password_hash, body.get("password") or ""):
        return jsonify({"error": "Invalid username or password"}), 401
    return jsonify({"token": make_token(user),
                    "user": {"username": user.username, "full_name": user.full_name}})


@app.get("/api/me")
@auth_required
def me():
    u = request.user
    return jsonify({"username": u.username, "full_name": u.full_name, "license_no": u.license_no})


# ── Settings (clinic customization) ──────────────────────────────────
def get_settings():
    saved = {s.key: s.value for s in Setting.query.all()}
    return {**DEFAULT_SETTINGS, **saved}


@app.get("/api/settings")
@auth_required
def read_settings():
    return jsonify(get_settings())


@app.put("/api/settings")
@auth_required
def write_settings():
    body = request.get_json(force=True)
    for key in DEFAULT_SETTINGS:
        if key in body:
            row = Setting.query.get(key)
            if row:
                row.value = body[key] or ""
            else:
                db.session.add(Setting(key=key, value=body[key] or ""))
    db.session.commit()
    return jsonify(get_settings())


# ── Dashboard ────────────────────────────────────────────────────────
@app.get("/api/dashboard")
@auth_required
def dashboard():
    today = datetime.date.today().isoformat()
    total_patients = Patient.query.filter_by(archived=False).count()
    todays = Appointment.query.filter_by(date=today).count()
    upcoming = Appointment.query.filter(Appointment.date > today,
                                        Appointment.status.in_(["Scheduled", "Confirmed"])).count()
    invoices = Invoice.query.all()
    unpaid = sum(1 for i in invoices if i.status != "Paid")
    month = today[:7]
    revenue = sum(i.paid for i in invoices if i.date.startswith(month))
    recent = Consultation.query.order_by(Consultation.id.desc()).limit(5).all()
    return jsonify({
        "total_patients": total_patients,
        "todays_appointments": todays,
        "upcoming_appointments": upcoming,
        "monthly_revenue": revenue,
        "unpaid_invoices": unpaid,
        "recent_consultations": [
            {"id": c.id, "patient": f"{c.patient.first_name} {c.patient.last_name}",
             "date": c.date, "diagnosis": c.diagnosis} for c in recent
        ],
    })


# ── Patients ─────────────────────────────────────────────────────────
@app.get("/api/patients")
@auth_required
def list_patients():
    q = request.args.get("q", "").lower()
    show_archived = request.args.get("archived") == "1"
    query = Patient.query
    if not show_archived:
        query = query.filter_by(archived=False)
    patients = query.order_by(Patient.last_name).all()
    if q:
        patients = [p for p in patients
                    if q in f"{p.first_name} {p.last_name}".lower()
                    or q in (p.contact or "")]
    return jsonify([p.to_dict() for p in patients])


@app.get("/api/patients/<int:pid>")
@auth_required
def get_patient(pid):
    p = Patient.query.get_or_404(pid)
    d = p.to_dict()
    d["consultations"] = [c.to_dict() for c in
                          sorted(p.consultations, key=lambda c: c.date, reverse=True)]
    d["appointments"] = [a.to_dict() for a in
                         sorted(p.appointments, key=lambda a: a.date, reverse=True)]
    d["invoices"] = [i.to_dict() for i in p.invoices]
    certs = MedicalCertificate.query.filter_by(patient_id=pid).order_by(
        MedicalCertificate.id.desc()).all()
    d["certificates"] = [c.to_dict() for c in certs]
    return jsonify(d)


@app.post("/api/patients")
@auth_required
def create_patient():
    body = request.get_json(force=True)
    if not body.get("first_name") or not body.get("last_name"):
        return jsonify({"error": "First and last name are required"}), 400
    p = Patient()
    for f in ["first_name", "middle_name", "last_name", "dob", "gender", "address",
              "contact", "email", "emergency_name", "emergency_contact", "blood_type",
              "allergies", "medications", "medical_history", "notes"]:
        setattr(p, f, body.get(f, "") or "")
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201


@app.put("/api/patients/<int:pid>")
@auth_required
def update_patient(pid):
    p = Patient.query.get_or_404(pid)
    body = request.get_json(force=True)
    for f in ["first_name", "middle_name", "last_name", "dob", "gender", "address",
              "contact", "email", "emergency_name", "emergency_contact", "blood_type",
              "allergies", "medications", "medical_history", "notes"]:
        if f in body:
            setattr(p, f, body.get(f) or "")
    db.session.commit()
    return jsonify(p.to_dict())


@app.post("/api/patients/<int:pid>/archive")
@auth_required
def archive_patient(pid):
    p = Patient.query.get_or_404(pid)
    p.archived = not p.archived
    db.session.commit()
    return jsonify({"archived": p.archived})


# ── Appointments ─────────────────────────────────────────────────────
@app.get("/api/appointments")
@auth_required
def list_appointments():
    appts = Appointment.query.order_by(Appointment.date, Appointment.time).all()
    return jsonify([a.to_dict() for a in appts])


@app.post("/api/appointments")
@auth_required
def create_appointment():
    body = request.get_json(force=True)
    if not body.get("patient_id") or not body.get("date"):
        return jsonify({"error": "Patient and date are required"}), 400
    a = Appointment(patient_id=body["patient_id"], date=body["date"],
                    time=body.get("time", ""), reason=body.get("reason", ""),
                    status=body.get("status", "Scheduled"))
    db.session.add(a)
    db.session.commit()
    return jsonify(a.to_dict()), 201


@app.put("/api/appointments/<int:aid>")
@auth_required
def update_appointment(aid):
    a = Appointment.query.get_or_404(aid)
    body = request.get_json(force=True)
    for f in ["date", "time", "reason", "status"]:
        if f in body:
            setattr(a, f, body[f])
    db.session.commit()
    return jsonify(a.to_dict())


@app.delete("/api/appointments/<int:aid>")
@auth_required
def delete_appointment(aid):
    a = Appointment.query.get_or_404(aid)
    db.session.delete(a)
    db.session.commit()
    return jsonify({"ok": True})


# ── Consultations + prescriptions ────────────────────────────────────
@app.post("/api/consultations")
@auth_required
def create_consultation():
    body = request.get_json(force=True)
    if not body.get("patient_id"):
        return jsonify({"error": "Patient is required"}), 400
    c = Consultation(
        patient_id=body["patient_id"],
        date=body.get("date") or datetime.date.today().isoformat(),
        chief_complaint=body.get("chief_complaint", ""), vitals=body.get("vitals", ""),
        diagnosis=body.get("diagnosis", ""), treatment=body.get("treatment", ""),
        notes=body.get("notes", ""), follow_up=body.get("follow_up", ""),
    )
    db.session.add(c)
    db.session.flush()
    for rx in body.get("prescriptions", []):
        if rx.get("medication"):
            db.session.add(Prescription(
                consultation_id=c.id, medication=rx["medication"],
                dosage=rx.get("dosage", ""), frequency=rx.get("frequency", ""),
                duration=rx.get("duration", ""), instructions=rx.get("instructions", "")))
    db.session.commit()
    return jsonify(c.to_dict()), 201


@app.get("/api/consultations/<int:cid>/prescription.pdf")
@auth_required
def prescription_pdf(cid):
    c = Consultation.query.get_or_404(cid)
    p = c.patient
    s = get_settings()
    buf = BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A5)
    w, h = A5
    y = h - 20 * mm
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(20 * mm, y, s["clinic_name"])
    pdf.setFont("Helvetica", 8)
    for line in [s["clinic_address"], s["clinic_contact"]]:
        if line:
            y -= 4.5 * mm
            pdf.drawString(20 * mm, y, line)
    y -= 10 * mm
    pdf.line(20 * mm, y, w - 20 * mm, y)
    y -= 8 * mm
    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Patient: {p.first_name} {p.last_name}")
    pdf.drawRightString(w - 20 * mm, y, f"Date: {c.date}")
    y -= 12 * mm
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(20 * mm, y, "Rx")
    y -= 10 * mm
    pdf.setFont("Helvetica", 10)
    if not c.prescriptions:
        pdf.drawString(25 * mm, y, "(no medications)")
        y -= 7 * mm
    for rx in c.prescriptions:
        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(25 * mm, y, rx.medication)
        y -= 6 * mm
        pdf.setFont("Helvetica", 9)
        detail = " · ".join(filter(None, [rx.dosage, rx.frequency, rx.duration]))
        pdf.drawString(28 * mm, y, detail)
        y -= 5 * mm
        if rx.instructions:
            pdf.drawString(28 * mm, y, rx.instructions)
            y -= 5 * mm
        y -= 3 * mm
    y = 30 * mm
    pdf.line(w - 70 * mm, y, w - 20 * mm, y)
    pdf.setFont("Helvetica", 9)
    pdf.drawCentredString(w - 45 * mm, y - 5 * mm, s["doctor_name"])
    if s["license_no"]:
        pdf.drawCentredString(w - 45 * mm, y - 9 * mm, f"License No.: {s['license_no']}")
    pdf.showPage()
    pdf.save()
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf", download_name=f"rx_{cid}.pdf")


# ── Medical certificates ─────────────────────────────────────────────
@app.post("/api/certificates")
@auth_required
def create_certificate():
    body = request.get_json(force=True)
    if not body.get("patient_id"):
        return jsonify({"error": "Patient is required"}), 400
    cert = MedicalCertificate(
        patient_id=body["patient_id"],
        date=body.get("date") or datetime.date.today().isoformat(),
        diagnosis=body.get("diagnosis", ""), remarks=body.get("remarks", ""),
        rest_days=body.get("rest_days", ""))
    db.session.add(cert)
    db.session.commit()
    return jsonify(cert.to_dict()), 201


@app.get("/api/patients/<int:pid>/certificates")
@auth_required
def patient_certificates(pid):
    certs = MedicalCertificate.query.filter_by(patient_id=pid).order_by(
        MedicalCertificate.id.desc()).all()
    return jsonify([c.to_dict() for c in certs])


@app.get("/api/certificates/<int:cid>/certificate.pdf")
@auth_required
def certificate_pdf(cid):
    cert = MedicalCertificate.query.get_or_404(cid)
    p = cert.patient
    s = get_settings()
    buf = BytesIO()
    pdf = canvas.Canvas(buf, pagesize=A5)
    w, h = A5
    y = h - 20 * mm
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawCentredString(w / 2, y, s["clinic_name"])
    pdf.setFont("Helvetica", 8)
    for line in [s["clinic_address"], s["clinic_contact"]]:
        if line:
            y -= 4.5 * mm
            pdf.drawCentredString(w / 2, y, line)
    y -= 12 * mm
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawCentredString(w / 2, y, "MEDICAL CERTIFICATE")
    y -= 14 * mm
    pdf.setFont("Helvetica", 10)
    pdf.drawString(20 * mm, y, f"Date: {cert.date}")
    y -= 12 * mm
    name = f"{p.first_name} {p.last_name}"
    lines = [
        f"This is to certify that {name} has been examined and",
        f"found to be suffering from: {cert.diagnosis or '—'}.",
    ]
    if cert.rest_days:
        lines.append(f"Recommended rest period: {cert.rest_days}.")
    if cert.remarks:
        lines.append(f"Remarks: {cert.remarks}")
    for ln in lines:
        pdf.drawString(20 * mm, y, ln)
        y -= 7 * mm
    y = 35 * mm
    pdf.line(w - 75 * mm, y, w - 20 * mm, y)
    pdf.setFont("Helvetica", 9)
    pdf.drawCentredString(w - 47.5 * mm, y - 5 * mm, s["doctor_name"])
    if s["license_no"]:
        pdf.drawCentredString(w - 47.5 * mm, y - 9 * mm, f"License No.: {s['license_no']}")
    pdf.showPage()
    pdf.save()
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf", download_name=f"certificate_{cid}.pdf")


# ── Reports ──────────────────────────────────────────────────────────
@app.get("/api/reports")
@auth_required
def reports():
    today = datetime.date.today().isoformat()
    month = today[:7]
    patients = Patient.query.filter_by(archived=False).all()
    invoices = Invoice.query.all()
    appts = Appointment.query.all()
    return jsonify({
        "total_patients": len(patients),
        "new_patients_this_month": sum(
            1 for p in patients if p.created_at and p.created_at.isoformat().startswith(month)),
        "appointments_today": sum(1 for a in appts if a.date == today),
        "appointments_this_month": sum(1 for a in appts if a.date.startswith(month)),
        "revenue_today": sum(i.paid for i in invoices if i.date == today),
        "revenue_this_month": sum(i.paid for i in invoices if i.date.startswith(month)),
        "outstanding_balance": sum(i.balance() for i in invoices),
    })


# ── Invoices ─────────────────────────────────────────────────────────
@app.get("/api/invoices")
@auth_required
def list_invoices():
    return jsonify([i.to_dict() for i in Invoice.query.order_by(Invoice.id.desc()).all()])


@app.post("/api/invoices")
@auth_required
def create_invoice():
    body = request.get_json(force=True)
    if not body.get("patient_id"):
        return jsonify({"error": "Patient is required"}), 400
    i = Invoice(patient_id=body["patient_id"],
                date=body.get("date") or datetime.date.today().isoformat(),
                service=body.get("service", "Consultation"),
                amount=float(body.get("amount") or 0),
                discount=float(body.get("discount") or 0))
    i.status = "Unpaid"
    db.session.add(i)
    db.session.commit()
    return jsonify(i.to_dict()), 201


@app.post("/api/invoices/<int:iid>/pay")
@auth_required
def pay_invoice(iid):
    i = Invoice.query.get_or_404(iid)
    body = request.get_json(force=True)
    i.paid += float(body.get("amount") or 0)
    i.method = body.get("method", i.method)
    bal = i.balance()
    i.status = "Paid" if bal <= 0 else ("Partial" if i.paid > 0 else "Unpaid")
    db.session.commit()
    return jsonify(i.to_dict())


# ── Serve frontend (production build) ────────────────────────────────
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not found"}), 404
    full = os.path.join(STATIC_DIR, path)
    if path and os.path.isfile(full):
        return send_from_directory(STATIC_DIR, path)
    return send_from_directory(STATIC_DIR, "index.html")


# ── Seed ─────────────────────────────────────────────────────────────
def seed():
    db.create_all()
    if User.query.first():
        return
    admin = User(username="admin", full_name="Dr. Jose Reyes", license_no="PRC-0123456",
                 password_hash=generate_password_hash("admin123"))
    db.session.add(admin)
    p1 = Patient(first_name="Maria", last_name="Santos", gender="Female",
                 dob="1985-03-12", contact="0917 555 0142", blood_type="O+",
                 allergies="Penicillin", address="12 Mabini St, Quezon City")
    p2 = Patient(first_name="Juan", last_name="dela Cruz", gender="Male",
                 dob="1992-11-30", contact="0920 555 8831", blood_type="A+",
                 address="88 Rizal Ave, Makati")
    db.session.add_all([p1, p2])
    db.session.flush()
    today = datetime.date.today().isoformat()
    db.session.add(Appointment(patient_id=p1.id, date=today, time="10:00",
                               reason="Follow-up", status="Confirmed"))
    c = Consultation(patient_id=p1.id, date=today, chief_complaint="Elevated BP",
                     vitals="BP 138/86", diagnosis="Hypertension",
                     treatment="Continue Amlodipine 5mg OD")
    db.session.add(c)
    db.session.flush()
    db.session.add(Prescription(consultation_id=c.id, medication="Amlodipine",
                                dosage="5mg", frequency="Once daily", duration="30 days"))
    inv = Invoice(patient_id=p1.id, date=today, service="Consultation", amount=800)
    db.session.add(inv)
    db.session.commit()


if __name__ == "__main__":
    with app.app_context():
        seed()
    app.run(debug=True, port=5000)
