import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Map, Sprout, TrendingUp, Droplets,
  Grid2X2, Beef, Truck, Users, Wrench, Star, Trophy, X
} from "lucide-react";

// 5 onglets principaux visibles en bas
const MAIN_NAV = [
  { to: "/",          icon: LayoutDashboard, label: "Bord",      end: true },
  { to: "/lands",     icon: Map,             label: "Terrains"            },
  { to: "/crops",     icon: Sprout,          label: "Cultures"            },
  { to: "/market",    icon: TrendingUp,      label: "Marché"              },
  { to: "/resources", icon: Droplets,        label: "Ressources"          },
];

// Pages supplémentaires dans le menu "Plus"
const MORE_NAV = [
  { to: "/livestock",     icon: Beef,    label: "Élevage"       },
  { to: "/vehicles",      icon: Truck,   label: "Véhicules"     },
  { to: "/employees",     icon: Users,   label: "Employés"      },
  { to: "/upgrades",      icon: Wrench,  label: "Améliorations" },
  { to: "/missions",      icon: Trophy,  label: "Missions"      },
  { to: "/premium",       icon: Star,    label: "Premium"       },
];

export function BottomNav() {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* Overlay foncé quand le menu Plus est ouvert */}
      {showMore && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Menu "Plus" — slide up */}
      {showMore && (
        <div className="lg:hidden fixed bottom-[64px] inset-x-0 z-50 bg-white border-t border-stone-200 rounded-t-2xl shadow-2xl pb-2"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <span className="text-xs font-bold uppercase tracking-widest text-stone-400">
              Toutes les sections
            </span>
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setShowMore(false)}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1 p-3">
            {MORE_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    [
                      "flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-[11px] font-medium tracking-wide transition-colors",
                      isActive
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-stone-600 hover:bg-stone-50",
                    ].join(" ")
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className="h-6 w-6" strokeWidth={isActive ? 2.2 : 1.7} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Nav principale */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-stone-200 bg-white/90 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-6">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  [
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] tracking-wide transition-colors",
                    isActive ? "text-emerald-800" : "text-stone-500",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.7} />
                    <span className="uppercase font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* Bouton Plus */}
          <button
            type="button"
            aria-label={showMore ? "Fermer le menu Plus" : "Ouvrir le menu Plus"}
            aria-expanded={showMore}
            onClick={() => setShowMore((v) => !v)}
            className={[
              "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] tracking-wide transition-colors",
              showMore ? "text-emerald-800" : "text-stone-500",
            ].join(" ")}
          >
            <Grid2X2 className="h-5 w-5" strokeWidth={showMore ? 2.2 : 1.7} />
            <span className="uppercase font-medium">Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}
