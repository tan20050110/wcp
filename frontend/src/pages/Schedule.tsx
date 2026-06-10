import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useMatches } from "../hooks/useMatchData";
import MatchCard from "../components/MatchCard";
import PageTransition from "../components/PageTransition";
import { API_BASE, getFlagUrl } from "../lib/utils";
import { useT } from "../lib/i18n";
import { Play, Loader2 } from "lucide-react";

const STAGES = ["", "group", "round32", "round16", "quarter", "semi", "third", "final"];
const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

const stageNames: Record<string, string> = {
  group: "Group Stage", round32: "Round of 32", round16: "Round of 16",
  quarter: "Quarter-finals", semi: "Semi-finals", third: "3rd Place", final: "Final",
};

function groupMatchesByDate(matches: any[]) {
  const groups: Record<string, any[]> = {};
  for (const m of matches) {
    const date = new Date(m.match_date).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(m);
  }
  return Object.entries(groups);
}

export default function Schedule() {
  const { t } = useT();
  const [stage, setStage] = useState("");
  const [group, setGroup] = useState("");
  const [activeTab, setActiveTab] = useState<"matches" | "standings" | "bracket">("matches");
  const [standings, setStandings] = useState<any[]>([]);
  const [bracket, setBracket] = useState<any[]>([]);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);
  const { matches } = useMatches({ stage, group });

  useEffect(() => {
    axios.get(`${API_BASE}/analysis/standings`).then(r => setStandings(r.data));
    axios.get(`${API_BASE}/analysis/bracket`).then(r => setBracket(r.data));
  }, []);

  const matchesByDate = useMemo(() => groupMatchesByDate(matches), [matches]);

  const runBracketSim = async () => {
    setSimLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/predictions/simulate`, { total_simulations: 1 });
      setSimResult(data);
    } catch { /* ignore */ }
    setSimLoading(false);
  };

  const teamNames = useMemo(() => {
    if (!simResult?.results_json?.champions) return {};
    const all: Record<string, string> = {};
    for (const key of ["champions", "finalists", "semifinalists"]) {
      for (const name of Object.keys(simResult.results_json[key] || {})) {
        all[name] = name;
      }
    }
    return all;
  }, [simResult]);

  const filledBracket = useMemo(() => {
    if (Object.keys(teamNames).length === 0) return null;
    const shuffled = Object.keys(teamNames).sort(() => Math.random() - 0.5);
    let idx = 0;
    const pick = () => shuffled[idx++ % shuffled.length];
    return bracket.map((round: any) => ({
      ...round,
      matches: round.matches.map((m: any) => ({ ...m, home: pick(), away: pick() })),
    }));
  }, [bracket, teamNames, simResult]);

  const tabs = ["matches", "standings", "bracket"] as const;

  return (
    <PageTransition className="space-y-6">
      <h1 className="text-2xl font-bold">{t("schedule")}</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-bg-elevated rounded-xl p-1 w-fit border border-border-subtle">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? "text-white" : "text-text-muted hover:text-text-primary"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="schedule-tab"
                className="absolute inset-0 bg-brand-blue rounded-lg"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              {t(tab === "matches" ? "matchesTab" : tab === "standings" ? "standingsTab" : "bracketTab")}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "matches" ? (
          <motion.div
            key="matches"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="flex gap-3 flex-wrap">
              <select value={stage} onChange={e => setStage(e.target.value)}
                className="bg-bg-elevated border border-border-default rounded-xl px-4 py-2 text-sm text-text-primary focus:border-brand-blue outline-none transition-colors">
                {STAGES.map(s => <option key={s} value={s}>{s ? stageNames[s] || s : "All Stages"}</option>)}
              </select>
              <select value={group} onChange={e => setGroup(e.target.value)}
                className="bg-bg-elevated border border-border-default rounded-xl px-4 py-2 text-sm text-text-primary focus:border-brand-blue outline-none transition-colors">
                <option value="">All Groups</option>
                {GROUPS.map(g => <option key={g} value={g}>Group {g}</option>)}
              </select>
              <span className="text-sm text-text-muted self-center ml-2">{matches.length} matches</span>
            </div>

            {matchesByDate.length > 0 ? (
              <div className="space-y-6">
                {matchesByDate.map(([date, dayMatches]) => (
                  <div key={date}>
                    <h3 className="text-sm text-text-muted mb-3 font-medium sticky top-0 bg-bg-deep/80 backdrop-blur py-2 z-10">
                      {date}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {dayMatches.map((m: any) => <MatchCard key={m.id} {...m} showId />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted py-8 text-center">No matches found.</p>
            )}
          </motion.div>
        ) : activeTab === "standings" ? (
          <motion.div
            key="standings"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="grid md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {standings.map((g: any) => (
              <div key={g.group} className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle hover:border-border-default transition-all">
                <h3 className="text-brand-gold font-bold mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold" /> Group {g.group}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs border-b border-border-subtle">
                      <th className="text-left py-2 w-6">#</th>
                      <th className="text-left py-2">Team</th>
                      <th className="text-center py-2 w-8">P</th>
                      <th className="text-center py-2 w-10">GD</th>
                      <th className="text-center py-2 w-10 font-semibold">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.standings.map((s: any, i: number) => (
                      <tr key={s.team_id}
                        className={`border-b border-border-subtle ${
                          i < 2 ? "text-text-primary font-medium" : "text-text-muted"
                        } ${i === 2 ? "border-t-2 border-dashed border-border-default" : ""}`}>
                        <td className="py-2.5">{i + 1}</td>
                        <td className="py-2.5">
                          <img src={getFlagUrl(s.fifa_code)} alt="" className="w-6 h-4 rounded-sm inline mr-2 align-middle" />
                          {s.name}
                        </td>
                        <td className="text-center py-2.5 text-xs">{s.played}</td>
                        <td className="text-center py-2.5 text-xs tabular-nums">{s.gd > 0 ? "+" : ""}{s.gd}</td>
                        <td className="text-center py-2.5 font-bold text-brand-gold tabular-nums">{s.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="bracket"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={runBracketSim}
                disabled={simLoading}
                className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue/80 disabled:opacity-50 px-5 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95"
              >
                {simLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {simLoading ? "Simulating..." : "Simulate Tournament Bracket"}
              </button>
              <span className="text-xs text-text-muted">Run a single tournament simulation to fill the bracket</span>
            </div>

            {(filledBracket || bracket).map((round: any) => (
              <div key={round.name} className="bg-bg-elevated rounded-2xl p-5 border border-border-subtle">
                <h3 className="text-brand-gold font-bold mb-4">{round.name}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {round.matches.map((m: any, i: number) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-bg-overlay rounded-xl p-3 border border-border-subtle text-center hover:border-brand-blue/30 transition-all"
                    >
                      <div className="text-[10px] text-text-muted mb-1 font-mono">{m.id}</div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <span className="text-sm font-medium text-text-primary truncate max-w-[90px]">{m.home}</span>
                      </div>
                      <div className="text-[10px] text-text-muted">vs</div>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <span className="text-sm font-medium text-text-primary truncate max-w-[90px]">{m.away}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
