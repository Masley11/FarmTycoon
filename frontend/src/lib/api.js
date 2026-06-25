import axios from "axios";
import { toast } from "sonner";

// ✅ Utilise une URL relative — fonctionne sur Vercel et en local
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
export const API = `${BACKEND_URL}/api`;
export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Token JWT (localStorage) ─────────────────────────────────────────────────
const TOKEN_KEY = "ft_token";
export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (t) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
};

// Injecte le token Bearer sur chaque requête
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// Intercepteur global d'erreurs — silencieux pour les GET de polling,
// toast pour les actions utilisateur (POST/PUT/DELETE).
let lastErrorAt = 0;
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const method = (error.config?.method || "get").toLowerCase();
    const isMutation = method !== "get";

    // 401 → token invalide/expiré : on déconnecte et on renvoie au login
    if (status === 401) {
      setToken(null);
      if (typeof window !== "undefined" && !/\/(login|signup)$/.test(window.location.pathname)) {
        window.location.assign("/login");
      }
      return Promise.reject(error);
    }

    // 409 = "pas d'entreprise" → géré par AuthContext (redirection onboarding)
    if (status === 409) return Promise.reject(error);

    const now = Date.now();
    if (isMutation && now - lastErrorAt > 1500) {
      lastErrorAt = now;
      const msg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        (error.code === "ECONNABORTED" ? "Délai dépassé — réessayez." : "Erreur réseau");
      toast.error(msg);
    }
    return Promise.reject(error);
  }
);

// Auth ----------------------------------------------------------------
export const authSignup = (email, password) =>
  api.post("/auth/signup", { email, password }).then((r) => r.data);
export const authLogin = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);
export const authMe = () => api.get("/auth/me").then((r) => r.data);

// Company -------------------------------------------------------------
export const createCompany = (name, specialization) =>
  api.post("/company", { name, specialization }).then((r) => r.data);
export const deleteCompany = (confirm) =>
  api.delete("/company", { data: { confirm } }).then((r) => r.data);

// Game ----------------------------------------------------------------
export const fetchGameState = () => api.get("/game/state").then((r) => r.data);
export const forceTick = () => api.post("/game/tick").then((r) => r.data);
export const resetGame = () => api.post("/game/reset").then((r) => r.data);

// Parcels -------------------------------------------------------------
export const buyParcel = (id) =>
  api.post(`/parcels/${id}/buy`).then((r) => r.data);
export const plantCrop = (id, crop_type) =>
  api.post(`/parcels/${id}/plant`, { crop_type }).then((r) => r.data);
export const harvestParcel = (id) =>
  api.post(`/parcels/${id}/harvest`).then((r) => r.data);
export const irrigateParcel = (id) =>
  api.post(`/parcels/${id}/irrigate`).then((r) => r.data);
export const fertilizeParcel = (id, type) =>
  api.post(`/parcels/${id}/fertilize`, { type }).then((r) => r.data);
export const herbicideParcel = (id) =>
  api.post(`/parcels/${id}/herbicide`).then((r) => r.data);

// Resources / market --------------------------------------------------
export const buyResource = (resource, packs) =>
  api.post(`/resources/buy`, { resource, packs }).then((r) => r.data);
export const sellInventory = (crop, qty) =>
  api.post(`/market/sell`, { crop, qty }).then((r) => r.data);
export const fulfillContract = (id) =>
  api.post(`/contracts/${id}/fulfill`).then((r) => r.data);

// Livestock -----------------------------------------------------------
export const buyLivestock = (type, count) =>
  api.post(`/livestock/buy`, { type, count }).then((r) => r.data);
export const vetLivestock = (id) =>
  api.post(`/livestock/${id}/vet`).then((r) => r.data);
export const sellLivestock = (id, count) =>
  api.post(`/livestock/${id}/sell`, { count }).then((r) => r.data);

// Vehicles ------------------------------------------------------------
export const buyVehicle = (type) =>
  api.post(`/vehicles/buy`, { type }).then((r) => r.data);
export const repairVehicle = (id) =>
  api.post(`/vehicles/${id}/repair`).then((r) => r.data);
export const sellVehicle = (id) =>
  api.post(`/vehicles/${id}/sell`).then((r) => r.data);

// Employees -----------------------------------------------------------
export const hireEmployee = (role) =>
  api.post(`/employees/hire`, { role }).then((r) => r.data);
export const fireEmployee = (id) =>
  api.post(`/employees/${id}/fire`).then((r) => r.data);

// Upgrades ------------------------------------------------------------
export const buyUpgrade = (key) =>
  api.post(`/upgrades/buy`, { key }).then((r) => r.data);

// Premium -------------------------------------------------------------
export const getPremiumStatus = () =>
  api.get("/premium/status").then((r) => r.data);
export const subscribePremium = () =>
  api.post("/premium/subscribe").then((r) => r.data);
