import { Target, Trophy, Sparkles, Check, Loader2, Calendar, Star, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useGame } from "@/context/GameContext";

// ── Types de missions ─────────────────────────────────────────────────────────
const MISSION_TYPE_STYLES = {
  daily:   { label: "Quotidienne", color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", icon: Zap },
  weekly:  { label: "Hebdomadaire", color: "text-blue-700",   bg: "bg-blue-50",     border: "border-blue-200",   icon: Calendar },
  achieve: { label: "Achievement",  color: "text-amber-700",  bg: "bg-amber-50",    border: "border-amber-200",  icon: Star },
};

function formatProgress(p) {
  if (p === undefined || p === null) return "0";
  return Number.isInteger(p) ? p : parseFloat(p).toFixed(1);
}

function MissionCard({ m, compact }) {
  const reverse = !!m.reverse;
  const pct     = reverse
    ? Math.max(0, 100 - (Math.min(m.progress, m.target * 1.5) / m.target) * 100)
    : Math.min(100, ((m.progress || 0) / m.target) * 100);

  const typeKey  = m.type || "daily";
  const typeStyle = MISSION_TYPE_STYLES[typeKey] || MISSION_TYPE_STYLES.daily;
  const TypeIcon  = typeStyle.icon;

  const isClaimed   = m.claimed;
  const isCompleted = m.completed && !m.claimed;
  const isReverse   = reverse && !m.claimed;

  return (
    <div
      data-testid={`mission-${m.id}`}
      className={`p-3 rounded-xl border transition-all ${
        isClaimed
          ? "bg-stone-50 border-stone-100 opacity-60"
          : isCompleted
          ? `${typeStyle.bg} ${typeStyle.border} shadow-sm`
          : "bg-white border-stone-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icône statut */}
        <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isClaimed   ? "bg-stone-100" :
          isCompleted ? typeStyle.bg   : "bg-stone-50"
        }`}>
          {isClaimed ? (
            <Check className="h-4 w-4 text-stone-400" strokeWidth={2.5} />
          ) : isCompleted ? (
            <Sparkles className={`h-4 w-4 ${typeStyle.color}`} strokeWidth={2} />
          ) : (
            <TypeIcon className="h-4 w-4 text-stone-400" strokeWidth={1.8} />
          )}
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className={`text-sm font-semibold truncate block ${
                isClaimed ? "text-stone-400 line-through" : "text-stone-900"
              }`}>
                {m.title}
              </span>
              {!compact && (
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{m.desc}</p>
              )}
            </div>

            {/* Récompenses */}
            <div className="text-right flex-shrink-0">
              {m.xp > 0 && (
                <div className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 justify-end ${typeStyle.color}`}>
                  <Sparkles className="h-2.5 w-2.5" strokeWidth={2} />
                  +{m.xp} XP
                </div>
              )}
              {m.cash > 0 && (
                <div className="text-[10px] text-stone-500 font-medium">+{m.cash}€</div>
              )}
              {m.credits > 0 && (
                <div className="text-[10px] text-amber-600 font-semibold">+{m.credits} 💎</div>
              )}
            </div>
          </div>

          {/* Barre de progression */}
          {!isClaimed && (
            <div className="mt-2">
              <Progress value={pct} className="h-1.5" />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-stone-400">
                  {reverse
                    ? `${formatProgress(m.progress)} / max ${m.target} ${m.unit}`
                    : `${formatProgress(m.progress)} / ${m.target} ${m.unit}`
                  }
                </span>
                {isCompleted && (
                  <span className={`text-[10px] font-semibold animate-pulse ${typeStyle.color}`}>
                    ✓ Récompense en cours…
                  </span>
                )}
                {isReverse && (
                  <span className="text-[10px] text-stone-400">Évalué en fin de journée</span>
                )}
              </div>
            </div>
          )}

          {isClaimed && (
            <div className="mt-1.5 text-[10px] text-stone-400 font-medium">
              ✓ Récompense obtenue automatiquement
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function MissionsPanel({ compact = false, max }) {
  const { data } = useGame();
  const missions  = (data?.missions || []).slice(0, max || 99);
  const level     = data?.level;

  const completed = missions.filter((m) => m.claimed).length;
  const total     = missions.length;

  return (
    <div data-testid="missions-panel" className="solid-card p-5">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="ft-label flex items-center gap-1.5">
            <Target className="h-3 w-3" strokeWidth={2} />
            Défis actifs
          </div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-stone-900 mt-0.5">
            Missions
          </h3>
        </div>

        {/* Niveau + progression */}
        {level && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] text-stone-500 uppercase tracking-wide">Niveau</div>
              <div className="font-display text-lg font-bold text-stone-900 leading-none">
                {level.level}
              </div>
            </div>
            <div className="relative h-10 w-10 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(20 6% 90%)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15"
                  fill="none" stroke="hsl(160 84% 25%)"
                  strokeWidth="3"
                  strokeDasharray={`${(level.progress_pct / 100) * 94.2} 94.2`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="h-3.5 w-3.5 text-emerald-800" strokeWidth={2} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progression globale */}
      {total > 0 && (
        <div className="mb-4 p-2.5 rounded-lg bg-stone-50 border border-stone-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-stone-500 font-medium">
              {completed}/{total} missions complétées
            </span>
            <span className="text-xs font-bold text-emerald-700">
              {Math.round((completed / total) * 100)}%
            </span>
          </div>
          <Progress value={(completed / total) * 100} className="h-1" />
        </div>
      )}

      {/* Note auto-claim */}
      <div className="mb-3 flex items-center gap-1.5 text-[10px] text-stone-400">
        <Zap className="h-3 w-3" strokeWidth={2} />
        Les récompenses sont attribuées automatiquement dès qu'une mission est complétée.
      </div>

      {/* Liste missions */}
      <div className={compact ? "space-y-2" : "space-y-2.5"}>
        {missions.length === 0 && (
          <p className="text-sm text-stone-500 py-6 text-center">
            Aucune mission active. Revenez demain !
          </p>
        )}
        {missions.map((m) => (
          <MissionCard key={m.instance_id} m={m} compact={compact} />
        ))}
      </div>

      {/* Info prochain niveau */}
      {level?.next_unlock && (
        <div className="mt-4 pt-4 border-t border-stone-100">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Star className="h-3.5 w-3.5 text-amber-500" strokeWidth={2} />
            <span>
              Niveau {level.next_unlock.level} — débloque:{" "}
              <strong className="text-stone-700">{level.next_unlock.desc}</strong>
            </span>
          </div>
          <div className="mt-2">
            <Progress value={level.progress_pct || 0} className="h-1.5" />
            <div className="text-[10px] text-stone-400 mt-1 text-right">
              {level.xp_to_next} XP restants
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LevelBadge({ level, credits }) {
  return (
    <div data-testid="level-badge" className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-stone-500 font-medium">Niveau</div>
        <div className="font-display font-semibold text-stone-900 leading-none mt-0.5">
          {level?.level ?? 1}
          <span className="text-xs text-stone-400 font-normal ml-1">· {level?.xp ?? 0} XP</span>
        </div>
      </div>
      <div className="relative h-10 w-10">
        <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(20 6% 90%)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15"
            fill="none" stroke="hsl(160 84% 25%)"
            strokeWidth="3"
            strokeDasharray={`${((level?.progress_pct ?? 0) / 100) * 94.2} 94.2`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Trophy className="h-3.5 w-3.5 text-emerald-800" strokeWidth={2} />
        </div>
      </div>
      {credits > 0 && (
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 border border-amber-200">
          <Sparkles className="h-3 w-3 text-amber-700" strokeWidth={2} />
          <span className="text-xs font-semibold text-amber-800">{credits}</span>
        </div>
      )}
    </div>
  );
      }
