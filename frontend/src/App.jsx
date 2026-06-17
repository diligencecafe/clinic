import { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { api, getToken, setToken, clearToken } from "./api";
import Dashboard from "./pages/Dashboard.jsx";
import Patients from "./pages/Patients.jsx";
import PatientDetail from "./pages/PatientDetail.jsx";
import Appointments from "./pages/Appointments.jsx";
import Billing from "./pages/Billing.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function submit() {
    setErr("");
    try {
      const { token } = await api.login({ username, password });
      setToken(token);
      nav("/");
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm p-7">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">+</div>
          <h1 className="font-semibold text-lg">Clinic Management</h1>
        </div>
        <label className="block text-sm text-slate-600">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)}
          className="mt-1 mb-3 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <label className="block text-sm text-slate-600">Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mt-1 mb-4 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        <button onClick={submit}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-lg font-medium">
          Log in
        </button>
        <p className="text-xs text-slate-400 mt-4 text-center">Demo: admin / admin123</p>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const links = [
    ["/", "Dashboard"], ["/patients", "Patients"],
    ["/appointments", "Appointments"], ["/billing", "Billing"],
    ["/reports", "Reports"], ["/settings", "Settings"],
  ];
  function logout() { clearToken(); nav("/login"); }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center gap-3 max-w-6xl mx-auto">
          <button className="sm:hidden text-slate-500" onClick={() => setOpen(!open)}>☰</button>
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">+</div>
          <span className="font-semibold">Clinic</span>
          <nav className="hidden sm:flex gap-1 ml-4">
            {links.map(([to, label]) => (
              <Link key={to} to={to}
                className={`px-3 py-1.5 rounded-lg text-sm ${loc.pathname === to
                  ? "bg-teal-50 text-teal-700 font-medium" : "text-slate-600 hover:bg-slate-100"}`}>
                {label}
              </Link>
            ))}
          </nav>
          <button onClick={logout} className="ml-auto text-sm text-slate-500 hover:text-slate-800">Log out</button>
        </div>
        {open && (
          <nav className="sm:hidden border-t border-slate-200 px-4 py-2 flex flex-col">
            {links.map(([to, label]) => (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm ${loc.pathname === to
                  ? "bg-teal-50 text-teal-700 font-medium" : "text-slate-600"}`}>
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

function Protected({ children }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/patients" element={<Protected><Patients /></Protected>} />
      <Route path="/patients/:id" element={<Protected><PatientDetail /></Protected>} />
      <Route path="/appointments" element={<Protected><Appointments /></Protected>} />
      <Route path="/billing" element={<Protected><Billing /></Protected>} />
      <Route path="/reports" element={<Protected><Reports /></Protected>} />
      <Route path="/settings" element={<Protected><Settings /></Protected>} />
    </Routes>
  );
}
