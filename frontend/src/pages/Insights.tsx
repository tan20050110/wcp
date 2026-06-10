import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useT } from "../lib/i18n";
import { API_BASE } from "../lib/utils";
import PageTransition from "../components/PageTransition";
import { AlertTriangle } from "lucide-react";

export default function Insights() {
  const { t } = useT();
  const [upsets, setUpsets] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`${API_BASE}/analysis/upsets`).then(r => setUpsets(r.data));
  }, []);

  const topCold = upsets.filter((u: any) => u.upset_index > 0.5);
  const medRisk = upsets.filter((u: any) => u.upset_index > 0.3 && u.upset_index <= 0.5);
  const lowRisk = upsets.filter((u: any) => u.upset_index <= 0.3);
  const allRanked = [...upsets].sort((a, b) => b.upset_index - a.upset_index);

  const summaryCards = [
    { count: topCold.length, label: t("highRisk"), sub: ">50%", color: "text-orange-400" },
    { count: medRisk.length, label: t("medRisk"), sub: "30-50%", color: "text-brand-gold" },
    { count: lowRisk.length, label: t("lowRisk"), sub: "<30%", color: "text-blue-400" },
  ];

  return (
    <PageTransition className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dataInsights")}</h1>

      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map(({ count, label, sub, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-elevated rounded-xl p-4 text-center border border-border-subtle"
          >
            <div className={`text-2xl font-bold ${color} tabular-nums`}>{count}</div>
            <div className="text-xs text-text-muted mt-1">{label} ({sub})</div>
          </motion.div>
        ))}
      </div>

      <div className="bg-bg-elevated rounded-xl p-6 border border-border-subtle">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-orange-400" /> {t("upsetTitle")}
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Higher = more likely to cause an upset. Based on FIFA rank, ELO rating, and group strength.
        </p>
        <motion.div
          initial="initial"
          animate="animate"
          variants={{ animate: { transition: { staggerChildren: 0.03 } } }}
          className="space-y-1 max-h-[600px] overflow-y-auto"
        >
          {allRanked.map((u: any, i: number) => (
            <motion.div
              key={u.team_id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 hover:bg-bg-hover rounded-lg p-2 transition-all"
            >
              <span className="text-xs text-text-muted w-8 text-right tabular-nums">#{i + 1}</span>
              <span className="inline-flex items-center justify-center w-9 h-6 rounded bg-brand-blue text-white text-[10px] font-bold">
                {u.fifa_code}
              </span>
              <span className="flex-1 text-sm">{u.name}</span>
              <span className="text-xs text-text-muted w-10">Gr.{u.group}</span>
              <span className="text-xs text-text-muted w-10 text-right">#{u.fifa_rank}</span>
              <div className="w-28 h-2 bg-bg-overlay rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, u.upset_index * 100)}%` }}
                  transition={{ duration: 0.4, delay: i * 0.02 }}
                  className={`h-full rounded-full ${
                    u.upset_index > 0.5 ? "bg-orange-500" : u.upset_index > 0.3 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                />
              </div>
              <span className={`text-xs w-12 text-right font-medium tabular-nums ${
                u.upset_index > 0.5 ? "text-orange-400" : u.upset_index > 0.3 ? "text-yellow-400" : "text-blue-400"
              }`}>
                {(u.upset_index * 100).toFixed(0)}%
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </PageTransition>
  );
}
