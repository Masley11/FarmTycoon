import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/layout/Brand";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [busy, setBusy]         = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8)  return toast.error("Mot de passe : 8 caractères minimum");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas");
    setBusy(true);
    try {
      await signup(email.trim(), password);
      toast.success("Compte créé !");
      navigate("/onboarding", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Impossible de créer le compte");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-emerald-50/40 to-amber-50/30 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Brand /></div>
        <div className="bg-white/80 backdrop-blur-xl border border-stone-200 rounded-2xl shadow-xl p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">Créer un compte</h1>
          <p className="text-sm text-stone-500 mt-1">Lancez votre exploitation en quelques secondes.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@ferme.fr" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" autoComplete="new-password" required minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input id="confirm" type="password" autoComplete="new-password" required
                value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-emerald-800 hover:bg-emerald-900">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer mon compte"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            Déjà inscrit ?{" "}
            <Link to="/login" className="text-emerald-800 font-medium hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
