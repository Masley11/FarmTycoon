import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sprout, Droplets, Beaker, Bug, Loader2, Wheat, MapPin, Lock, AlertTriangle } from "lucide-react";
import { plantCrop, irrigateParcel, fertilizeParcel, herbicideParcel, harvestParcel } from "@/lib/api";
import { toast } from "sonner";

// ── Images réelles fiables pour chaque culture ────────────────────────────────
const CROP_VIS = {
  wheat:     {
    name: "Blé",
    img:  "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
    color: "bg-amber-50 border-amber-200 text-amber-800",
  },
  corn:      {
    name: "Maïs",
    img:  "https://images.unsplash.com/photo-1601593768793-d40a3f99b9b3?auto=format&fit=crop&w=900&q=80",
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
  },
  soy:       {
    name: "Soja",
    img:  "https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=900&q=80",
    color: "bg-lime-50 border-lime-200 text-lime-800",
  },
  barley:    {
    name: "Orge",
    img:  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80",
    color: "bg-orange-50 border-orange-200 text-orange-800",
  },
  sunflower: {
    name: "Tournesol",
    img:  "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=900&q=80",
    color: "bg-yellow-50 border-yellow-200 text-yellow-900",
  },
};

// Image de fallback si URL casse
const FALLBACK_IMG = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80";

export default function Crops() {
  const { data, refresh, loading } = useGame();
  const [busy, setBusy] = useState(null);

  if (loading && !data) return (
    <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>
  );

  const parcels  = (data?.parcels || []).filter((p) => p.owned);
  const catalog  = data?.catalog?.crops || {};
  const level    = data?.level?.level || 1;
  const season   = data?.season;

  const action = async (id, fn, key, ...args) => {
    setBusy(`${id}-${key}`);
    try {
      const res = await fn(id, ...args);
      await refresh();
      // Avertissement hors saison
      if (res?.season_warning) {
        toast.warning(res.season_warning, { duration: 5000 });
      } else {
        toast.success("Action exécutée avec succès");
      }
      // XP gagné
      if (res?.xp_gained) {
        toast.info(`+${res.xp_gained} XP`, { duration: 2000 });
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Action impossible");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Module cultures</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Cultures & Opérations
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Plantez, irriguez, fertilisez et récoltez vos parcelles.
          {season && (
            <span className="ml-2 font-medium text-stone-800">
              {season?.season_icon || "🌱"} {season?.display || "Saison en cours"}
            </span>
          )}
        </p>
      </header>

      {/* Guide cultures disponibles */}
      <section className="solid-card p-5">
        <div className="ft-label mb-3">Cultures disponibles à votre niveau ({level})</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(catalog).map(([key, c]) => {
            const vis       = CROP_VIS[key];
            const locked    = (c.min_level || 1) > level;
            const offSeason = season && !isCropInSeason(key, season?.season_key);
            return (
              <div
                key={key}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                  locked
                    ? "bg-stone-50 border-stone-200 text-stone-400"
                    : offSeason
                    ? "bg-orange-50 border-orange-200 text-orange-700"
                    : vis?.color || "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}
              >
                {locked
                  ? <Lock className="h-3 w-3" strokeWidth={2} />
                  : offSeason
                  ? <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                  : <Sprout className="h-3 w-3" strokeWidth={2} />
                }
                {c.name}
                {locked && <span className="text-[10px]">Niv.{c.min_level}</span>}
                {!locked && offSeason && <span className="text-[10px]">Hors saison</span>}
              </div>
            );
          })}
        </div>
      </section>

      {parcels.length === 0 ? (
        <div className="solid-card p-10 text-center">
          <Sprout className="h-10 w-10 text-stone-400 mx-auto" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-stone-600">
            Vous ne possédez aucune parcelle. Rendez-vous dans <strong>Terrains</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {parcels.map((p) => (
            <CropCard
              key={p.id}
              parcel={p}
              catalog={catalog}
              level={level}
              season={season}
              busy={busy}
              onPlant={(crop)  => action(p.id, plantCrop,      "plant",   crop)}
              onIrrigate={()   => action(p.id, irrigateParcel, "irrigate")}
              onFertilize={(t) => action(p.id, fertilizeParcel,"fert",    t)}
              onHerbicide={()  => action(p.id, herbicideParcel,"herb")}
              onHarvest={()    => action(p.id, harvestParcel,  "harvest")}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper saison (miroir du backend)
const CROP_SEASONS = {
  wheat:     ["spring", "autumn"],
  corn:      ["summer"],
  soy:       ["spring", "summer"],
  barley:    ["spring", "autumn", "winter"],
  sunflower: ["summer"],
};
function isCropInSeason(crop, seasonKey) {
  const allowed = CROP_SEASONS[crop];
  if (!allowed) return true;
  return allowed.includes(seasonKey);
}

function CropCard({ parcel, catalog, level, season, busy, onPlant, onIrrigate, onFertilize, onHerbicide, onHarvest }) {
  const planted = !!parcel.crop_type;
  const mature  = parcel.growth >= 90;
  const vis     = planted ? CROP_VIS[parcel.crop_type] : null;

  return (
    <div data-testid={`crop-card-${parcel.id}`} className="solid-card overflow-hidden">
      {/* Image */}
      <div className="relative h-36 bg-stone-200">
        {planted ? (
          <img
            src={vis?.img || FALLBACK_IMG}
            alt={vis?.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = FALLBACK_IMG; }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-100 flex items-center justify-center">
            <Sprout className="h-10 w-10 text-stone-400" strokeWidth={1.4} />
          </div>
        )}

        {/* Badge parcelle */}
        <div className="absolute top-3 left-3">
          <div className="px-2.5 py-1 rounded-md bg-white/95 backdrop-blur text-[10px] uppercase tracking-wider font-semibold text-stone-800 flex items-center gap-1">
            <MapPin className="h-3 w-3" strokeWidth={1.8} />
            {parcel.name} · {parcel.size_ha} ha
          </div>
        </div>

        {/* Badge culture + statut */}
        {planted && (
          <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
            <div className="px-2.5 py-1 rounded-md bg-emerald-800 text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
              <Wheat className="h-3 w-3" strokeWidth={1.8} /> {vis?.name}
            </div>
            {mature && (
              <div className="px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-bold animate-pulse">
                PRÊT À RÉCOLTER
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {planted ? (
          <>
            {/* Croissance */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="ft-label">Croissance</span>
                <span className="text-xs font-semibold text-stone-900">{Math.round(parcel.growth)}%</span>
              </div>
              <Progress value={parcel.growth} className="h-2" />
            </div>

            {/* Métriques */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <MetricMini label="Humidité sol" value={`${Math.round(parcel.soil_moisture)}%`} accent="blue" />
              <MetricMini label="Mauvaises herbes" value={`${Math.round(parcel.weed_level)}%`} accent={parcel.weed_level > 60 ? "red" : "stone"} />
              <MetricMini label="Boost engrais" value={`+${parcel.fertilizer_boost}%`} accent="emerald" />
            </div>

            {/* Rendement estimé */}
            {parcel.expected_yield > 0 && (
              <div className="text-xs text-stone-500 flex items-center gap-1">
                <Wheat className="h-3 w-3" strokeWidth={1.8} />
                Rendement estimé: <strong className="text-stone-800">{parcel.expected_yield.toFixed(1)} t</strong>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                size="sm" variant="outline"
                onClick={onIrrigate}
                disabled={!!busy}
                data-testid={`irrigate-${parcel.id}`}
              >
                <Droplets className="h-3.5 w-3.5 mr-1.5 text-blue-700" strokeWidth={1.8} />
                Irriguer
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={!!busy} data-testid={`fertilize-${parcel.id}`}>
                    <Beaker className="h-3.5 w-3.5 mr-1.5 text-emerald-700" strokeWidth={1.8} />
                    Fertiliser
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Type d'engrais</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onFertilize("chemical")}>🧪 Chimique (+18%)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFertilize("bio")}>🌿 Bio (+12%)</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onFertilize("premium")}>⭐ Premium (+28%)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm" variant="outline"
                onClick={onHerbicide}
                disabled={!!busy}
                data-testid={`herbicide-${parcel.id}`}
              >
                <Bug className="h-3.5 w-3.5 mr-1.5 text-orange-700" strokeWidth={1.8} />
                Herbicide
              </Button>

              {mature && (
                <Button
                  size="sm"
                  onClick={onHarvest}
                  disabled={!!busy}
                  className="bg-emerald-800 hover:bg-emerald-700 ml-auto"
                  data-testid={`harvest-${parcel.id}`}
                >
                  <Wheat className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.8} />
                  Récolter ({(parcel.expected_yield || 0).toFixed(1)} t)
                </Button>
              )}
            </div>
          </>
        ) : (
          /* Semis */
          <div>
            <p className="text-sm text-stone-600 mb-3">Choisissez une culture à planter :</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(catalog).map(([key, c]) => {
                const locked    = (c.min_level || 1) > level;
                const offSeason = season && !isCropInSeason(key, season?.season_key);
                const vis       = CROP_VIS[key];
                return (
                  <button
                    key={key}
                    onClick={() => !locked && onPlant(key)}
                    disabled={locked || !!busy}
                    data-testid={`plant-${parcel.id}-${key}`}
                    className={`relative text-left text-xs px-3 py-2 rounded-md border transition-colors font-medium ${
                      locked
                        ? "bg-stone-50 border-stone-100 text-stone-400 cursor-not-allowed"
                        : offSeason
                        ? "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"
                        : "border-stone-200 bg-white hover:bg-stone-50 hover:border-emerald-700 text-stone-900"
                    }`}
                  >
                    {locked && (
                      <Lock className="h-3 w-3 absolute top-2 right-2 text-stone-300" strokeWidth={2} />
                    )}
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {locked
                        ? `🔒 Niv. ${c.min_level}`
                        : offSeason
                        ? `⚠️ Hors saison`
                        : `${c.growth_days}j · ${c.seed_cost_per_ha}€/ha`
                      }
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricMini({ label, value, accent }) {
  const map = {
    blue:    "text-blue-700",
    emerald: "text-emerald-700",
    red:     "text-red-700",
    stone:   "text-stone-700",
  };
  return (
    <div className="px-2 py-1.5 rounded-md bg-stone-50 border border-stone-200">
      <div className="text-[9px] uppercase tracking-wider text-stone-500 leading-tight">{label}</div>
      <div className={`text-sm font-semibold ${map[accent]}`}>{value}</div>
    </div>
  );
}
