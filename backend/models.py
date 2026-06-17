from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()


class Setting(db.Model):
    __tablename__ = "settings"
    key = db.Column(db.String(60), primary_key=True)
    value = db.Column(db.Text, default="")


# Default clinic settings used when none are saved yet
DEFAULT_SETTINGS = {
    "clinic_name": "My Clinic",
    "clinic_address": "",
    "clinic_contact": "",
    "doctor_name": "Dr. Jose Reyes",
    "license_no": "PRC-0123456",
}


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(120), nullable=False, default="")
    license_no = db.Column(db.String(60), default="")


class Patient(db.Model):
    __tablename__ = "patients"
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(80), nullable=False)
    middle_name = db.Column(db.String(80), default="")
    last_name = db.Column(db.String(80), nullable=False)
    dob = db.Column(db.String(10), default="")          # ISO yyyy-mm-dd
    gender = db.Column(db.String(20), default="")
    address = db.Column(db.String(255), default="")
    contact = db.Column(db.String(40), default="")
    email = db.Column(db.String(120), default="")
    emergency_name = db.Column(db.String(120), default="")
    emergency_contact = db.Column(db.String(40), default="")
    blood_type = db.Column(db.String(8), default="")
    allergies = db.Column(db.Text, default="")
    medications = db.Column(db.Text, default="")
    medical_history = db.Column(db.Text, default="")
    notes = db.Column(db.Text, default="")
    archived = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    consultations = db.relationship("Consultation", backref="patient", lazy=True,
                                    cascade="all, delete-orphan")
    appointments = db.relationship("Appointment", backref="patient", lazy=True,
                                   cascade="all, delete-orphan")
    invoices = db.relationship("Invoice", backref="patient", lazy=True,
                               cascade="all, delete-orphan")

    def to_dict(self):
        d = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        d["created_at"] = self.created_at.isoformat() if self.created_at else None
        return d


class Appointment(db.Model):
    __tablename__ = "appointments"
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    date = db.Column(db.String(10), nullable=False)     # yyyy-mm-dd
    time = db.Column(db.String(5), default="")          # HH:MM
    reason = db.Column(db.String(255), default="")
    status = db.Column(db.String(20), default="Scheduled")

    def to_dict(self):
        return {
            "id": self.id, "patient_id": self.patient_id,
            "patient_name": f"{self.patient.first_name} {self.patient.last_name}",
            "date": self.date, "time": self.time,
            "reason": self.reason, "status": self.status,
        }


class Consultation(db.Model):
    __tablename__ = "consultations"
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    chief_complaint = db.Column(db.Text, default="")
    vitals = db.Column(db.String(255), default="")
    diagnosis = db.Column(db.Text, default="")
    treatment = db.Column(db.Text, default="")
    notes = db.Column(db.Text, default="")
    follow_up = db.Column(db.String(10), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    prescriptions = db.relationship("Prescription", backref="consultation", lazy=True,
                                    cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id, "patient_id": self.patient_id, "date": self.date,
            "chief_complaint": self.chief_complaint, "vitals": self.vitals,
            "diagnosis": self.diagnosis, "treatment": self.treatment,
            "notes": self.notes, "follow_up": self.follow_up,
            "prescriptions": [p.to_dict() for p in self.prescriptions],
        }


class Prescription(db.Model):
    __tablename__ = "prescriptions"
    id = db.Column(db.Integer, primary_key=True)
    consultation_id = db.Column(db.Integer, db.ForeignKey("consultations.id"), nullable=False)
    medication = db.Column(db.String(120), nullable=False)
    dosage = db.Column(db.String(80), default="")
    frequency = db.Column(db.String(80), default="")
    duration = db.Column(db.String(80), default="")
    instructions = db.Column(db.String(255), default="")

    def to_dict(self):
        return {
            "id": self.id, "medication": self.medication, "dosage": self.dosage,
            "frequency": self.frequency, "duration": self.duration,
            "instructions": self.instructions,
        }


class Invoice(db.Model):
    __tablename__ = "invoices"
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    service = db.Column(db.String(120), default="Consultation")
    amount = db.Column(db.Float, default=0)
    discount = db.Column(db.Float, default=0)
    paid = db.Column(db.Float, default=0)
    method = db.Column(db.String(40), default="")
    status = db.Column(db.String(20), default="Unpaid")

    def balance(self):
        return max(self.amount - self.discount - self.paid, 0)

    def to_dict(self):
        return {
            "id": self.id, "patient_id": self.patient_id,
            "patient_name": f"{self.patient.first_name} {self.patient.last_name}",
            "date": self.date, "service": self.service, "amount": self.amount,
            "discount": self.discount, "paid": self.paid, "method": self.method,
            "status": self.status, "balance": self.balance(),
        }


class MedicalCertificate(db.Model):
    __tablename__ = "medical_certificates"
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey("patients.id"), nullable=False)
    date = db.Column(db.String(10), nullable=False)
    diagnosis = db.Column(db.Text, default="")
    remarks = db.Column(db.Text, default="")
    rest_days = db.Column(db.String(40), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    patient = db.relationship("Patient")

    def to_dict(self):
        return {
            "id": self.id, "patient_id": self.patient_id,
            "patient_name": f"{self.patient.first_name} {self.patient.last_name}",
            "date": self.date, "diagnosis": self.diagnosis,
            "remarks": self.remarks, "rest_days": self.rest_days,
        }
