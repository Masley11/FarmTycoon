import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createCompany } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/layout/Brand";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";

const SPECS = [
  { key: "cerealier",  emoji: "🌾", name: "Céréalier",   bonus: "Croissance des cultures +10 %" },
  { key: "mecanicien", emoji: "🚜", name: "Mécanicien",  bonus: "Coût des améliorations −15 %" },
  { key: "commercant", emoji: "💰", name: "Commerçant",  bonus: "Prix de vente +5 %" },
];

export default function CreateCompany() {
  const { markHasCompany, refreshMe, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [spec, setSpec] = useState("cerealier");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Nom : 2 caractères minimum");
    setBusy(true);
    try {
      await createCompany(name.trim(), spec);
      markHasCompany(true);
      toast.success("Bienvenue à la ferme !");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Impossible de créer l'entreprise");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-emerald-50/40 to-amber-50/30 px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8"><Brand /></div>
        <div className="bg-white/80 backdrop-blur-xl border border-stone-200 rounded-2xl shadow-xl p-6 md:p-10">
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-stone-900">
            Créez votre entreprise
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Choisissez un nom et une spécialisation. Vous pourrez la modifier en réinitialisant votre ferme.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom de l'entreprise</Label>
              <Input id="name" required maxLength={60} value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ferme des Trois Chênes" />
            </div>

            <div>
              <Label className="mb-3 block">Spécialisation de départ</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SPECS.map((s) => {
                  const active = spec === s.key;
                  return (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => setSpec(s.key)}
                      className={[
                        "relative text-left rounded-xl border p-4 transition-all",
                        active
                          ? "border-emerald-700 bg-emerald-50 shadow-sm ring-2 ring-emerald-700/20"
                          : "border-stone-200 bg-white hover:border-stone-300",
                      ].join(" ")}
                    >
                      {active && (
                        <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <div className="text-2xl">{s.emoji}</div>
                      <div className="mt-2 font-semibold text-stone-900">{s.name}</div>
                      <div className="text-xs text-stone-500 mt-1 leading-relaxed">{s.bonus}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => { logout(); navigate("/login"); }}
                className="text-stone-500">
                Se déconnecter
              </Button>
              <Button type="submit" disabled={busy} className="flex-1 bg-emerald-800 hover:bg-emerald-900">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lancer mon exploitation"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
