import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const blank = {
  first_name: "", middle_name: "", last_name: "", dob: "", gender: "",
  address: "", contact: "", email: "", emergency_name: "", emergency_contact: "",
  blood_type: "", allergies: "", medications: "", medical_history: "", notes: "",
};

function age(dob) {
  if (!dob) return "—";
  const b = new Date(dob), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

export default function Patients() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(blank);
  const [err, setErr] = useState("");

  function load() { api.patients(q).then(setList).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, [q]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save() {
    setErr("");
    try { await api.createPatient(form); setShow(false); setForm(blank); load(); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-xl font-semibold">Patients</h1>
        <button onClick={() => { setForm(blank); setShow(true); }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + New patient
        </button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or contact"
        className="w-full mb-4 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      <div className="grid gap-2">
        {list.map((p) => (
          <Link key={p.id} to={`/patients/${p.id}`}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:border-teal-400 flex justify-between items-center">
            <div>
              <p className="font-medium">{p.first_name} {p.last_name}</p>
              <p className="text-sm text-slate-500">{p.gender || "—"} · {age(p.dob)} yrs · {p.contact || "no contact"}</p>
            </div>
            <span className="text-slate-300">›</span>
          </Link>
        ))}
        {list.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">No patients found.</p>}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">New patient</h2>
              <button onClick={() => setShow(false)} className="text-slate-400">✕</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <F label="First name *" v={form.first_name} on={set("first_name")} />
              <F label="Last name *" v={form.last_name} on={set("last_name")} />
              <F label="Middle name" v={form.middle_name} on={set("middle_name")} />
              <F label="Date of birth" type="date" v={form.dob} on={set("dob")} />
              <label className="block">
                <span className="text-sm text-slate-600">Gender</span>
                <select value={form.gender} onChange={set("gender")}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200">
                  <option value="">—</option><option>Female</option><option>Male</option><option>Other</option>
                </select>
              </label>
              <F label="Contact number" v={form.contact} on={set("contact")} />
              <F label="Email" v={form.email} on={set("email")} />
              <F label="Blood type" v={form.blood_type} on={set("blood_type")} />
              <F label="Address" v={form.address} on={set("address")} full />
              <F label="Emergency contact name" v={form.emergency_name} on={set("emergency_name")} />
              <F label="Emergency contact no." v={form.emergency_contact} on={set("emergency_contact")} />
              <F label="Allergies" v={form.allergies} on={set("allergies")} full />
              <F label="Current medications" v={form.medications} on={set("medications")} full />
              <F label="Medical history" v={form.medical_history} on={set("medical_history")} full />
            </div>
            <button onClick={save}
              className="mt-4 w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium">
              Save patient
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, v, on, type = "text", full }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm text-slate-600">{label}</span>
      <input type={type} value={v} onChange={on}
        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
    </label>
  );
}
