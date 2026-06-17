const BASE = "/api";

export function getToken() { return localStorage.getItem("token"); }
export function setToken(t) { localStorage.setItem("token", t); }
export function clearToken() { localStorage.removeItem("token"); }

async function req(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
  if (res.status === 401) { clearToken(); window.location.href = "/login"; throw new Error("Unauthorized"); }
  if (!res.ok) {
    let msg = "Request failed";
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res;
}

export const api = {
  login: (b) => req("/login", { method: "POST", body: JSON.stringify(b) }),
  me: () => req("/me"),
  dashboard: () => req("/dashboard"),
  patients: (q = "") => req(`/patients?q=${encodeURIComponent(q)}`),
  patient: (id) => req(`/patients/${id}`),
  createPatient: (b) => req("/patients", { method: "POST", body: JSON.stringify(b) }),
  updatePatient: (id, b) => req(`/patients/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  archivePatient: (id) => req(`/patients/${id}/archive`, { method: "POST" }),
  appointments: () => req("/appointments"),
  createAppointment: (b) => req("/appointments", { method: "POST", body: JSON.stringify(b) }),
  updateAppointment: (id, b) => req(`/appointments/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  createConsultation: (b) => req("/consultations", { method: "POST", body: JSON.stringify(b) }),
  invoices: () => req("/invoices"),
  createInvoice: (b) => req("/invoices", { method: "POST", body: JSON.stringify(b) }),
  payInvoice: (id, b) => req(`/invoices/${id}/pay`, { method: "POST", body: JSON.stringify(b) }),
  settings: () => req("/settings"),
  saveSettings: (b) => req("/settings", { method: "PUT", body: JSON.stringify(b) }),
  createCertificate: (b) => req("/certificates", { method: "POST", body: JSON.stringify(b) }),
  reports: () => req("/reports"),
};
