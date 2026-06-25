import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buyVehicle, repairVehicle, sellVehicle } from "@/lib/api";
import { toast } from "sonner";
import { Wrench, Truck, Loader2, ShoppingBag, AlertTriangle, Fuel, Activity } from "lucide-react";

const VEHICLE_IMG = {
  tractor_basic: "https://images.unsplash.com/photo-1763416160482-c77fadd32d3f?crop=entropy&cs=srgb&fm=jpg&q=85",
  tractor_premium: "https://images.unsplash.com/photo-1599577180589-0a306d72ed5d?auto=format&fit=crop&w=900&q=80",
  harvester: "https://images.unsplash.com/photo-1591086918211-e9d33b91d51d?auto=format&fit=crop&w=900&q=80",
  irrigation_rig: "https://images.unsplash.com/photo-1559521783-1d1599583485?auto=format&fit=crop&w=900&q=80",
};

const fmtCur = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

const STATUS_VIS = {
  working: { label: "En activité", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  idle: { label: "Au repos", color: "bg-stone-100 text-stone-700 border-stone-200" },
  broken: { label: "En panne", color: "bg-red-50 text-red-700 border-red-200" },
};

export default function Vehicles() {
  const { data, refresh, loading } = useGame();
  const [busy, setBusy] = useState(null);

  if (loading && !data?.state) return <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>;

  const catalog = data?.catalog?.vehicles || {};
  const vehicles = data?.state?.vehicles || [];

  const handle = async (fn, key, ...args) => {
    setBusy(key);
    try { await fn(...args); await refresh(); toast.success("Opération effectuée"); }
    catch (e) { toast.error(e.response?.data?.detail || "Action impossible"); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Module garage</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Véhicules & Garage
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Acquérez tracteurs, moissonneuses et systèmes d'irrigation. Suivez la condition, réparez les pannes et bénéficiez des bonus de rendement.
        </p>
      </header>

      <section>
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">
          Votre flotte <span className="text-stone-400 font-normal">({vehicles.length})</span>
        </h2>
        {vehicles.length === 0 ? (
          <div className="solid-card p-10 text-center text-sm text-stone-500">
            <Truck className="h-10 w-10 text-stone-400 mx-auto mb-3" strokeWidth={1.4} />
            Aucun véhicule. Vos opérations consomment quand même du carburant.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => {
              const cat = catalog?.[v.type] || { name: v.type || "Véhicule" };
              const stat = STATUS_VIS[v.status] || STATUS_VIS.idle;
              const broken = v.status === "broken";
              return (
                <div key={v.id} data-testid={`vehicle-${v.id}`} className="solid-card overflow-hidden">
                  <div className="relative h-32 bg-stone-200">
                    <img src={VEHICLE_IMG[v.type]} alt={cat?.name || "Véhicule"} loading="lazy" className="w-full h-full object-cover" />
                    <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${stat.color}`}>
                      <Activity className="h-3 w-3 mr-1 inline" strokeWidth={2} />
                      {stat.label}
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="font-display text-base font-semibold text-stone-900">{cat?.name || "Véhicule"}</div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-stone-500">Condition</span>
                        <span className="font-semibold text-stone-900">{v.condition ?? 0}%</span>
                      </div>
                      <Progress value={v.condition ?? 0} className="h-1.5" />
                    </div>
                    {broken && (
                      <div className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1.5 rounded-md">
                        <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />
                        Inutilisable jusqu'à réparation
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => handle(repairVehicle, `repair-${v.id}`, v.id)} disabled={busy === `repair-${v.id}` || v.condition === 100} data-testid={`repair-${v.id}`}>
                        <Wrench className="h-3.5 w-3.5 mr-1.5 text-blue-700" strokeWidth={1.8} />
                        Réparer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handle(sellVehicle, `sell-${v.id}`, v.id)} disabled={busy === `sell-${v.id}`} data-testid={`sell-vehicle-${v.id}`}>
                        Vendre
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Catalogue véhicules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(catalog).map(([key, cat]) => {
            const bonuses = [];
            if (cat?.bonus_growth) bonuses.push(`+${cat.bonus_growth}% croissance`);
            if (cat?.bonus_yield) bonuses.push(`+${cat.bonus_yield}% rendement`);
            if (cat?.bonus_water) bonuses.push(`-${cat.bonus_water}% eau`);
            return (
              <div key={key} className="solid-card overflow-hidden hover:-translate-y-[2px] transition-all">
                <div className="relative h-28 bg-stone-200">
                  <img src={VEHICLE_IMG[key]} alt={cat.name} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <div className="font-display text-base font-semibold text-stone-900">{cat?.name || key}</div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                    <Fuel className="h-3 w-3" strokeWidth={1.8} />
                    {cat?.fuel_per_day_active ?? 0} L/jour actif
                  </div>
                  {bonuses.length > 0 && (
                    <div className="mt-2 text-[10px] text-emerald-700 font-medium">{bonuses.join(" · ")}</div>
                  )}
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="font-display text-xl font-semibold text-stone-900">{fmtCur(cat?.buy_price)}</span>
                  </div>
                  <Button onClick={() => handle(buyVehicle, `buy-${key}`, key)} disabled={busy === `buy-${key}`} className="w-full mt-3 bg-stone-900 hover:bg-stone-800 text-white" size="sm" data-testid={`buy-vehicle-${key}`}>
                    <ShoppingBag className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.8} />
                    Acheter
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
