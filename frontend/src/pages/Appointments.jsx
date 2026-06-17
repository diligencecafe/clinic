import { useEffect, useState } from "react";
import { api } from "../api";

const STATUSES = ["Scheduled", "Confirmed", "Completed", "Cancelled", "No Show"];
const statusColor = {
  Scheduled: "bg-slate-100 text-slate-700", Confirmed: "bg-teal-100 text-teal-700",
  Completed: "bg-green-100 text-green-700", Cancelled: "bg-red-100 text-red-700",
  "No Show": "bg-amber-100 text-amber-700",
};

export default function Appointments() {
  const [list, setList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [show, setShow] = useState(false);
  const [filter, setFilter] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ patient_id: "", date: today, time: "", reason: "", status: "Scheduled" });

  function load() { api.appointments().then(setList); }
  useEffect(() => { load(); api.patients().then(setPatients); }, []);

  async function save() {
    if (!f.patient_id) return;
    await api.createAppointment({ ...f, patient_id: Number(f.patient_id) });
    setShow(false); setF({ patient_id: "", date: today, time: "", reason: "", status: "Scheduled" });
    load();
  }
  async function changeStatus(a, status) { await api.updateAppointment(a.id, { status }); load(); }

  const shown = filter ? list.filter((a) => a.status === filter) : list;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <button onClick={() => setShow(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New</button>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter("")} className={`px-3 py-1 rounded-full text-sm ${!filter ? "bg-slate-800 text-white" : "bg-white border border-slate-200"}`}>All</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-sm ${filter === s ? "bg-slate-800 text-white" : "bg-white border border-slate-200"}`}>{s}</button>
        ))}
      </div>
      <div className="grid gap-2">
        {shown.map((a) => (
          <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{a.patient_name}</p>
              <p className="text-sm text-slate-500">{a.date} {a.time && `· ${a.time}`} {a.reason && `· ${a.reason}`}</p>
            </div>
            <select value={a.status} onChange={(e) => changeStatus(a, e.target.value)}
              className={`text-sm rounded-full px-3 py-1 border-0 ${statusColor[a.status]}`}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        ))}
        {shown.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">No appointments.</p>}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">New appointment</h2>
              <button onClick={() => setShow(false)} className="text-slate-400">✕</button>
            </div>
            <label className="block mb-3">
              <span className="text-sm text-slate-600">Patient</span>
              <select value={f.patient_id} onChange={(e) => setF({ ...f, patient_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200">
                <option value="">Select…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="block"><span className="text-sm text-slate-600">Date</span>
                <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
              <label className="block"><span className="text-sm text-slate-600">Time</span>
                <input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
            </div>
            <label className="block mb-4"><span className="text-sm text-slate-600">Reason</span>
              <input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
            <button onClick={save} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium">Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
