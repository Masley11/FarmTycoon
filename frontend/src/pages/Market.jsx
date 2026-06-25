import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Loader2, Wheat, FileText, Clock } from "lucide-react";
import { sellInventory, fulfillContract } from "@/lib/api";
import { toast } from "sonner";

const fmtCur = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

export default function Market() {
  const { data, refresh, loading } = useGame();
  const [sellCrop, setSellCrop] = useState(null);
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading && !data) return (
    <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>
  );

  // ✅ Structure réelle : data.catalog.crops, data.crop_prices, data.state.inventory, data.state.market_multipliers
  const catalog = data?.catalog?.crops || {};
  const prices = data?.crop_prices || {};
  const inv = data?.state?.inventory || {};
  const multipliers = data?.state?.market_multipliers || {};
  const contracts = data?.contracts || [];
  const day = data?.state?.day ?? 0;

  const openSell = (crop) => { setSellCrop(crop); setQty(""); };

  const handleSell = async () => {
    const q = parseFloat(qty);
    if (!q || q <= 0) { toast.error("Quantité invalide"); return; }
    setBusy(true);
    try {
      const res = await sellInventory(sellCrop, q);
      toast.success(`Vendu: +${fmtCur(res.revenue)}`);
      setSellCrop(null);
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Vente impossible");
    } finally {
      setBusy(false);
    }
  };

  const handleContract = async (id) => {
    setBusy(true);
    try {
      const res = await fulfillContract(id);
      toast.success(`Contrat exécuté: +${fmtCur(res.revenue)}`);
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Contrat impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Module marché</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Marché & Contrats
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Vendez votre production sur le marché spot ou honorez des contrats à prime garantie pour maximiser vos revenus.
        </p>
      </header>

      <Tabs defaultValue="spot" className="w-full">
        <TabsList data-testid="market-tabs">
          <TabsTrigger value="spot" data-testid="tab-spot">Marché spot</TabsTrigger>
          <TabsTrigger value="contracts" data-testid="tab-contracts">Contrats ({contracts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="spot" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(catalog).map(([key, c]) => {
              const price = prices[key] ?? 0;
              const m = multipliers[key] ?? 1;
              const stock = inv[key] ?? 0;
              const trendUp = m > 1.0;
              return (
                <div key={key} data-testid={`market-row-${key}`} className="solid-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-base font-semibold text-stone-900">{c.name}</div>
                      <div className="text-xs text-stone-500 mt-0.5">Base {fmtCur(c.base_price)}/t</div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${trendUp ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"}`}>
                      {trendUp ? <TrendingUp className="h-3 w-3" strokeWidth={2} /> : <TrendingDown className="h-3 w-3" strokeWidth={2} />}
                      {(m * 100 - 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-semibold text-stone-900">{fmtCur(price)}</span>
                    <span className="text-xs text-stone-500">/ tonne</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-stone-100">
                    <div className="text-xs text-stone-600">
                      Stock: <strong className="text-stone-900">{Number(stock).toFixed(1)} t</strong>
                    </div>
                    <Button size="sm" onClick={() => openSell(key)} disabled={stock <= 0} className="bg-stone-900 hover:bg-stone-800 text-white" data-testid={`sell-${key}`}>
                      Vendre
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contracts.map((c) => {
              const have = inv[c.crop] ?? 0;
              const ok = have >= c.qty;
              const daysLeft = (c.deadline_day ?? 0) - day;
              return (
                <div key={c.id} data-testid={`contract-${c.id}`} className="solid-card p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-stone-600" strokeWidth={1.8} />
                        <span className="ft-label">Contrat #{c.id.split("-").pop()}</span>
                      </div>
                      <div className="font-display text-lg font-semibold text-stone-900 mt-1">{c.qty} t · {c.crop_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl font-semibold text-emerald-800">{fmtCur(c.total_value)}</div>
                      <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wide">+{((c.premium - 1) * 100).toFixed(0)}% prime</div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="px-3 py-2 rounded-md bg-stone-50 border border-stone-200">
                      <div className="text-stone-500 uppercase text-[10px] tracking-wide">Prix/t</div>
                      <div className="font-semibold text-stone-900 mt-0.5">{fmtCur(c.price_per_ton)}</div>
                    </div>
                    <div className="px-3 py-2 rounded-md bg-stone-50 border border-stone-200">
                      <div className="flex items-center gap-1 text-stone-500 uppercase text-[10px] tracking-wide">
                        <Clock className="h-3 w-3" /> Échéance
                      </div>
                      <div className="font-semibold text-stone-900 mt-0.5">Jour {c.deadline_day} ({daysLeft}j)</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-stone-600">
                      Votre stock: <strong className={ok ? "text-emerald-700" : "text-red-700"}>{Number(have).toFixed(1)} t</strong>
                    </div>
                    <Button size="sm" onClick={() => handleContract(c.id)} disabled={!ok || busy} className="bg-emerald-800 hover:bg-emerald-700" data-testid={`fulfill-${c.id}`}>
                      Exécuter
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!sellCrop} onOpenChange={(o) => !o && setSellCrop(null)}>
        <DialogContent data-testid="sell-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Vendre {sellCrop && catalog[sellCrop]?.name}</DialogTitle>
            <DialogDescription>
              Stock disponible: <strong>{sellCrop ? Number(inv[sellCrop] ?? 0).toFixed(1) : 0} t</strong> · Prix actuel: <strong>{sellCrop && fmtCur(prices[sellCrop])}/t</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium text-stone-700">Quantité (tonnes)</label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0.0" data-testid="sell-qty-input" step="0.1" min="0" />
            {qty && sellCrop && (
              <div className="text-sm text-stone-600">
                Recette estimée: <strong className="text-emerald-700">{fmtCur(parseFloat(qty || 0) * (prices[sellCrop] ?? 0))}</strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellCrop(null)} data-testid="cancel-sell-btn">Annuler</Button>
            <Button onClick={handleSell} disabled={busy} className="bg-emerald-800 hover:bg-emerald-700" data-testid="confirm-sell-btn">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmer la vente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  }

