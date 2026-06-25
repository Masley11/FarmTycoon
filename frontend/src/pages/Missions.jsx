import { useGame } from "@/context/GameContext";
import { MissionsPanel, LevelBadge } from "@/components/missions/MissionsPanel";
import { Loader2, Trophy, Sparkles, Lock, Palette } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const COSMETIC_TIERS = [
  { level: 3, name: "Thème Classique", id: "theme_classic" },
  { level: 5, name: "Thème Émeraude", id: "theme_emerald" },
  { level: 8, name: "Thème Terracotta", id: "theme_terracotta" },
  { level: 12, name: "Thème Midnight", id: "theme_midnight" },
  { level: 18, name: "Bannière Récolte d'Or", id: "banner_harvest" },
];

export default function Missions() {
  const { data, loading } = useGame();
  if (loading && !data) {
    return <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>;
  }

  const level = data.level;
  const credits = data.state.premium_credits || 0;
  const owned = new Set((data.state.cosmetics || []).map((c) => c.id));

  return (
    <div className="space-y-8">
      <header>
        <span className="ft-label">Progression & défis</span>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-stone-900 mt-2 tracking-tight">
          Missions quotidiennes
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl">
          Connectez-vous chaque jour pour des défis simples et satisfaisants. Gagnez de l'XP, des crédits FarmTycoon+ et débloquez des cosmétiques. <strong>Aucun paywall.</strong>
        </p>
      </header>

      {/* Progression card */}
      <section className="solid-card p-6 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-sm">
              <Trophy className="h-6 w-6" strokeWidth={1.7} />
            </div>
            <div>
              <div className="ft-label">Votre niveau</div>
              <div className="font-display text-3xl font-semibold text-stone-900 leading-none mt-1">
                Niveau {level.level}
              </div>
              <div className="text-xs text-stone-500 mt-1">
                {level.xp} XP total · {level.xp_to_next} XP avant le niveau {level.level + 1}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
            <Sparkles className="h-4 w-4 text-amber-700" strokeWidth={2} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-medium">Crédits Premium</div>
              <div className="font-display text-xl font-semibold text-amber-900">{credits}</div>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <Progress value={level.progress_pct} className="h-2" />
          <div className="flex justify-between mt-1.5 text-[10px] text-stone-500 uppercase tracking-wider">
            <span>Niveau {level.level}</span>
            <span>{level.progress_pct}%</span>
            <span>Niveau {level.level + 1}</span>
          </div>
        </div>
      </section>

      {/* Today's missions */}
      <MissionsPanel />

      {/* Cosmetics */}
      <section>
        <h2 className="font-display text-lg font-semibold text-stone-900 mb-4">
          Cosmétiques débloquables
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {COSMETIC_TIERS.map((c) => {
            const unlocked = owned.has(c.id);
            return (
              <div
                key={c.id}
                data-testid={`cosmetic-${c.id}`}
                className={`p-4 rounded-xl border ${unlocked ? "bg-emerald-50 border-emerald-200" : "bg-stone-50 border-stone-200"}`}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${unlocked ? "bg-emerald-800 text-white" : "bg-stone-200 text-stone-500"}`}>
                  {unlocked ? <Palette className="h-5 w-5" strokeWidth={1.7} /> : <Lock className="h-4 w-4" strokeWidth={1.7} />}
                </div>
                <div className="font-display text-sm font-semibold text-stone-900 mt-3">{c.name}</div>
                <div className="text-[10px] text-stone-500 mt-0.5 uppercase tracking-wide">
                  {unlocked ? "Débloqué" : `Niveau ${c.level}`}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
