import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useLiveMatches } from "../hooks/useMatchData";
import { useT } from "../lib/i18n";
import { useWebSocket } from "../hooks/useWebSocket";
import MatchCard from "../components/MatchCard";
import PageTransition from "../components/PageTransition";
import { API_BASE } from "../lib/utils";
import { Clock, Radio } from "lucide-react";

export default function LiveMonitor() {
  const { t } = useT();
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [flashes, setFlashes] = useState<Set<string>>(new Set());
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [countdown, setCountdown] = useState("");

  const onWsMessage = useCallback((data: any) => {
    if (data.type === "score_update" || data.type === "goal" || data.type === "match_started") {
      setLiveMatches(prev => {
        const exists = prev.find(m => m.id === data.match_id);
        const updated = {
          ...(exists || {}),
          id: data.match_id,
          home_score: data.home_score ?? 0,
          away_score: data.away_score ?? 0,
          status: data.status ?? "live",
        };
        return exists ? prev.map(m => m.id === data.match_id ? updated : m) : [...prev, updated];
      });
      setFlashes(prev => new Set(prev).add(data.match_id));
      setTimeout(() => setFlashes(prev => { const s = new Set(prev); s.delete(data.match_id); return s; }), 2000);
    }
    if (data.type === "match_finished") {
      setLiveMatches(prev => prev.filter(m => m.id !== data.match_id));
    }
  }, []);

  useWebSocket(onWsMessage);
  const apiMatches = useLiveMatches();

  useEffect(() => { if (apiMatches.length > 0) setLiveMatches(apiMatches); }, [apiMatches]);

  useEffect(() => {
    const findNext = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/matches`);
        const upcoming = data
          .filter((m: any) => m.status === "scheduled")
          .sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
        setNextMatch(upcoming[0] || null);
      } catch { /* ignore */ }
    };
    findNext();
  }, [liveMatches]);

  useEffect(() => {
    if (!nextMatch) return;
    const tick = () => {
      const now = Date.now();
      const kickoff = new Date(nextMatch.match_date).getTime();
      const diff = kickoff - now;
      if (diff <= 0) { setCountdown("即将开赛..."); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(days > 0 ? `${days}d ${hours}h ${mins}m ${secs}s` : `${hours}h ${mins}m ${secs}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [nextMatch]);

  return (
    <PageTransition className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        {t("liveMonitor")}
        {liveMatches.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-normal text-red-400">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </h1>

      {liveMatches.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {liveMatches.map((m: any) => (
            <motion.div
              key={m.id}
              initial={flashes.has(m.id) ? { scale: 0.95 } : false}
              animate={flashes.has(m.id) ? { scale: 1 } : false}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="relative"
            >
              {flashes.has(m.id) && (
                <motion.div
                  initial={{ opacity: 1, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  transition={{ duration: 0.8 }}
                  className="absolute -inset-2 rounded-2xl bg-red-500/10 pointer-events-none"
                />
              )}
              <MatchCard {...m} />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 space-y-4"
        >
          <Radio size={48} className="text-text-muted mx-auto" />
          <p className="text-text-secondary text-lg">{t("noMatchesLive")}</p>
          {nextMatch && (
            <div className="bg-bg-elevated rounded-2xl p-6 border border-border-subtle max-w-lg mx-auto space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
                <Clock size={14} /> 下一场比赛
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="font-bold text-text-primary">{nextMatch.home_team?.name}</span>
                <span className="text-brand-gold font-bold">VS</span>
                <span className="font-bold text-text-primary">{nextMatch.away_team?.name}</span>
              </div>
              <div className="text-xs text-text-muted">
                {new Date(nextMatch.match_date).toLocaleString()} · {nextMatch.venue}
              </div>
              <div className="text-2xl font-mono font-bold text-brand-gold tabular-nums">{countdown}</div>
            </div>
          )}
        </motion.div>
      )}
    </PageTransition>
  );
}
