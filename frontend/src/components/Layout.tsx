import { NavLink, Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Calendar, Users, BarChart3, Radio, Lightbulb, Brain, Languages } from "lucide-react";
import { cn } from "../lib/utils";
import { useT } from "../lib/i18n";
import ScrollProgress from "./ScrollProgress";

const navItems = [
  { to: "/", labelKey: "dashboard", icon: Trophy },
  { to: "/schedule", labelKey: "schedule", icon: Calendar },
  { to: "/teams", labelKey: "teams", icon: Users },
  { to: "/predictions", labelKey: "predictions", icon: BarChart3 },
  { to: "/live", labelKey: "live", icon: Radio },
  { to: "/insights", labelKey: "insights", icon: Lightbulb },
  { to: "/ai-lab", labelKey: "aiLab", icon: Brain },
];

export default function Layout() {
  const { t, lang, toggleLang } = useT();

  return (
    <div className="h-screen bg-bg-deep text-text-primary flex overflow-hidden">
      <ScrollProgress />
      {/* Sidebar */}
      <aside className="w-16 lg:w-56 border-r border-border-subtle flex flex-col py-4 px-2 lg:px-4 gap-1 shrink-0 h-screen overflow-y-auto">
        <div className="text-brand-gold font-bold text-lg mb-6 hidden lg:block tracking-tight">
          {t("wc2026")}
        </div>
        {navItems.map(({ to, labelKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-200",
                isActive
                  ? "bg-brand-blue text-white"
                  : "text-text-muted hover:text-text-primary hover:bg-bg-elevated"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-brand-blue rounded-lg"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={20} className="relative z-10" />
                <span className="hidden lg:inline relative z-10">{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Lang toggle */}
        <div className="mt-auto pt-4 border-t border-border-subtle">
          <button
            onClick={toggleLang}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors w-full"
          >
            <Languages size={20} />
            <span className="hidden lg:inline">{lang === "en" ? "中文" : "EN"}</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto h-screen">
        <Outlet />
      </main>
    </div>
  );
}
