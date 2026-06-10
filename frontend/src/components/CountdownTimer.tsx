import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { API_BASE } from "../lib/utils";
import { useT } from "../lib/i18n";

function FlipNumber({ value }: { value: number }) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={value}
        initial={{ y: 12, opacity: 0, filter: "blur(4px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        exit={{ y: -12, opacity: 0, filter: "blur(4px)" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="block"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

export default function CountdownTimer() {
  const { t } = useT();
  const [now, setNow] = useState(new Date());
  const [kickoff, setKickoff] = useState<Date | null>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/matches`).then(r => {
      const upcoming = r.data
        .filter((m: any) => m.status === "scheduled")
        .sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
      if (upcoming[0]) setKickoff(new Date(upcoming[0].match_date));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!kickoff) return <div className="text-xl text-text-muted">加载中...</div>;

  const diff = kickoff.getTime() - now.getTime();
  if (diff <= 0)
    return <div className="text-2xl font-bold text-brand-gold">{t("worldCupHere")}</div>;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const blocks = days > 0
    ? [{ v: days, l: t("days") }, { v: hours, l: t("hours") }, { v: minutes, l: t("minutes") }, { v: seconds, l: t("seconds") }]
    : [{ v: hours, l: t("hours") }, { v: minutes, l: t("minutes") }, { v: seconds, l: t("seconds") }];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex gap-3 text-center"
    >
      {blocks.map(({ v, l }) => (
        <div key={l} className="bg-bg-overlay backdrop-blur rounded-xl p-4 min-w-[80px] border border-border-subtle">
          <div className="text-3xl font-bold text-brand-gold tabular-nums overflow-hidden">
            <FlipNumber value={v} />
          </div>
          <div className="text-xs text-text-muted mt-1">{l}</div>
        </div>
      ))}
    </motion.div>
  );
}
