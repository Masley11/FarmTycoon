import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { buyUpgrade } from "@/lib/api";
import { toast } from "sonner";
import { Settings, Check, Loader2, Sparkles, Leaf, Warehouse, Beef, Wrench } from "lucide-react";

const fmtCur = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

const CAT_VIS = {
  field: { label: "Champs", icon: Leaf, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  warehouse: { label: "Entrepôts", icon: Warehouse, color: "text-stone-700 bg-stone-100 border-stone-200" },
  livestock: { label: "Élevage", icon: Beef, color: "text-orange-700 bg-orange-50 border-orange-200" },
  garage: { label: "Garage", icon: Wrench, color: "text-blue-700 bg-blue-50 border-blue-200" },
};

export default function Upgrades() {
  const { data, refresh, loading } = useGame();
  const [busy, setBusy] = useState(null);

  if (loading && !data) return <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>;

  const catalog = data.catalog.upgrades;
  const owned = new Set(data.state.upgrades || []);

  const handleBuy = async (key) => {
    setBusy(key);
    try { await buyUpgrade(key); toast.success(`Amélioration installée: ${catalog[key].name}`); await refresh(); }
    catch (e) { toast.error(e.response?.data?.detail || "Achat impossible"); }
    finally { setBusy(null); }
  };

  const byCat = Object.entries(catalog).reduce((acc, [k, v]) => {
    (acc[v.cat] ||= []).push([k, v]); return acc;
  }, {});

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Module amélioration</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Améliorations d'exploitation
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Achat unique, bonus permanents. Optimisez vos champs, entrepôts, élevage et véhicules pour gagner en efficacité.
        </p>
      </header>

      {Object.entries(byCat).map(([cat, items]) => {
        const vis = CAT_VIS[cat];
        const Icon = vis.icon;
        return (
          <section key={cat}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`h-9 w-9 rounded-lg border flex items-center justify-center ${vis.color}`}>
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </div>
              <h2 className="font-display text-lg font-semibold text-stone-900">{vis.label}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(([key, u]) => {
                const ok = owned.has(key);
                return (
                  <div key={key} data-testid={`upgrade-${key}`} className={`solid-card p-5 ${ok ? "bg-emerald-50/40 border-emerald-200" : ""}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-display text-base font-semibold text-stone-900">{u.name}</div>
                        <div className="text-xs text-stone-600 mt-1.5 leading-relaxed">{u.effect}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display text-lg font-semibold text-stone-900">{fmtCur(u.price)}</div>
                        <div className="text-[10px] text-stone-500 uppercase tracking-wide">unique</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-stone-100">
                      {ok ? (
                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 uppercase tracking-wide py-1.5">
                          <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                          Installée
                        </div>
                      ) : (
                        <Button onClick={() => handleBuy(key)} disabled={busy === key} size="sm" className="w-full bg-emerald-800 hover:bg-emerald-700" data-testid={`buy-upgrade-${key}`}>
                          {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.8} />}
                          Installer
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
