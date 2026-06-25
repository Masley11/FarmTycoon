import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }) {
  return (
    <div className="min-h-screen flex bg-stone-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 px-4 md:px-6 lg:px-10 py-6 lg:py-10 pb-24 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
