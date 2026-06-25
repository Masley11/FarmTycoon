import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Droplets, Sun, Cloud, Loader2, ShoppingBag, ArrowLeftRight, TrendingUp } from "lucide-react";
import { buyParcel } from "@/lib/api";
import { toast } from "sonner";

const CLIMATE_VIS = {
  temperate: { label: "Tempéré",  icon: Cloud,     color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  humid:     { label: "Humide",   icon: Droplets,  color: "text-blue-700    bg-blue-50    border-blue-200"    },
  arid:      { label: "Aride",    icon: Sun,       color: "text-orange-700  bg-orange-50  border-orange-200"  },
};

const PARCEL_IMG = {
  temperate: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
  humid:     "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=900&q=80",
  arid:      "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
};

const fmtCur = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

export default function Lands() {
  const { data, refresh, loading } = useGame();
  const [selected, setSelected]   = useState(null);  // parcelle à acheter
  const [selling, setSelling]     = useState(null);   // parcelle à vendre
  const [busy, setBusy]           = useState(false);

  if (loading && !data) {
    return <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>;
  }

  const parcels   = data?.parcels || [];
  const cash      = data?.state?.cash || 0;
  const owned     = parcels.filter((p) => p.owned);
  const available = parcels.filter((p) => !p.owned);
  const totalHa   = owned.reduce((s, p) => s + p.size_ha, 0);

  // ── Achat ──
  const handleBuy = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await buyParcel(selected.id);
      toast.success(`✅ ${selected.name} acquise pour ${fmtCur(selected.price)}`);
      setSelected(null);
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'achat");
    } finally {
      setBusy(false);
    }
  };

  // ── Vente (simulée côté front — à connecter au backend plus tard) ──
  const handleSell = async () => {
    if (!selling) return;
    // Vérifier pas de culture en cours
    if (selling.crop_type) {
      toast.error("Impossible de vendre une parcelle avec une culture en cours");
      return;
    }
    setBusy(true);
    try {
      // Prix de revente = 70% du prix d'achat (à implémenter côté backend)
      const resellPrice = Math.round(selling.price * 0.70);
      toast.info(`🚧 Vente de terrain — fonctionnalité en cours d'intégration. Prix estimé : ${fmtCur(resellPrice)}`);
      setSelling(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Module foncier</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Gestion des terrains
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Achetez de nouvelles parcelles pour étendre votre exploitation, ou revendez des terrains sur le marché foncier.
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="solid-card p-4 text-center">
          <div className="ft-label mb-1">Parcelles</div>
          <div className="font-display text-2xl font-bold text-stone-900">{owned.length}</div>
        </div>
        <div className="solid-card p-4 text-center">
          <div className="ft-label mb-1">Surface totale</div>
          <div className="font-display text-2xl font-bold text-stone-900">{totalHa.toFixed(0)} ha</div>
        </div>
        <div className="solid-card p-4 text-center">
          <div className="ft-label mb-1">Disponibles</div>
          <div className="font-display text-2xl font-bold text-emerald-700">{available.length}</div>
        </div>
      </div>

      {/* Parcelles détenues */}
      <section>
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">
          Mes parcelles <span className="text-stone-400 font-normal">({owned.length})</span>
        </h2>
        {owned.length === 0 ? (
          <div className="solid-card p-8 text-center text-stone-500 text-sm">
            Vous ne possédez aucune parcelle.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {owned.map((p) => (
              <ParcelCard
                key={p.id}
                parcel={p}
                owned
                onSell={() => setSelling(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Marché foncier */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-stone-900">
            Marché foncier <span className="text-stone-400 font-normal">({available.length} disponibles)</span>
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-stone-500">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.8} />
            Trésorerie: <strong className="text-stone-900 ml-1">{fmtCur(cash)}</strong>
          </div>
        </div>

        {available.length === 0 ? (
          <div className="solid-card p-8 text-center text-stone-500 text-sm">
            Toutes les parcelles disponibles ont été acquises.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {available.map((p) => (
              <ParcelCard
                key={p.id}
                parcel={p}
                cash={cash}
                onBuy={() => setSelected(p)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Dialog achat */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent data-testid="buy-parcel-dialog">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{selected?.name}</DialogTitle>
            <DialogDescription>
              Acquisition de <strong>{selected?.size_ha} ha</strong> · Climat {CLIMATE_VIS[selected?.climate]?.label?.toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <Row label="Fertilité"      value={`${selected.fertility}/100`} />
              <Row label="Accès à l'eau"  value={`${selected.water_access}/100`} />
              <Row label="Surface"        value={`${selected.size_ha} hectares`} />
              <Row label="Votre trésorerie" value={fmtCur(cash)} />
              <Row label="Prix d'achat"   value={fmtCur(selected.price)} bold />
              {cash < selected.price && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  ⚠️ Trésorerie insuffisante — il vous manque {fmtCur(selected.price - cash)}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>Annuler</Button>
            <Button
              onClick={handleBuy}
              disabled={busy || (selected && cash < selected.price)}
              className="bg-emerald-800 hover:bg-emerald-700"
              data-testid="confirm-buy-btn"
            >
              {busy
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <ShoppingBag className="h-4 w-4 mr-2" />
              }
              Confirmer l'acquisition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog vente */}
      <Dialog open={!!selling} onOpenChange={(o) => !o && setSelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Vendre {selling?.name}</DialogTitle>
            <DialogDescription>
              Mettez cette parcelle en vente sur le marché foncier.
            </DialogDescription>
          </DialogHeader>
          {selling && (
            <div className="space-y-3 text-sm">
              <Row label="Surface"          value={`${selling.size_ha} ha`} />
              <Row label="Prix d'achat initial" value={fmtCur(selling.price)} />
              <Row label="Prix de revente estimé" value={fmtCur(Math.round(selling.price * 0.70))} bold />
              {selling.crop_type && (
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs">
                  ⚠️ Une culture est en cours sur cette parcelle. Récoltez d'abord avant de vendre.
                </div>
              )}
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-xs">
                ℹ️ La vente de terrain sera disponible dans la prochaine mise à jour du marché foncier multijoueur.
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelling(null)}>Annuler</Button>
            <Button
              onClick={handleSell}
              disabled={busy || selling?.crop_type}
              className="bg-stone-800 hover:bg-stone-700"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Confirmer la vente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ParcelCard({ parcel, owned, cash, onBuy, onSell }) {
  const climate    = CLIMATE_VIS[parcel.climate] || CLIMATE_VIS.temperate;
  const ClimateIcon = climate.icon;
  const canAfford  = cash >= parcel.price;

  return (
    <div data-testid={`parcel-card-${parcel.id}`} className="solid-card overflow-hidden hover:-translate-y-[2px] transition-all">
      <div className="relative h-32 overflow-hidden bg-stone-200">
        <img
          src={PARCEL_IMG[parcel.climate] || PARCEL_IMG.temperate}
          alt={parcel.name}
          loading="lazy"
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = PARCEL_IMG.temperate; }}
        />
        <div className="absolute top-3 left-3">
          <Badge className={`${climate.color} border font-medium`} variant="outline">
            <ClimateIcon className="h-3 w-3 mr-1" strokeWidth={1.8} />
            {climate.label}
          </Badge>
        </div>
        {owned && (
          <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
            <Badge className="bg-emerald-800 text-white border-0">Détenue</Badge>
            {parcel.crop_type && (
              <Badge className="bg-amber-500 text-white border-0 text-[10px]">
                En culture
              </Badge>
            )}
          </div>
        )}
        {!owned && !canAfford && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">
              Fonds insuffisants
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-display text-base font-semibold text-stone-900">{parcel.name}</div>
            <div className="flex items-center gap-1 text-xs text-stone-500 mt-0.5">
              <MapPin className="h-3 w-3" strokeWidth={1.7} />
              {parcel.size_ha} ha
            </div>
          </div>
          <div className="text-right">
            <div className="ft-label">
              {owned ? "Valeur estimée" : "Prix"}
            </div>
            <div className={`font-display text-lg font-semibold ${owned ? "text-stone-500" : canAfford ? "text-stone-900" : "text-red-600"}`}>
              {fmtCur(owned ? Math.round(parcel.price * 0.70) : parcel.price)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Stat label="Fertilité"    value={parcel.fertility} />
          <Stat label="Accès eau"    value={parcel.water_access} />
        </div>

        {!owned && (
          <Button
            onClick={onBuy}
            disabled={!canAfford}
            className={`w-full mt-4 ${canAfford ? "bg-stone-900 hover:bg-stone-800" : "bg-stone-200 cursor-not-allowed"} text-white`}
            data-testid={`buy-${parcel.id}`}
          >
            <ShoppingBag className="h-4 w-4 mr-2" strokeWidth={1.8} />
            {canAfford ? "Acheter" : `Manque ${fmtCur(parcel.price - cash)}`}
          </Button>
        )}

        {owned && !parcel.crop_type && (
          <Button
            onClick={onSell}
            variant="outline"
            className="w-full mt-4 text-stone-600"
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" strokeWidth={1.8} />
            Mettre en vente
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
      <span className="text-stone-500">{label}</span>
      <span className={`text-stone-900 ${bold ? "font-semibold font-display text-lg" : ""}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="flex items-center justify-between text-stone-500">
        <span>{label}</span>
        <span className="text-stone-900 font-medium">{value}/100</span>
      </div>
      <div className="mt-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-800 rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
