import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/layout/Brand";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy]         = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await login(email.trim(), password);
      toast.success("Connexion réussie");
      navigate(r.has_company ? "/" : "/onboarding", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Email ou mot de passe incorrect");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-emerald-50/40 to-amber-50/30 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Brand /></div>
        <div className="bg-white/80 backdrop-blur-xl border border-stone-200 rounded-2xl shadow-xl p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">Connexion</h1>
          <p className="text-sm text-stone-500 mt-1">Reprenez la gestion de votre ferme.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@ferme.fr" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-emerald-800 hover:bg-emerald-900">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            Pas encore de compte ?{" "}
            <Link to="/signup" className="text-emerald-800 font-medium hover:underline">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
