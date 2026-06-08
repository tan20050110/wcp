import { NavLink, Outlet } from "react-router-dom";
import { Trophy, Calendar, Users, BarChart3, Radio, Lightbulb, Brain, Languages } from "lucide-react";
import { cn } from "../lib/utils";
import { useT } from "../lib/i18n";

export default function Layout() {
  const { t, lang, toggleLang } = useT();

  const navItems = [
    { to: "/", label: t("dashboard"), icon: Trophy },
    { to: "/schedule", label: t("schedule"), icon: Calendar },
    { to: "/teams", label: t("teams"), icon: Users },
    { to: "/predictions", label: t("predictions"), icon: BarChart3 },
    { to: "/live", label: t("live"), icon: Radio },
    { to: "/insights", label: t("insights"), icon: Lightbulb },
    { to: "/ai-lab", label: t("aiLab"), icon: Brain },
  ];

  return (
    <div className="h-screen bg-[#0a0f1a] text-white flex overflow-hidden">
      <aside className="w-16 lg:w-56 border-r border-white/10 flex flex-col py-4 px-2 lg:px-4 gap-1 shrink-0 h-screen overflow-y-auto sticky top-0">
        <div className="text-[#d4a843] font-bold text-lg mb-6 hidden lg:block">{t("wc2026")}</div>
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
        <div className="mt-auto pt-4 border-t border-white/10">
          <button
            onClick={toggleLang}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors w-full"
          >
            <Languages size={20} />
            <span className="hidden lg:inline">{lang === "en" ? "中文" : "EN"}</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
}
