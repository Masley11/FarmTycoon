import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { buyLivestock, vetLivestock, sellLivestock } from "@/lib/api";
import { toast } from "sonner";
import { Beef, Heart, Loader2, ShoppingBag, Stethoscope, Trash2 } from "lucide-react";

const ANIMAL_IMG = {
  cattle: "https://images.unsplash.com/photo-1546445317-29f4545e9d53?auto=format&fit=crop&w=900&q=80",
  pig: "https://images.unsplash.com/photo-1593179357196-705d7578fe5e?auto=format&fit=crop&w=900&q=80",
  chicken: "https://images.unsplash.com/photo-1612170153139-6f881ff067e0?auto=format&fit=crop&w=900&q=80",
  sheep: "https://images.unsplash.com/photo-1484557985045-edf25e08da73?auto=format&fit=crop&w=900&q=80",
};

const fmtCur = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

export default function Livestock() {
  const { data, refresh, loading } = useGame();
  const [buyOpen, setBuyOpen] = useState(null);
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(null);

  if (loading && !data?.state) return <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>;

  const catalog = data?.catalog?.livestock || {};
  const products = data?.catalog?.livestock_products || {};
  const herds = data?.state?.livestock || [];

  const handleBuy = async () => {
    setBusy("buy");
    try {
      await buyLivestock(buyOpen, count);
      toast.success(`Achat: ${count} × ${catalog?.[buyOpen]?.name || buyOpen}`);
      setBuyOpen(null);
      setCount(1);
      await refresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Achat impossible"); }
    finally { setBusy(null); }
  };

  const handleVet = async (id) => {
    setBusy(`vet-${id}`);
    try { await vetLivestock(id); toast.success("Visite vétérinaire effectuée"); await refresh(); }
    catch (e) { toast.error(e.response?.data?.detail || "Action impossible"); }
    finally { setBusy(null); }
  };

  const handleSell = async (id, c) => {
    setBusy(`sell-${id}`);
    try { const res = await sellLivestock(id, c); toast.success(`Vendu: +${fmtCur(res.revenue)}`); await refresh(); }
    catch (e) { toast.error(e.response?.data?.detail || "Action impossible"); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Module élevage</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Élevage & Production animale
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Achetez du bétail pour produire lait, œufs, viande et laine. Surveillez la santé, payez l'alimentation et les soins vétérinaires.
        </p>
      </header>

      {/* Owned herds */}
      <section>
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">
          Vos troupeaux <span className="text-stone-400 font-normal">({herds.length})</span>
        </h2>
        {herds.length === 0 ? (
          <div className="solid-card p-10 text-center text-sm text-stone-500">
            <Beef className="h-10 w-10 text-stone-400 mx-auto mb-3" strokeWidth={1.4} />
            Aucun troupeau. Acquérez vos premiers animaux ci-dessous.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {herds.map((h) => {
              const cat = catalog?.[h?.type] || { name: h?.type || "Troupeau", feed_cost_per_day: 0 };
              const prod = products?.[cat?.produces] || { name: "Production", unit: "u" };
              return (
                <div key={h.id} data-testid={`herd-${h.id}`} className="solid-card overflow-hidden">
                  <div className="relative h-32 bg-stone-200">
                    <img src={ANIMAL_IMG[h.type]} alt={cat?.name || "Troupeau"} loading="lazy" className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/90 backdrop-blur text-[10px] font-semibold uppercase tracking-wider text-stone-900">
                      {h?.count ?? 0} × {cat?.name || "Troupeau"}
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-stone-600">
                        <Heart className="h-3.5 w-3.5 text-red-600" strokeWidth={2} />
                        Santé: <strong className="text-stone-900">{h?.health ?? 0}%</strong>
                      </span>
                      <span className="text-stone-600">
                        Hier: <strong className="text-emerald-700">{(h?.last_production ?? 0).toFixed(2)} {prod?.unit || "u"}</strong> {(prod?.name || "production").toLowerCase()}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500">
                      Alimentation: {((cat?.feed_cost_per_day || 0) * (h?.count || 0)).toFixed(1)} €/jour
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={() => handleVet(h.id)} disabled={busy === `vet-${h.id}`} data-testid={`vet-${h.id}`}>
                        <Stethoscope className="h-3.5 w-3.5 mr-1.5 text-blue-700" strokeWidth={1.8} />
                        Vétérinaire (~{18 * (h?.count || 0)}€)
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleSell(h.id, h?.count || 0)} disabled={busy === `sell-${h.id}`} data-testid={`sell-herd-${h.id}`}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5 text-stone-700" strokeWidth={1.8} />
                        Tout vendre
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Catalog */}
      <section>
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Marché des animaux</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(catalog).map(([key, cat]) => {
            const prod = products?.[cat?.produces] || { name: "Production", unit: "u" };
            return (
              <div key={key} data-testid={`buy-animal-${key}`} className="solid-card overflow-hidden hover:-translate-y-[2px] transition-all">
                <div className="relative h-28 bg-stone-200">
                  <img src={ANIMAL_IMG[key]} alt={cat.name} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="p-5">
                  <div className="font-display text-base font-semibold text-stone-900">{cat?.name || key}</div>
                  <div className="text-xs text-stone-500 mt-1">
                    Produit: {prod?.name || "Production"} ({cat?.daily_yield ?? 0} {prod?.unit || "u"}/jour)
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="font-display text-xl font-semibold text-stone-900">{fmtCur(cat?.buy_price)}</span>
                    <span className="text-[10px] text-stone-500">/animal</span>
                  </div>
                  <Button onClick={() => { setBuyOpen(key); setCount(1); }} className="w-full mt-3 bg-stone-900 hover:bg-stone-800 text-white" size="sm">
                    <ShoppingBag className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.8} />
                    Acheter
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Dialog open={!!buyOpen} onOpenChange={(o) => !o && setBuyOpen(null)}>
        <DialogContent data-testid="buy-livestock-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Acheter du bétail</DialogTitle>
          </DialogHeader>
          {buyOpen && (
            <div className="space-y-3">
              <div className="text-sm text-stone-600">{catalog?.[buyOpen]?.name || buyOpen} · {fmtCur(catalog?.[buyOpen]?.buy_price)}/unité</div>
              <Input type="number" value={count} onChange={(e) => setCount(Math.max(1, parseInt(e.target.value || 1)))} min={1} max={50} data-testid="livestock-count-input" />
              <div className="text-sm text-stone-700">Total: <strong>{fmtCur((catalog?.[buyOpen]?.buy_price || 0) * count)}</strong></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuyOpen(null)}>Annuler</Button>
            <Button onClick={handleBuy} disabled={busy === "buy"} className="bg-emerald-800 hover:bg-emerald-700" data-testid="confirm-buy-livestock">
              {busy === "buy" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
