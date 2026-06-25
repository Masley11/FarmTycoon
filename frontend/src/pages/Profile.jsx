import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { deleteCompany } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { LogOut, Trash2, Loader2 } from "lucide-react";

const SPEC_LABEL = {
  cerealier:  { emoji: "🌾", name: "Céréalier" },
  mecanicien: { emoji: "🚜", name: "Mécanicien" },
  commercant: { emoji: "💰", name: "Commerçant" },
};

export default function Profile() {
  const { user, logout, markHasCompany, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const company = user?.company;
  const spec = company ? SPEC_LABEL[company.specialization] : null;

  const onDelete = async () => {
    if (confirmText !== "SUPPRIMER") return;
    setBusy(true);
    try {
      await deleteCompany("SUPPRIMER");
      toast.success("Entreprise supprimée");
      markHasCompany(false);
      await refreshMe();
      navigate("/onboarding", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Suppression impossible");
    } finally {
      setBusy(false);
      setConfirmText("");
    }
  };

  const onLogout = () => { logout(); navigate("/login", { replace: true }); };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-stone-900">
          Mon profil
        </h1>
        <p className="text-sm text-stone-500 mt-1">Gérez votre compte et votre exploitation.</p>
      </header>

      {/* Compte */}
      <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 mb-4">Compte</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-stone-100 pb-2">
            <dt className="text-stone-500">Email</dt>
            <dd className="font-medium text-stone-900">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Inscrit le</dt>
            <dd className="font-medium text-stone-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}
            </dd>
          </div>
        </dl>
        <Button onClick={onLogout} variant="outline" className="mt-5">
          <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
        </Button>
      </section>

      {/* Entreprise */}
      <section className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-400 mb-4">Entreprise</h2>
        {company ? (
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-stone-100 pb-2">
              <dt className="text-stone-500">Nom</dt>
              <dd className="font-medium text-stone-900">{company.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500">Spécialisation</dt>
              <dd className="font-medium text-stone-900">
                {spec ? `${spec.emoji} ${spec.name}` : company.specialization}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-stone-500">Aucune entreprise active.</p>
        )}
      </section>

      {/* Zone dangereuse */}
      <section className="bg-red-50/40 border border-red-200 rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-red-700 mb-2">Zone dangereuse</h2>
        <p className="text-sm text-stone-600 mb-4">
          Cette action supprime définitivement votre entreprise, vos parcelles, votre inventaire et votre historique.
          Votre compte sera conservé pour recréer une nouvelle ferme.
        </p>

        <AlertDialog onOpenChange={(o) => !o && setConfirmText("")}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer mon entreprise
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer votre entreprise ?</AlertDialogTitle>
              <AlertDialogDescription>
                Action <strong>irréversible</strong>. Toutes vos données de jeu seront effacées.
                Pour confirmer, tapez <code className="px-1.5 py-0.5 bg-stone-100 rounded text-red-700 font-mono">SUPPRIMER</code> ci-dessous.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete" className="sr-only">Confirmation</Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                autoComplete="off"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={confirmText !== "SUPPRIMER" || busy}
                className="bg-red-600 hover:bg-red-700"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Supprimer définitivement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
