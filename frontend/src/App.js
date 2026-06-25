import "@/App.css";
import { Component } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { GameProvider, useGame } from "@/context/GameContext";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Lands from "@/pages/Lands";
import Crops from "@/pages/Crops";
import Market from "@/pages/Market";
import Resources from "@/pages/Resources";
import Premium from "@/pages/Premium";
import Missions from "@/pages/Missions";
import Livestock from "@/pages/Livestock";
import Vehicles from "@/pages/Vehicles";
import Employees from "@/pages/Employees";
import Upgrades from "@/pages/Upgrades";
import Warehouse from "@/pages/Warehouse";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import CreateCompany from "@/pages/CreateCompany";
import Profile from "@/pages/Profile";

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-800" />
    </div>
  );
}

function GameLoadingScreen({ message = "Chargement de l'exploitation…" }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-stone-500">
      <Loader2 className="h-7 w-7 animate-spin text-emerald-800 mb-3" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

function ServerRestartingScreen() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center text-stone-500">
      <Loader2 className="h-7 w-7 animate-spin text-emerald-800 mb-3" />
      <h1 className="font-display text-xl font-semibold text-stone-900">Serveur en cours de redémarrage</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed">
        Reconnexion à l'exploitation en cours. Vos données sont conservées dans la base et la page se resynchronisera automatiquement.
      </p>
    </div>
  );
}

class GameErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Erreur de rendu du jeu:", error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <GameLoadingScreen message="Synchronisation des données de l'exploitation…" />
      );
    }
    return this.props.children;
  }
}

// Garde : doit être connecté
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user)   return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

// Garde : doit avoir une entreprise (sinon → onboarding)
function RequireCompany({ children }) {
  const { hasCompany, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!hasCompany) return <Navigate to="/onboarding" replace />;
  return children;
}

// Empêche d'aller sur /login ou /signup si déjà connecté
function PublicOnly({ children }) {
  const { user, hasCompany, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user)    return <Navigate to={hasCompany ? "/" : "/onboarding"} replace />;
  return children;
}

function GameRoutes() {
  const location = useLocation();

  return (
    <GameProvider>
      <GameRouteContent resetKey={location.pathname} />
    </GameProvider>
  );
}

function GameRouteContent({ resetKey }) {
  const { data, loading, error } = useGame();
  const hasEssentialData = !!data?.state && !!data?.catalog;

  return (
    <AppShell>
      <GameErrorBoundary resetKey={resetKey}>
        {error === "SERVER_RESTARTING" ? (
          <ServerRestartingScreen />
        ) : loading || !hasEssentialData ? (
          <GameLoadingScreen />
        ) : (
          <Routes>
            <Route path="/"           element={<Dashboard />} />
            <Route path="/lands"      element={<Lands />} />
            <Route path="/crops"      element={<Crops />} />
            <Route path="/market"     element={<Market />} />
            <Route path="/resources"  element={<Resources />} />
            <Route path="/livestock"  element={<Livestock />} />
            <Route path="/warehouse"  element={<Warehouse />} />
            <Route path="/vehicles"   element={<Vehicles />} />
            <Route path="/employees"  element={<Employees />} />
            <Route path="/upgrades"   element={<Upgrades />} />
            <Route path="/missions"   element={<Missions />} />
            <Route path="/premium"    element={<Premium />} />
            <Route path="/profile"    element={<Profile />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </GameErrorBoundary>
    </AppShell>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login"      element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup"     element={<PublicOnly><Signup /></PublicOnly>} />
            <Route path="/onboarding" element={<RequireAuth><CreateCompany /></RequireAuth>} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <RequireCompany>
                    <GameRoutes />
                  </RequireCompany>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </div>
  );
}

export default App;
