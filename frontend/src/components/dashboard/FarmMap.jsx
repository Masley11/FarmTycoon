import { useNavigate } from "react-router-dom";
import { MapPin, Wheat, Sprout, Droplets } from "lucide-react";

const CROP_LABEL = {
  wheat: "Blé",
  corn: "Maïs",
  soy: "Soja",
  barley: "Orge",
  sunflower: "Tournesol",
};

const CLIMATE_BG = {
  temperate: "bg-emerald-50 border-emerald-200",
  humid: "bg-blue-50 border-blue-200",
  arid: "bg-orange-50 border-orange-200",
};

export function FarmMap({ parcels }) {
  const navigate = useNavigate();
  const owned = (parcels || []).filter((p) => p.owned);

  return (
    <div data-testid="farm-map" className="solid-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="ft-label">Carte de l'exploitation</span>
          <h3 className="font-display text-lg font-semibold tracking-tight text-stone-900 mt-1">
            Parcelles actives ({owned.length})
          </h3>
        </div>
        <button
          onClick={() => navigate("/lands")}
          className="text-xs font-medium text-emerald-800 hover:text-emerald-700 tracking-tight"
          data-testid="farm-map-manage"
        >
          Gérer →
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {owned.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate("/crops")}
            data-testid={`farm-map-parcel-${p.id}`}
            className={`text-left p-3 rounded-lg border ${CLIMATE_BG[p.climate]} hover:shadow-md transition-all`}
          >
            <div className="flex items-start justify-between">
              <MapPin className="h-3.5 w-3.5 text-stone-500" strokeWidth={1.7} />
              <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wide">
                {p.size_ha} ha
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold text-stone-900 leading-tight">
              {p.name}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-stone-600">
              {p.crop_type ? (
                <>
                  <Wheat className="h-3 w-3 text-amber-700" strokeWidth={1.8} />
                  {CROP_LABEL[p.crop_type]} · {Math.round(p.growth)}%
                </>
              ) : (
                <>
                  <Sprout className="h-3 w-3 text-stone-500" strokeWidth={1.8} />
                  En jachère
                </>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-700">
              <Droplets className="h-3 w-3" strokeWidth={1.8} />
              Sol {Math.round(p.soil_moisture)}%
            </div>
          </button>
        ))}
        {owned.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-stone-500">
            Aucune parcelle. Acquérez votre premier terrain.
          </div>
        )}
      </div>
    </div>
  );
}
