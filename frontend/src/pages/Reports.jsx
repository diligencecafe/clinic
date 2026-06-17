import { useEffect, useState } from "react";
import { api } from "../api";

function Card({ label, value, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent || ""}`}>{value}</p>
    </div>
  );
}

export default function Reports() {
  const [r, setR] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { api.reports().then(setR).catch((e) => setErr(e.message)); }, []);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!r) return <p className="text-slate-400">Loading…</p>;
  const peso = (n) => `₱${(n || 0).toLocaleString()}`;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Reports</h1>

      <h2 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-2">Patients</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Card label="Total patients" value={r.total_patients} />
        <Card label="New this month" value={r.new_patients_this_month} accent="text-teal-600" />
      </div>

      <h2 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-2">Appointments</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Card label="Today" value={r.appointments_today} />
        <Card label="This month" value={r.appointments_this_month} />
      </div>

      <h2 className="font-semibold text-sm text-slate-500 uppercase tracking-wide mb-2">Revenue</h2>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Card label="Today" value={peso(r.revenue_today)} accent="text-teal-600" />
        <Card label="This month" value={peso(r.revenue_this_month)} accent="text-teal-600" />
        <Card label="Outstanding balance" value={peso(r.outstanding_balance)} accent="text-red-600" />
      </div>
    </div>
  );
}
