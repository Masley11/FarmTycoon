import { Brand } from "./Brand";
import { Wallet, Calendar, Cloud, Sun, CloudRain, Zap, ThermometerSun, Loader2, Trophy, Sparkles } from "lucide-react";
import { useGame } from "@/context/GameContext";

const WEATHER_ICONS = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  storm: Zap,
  drought: ThermometerSun,
};

const WEATHER_LABELS = {
  sunny: "Ensoleillé",
  cloudy: "Nuageux",
  rainy: "Pluie",
  storm: "Tempête",
  drought: "Sécheresse",
};

const fmtCurrency = (v) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

export function Topbar() {
  const { data, loading } = useGame();
  const state = data?.state;
  const cond = state?.weather?.condition || "sunny";
  const WIcon = WEATHER_ICONS[cond] || Sun;

  return (
    <header
      data-testid="topbar"
      className="sticky top-0 z-30 border-b border-stone-200/70 bg-white/70 backdrop-blur-xl backdrop-saturate-150"
    >
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 lg:px-8 py-3">
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="hidden lg:block">
          <div className="text-xs uppercase tracking-[0.16em] text-stone-500 font-medium">
            Plateforme de gestion agricole
          </div>
          <div className="font-display text-xl font-semibold text-stone-900 tracking-tight">
            Bonjour, exploitant
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {loading && !state ? (
            <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
          ) : (
            <>
              <div
                data-testid="topbar-weather"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200"
              >
                <WIcon className="h-4 w-4 text-amber-700" strokeWidth={1.7} />
                <span className="text-xs font-medium text-stone-700">
                  {WEATHER_LABELS[cond]} · {state?.weather?.temperature_c ?? "—"}°C
                </span>
              </div>
              <div
                data-testid="topbar-level"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200"
              >
                <Trophy className="h-4 w-4 text-emerald-800" strokeWidth={1.7} />
                <span className="text-xs font-semibold text-stone-700">
                  Niv. {data?.level?.level ?? 1}
                  <span className="text-stone-400 font-normal ml-1">· {data?.level?.xp ?? 0} XP</span>
                </span>
              </div>
              {(state?.premium_credits || 0) > 0 && (
                <div
                  data-testid="topbar-credits"
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200"
                >
                  <Sparkles className="h-4 w-4 text-amber-700" strokeWidth={1.7} />
                  <span className="text-xs font-semibold text-amber-900">{state?.premium_credits ?? 0}</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200" data-testid="topbar-day">
                <Calendar className="h-4 w-4 text-stone-600" strokeWidth={1.7} />
                <span className="text-xs font-medium text-stone-700">Jour {state?.day}</span>
              </div>
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-800 text-white shadow-sm"
                data-testid="topbar-cash"
              >
                <Wallet className="h-4 w-4" strokeWidth={1.7} />
                <span className="text-sm font-semibold tracking-tight">
                  {fmtCurrency(state?.cash)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
