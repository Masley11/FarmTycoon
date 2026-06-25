import { AlertTriangle, AlertCircle, CheckCircle2, Info, Bell } from "lucide-react";

const SEV = {
  danger: { Icon: AlertCircle, color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  warning: { Icon: AlertTriangle, color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  success: { Icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  info: { Icon: Info, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
};

export function AlertsPanel({ alerts }) {
  return (
    <div data-testid="alerts-panel" className="solid-card p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="ft-label">Alertes intelligentes</span>
          <h3 className="font-display text-lg font-semibold tracking-tight text-stone-900 mt-1">
            Centre de notifications
          </h3>
        </div>
        <div className="h-9 w-9 rounded-lg bg-stone-100 flex items-center justify-center">
          <Bell className="h-4 w-4 text-stone-700" strokeWidth={1.7} />
        </div>
      </div>
      <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[340px] pr-1">
        {(!alerts || alerts.length === 0) && (
          <div className="text-sm text-stone-500 py-8 text-center" data-testid="no-alerts">
            Aucune alerte. Tout est sous contrôle.
          </div>
        )}
        {alerts?.map((a, i) => {
          const sev = SEV[a.severity] || SEV.info;
          const Icon = sev.Icon;
          return (
            <div
              key={i}
              data-testid={`alert-${i}`}
              className={`flex items-start gap-3 p-3 rounded-lg border ${sev.bg} ${sev.border}`}
            >
              <Icon className={`h-4 w-4 mt-0.5 ${sev.color}`} strokeWidth={1.8} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-stone-900 truncate">{a.title}</div>
                <div className="text-xs text-stone-600 mt-0.5">{a.detail}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
