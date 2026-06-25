import { Activity, ShoppingCart, Wheat, Tractor, TrendingUp, Cloud } from "lucide-react";

const TYPE_ICON = {
  purchase: ShoppingCart,
  field: Tractor,
  harvest: Wheat,
  sale: TrendingUp,
  market: TrendingUp,
  weather: Cloud,
  info: Activity,
};

const TYPE_COLOR = {
  purchase: "text-orange-700 bg-orange-50",
  field: "text-stone-700 bg-stone-100",
  harvest: "text-emerald-700 bg-emerald-50",
  sale: "text-emerald-700 bg-emerald-50",
  market: "text-blue-700 bg-blue-50",
  weather: "text-amber-700 bg-amber-50",
  info: "text-stone-700 bg-stone-100",
};

export function ActivityFeed({ items }) {
  const list = items || [];
  return (
    <div data-testid="activity-feed" className="solid-card p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="ft-label">Journal d'activité</span>
          <h3 className="font-display text-lg font-semibold tracking-tight text-stone-900 mt-1">
            Activité récente
          </h3>
        </div>
        <div className="h-9 w-9 rounded-lg bg-stone-100 flex items-center justify-center">
          <Activity className="h-4 w-4 text-stone-700" strokeWidth={1.7} />
        </div>
      </div>
      <div className="space-y-1 overflow-y-auto max-h-[340px] pr-1">
        {list.length === 0 && (
          <div className="text-sm text-stone-500 py-8 text-center">
            L'activité s'affichera ici au fur et à mesure du jeu.
          </div>
        )}
        {list.filter(Boolean).map((item, i) => {
          const Icon = TYPE_ICON[item?.type] || Activity;
          const cls = TYPE_COLOR[item?.type] || TYPE_COLOR.info;
          return (
            <div key={item?.id || i} data-testid={`activity-${i}`} className="flex items-start gap-3 py-2 border-b border-stone-100 last:border-0">
              <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${cls}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-stone-800">{item?.message || "Activité"}</div>
                {item?.day != null && (
                  <div className="text-[10px] text-stone-400 mt-0.5">Jour {item?.day}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
