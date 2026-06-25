import { Sprout } from "lucide-react";

export function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-logo">
      <div className="relative">
        <div className="h-10 w-10 rounded-lg bg-emerald-800 flex items-center justify-center shadow-sm">
          <Sprout className="h-5 w-5 text-emerald-100" strokeWidth={1.8} />
        </div>
        <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="font-display text-base font-semibold text-stone-900 tracking-tight">
            FarmTycoon
          </div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-stone-500 font-medium">
            Agricultural Management
          </div>
        </div>
      )}
    </div>
  );
}
