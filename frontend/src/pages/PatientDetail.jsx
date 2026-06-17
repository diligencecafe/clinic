import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, getToken } from "../api";

export default function PatientDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [err, setErr] = useState("");
  const [showConsult, setShowConsult] = useState(false);
  const [showCert, setShowCert] = useState(false);

  function load() { api.patient(id).then(setP).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, [id]);

  async function openPdf(path) {
    const res = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), "_blank");
  }
  const downloadPdf = (cid) => openPdf(`/api/consultations/${cid}/prescription.pdf`);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!p) return <p className="text-slate-400">Loading…</p>;

  return (
    <div>
      <Link to="/patients" className="text-sm text-slate-500 hover:text-slate-800">← All patients</Link>
      <div className="bg-white border border-slate-200 rounded-xl p-5 mt-3 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold">{p.first_name} {p.middle_name} {p.last_name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{p.gender || "—"} · born {p.dob || "—"} · {p.contact}</p>
          </div>
          <button onClick={async () => { await api.archivePatient(p.id); load(); }}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50">
            {p.archived ? "Unarchive" : "Archive"}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-4 text-sm">
          <Info label="Blood type" v={p.blood_type} />
          <Info label="Allergies" v={p.allergies} alert />
          <Info label="Medications" v={p.medications} />
          <Info label="Address" v={p.address} />
          <Info label="Emergency" v={p.emergency_name && `${p.emergency_name} (${p.emergency_contact})`} />
          <Info label="Medical history" v={p.medical_history} />
        </div>
      </div>

      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold">Consultation history</h2>
        <button onClick={() => setShowConsult(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
          + New consultation
        </button>
      </div>
      <div className="space-y-3">
        {p.consultations.length === 0 && (
          <p className="text-slate-400 text-sm py-6 text-center bg-white rounded-xl border border-slate-200">No consultations.</p>
        )}
        {p.consultations.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium">{c.date}</span>
              {c.prescriptions.length > 0 && (
                <button onClick={() => downloadPdf(c.id)} className="text-sm text-teal-600 hover:underline">
                  Print Rx PDF
                </button>
              )}
            </div>
            {c.chief_complaint && <p className="text-sm mt-1"><b>Complaint:</b> {c.chief_complaint}</p>}
            {c.vitals && <p className="text-sm"><b>Vitals:</b> {c.vitals}</p>}
            {c.diagnosis && <p className="text-sm"><b>Diagnosis:</b> {c.diagnosis}</p>}
            {c.treatment && <p className="text-sm"><b>Treatment:</b> {c.treatment}</p>}
            {c.prescriptions.length > 0 && (
              <div className="mt-2 text-sm bg-slate-50 rounded-lg p-2">
                {c.prescriptions.map((rx) => (
                  <p key={rx.id}>℞ {rx.medication} — {[rx.dosage, rx.frequency, rx.duration].filter(Boolean).join(" · ")}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mb-3 mt-6">
        <h2 className="font-semibold">Medical certificates</h2>
        <button onClick={() => setShowCert(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
          + New certificate
        </button>
      </div>
      <div className="space-y-2">
        {(!p.certificates || p.certificates.length === 0) && (
          <p className="text-slate-400 text-sm py-4 text-center bg-white rounded-xl border border-slate-200">No certificates.</p>
        )}
        {(p.certificates || []).map((cert) => (
          <div key={cert.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{cert.date}</p>
              <p className="text-sm text-slate-500">{cert.diagnosis || "—"}{cert.rest_days && ` · rest ${cert.rest_days}`}</p>
            </div>
            <button onClick={() => openPdf(`/api/certificates/${cert.id}/certificate.pdf`)}
              className="text-sm text-teal-600 hover:underline">Print PDF</button>
          </div>
        ))}
      </div>

      {showConsult && (
        <ConsultForm patientId={p.id} onClose={() => setShowConsult(false)}
          onSaved={() => { setShowConsult(false); load(); }} />
      )}
      {showCert && (
        <CertForm patientId={p.id} onClose={() => setShowCert(false)}
          onSaved={() => { setShowCert(false); load(); }} />
      )}
    </div>
  );
}

function CertForm({ patientId, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ date: today, diagnosis: "", rest_days: "", remarks: "" });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function save() {
    await api.createCertificate({ patient_id: patientId, ...f });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">New medical certificate</h2>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>
        <div className="space-y-3">
          <label className="block"><span className="text-sm text-slate-600">Date</span>
            <input type="date" value={f.date} onChange={set("date")}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
          <label className="block"><span className="text-sm text-slate-600">Diagnosis</span>
            <input value={f.diagnosis} onChange={set("diagnosis")}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
          <label className="block"><span className="text-sm text-slate-600">Recommended rest period</span>
            <input value={f.rest_days} onChange={set("rest_days")} placeholder="e.g. 3 days"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
          <label className="block"><span className="text-sm text-slate-600">Remarks</span>
            <textarea value={f.remarks} onChange={set("remarks")} rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
        </div>
        <button onClick={save}
          className="mt-4 w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium">
          Save certificate
        </button>
      </div>
    </div>
  );
}

function Info({ label, v, alert }) {
  return (
    <p><span className="text-slate-400">{label}: </span>
      <span className={alert && v ? "text-red-600 font-medium" : ""}>{v || "—"}</span></p>
  );
}

function ConsultForm({ patientId, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ date: today, chief_complaint: "", vitals: "", diagnosis: "", treatment: "", notes: "", follow_up: "" });
  const [rx, setRx] = useState([{ medication: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setRxField = (i, k) => (e) => setRx((arr) => arr.map((r, j) => j === i ? { ...r, [k]: e.target.value } : r));

  async function save() {
    await api.createConsultation({ patient_id: patientId, ...f, prescriptions: rx.filter((r) => r.medication.trim()) });
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold">New consultation</h2>
          <button onClick={onClose} className="text-slate-400">✕</button>
        </div>
        <div className="space-y-3">
          <T label="Date" type="date" v={f.date} on={set("date")} />
          <T label="Chief complaint" v={f.chief_complaint} on={set("chief_complaint")} />
          <T label="Vital signs" v={f.vitals} on={set("vitals")} />
          <T label="Diagnosis" v={f.diagnosis} on={set("diagnosis")} />
          <T label="Treatment plan" v={f.treatment} on={set("treatment")} area />
          <T label="Follow-up date" type="date" v={f.follow_up} on={set("follow_up")} />
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Prescriptions</p>
            {rx.map((r, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 mb-2">
                <input placeholder="Medication" value={r.medication} onChange={setRxField(i, "medication")}
                  className="px-3 py-2 rounded-lg border border-slate-200 col-span-2" />
                <input placeholder="Dosage" value={r.dosage} onChange={setRxField(i, "dosage")}
                  className="px-3 py-2 rounded-lg border border-slate-200" />
                <input placeholder="Frequency" value={r.frequency} onChange={setRxField(i, "frequency")}
                  className="px-3 py-2 rounded-lg border border-slate-200" />
                <input placeholder="Duration" value={r.duration} onChange={setRxField(i, "duration")}
                  className="px-3 py-2 rounded-lg border border-slate-200" />
                <input placeholder="Instructions" value={r.instructions} onChange={setRxField(i, "instructions")}
                  className="px-3 py-2 rounded-lg border border-slate-200" />
              </div>
            ))}
            <button onClick={() => setRx((a) => [...a, { medication: "", dosage: "", frequency: "", duration: "", instructions: "" }])}
              className="text-sm text-teal-600 hover:underline">+ Add medication</button>
          </div>
        </div>
        <button onClick={save}
          className="mt-4 w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium">
          Save consultation
        </button>
      </div>
    </div>
  );
}

function T({ label, v, on, type = "text", area }) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">{label}</span>
      {area
        ? <textarea value={v} onChange={on} rows={3}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        : <input type={type} value={v} onChange={on}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />}
    </label>
  );
}
