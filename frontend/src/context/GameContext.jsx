import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchGameState, getToken } from "@/lib/api";
import { claimMission } from "@/lib/missions";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const GameContext = createContext(null);

// Structure par défaut complète — jamais undefined
const DEFAULT_DATA = {
  state: {
    cash: 0, day: 1, water: 0, fuel: 0, electricity: 0,
    herbicide: 0, fertilizer_chemical: 0, fertilizer_bio: 0, fertilizer_premium: 0,
    inventory: {}, vehicles: [], livestock: [], employees: [], upgrades: [],
    weather: { condition: "sunny", temperature_c: 22, humidity: 55, wind_kmh: 8, drought_index: 0 },
    market_multipliers: {}, history: [], xp: 0, cosmetics: [],
    day_stats: {}, daily_missions: [], premium_credits: 0,
  },
  parcels:        [],
  alerts:         [],
  crop_prices:    {},
  resource_prices:{},
  contracts:      [],
  catalog:        { crops: {}, resources: {}, livestock: {}, livestock_products: {}, vehicles: {}, employee_roles: {}, upgrades: {} },
  missions:       [],
  level:          { level: 1, xp: 0, progress_pct: 0, xp_to_next: 100, next_unlock: null, unlocked: {} },
  season:         { year: 1, season_name: "Printemps", season_key: "spring", season_icon: "🌸", season_day: 1, display: "Année 1 — Printemps (Jour 1/30)", yield_mult: 1.1 },
  activity:       [],
  ticks_applied:  0,
};

export function GameProvider({ children }) {
  const { user, hasCompany, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData]       = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const lastTicksRef          = useRef(0);
  const claimingRef           = useRef(new Set()); // évite les double-claims

  // ── Auto-claim : dès qu'une mission est complétée, on la réclame ─────────
  const autoClaimMissions = useCallback(async (missions) => {
    if (!missions || missions.length === 0) return;
    const claimable = missions.filter(
      (m) => m.completed && !m.claimed && !claimingRef.current.has(m.instance_id)
    );
    if (claimable.length === 0) return;
    claimable.forEach((m) => claimingRef.current.add(m.instance_id));

    const results = await Promise.allSettled(
      claimable.map((m) => claimMission(m.instance_id).then((res) => ({ m, res })))
    );

    for (const r of results) {
      if (r.status !== "fulfilled") {
        // Libère le verrou pour permettre un nouvel essai au prochain refresh
        const failed = claimable[results.indexOf(r)];
        if (failed) claimingRef.current.delete(failed.instance_id);
        continue;
      }
      const { m, res } = r.value;
      const parts = [];
      if (res.rewards?.xp)      parts.push(`+${res.rewards.xp} XP`);
      if (res.rewards?.cash)    parts.push(`+${res.rewards.cash}€`);
      if (res.rewards?.credits) parts.push(`+${res.rewards.credits} crédits`);
      toast.success(`🎯 ${m.title} — ${parts.join(" · ")}`, { duration: 4000 });
      if (res.rewards?.cosmetic) {
        toast.success(`✦ Débloqué: ${res.rewards.cosmetic.name}`, { duration: 5000 });
      }
      if (res.level?.level > data.level?.level) {
        toast.success(
          `⭐ Niveau ${res.level.level} atteint ! ${res.level.next_unlock ? `Nouveau: ${res.level.next_unlock.desc}` : ""}`,
          { duration: 6000 }
        );
      }
    }
  }, [data.level]);

  // ── Refresh principal ─────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const res = await fetchGameState();
      if (!res || typeof res !== "object") return;

      // Merge profond pour garantir que toutes les clés existent
      const merged = {
        ...DEFAULT_DATA,
        ...res,
        state: {
          ...DEFAULT_DATA.state,
          ...(res.state || {}),
          inventory: { ...(res.state?.inventory || {}) },
          weather:   { ...DEFAULT_DATA.state.weather, ...(res.state?.weather || {}) },
        },
        catalog:  { ...DEFAULT_DATA.catalog,  ...(res.catalog  || {}) },
        level:    { ...DEFAULT_DATA.level,    ...(res.level    || {}) },
        season:   { ...DEFAULT_DATA.season,   ...(res.season   || {}) },
        missions: res.missions || res.state?.daily_missions || [],
      };

      setData(merged);
      setError(null);

      // Notification jours écoulés
      if (res.ticks_applied > 0 && lastTicksRef.current !== 0) {
        const si = merged.season;
        toast.info(`${si.season_icon} ${si.display}`, { duration: 3000 });
      }
      lastTicksRef.current = res.ticks_applied ?? 0;

      // Auto-claim missions complétées
      await autoClaimMissions(merged.missions);

    } catch (e) {
      console.error("GameContext refresh error:", e);
      setError(e.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }, [autoClaimMissions]);

  useEffect(() => {
    refresh();
    let id = setInterval(refresh, 8000);
    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(id);
      } else {
        refresh();
        id = setInterval(refresh, 8000);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  return (
    <GameContext.Provider value={{ data, loading, error, refresh }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame doit être utilisé à l'intérieur de GameProvider");
  return ctx;
};
    
