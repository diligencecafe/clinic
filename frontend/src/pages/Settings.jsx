import { useEffect, useState } from "react";
import { api } from "../api";

const FIELDS = [
  ["clinic_name", "Clinic name"],
  ["clinic_address", "Clinic address"],
  ["clinic_contact", "Contact (phone / email)"],
  ["doctor_name", "Doctor name"],
  ["license_no", "PRC license number"],
];

export default function Settings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { api.settings().then(setForm).catch((e) => setErr(e.message)); }, []);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false); };

  async function save() {
    setErr(""); setSaved(false);
    try { const r = await api.saveSettings(form); setForm(r); setSaved(true); }
    catch (e) { setErr(e.message); }
  }

  if (err) return <p className="text-red-600">{err}</p>;
  if (!form) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-1">Clinic settings</h1>
      <p className="text-sm text-slate-500 mb-5">
        These details appear on your printed prescriptions and medical certificates.
      </p>
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        {FIELDS.map(([key, label]) => (
          <label key={key} className="block">
            <span className="text-sm text-slate-600">{label}</span>
            <input value={form[key] || ""} onChange={set(key)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </label>
        ))}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={save}
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg font-medium">
            Save settings
          </button>
          {saved && <span className="text-sm text-green-600">Saved ✓</span>}
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-4">
        A clinic logo can be added once you move to paid hosting with permanent file storage.
      </p>
    </div>
  );
}
