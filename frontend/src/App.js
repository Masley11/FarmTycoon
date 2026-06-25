import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { GameProvider } from "@/context/GameContext";
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

function App() {
  return (
    <div className="App">
      <GameProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/lands" element={<Lands />} />
              <Route path="/crops" element={<Crops />} />
              <Route path="/market" element={<Market />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/livestock" element={<Livestock />} />
              <Route path="/warehouse" element={<Warehouse />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/upgrades" element={<Upgrades />} />
              <Route path="/missions" element={<Missions />} />
              <Route path="/premium" element={<Premium />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </GameProvider>
    </div>
  );
}

export default App;
