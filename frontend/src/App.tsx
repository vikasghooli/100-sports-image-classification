import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { BarChart3, Gauge, History, Info, Layers, LayoutDashboard, Menu, ScanSearch, Trophy, X } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Predict from "./pages/Predict";
import Batch from "./pages/Batch";
import HistoryPage from "./pages/History";
import PredictionDetail from "./pages/PredictionDetail";
import Analytics from "./pages/Analytics";
import Sports from "./pages/Sports";
import ModelPerformance from "./pages/ModelPerformance";
import About from "./pages/About";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/predict", label: "Predict", icon: ScanSearch },
  { to: "/batch", label: "Batch Prediction", icon: Layers },
  { to: "/history", label: "History", icon: History },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/sports", label: "100 Sports", icon: Trophy },
  { to: "/performance", label: "Model Performance", icon: Gauge },
  { to: "/about", label: "About", icon: Info },
];

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen lg:flex">
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-slate-900 p-4 text-slate-200 transition lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-6 flex items-center justify-between">
          <div><p className="text-lg font-bold text-white">🏅 100 Sports Image Classification</p></div>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X /></button>
        </div>
        <nav className="space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? "bg-emerald-600 text-white" : "hover:bg-slate-800"}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {open && <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <div className="min-w-0 flex-1">
        <header className="flex items-center gap-3 bg-white p-3 shadow-sm lg:hidden">
          <button onClick={() => setOpen(true)}><Menu /></button><span className="font-semibold">100 Sports Image Classification</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/batch" element={<Batch />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:id" element={<PredictionDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/sports" element={<Sports />} />
            <Route path="/performance" element={<ModelPerformance />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<p className="p-8 text-center text-slate-500">Page not found.</p>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
