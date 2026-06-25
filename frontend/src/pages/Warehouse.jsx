import { useGame } from "@/context/GameContext";
import { Loader2, Package, TrendingUp, Wheat, Beef, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { sellInventory } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const fmtCur = (v) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

// Icônes et couleurs par produit
const PRODUCT_VIS = {
  wheat:     { name: "Blé",       icon: "🌾", color: "bg-amber-50  border-amber-200",  text: "text-amber-800"  },
  corn:      { name: "Maïs",      icon: "🌽", color: "bg-yellow-50 border-yellow-200", text: "text-yellow-800" },
  soy:       { name: "Soja",      icon: "🫘", color: "bg-lime-50   border-lime-200",   text: "text-lime-800"   },
  barley:    { name: "Orge",      icon: "🌿", color: "bg-orange-50 border-orange-200", text: "text-orange-800" },
  sunflower: { name: "Tournesol", icon: "🌻", color: "bg-yellow-50 border-yellow-200", text: "text-yellow-900" },
  milk:      { name: "Lait",      icon: "🥛", color: "bg-blue-50   border-blue-200",   text: "text-blue-800"   },
  eggs:      { name: "Œufs",      icon: "🥚", color: "bg-stone-50  border-stone-200",  text: "text-stone-800"  },
  meat:      { name: "Viande",    icon: "🥩", color: "bg-red-50    border-red-200",     text: "text-red-800"    },
  wool:      { name: "Laine",     icon: "🐑", color: "bg-gray-50   border-gray-200",   text: "text-gray-800"   },
};

export default function Warehouse() {
  const { data, refresh, loading } = useGame();
  const [selling, setSelling]   = useState(null); // { key, qty }
  const [busy, setBusy]         = useState(false);

  if (loading && !data) return (
    <div className="text-stone-500 flex items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />Chargement…
    </div>
  );

  const inventory    = data?.state?.inventory || {};
  const cropPrices   = data?.crop_prices      || {};
  const catalog      = data?.catalog          || {};
  const allProducts  = {
    ...(catalog?.crops || {}),
    ...(catalog?.livestock_products || {}),
  };

  // Ne montrer que les produits avec un stock > 0 ou > 0.01
  const stockItems = Object.entries(inventory)
    .filter(([, qty]) => qty > 0.001)
    .sort(([, a], [, b]) => b - a);

  const totalValue = stockItems.reduce((sum, [key, qty]) => {
    const price = cropPrices[key] || allProducts[key]?.base_price || 0;
    return sum + qty * price;
  }, 0);

  const handleSell = async () => {
    if (!selling || !selling.qty || selling.qty <= 0) return;
    const have = inventory[selling.key] || 0;
    if (selling.qty > have) {
      toast.error(`Stock insuffisant (${have.toFixed(1)} disponible)`);
      return;
    }
    setBusy(true);
    try {
      const res = await sellInventory(selling.key, parseFloat(selling.qty));
      toast.success(`Vendu: ${fmtCur(res.revenue)} encaissés`);
      setSelling(null);
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Vente impossible");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Module stockage</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Entrepôt & Silo
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Consultez vos stocks de récoltes et produits d'élevage. Vendez directement au marché spot depuis l'entrepôt.
        </p>
      </header>

      {/* KPI total */}
      <div className="grid grid-cols-2 gap-4">
        <div className="solid-card p-5">
          <div className="ft-label mb-1 flex items-center gap-1.5">
            <Package className="h-3 w-3" />Produits en stock
          </div>
          <div className="font-display text-3xl font-semibold text-stone-900">{stockItems.length}</div>
          <div className="text-xs text-stone-500 mt-1">références différentes</div>
        </div>
        <div className="solid-card p-5">
          <div className="ft-label mb-1 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />Valeur estimée
          </div>
          <div className="font-display text-3xl font-semibold text-emerald-800">{fmtCur(totalValue)}</div>
          <div className="text-xs text-stone-500 mt-1">au prix du marché</div>
        </div>
      </div>

      {/* Stocks */}
      {stockItems.length === 0 ? (
        <div className="solid-card p-12 text-center">
          <Package className="h-12 w-12 text-stone-300 mx-auto mb-3" strokeWidth={1.3} />
          <p className="text-stone-500 text-sm">Votre entrepôt est vide.</p>
          <p className="text-stone-400 text-xs mt-1">Récoltez des cultures ou collectez les productions d'élevage.</p>
        </div>
      ) : (
        <>
          {/* Cultures */}
          {stockItems.some(([k]) => k in (catalog?.crops || {})) && (
            <section>
              <h2 className="font-display text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Wheat className="h-5 w-5 text-amber-700" strokeWidth={1.7} />
                Cultures récoltées
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stockItems
                  .filter(([k]) => k in (catalog?.crops || {}))
                  .map(([key, qty]) => (
                    <StockCard
                      key={key}
                      productKey={key}
                      qty={qty}
                      price={cropPrices[key] || 0}
                      allProducts={allProducts}
                      onSell={() => setSelling({ key, qty: "" })}
                    />
                  ))}
              </div>
            </section>
          )}

          {/* Produits élevage */}
          {stockItems.some(([k]) => k in (catalog?.livestock_products || {})) && (
            <section>
              <h2 className="font-display text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Beef className="h-5 w-5 text-red-700" strokeWidth={1.7} />
                Produits d'élevage
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stockItems
                  .filter(([k]) => k in (catalog?.livestock_products || {}))
                  .map(([key, qty]) => {
                    const prod = catalog?.livestock_products?.[key];
                    return (
                      <StockCard
                        key={key}
                        productKey={key}
                        qty={qty}
                        price={prod?.base_price || 0}
                        allProducts={allProducts}
                        unit={prod?.unit}
                        onSell={() => setSelling({ key, qty: "" })}
                      />
                    );
                  })}
              </div>
            </section>
          )}
        </>
      )}

      {/* Modal vente */}
      {selling && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setSelling(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-display text-xl font-semibold text-stone-900 mb-1">
              Vendre — {PRODUCT_VIS[selling.key]?.name || selling.key}
            </h3>
            <p className="text-sm text-stone-500 mb-4">
              Stock disponible : <strong>{(inventory[selling.key] || 0).toFixed(2)}</strong>
              {" "}· Prix actuel : <strong className="text-emerald-700">
                {fmtCur(cropPrices[selling.key] || allProducts[selling.key]?.base_price || 0)}
              </strong>/unité
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-600 mb-1 block">
                  Quantité à vendre
                </label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max={inventory[selling.key] || 0}
                  value={selling.qty}
                  onChange={(e) => setSelling({ ...selling, qty: e.target.value })}
                  placeholder="Ex: 5.0"
                  className="text-lg font-semibold"
                  autoFocus
                />
              </div>

              {/* Boutons quantité rapide */}
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setSelling({
                      ...selling,
                      qty: ((inventory[selling.key] || 0) * pct / 100).toFixed(2)
                    })}
                    className="flex-1 text-xs py-1.5 rounded-md border border-stone-200 bg-stone-50 hover:bg-stone-100 font-medium text-stone-700"
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Revenu estimé */}
              {selling.qty > 0 && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
                  Revenu estimé : <strong className="text-emerald-800 text-base">
                    {fmtCur(
                      parseFloat(selling.qty) *
                      (cropPrices[selling.key] || allProducts[selling.key]?.base_price || 0)
                    )}
                  </strong>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setSelling(null)}>
                Annuler
              </Button>
              <Button
                className="flex-1 bg-emerald-800 hover:bg-emerald-700"
                onClick={handleSell}
                disabled={busy || !selling.qty || parseFloat(selling.qty) <= 0}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                Confirmer la vente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StockCard({ productKey, qty, price, allProducts, unit, onSell }) {
  const vis     = PRODUCT_VIS[productKey];
  const prodCat = allProducts[productKey];
  const unitLabel = unit || prodCat?.unit || "t";
  const value   = qty * price;

  return (
    <div className={`solid-card p-5 border ${vis?.color || "bg-stone-50 border-stone-200"}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{vis?.icon || "📦"}</span>
          <div>
            <div className={`font-semibold text-base ${vis?.text || "text-stone-800"}`}>
              {vis?.name || productKey}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">
              {fmtCur(price)} / {unitLabel}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold text-stone-900">
            {qty % 1 === 0 ? qty : qty.toFixed(2)}
          </div>
          <div className="text-xs text-stone-500">{unitLabel}</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-stone-200 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-stone-500">Valeur : </span>
          <span className="font-semibold text-emerald-700">{fmtCur(value)}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onSell}
          className="text-xs"
        >
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.8} />
          Vendre
        </Button>
      </div>
    </div>
  );
    }
                                        
