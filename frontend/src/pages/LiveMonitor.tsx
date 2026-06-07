import { useState, useEffect, useCallback } from "react";
import { useLiveMatches } from "../hooks/useMatchData";
import { useWebSocket } from "../hooks/useWebSocket";
import MatchCard from "../components/MatchCard";

export default function LiveMonitor() {
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [flashes, setFlashes] = useState<Set<string>>(new Set());

  const onWsMessage = useCallback((data: any) => {
    if (data.type === "score_update") {
      setLiveMatches(prev => prev.map(m =>
        m.id === data.match_id ? { ...m, home_score: data.home_score, away_score: data.away_score } : m
      ));
      setFlashes(prev => new Set(prev).add(data.match_id));
      setTimeout(() => setFlashes(prev => {
        const s = new Set(prev); s.delete(data.match_id); return s;
      }), 2000);
    }
  }, []);

  useWebSocket(onWsMessage);
  const apiMatches = useLiveMatches();

  useEffect(() => { if (apiMatches.length > 0) setLiveMatches(apiMatches); }, [apiMatches]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        Live Monitor <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
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
        <p className="text-gray-500">No matches currently live.</p>
      )}
    </div>
  );
}
