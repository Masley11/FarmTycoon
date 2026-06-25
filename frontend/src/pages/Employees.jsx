import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { hireEmployee, fireEmployee } from "@/lib/api";
import { toast } from "sonner";
import { Users, UserPlus, UserMinus, Loader2, Briefcase, Sparkles } from "lucide-react";

const fmtCur = (v) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v ?? 0);

const ROLE_VIS = {
  field_hand: { accent: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  mechanic:   { accent: "bg-blue-50 text-blue-800 border-blue-200" },
  vet:        { accent: "bg-red-50 text-red-800 border-red-200" },
  driver:     { accent: "bg-orange-50 text-orange-800 border-orange-200" },
};

export default function Employees() {
  const { data, refresh, loading } = useGame();
  const [busy, setBusy] = useState(null);

  if (loading && !data) return <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>;

  const roles = data.catalog.employee_roles;
  const employees = data.state.employees || [];

  const handleHire = async (role) => {
    setBusy(`hire-${role}`);
    try { await hireEmployee(role); toast.success(`Embauche: ${roles[role].name}`); await refresh(); }
    catch (e) { toast.error(e.response?.data?.detail || "Embauche impossible"); }
    finally { setBusy(null); }
  };

  const handleFire = async (id) => {
    if (!window.confirm("Licencier cet employé ? Vous paierez 2 jours d'indemnités.")) return;
    setBusy(`fire-${id}`);
    try { await fireEmployee(id); toast.success("Licenciement effectué"); await refresh(); }
    catch (e) { toast.error(e.response?.data?.detail || "Action impossible"); }
    finally { setBusy(null); }
  };

  const totalSalary = employees.reduce((s, e) => s + (roles[e.role]?.daily_salary || 0), 0);

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Module RH</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Employés & Ressources humaines
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Embauchez des ouvriers, mécaniciens, vétérinaires et chauffeurs pour automatiser et booster vos opérations. Chaque rôle apporte un bonus permanent.
        </p>
      </header>

      <section className="solid-card p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-stone-900 text-white flex items-center justify-center">
            <Users className="h-5 w-5" strokeWidth={1.7} />
          </div>
          <div>
            <div className="ft-label">Effectif total</div>
            <div className="font-display text-2xl font-semibold text-stone-900">{employees.length} employé{employees.length > 1 ? "s" : ""}</div>
          </div>
        </div>
        <div>
          <div className="ft-label">Charges salariales</div>
          <div className="font-display text-2xl font-semibold text-stone-900">{fmtCur(totalSalary)}<span className="text-xs text-stone-500 font-normal ml-1">/jour</span></div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">
          Équipe actuelle <span className="text-stone-400 font-normal">({employees.length})</span>
        </h2>
        {employees.length === 0 ? (
          <div className="solid-card p-10 text-center text-sm text-stone-500">
            <Users className="h-10 w-10 text-stone-400 mx-auto mb-3" strokeWidth={1.4} />
            Aucun employé pour le moment. Embauchez ci-dessous.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((e) => {
              const cat = roles[e.role];
              const vis = ROLE_VIS[e.role];
              return (
                <div key={e.id} data-testid={`employee-${e.id}`} className="solid-card p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${vis.accent}`}>
                        <Briefcase className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      <div>
                        <div className="font-display text-base font-semibold text-stone-900">{cat.name}</div>
                        <div className="text-xs text-stone-500">Embauché jour {e.hired_day}</div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-stone-900">{fmtCur(cat.daily_salary)}/j</span>
                  </div>
                  <div className="mt-3 text-xs text-stone-600 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-emerald-700" strokeWidth={2} />
                    {cat.desc}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleFire(e.id)} disabled={busy === `fire-${e.id}`} className="w-full mt-4" data-testid={`fire-${e.id}`}>
                    <UserMinus className="h-3.5 w-3.5 mr-1.5 text-red-700" strokeWidth={1.8} />
                    Licencier
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">Profils disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(roles).map(([key, cat]) => {
            const vis = ROLE_VIS[key];
            const signup = cat.daily_salary * 3;
            return (
              <div key={key} data-testid={`hire-card-${key}`} className="solid-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${vis.accent}`}>
                      <Briefcase className="h-5 w-5" strokeWidth={1.7} />
                    </div>
                    <div>
                      <div className="font-display text-lg font-semibold text-stone-900">{cat.name}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{cat.desc}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-xl font-semibold text-stone-900">{fmtCur(cat.daily_salary)}</div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wide">/ jour</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-stone-100">
                  <span className="text-xs text-stone-500">Prime d'embauche: <strong className="text-stone-900">{fmtCur(signup)}</strong></span>
                  <Button onClick={() => handleHire(key)} disabled={busy === `hire-${key}`} size="sm" className="bg-emerald-800 hover:bg-emerald-700" data-testid={`hire-${key}`}>
                    {busy === `hire-${key}` ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <UserPlus className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.8} />}
                    Embaucher
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
