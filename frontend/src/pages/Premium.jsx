import { useEffect, useState } from "react";
import { Crown, Check, Sparkles, Zap, BarChart3, Bell, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPremiumStatus, subscribePremium } from "@/lib/api";
import { toast } from "sonner";

const HERO_IMG = "https://images.unsplash.com/photo-1776799214275-7e68c756c573?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODB8MHwxfHNlYXJjaHwxfHxmYXJtJTIwc2lsbyUyMG1vZGVybnxlbnwwfHx8fDE3Nzg2MzM1ODh8MA&ixlib=rb-4.1.0&q=85";

export default function Premium() {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPremiumStatus().then(setInfo).catch(() => {});
  }, []);

  const handleSubscribe = async (tier) => {
    setBusy(true);
    try {
      const res = await subscribePremium();
      if (res.status === "pending_integration") {
        toast.info(res.message || "Intégration API Maketou en attente");
      }
    } catch (e) {
      toast.error("Impossible de souscrire pour le moment");
    } finally {
      setBusy(false);
    }
  };

  if (!info) return <div className="text-stone-500"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Chargement…</div>;

  return (
    <div className="space-y-8">
      <section
        data-testid="premium-hero"
        className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-900 text-white"
      >
        <img src={HERO_IMG} alt="Silos premium" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-900/70 to-stone-900/30" />
        <div className="relative p-8 md:p-12">
          <div className="flex items-center gap-2 text-amber-300 text-[10px] uppercase tracking-[0.2em] font-semibold">
            <Crown className="h-4 w-4" strokeWidth={1.7} />
            FarmTycoon+ Premium
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-semibold tracking-tight mt-3 max-w-2xl leading-tight">
            Passez à la vitesse supérieure.
          </h1>
          <p className="mt-4 text-sm md:text-base text-stone-300 max-w-xl leading-relaxed">
            Analytics avancés, automatisations, prévisions de marché et thèmes exclusifs. Conçu pour les exploitants qui veulent dominer leur marché.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs">
            <Lock className="h-3.5 w-3.5" strokeWidth={1.8} />
            Architecture prête — intégration Maketou en attente
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {info.tiers.map((t) => (
          <div key={t.id} data-testid={`tier-${t.id}`} className="solid-card p-8 relative overflow-hidden">
            {t.discount && (
              <div className="absolute top-5 right-5 px-2.5 py-1 rounded-md bg-amber-500 text-amber-950 text-[10px] font-bold uppercase tracking-wider">
                {t.discount} de remise
              </div>
            )}
            <div className="font-display text-xl font-semibold text-stone-900">{t.name}</div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-5xl font-semibold text-stone-900">{t.price}€</span>
              <span className="text-stone-500 text-sm">/{t.billing}</span>
            </div>
            <ul className="mt-6 space-y-2.5">
              {info.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
                  <Check className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" strokeWidth={2} />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleSubscribe(t.id)}
              disabled={busy}
              className="w-full mt-7 bg-stone-900 hover:bg-stone-800 text-white"
              data-testid={`subscribe-${t.id}`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" strokeWidth={1.7} />}
              Souscrire
            </Button>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureBlock icon={BarChart3} title="Analytics avancés" desc="Tableaux de bord, prévisions, rapports détaillés sur 90 jours." />
        <FeatureBlock icon={Zap} title="Automatisations" desc="Irrigation auto, achats programmés, alertes intelligentes." />
        <FeatureBlock icon={Bell} title="Priorités contrats" desc="Accès anticipé aux meilleurs contrats du marché." />
      </section>
    </div>
  );
}

function FeatureBlock({ icon: Icon, title, desc }) {
  return (
    <div className="solid-card p-6">
      <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
        <Icon className="h-5 w-5" strokeWidth={1.7} />
      </div>
      <div className="font-display text-base font-semibold text-stone-900 mt-4">{title}</div>
      <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">{desc}</p>
    </div>
  );
}
