import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number | ReactNode;
  color?: string;
  className?: string;
}

export default function StatCard({ icon: Icon, label, value, color = "from-brand-blue to-brand-blue-bright", className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -3, scale: 1.03 }}
      className={cn(
        "bg-bg-elevated border border-border-subtle hover:border-border-default rounded-2xl p-5 text-center transition-all duration-300",
        className
      )}
    >
      <div className={cn(
        "w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br flex items-center justify-center",
        color
      )}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-text-muted mt-0.5">{label}</div>
    </motion.div>
  );
}
