import { NavLink, Outlet } from "react-router-dom";
import { Trophy, Calendar, Users, BarChart3, Radio, Lightbulb } from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: Trophy },
  { to: "/schedule", label: "Schedule", icon: Calendar },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/predictions", label: "Predictions", icon: BarChart3 },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/insights", label: "Insights", icon: Lightbulb },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white flex">
      <aside className="w-16 lg:w-56 border-r border-white/10 flex flex-col py-4 px-2 lg:px-4 gap-1 shrink-0">
        <div className="text-[#d4a843] font-bold text-lg mb-6 hidden lg:block">WC 2026</div>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive ? "bg-[#1a5632] text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
              )
            }
          >
            <Icon size={20} />
            <span className="hidden lg:inline">{label}</span>
          </NavLink>
        ))}
      </aside>
      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
