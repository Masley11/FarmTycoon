import { NavLink } from "react-router-dom";
import { LayoutDashboard, Map, Sprout, TrendingUp, Droplets, Crown, RotateCcw, Target, Beef, Truck, Users, Settings } from "lucide-react";
import { Brand } from "./Brand";
import { Button } from "@/components/ui/button";
import { resetGame } from "@/lib/api";
import { useGame } from "@/context/GameContext";
import { toast } from "sonner";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true, testId: "nav-dashboard" },
  { to: "/lands", label: "Terrains", icon: Map, testId: "nav-lands" },
  { to: "/crops", label: "Cultures", icon: Sprout, testId: "nav-crops" },
  { to: "/livestock", label: "Élevage", icon: Beef, testId: "nav-livestock" },
  { to: "/market", label: "Marché", icon: TrendingUp, testId: "nav-market" },
  { to: "/resources", label: "Ressources", icon: Droplets, testId: "nav-resources" },
  { to: "/vehicles", label: "Véhicules", icon: Truck, testId: "nav-vehicles" },
  { to: "/employees", label: "Employés", icon: Users, testId: "nav-employees" },
  { to: "/upgrades", label: "Améliorations", icon: Settings, testId: "nav-upgrades" },
  { to: "/missions", label: "Missions", icon: Target, testId: "nav-missions" },
  { to: "/premium", label: "FarmTycoon+", icon: Crown, testId: "nav-premium" },
];

export function Sidebar() {
  const { refresh } = useGame();

  const handleReset = async () => {
    if (!window.confirm("Réinitialiser toute l'exploitation ? Cette action est irréversible.")) return;
    try {
      await resetGame();
      await refresh();
      toast.success("Exploitation réinitialisée");
    } catch (e) {
      toast.error("Impossible de réinitialiser");
    }
  };

  return (
    <aside
      data-testid="sidebar"
      className="hidden lg:flex flex-col w-64 shrink-0 border-r border-stone-200 bg-white/60 backdrop-blur-xl"
    >
      <div className="px-6 py-6 border-b border-stone-200">
        <Brand />
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto no-scrollbar">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={item.testId}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
                  isActive
                    ? "bg-emerald-800 text-white shadow-sm"
                    : "text-stone-700 hover:bg-stone-100 hover:text-stone-900",
                ].join(" ")
              }
            >
              <Icon className="h-4 w-4" strokeWidth={1.7} />
              <span className="font-medium tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="px-3 pb-6 border-t border-stone-200 pt-4 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="w-full justify-start text-stone-500 hover:text-stone-900"
          data-testid="reset-game-btn"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-2" strokeWidth={1.7} />
          Réinitialiser
        </Button>
        <p className="px-3 text-[10px] text-stone-400 leading-relaxed">
          MVP v1.0 — Mode démo single-save.<br />
          Maketou Pay: architecture en place.
        </p>
      </div>
    </aside>
  );
}
