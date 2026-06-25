import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Loader2, Droplets, Fuel, Zap, Beaker, Bug, Plus, Minus } from "lucide-react";
import { buyResource } from "@/lib/api";
import { toast } from "sonner";

const fmtCur = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(v ?? 0);

const ICONS = {
  water: Droplets,
  fuel: Fuel,
  electricity: Zap,
  fertilizer_chemical: Beaker,
  fertilizer_bio: Beaker,
  fertilizer_premium: Beaker,
  herbicide: Bug,
};

const ACCENT = {
  water: "text-blue-700 bg-blue-50",
  fuel: "text-orange-700 bg-orange-50",
  electricity: "text-amber-700 bg-amber-50",
  fertilizer_chemical: "text-emerald-700 bg-emerald-50",
  fertilizer_bio: "text-emerald-700 bg-emerald-50",
  fertilizer_premium: "text-violet-700 bg-violet-50",
  herbicide: "text-stone-700 bg-stone-100",
};

export default function Resources() {
  const { data, refresh, loading } = useGame();
  const [packs, setPacks] = useState({});
  const [busy, setBusy] = useState(null);

  if (loading && !data) return (
    <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>
  );

  // ✅ Structure réelle : data.catalog.resources, data.resource_prices, data.state pour les stocks
  const catalog = data?.catalog?.resources || {};
  const prices = data?.resource_prices || {};
  const state = data?.state || {};

  const setQty = (k, n) => setPacks((p) => ({ ...p, [k]: Math.max(1, n) }));

  const handleBuy = async (key) => {
    const n = packs[key] || 1;
    setBusy(key);
    try {
      const res = await buyResource(key, n);
      toast.success(`+${res.added_qty} ${catalog[key]?.unit} acquis`);
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Achat impossible");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Module ressources</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Approvisionnement
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Achetez l'eau, le carburant, l'électricité, les engrais et les herbicides nécessaires aux opérations. Les prix fluctuent selon la météo et les conditions du marché.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Object.entries(catalog).map(([key, r]) => {
          const Icon = ICONS[key] || Beaker;
          const accent = ACCENT[key] || "text-stone-700 bg-stone-100";
          const unitPrice = prices[key] ?? 0;
          const n = packs[key] || 1;
          const totalQty = r.pack * n;
          const totalCost = unitPrice * totalQty;
          // ✅ Les stocks sont dans data.state directement (water, fuel, electricity, etc.)
          const current = state[key] ?? 0;
          const cash = state.cash ?? 0;

          return (
            <div key={key} data-testid={`resource-card-${key}`} className="solid-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="ft-label">{r.name}</span>
                  <div className="font-display text-2xl font-semibold text-stone-900 mt-1">
                    {Math.round(current)} <span className="text-sm text-stone-500 font-normal">{r.unit}</span>
                  </div>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accent}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-100">
                <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                  <span>Prix marché</span>
                  <span className="font-medium text-stone-900">{fmtCur(unitPrice)}/{r.unit}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-500 mb-3">
                  <span>Packs ({r.pack} {r.unit}/pack)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(key, n - 1)} data-testid={`dec-${key}`}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <div className="flex-1 text-center font-display font-semibold text-stone-900">{n}</div>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setQty(key, n + 1)} data-testid={`inc-${key}`}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-stone-500">Total {totalQty} {r.unit}</span>
                  <span className="font-semibold text-stone-900">{fmtCur(totalCost)}</span>
                </div>
                <Button
                  className="w-full mt-3 bg-emerald-800 hover:bg-emerald-700"
                  onClick={() => handleBuy(key)}
                  disabled={busy === key || totalCost > cash}
                  data-testid={`buy-${key}`}
                >
                  {busy === key ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Acheter
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
