import { useState, useEffect, useCallback } from "react";
import { useLiveMatches } from "../hooks/useMatchData";
import { useT } from "../lib/i18n";
import { useWebSocket } from "../hooks/useWebSocket";
import MatchCard from "../components/MatchCard";
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
        const updated = { ...(exists || {}), id: data.match_id, home_score: data.home_score ?? 0, away_score: data.away_score ?? 0, status: data.status ?? "live" };
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

  // Find next upcoming match
  useEffect(() => {
    const findNext = async () => {
      try {
        const { default: axios } = await import("axios");
        const { API_BASE } = await import("../lib/utils");
        const { data } = await axios.get(`${API_BASE}/matches`);
        const upcoming = data
          .filter((m: any) => m.status === "scheduled")
          .sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
        setNextMatch(upcoming[0] || null);
      } catch { /* ignore */ }
    };
    findNext();
  }, [liveMatches]);

  // Countdown ticker
  useEffect(() => {
    if (!nextMatch) return;
    const tick = () => {
      const now = Date.now();
      const kickoff = new Date(nextMatch.match_date).getTime();
      const diff = kickoff - now;
      if (diff <= 0) { setCountdown("Starting soon..."); return; }
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        {t("liveMonitor")}
        {liveMatches.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
      </h1>

      {liveMatches.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {liveMatches.map((m: any) => (
            <div key={m.id} className={flashes.has(m.id) ? "animate-pulse" : ""}>
              <MatchCard {...m} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 space-y-4">
          <Radio size={48} className="text-gray-700 mx-auto" />
          <p className="text-gray-500 text-lg">{t("noMatchesLive")}</p>
          {nextMatch && (
            <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5 max-w-lg mx-auto space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Clock size={14} /> Next Match
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="font-bold text-white">{nextMatch.home_team?.name}</span>
                <span className="text-[#d4a843] font-bold">VS</span>
                <span className="font-bold text-white">{nextMatch.away_team?.name}</span>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(nextMatch.match_date).toLocaleString()} · {nextMatch.venue}
              </div>
              <div className="text-2xl font-mono font-bold text-[#d4a843]">{countdown}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
