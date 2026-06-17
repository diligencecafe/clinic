import { useEffect, useState } from "react";
import { api } from "../api";

function Stat({ label, value, accent }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${accent || ""}`}>{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => { api.dashboard().then(setD).catch((e) => setErr(e.message)); }, []);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!d) return <p className="text-slate-400">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <Stat label="Total patients" value={d.total_patients} />
        <Stat label="Today's appointments" value={d.todays_appointments} />
        <Stat label="Upcoming" value={d.upcoming_appointments} />
        <Stat label="Monthly revenue" value={`₱${d.monthly_revenue.toLocaleString()}`} accent="text-teal-600" />
        <Stat label="Unpaid invoices" value={d.unpaid_invoices} accent="text-red-600" />
      </div>
      <h2 className="font-semibold mb-2">Recent consultations</h2>
      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
        {d.recent_consultations.length === 0 && <p className="p-4 text-slate-400 text-sm">None yet.</p>}
        {d.recent_consultations.map((c) => (
          <div key={c.id} className="p-3 flex justify-between text-sm">
            <span className="font-medium">{c.patient}</span>
            <span className="text-slate-500">{c.diagnosis || "—"}</span>
            <span className="text-slate-400">{c.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
