import { useEffect, useState } from "react";
import { api } from "../api";

const SERVICES = ["Consultation", "Follow-up Consultation", "Medical Certificate", "Procedure", "Other"];
const METHODS = ["Cash", "GCash", "Bank Transfer", "Credit Card"];
const statusColor = {
  Unpaid: "bg-red-100 text-red-700", Partial: "bg-amber-100 text-amber-700", Paid: "bg-green-100 text-green-700",
};

export default function Billing() {
  const [list, setList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [show, setShow] = useState(false);
  const [payFor, setPayFor] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ patient_id: "", date: today, service: "Consultation", amount: "", discount: "" });
  const [pay, setPay] = useState({ amount: "", method: "Cash" });

  function load() { api.invoices().then(setList); }
  useEffect(() => { load(); api.patients().then(setPatients); }, []);

  async function save() {
    if (!f.patient_id) return;
    await api.createInvoice({ ...f, patient_id: Number(f.patient_id), amount: Number(f.amount || 0), discount: Number(f.discount || 0) });
    setShow(false); setF({ patient_id: "", date: today, service: "Consultation", amount: "", discount: "" }); load();
  }
  async function submitPay() {
    await api.payInvoice(payFor.id, { amount: Number(pay.amount || 0), method: pay.method });
    setPayFor(null); setPay({ amount: "", method: "Cash" }); load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Billing</h1>
        <button onClick={() => setShow(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium">+ New invoice</button>
      </div>
      <div className="grid gap-2">
        {list.map((i) => (
          <div key={i.id} className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-medium">{i.patient_name} <span className="text-slate-400 font-normal">#{i.id}</span></p>
              <p className="text-sm text-slate-500">{i.service} · ₱{i.amount.toLocaleString()}{i.discount > 0 && ` − ₱${i.discount}`} · {i.date}</p>
              {i.balance > 0 && <p className="text-sm text-red-600">Balance: ₱{i.balance.toLocaleString()}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs rounded-full px-2.5 py-1 ${statusColor[i.status]}`}>{i.status}</span>
              {i.status !== "Paid" && (
                <button onClick={() => { setPayFor(i); setPay({ amount: String(i.balance), method: "Cash" }); }}
                  className="text-sm text-teal-600 hover:underline">Record payment</button>
              )}
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">No invoices.</p>}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">New invoice</h2><button onClick={() => setShow(false)} className="text-slate-400">✕</button>
            </div>
            <label className="block mb-3"><span className="text-sm text-slate-600">Patient</span>
              <select value={f.patient_id} onChange={(e) => setF({ ...f, patient_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200">
                <option value="">Select…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select></label>
            <label className="block mb-3"><span className="text-sm text-slate-600">Service</span>
              <select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200">
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select></label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="block"><span className="text-sm text-slate-600">Amount (₱)</span>
                <input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
              <label className="block"><span className="text-sm text-slate-600">Discount (₱)</span>
                <input type="number" value={f.discount} onChange={(e) => setF({ ...f, discount: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
            </div>
            <button onClick={save} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium">Create</button>
          </div>
        </div>
      )}

      {payFor && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-30 sm:p-4">
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Record payment</h2><button onClick={() => setPayFor(null)} className="text-slate-400">✕</button>
            </div>
            <p className="text-sm text-slate-500 mb-3">{payFor.patient_name} · balance ₱{payFor.balance.toLocaleString()}</p>
            <label className="block mb-3"><span className="text-sm text-slate-600">Amount (₱)</span>
              <input type="number" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
            <label className="block mb-4"><span className="text-sm text-slate-600">Method</span>
              <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200">
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select></label>
            <button onClick={submitPay} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium">Save payment</button>
          </div>
        </div>
      )}
    </div>
  );
}
