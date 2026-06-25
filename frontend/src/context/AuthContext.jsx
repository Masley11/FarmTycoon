import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authLogin, authMe, authSignup, getToken, setToken } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]             = useState(null);
  const [hasCompany, setHasCompany] = useState(false);
  const [loading, setLoading]       = useState(true);

  const bootstrap = useCallback(async () => {
    if (!getToken()) { setUser(null); setHasCompany(false); setLoading(false); return; }
    try {
      const me = await authMe();
      setUser(me.user);
      setHasCompany(!!me.has_company);
    } catch {
      setToken(null);
      setUser(null);
      setHasCompany(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const login = async (email, password) => {
    const r = await authLogin(email, password);
    setToken(r.token);
    setUser(r.user);
    setHasCompany(!!r.has_company);
    return r;
  };

  const signup = async (email, password) => {
    const r = await authSignup(email, password);
    setToken(r.token);
    setUser(r.user);
    setHasCompany(!!r.has_company);
    return r;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setHasCompany(false);
  };

  const markHasCompany = (v) => setHasCompany(!!v);
  const refreshMe      = bootstrap;

  return (
    <AuthContext.Provider value={{ user, hasCompany, loading, login, signup, logout, markHasCompany, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
};
