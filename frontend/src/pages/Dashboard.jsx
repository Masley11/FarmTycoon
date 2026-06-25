import { useGame } from "@/context/GameContext";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { FarmMap } from "@/components/dashboard/FarmMap";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { MissionsPanel } from "@/components/missions/MissionsPanel";
import { Wallet, Sprout, Map, TrendingUp, Droplets, Fuel, Loader2, Star, ChevronRight, Lock } from "lucide-react";

const fmtCurrency = (v) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

const HERO_IMG =
  "https://images.unsplash.com/photo-1763416160482-c77fadd32d3f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBmYXJtJTIwdHJhY3RvcnxlbnwwfHx8fDE3Nzg2MzM1ODh8MA&ixlib=rb-4.1.0&q=85";

// Couleurs par saison
const SEASON_STYLES = {
  spring: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-400/30" },
  summer: { bg: "bg-amber-500/20",   text: "text-amber-300",   border: "border-amber-400/30" },
  autumn: { bg: "bg-orange-500/20",  text: "text-orange-300",  border: "border-orange-400/30" },
  winter: { bg: "bg-blue-500/20",    text: "text-blue-300",    border: "border-blue-400/30" },
};

// Badge niveau
function LevelBadge({ level }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-400/30">
      <Star className="h-3.5 w-3.5 text-amber-300" strokeWidth={2} />
      <span className="text-xs font-bold text-amber-300">Niv. {level}</span>
    </div>
  );
}

// Barre XP
function XpBar({ level, progress_pct, xp_to_next }) {
  return (
    <div className="flex items-center gap-3 mt-3">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-700"
          style={{ width: `${progress_pct}%` }}
        />
      </div>
      <span className="text-[10px] text-stone-400 whitespace-nowrap">
        {xp_to_next} XP → Niv. {level + 1}
      </span>
    </div>
  );
}

// Badge saison
function SeasonBadge({ season }) {
  if (!season) return null;
  const style = SEASON_STYLES[season.season_key] || SEASON_STYLES.spring;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${style.bg} ${style.border}`}>
      <span className="text-sm">{season.season_icon}</span>
      <span className={`text-xs font-semibold ${style.text}`}>{season.display}</span>
    </div>
  );
}

// Prochain déverrouillage
function NextUnlockBanner({ nextUnlock }) {
  if (!nextUnlock) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
      <Lock className="h-3.5 w-3.5 text-stone-400 flex-shrink-0" strokeWidth={1.8} />
      <span className="text-xs text-stone-300">
        Prochain déverrouillage — <strong className="text-white">Niv. {nextUnlock.level}</strong> : {nextUnlock.desc}
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-stone-500 ml-auto flex-shrink-0" strokeWidth={1.8} />
    </div>
  );
}

export default function Dashboard() {
  const { data, loading } = useGame();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-stone-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Chargement de l'exploitation…
      </div>
    );
  }

  const state   = data?.state   || {};
  const parcels = data?.parcels || [];
  const level   = data?.level   || {};
  const season  = data?.season  || null;

  const owned      = parcels.filter((p) => p.owned);
  const ownedHa    = owned.reduce((s, p) => s + (p.size_ha || 0), 0);
  const activeCrops = owned.filter((p) => p.crop_type).length;

  const inventoryTotal = Object.values(state.inventory || {}).reduce(
    (s, v) => s + (typeof v === "number" ? v : 0), 0
  );

  const lastDay  = (state.history || []).slice(-1)[0];
  const revToday = lastDay?.revenue  || 0;
  const expToday = lastDay?.expenses || 0;
  const net      = revToday - expToday;

  // Alerte hiver
  const isWinter = season?.season_key === "winter";

  return (
    <div className="space-y-6 lg:space-y-8">

      {/* ── HERO ── */}
      <section
        data-testid="dashboard-hero"
        className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-900 text-white"
      >
        <img
          src={HERO_IMG}
          alt="Exploitation agricole"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/85 via-stone-900/60 to-transparent" />

        <div className="relative p-6 md:p-10 lg:p-12">
          <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300 font-medium">
            FarmTycoon — Agricultural Management Platform
          </div>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mt-3 max-w-2xl leading-tight">
            Pilotez votre exploitation comme une véritable entreprise agricole.
          </h1>

          {/* Saison + niveau */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {season && <SeasonBadge season={season} />}
            <LevelBadge level={level.level || 1} />
          </div>

          {/* Barre XP */}
          {level.level > 0 && (
            <XpBar
              level={level.level}
              progress_pct={level.progress_pct || 0}
              xp_to_next={level.xp_to_next || 0}
            />
          )}

          {/* Infos exploitation */}
          <p className="mt-4 text-sm md:text-base text-stone-300 max-w-xl leading-relaxed">
            {owned.length} parcelle{owned.length > 1 ? "s" : ""} active{owned.length > 1 ? "s" : ""} ·{" "}
            <strong className="text-white">{ownedHa.toFixed(1)} ha</strong> sous gestion
            {isWinter && (
              <span className="ml-2 text-blue-300 text-xs font-medium">
                ❄️ Hiver — rendements -30%
              </span>
            )}
          </p>

          {/* Trésorerie */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/20 backdrop-blur-md">
              <Wallet className="h-4 w-4 text-emerald-300" strokeWidth={1.7} />
              <span className="text-sm font-semibold">{fmtCurrency(state.cash)}</span>
              <span className="text-xs text-stone-300 ml-1">trésorerie</span>
            </div>
          </div>

          {/* Prochain déverrouillage */}
          {level.next_unlock && (
            <div className="mt-4 max-w-md">
              <NextUnlockBanner nextUnlock={level.next_unlock} />
            </div>
          )}
        </div>
      </section>

      {/* ── KPIs ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard
          label="Trésorerie"
          value={fmtCurrency(state.cash)}
          sublabel={`Net ${net >= 0 ? "+" : ""}${fmtCurrency(net)} aujourd'hui`}
          trend={net >= 0 ? "up" : "down"}
          icon={Wallet}
          accent="emerald"
          testId="kpi-cash"
        />
        <KpiCard
          label="Surface gérée"
          value={`${ownedHa.toFixed(1)} ha`}
          sublabel={`${owned.length} parcelle${owned.length > 1 ? "s" : ""}`}
          icon={Map}
          accent="stone"
          testId="kpi-land"
        />
        <KpiCard
          label="Cultures actives"
          value={activeCrops}
          sublabel={`${owned.length - activeCrops} en jachère`}
          icon={Sprout}
          accent="emerald"
          testId="kpi-crops"
        />
        <KpiCard
          label="Stock récolté"
          value={`${inventoryTotal.toFixed(1)} t`}
          sublabel="Toutes cultures confondues"
          icon={TrendingUp}
          accent="amber"
          testId="kpi-inventory"
        />
      </section>

      {/* ── CHARTS & WEATHER ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2"><RevenueChart history={state.history} /></div>
        <WeatherWidget weather={state.weather} />
      </section>

      {/* ── RESSOURCES ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Eau"         value={`${Math.round(state.water       ?? 0)} m³`}  icon={Droplets}    accent="blue"       testId="kpi-water" />
        <KpiCard label="Carburant"   value={`${Math.round(state.fuel        ?? 0)} L`}   icon={Fuel}        accent="terracotta" testId="kpi-fuel" />
        <KpiCard label="Électricité" value={`${Math.round(state.electricity ?? 0)} kWh`} icon={TrendingUp}  accent="amber"      testId="kpi-electricity" />
        <KpiCard label="Herbicide"   value={`${Math.round(state.herbicide   ?? 0)} L`}   icon={Sprout}      accent="stone"      testId="kpi-herbicide" />
      </section>

      {/* ── CARTE + ALERTES ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2"><FarmMap parcels={parcels} /></div>
        <AlertsPanel alerts={data?.alerts} />
      </section>

      {/* ── MISSIONS + ACTIVITÉ ── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2"><MissionsPanel compact max={3} /></div>
        <ActivityFeed items={data?.activity} />
      </section>

    </div>
  );
}
