import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function KpiCard({ label, value, sublabel, icon: Icon, trend, accent = "emerald", testId }) {
  const accentMap = {
    emerald: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-800",
    stone: "bg-stone-100 text-stone-800",
    terracotta: "bg-orange-50 text-orange-800",
  };

  return (
    <div
      data-testid={testId}
      className="solid-card p-5 md:p-6 flex flex-col gap-4 hover:-translate-y-[2px] transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <span className="ft-label">{label}</span>
        {Icon && (
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accentMap[accent]}`}>
            <Icon className="h-4 w-4" strokeWidth={1.7} />
          </div>
        )}
      </div>
      <div>
        <div className="kpi-value">{value}</div>
        {sublabel && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-stone-500">
            {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2} />}
            {trend === "down" && <ArrowDownRight className="h-3.5 w-3.5 text-red-700" strokeWidth={2} />}
            <span>{sublabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
