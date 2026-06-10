import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import ProbabilityBar from "../components/ProbabilityBar";
import PageTransition from "../components/PageTransition";
import { API_BASE } from "../lib/utils";
import { useT } from "../lib/i18n";
import { Calendar, Target, TrendingUp, Play, Pause, RotateCcw, ChevronUp, ChevronDown, Zap } from "lucide-react";

const minPresets = [15, 30, 45, 60, 75, 85];

export default function Prediction() {
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const urlMatchId = searchParams.get("match") || "";
  const [matches, setMatches] = useState<any[]>([]);
  const [matchId, setMatchId] = useState(urlMatchId);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  const [liveMode, setLiveMode] = useState(false);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [minute, setMinute] = useState(0);
  const [livePred, setLivePred] = useState<any>(null);

  useEffect(() => { axios.get(`${API_BASE}/matches`).then(r => setMatches(r.data)); }, []);
  useEffect(() => {
    if (urlMatchId) { setMatchId(urlMatchId); fetchPrediction(urlMatchId); }
  }, [urlMatchId]);

  const fetchPrediction = async (mid: string) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/predictions/match/${mid}/refresh`);
      setPrediction(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const runSimulation = async (total: number) => {
    setSimLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/predictions/simulate`, { total_simulations: total });
      setSimResult(data);
    } catch { /* ignore */ }
    setSimLoading(false);
  };

  const fetchLivePrediction = async (hs: number, aws: number, min: number) => {
    if (!matchId) return;
    try {
      const { data } = await axios.post(`${API_BASE}/predictions/match/${matchId}/live`, {
        home_score: hs, away_score: aws, minute: min,
      });
      setLivePred(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!liveMode) { setLivePred(null); return; }
    const timer = setTimeout(() => fetchLivePrediction(homeScore, awayScore, minute), 200);
    return () => clearTimeout(timer);
  }, [liveMode, homeScore, awayScore, minute, matchId]);

  const selectedMatch = matches.find((m: any) => m.id === matchId);

  const topScores = prediction?.score_matrix_json && Array.isArray(prediction.score_matrix_json)
    ? (() => {
        const scores: [number, number, number][] = [];
        prediction.score_matrix_json.forEach((row: number[], i: number) => {
          row.forEach((prob: number, j: number) => {
            if (prob > 0.01) scores.push([i, j, prob]);
          });
        });
        return scores.sort((a, b) => b[2] - a[2]).slice(0, 5);
      })()
    : [];

  const probs = livePred || prediction;

  return (
    <PageTransition className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Target className="text-brand-gold" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Predictions</h1>
          <p className="text-sm text-text-muted">
            {prediction?.model_type?.startsWith("ml_blend")
              ? `ML-Enhanced (${prediction.model_type})`
              : "Poisson statistical model"}
          </p>
        </div>
      </motion.div>

      {/* Match Selector */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-bg-elevated rounded-2xl p-6 border border-border-subtle"
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-brand-gold" /> Match Prediction
        </h2>
        <div className="flex gap-3 mb-4">
          <select
            value={matchId}
            onChange={e => { setMatchId(e.target.value); setLiveMode(false); if (e.target.value) fetchPrediction(e.target.value); }}
            className="bg-bg-overlay border border-border-default rounded-xl px-4 py-2 flex-1 text-sm text-text-primary outline-none focus:border-brand-blue transition-colors"
          >
            <option value="">选择比赛...</option>
            {matches.filter((m: any) => m.status === "scheduled").map((m: any) => (
              <option key={m.id} value={m.id}>
                [{m.group ? `Group ${m.group}` : m.stage}] {m.home_team?.name} vs {m.away_team?.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => matchId && fetchPrediction(matchId)}
            disabled={!matchId || loading}
            className="bg-brand-blue hover:bg-brand-blue/80 disabled:opacity-50 px-5 py-2 rounded-xl text-sm font-medium transition-all"
          >
            {loading ? "..." : "Predict"}
          </button>
          <button
            onClick={() => {
              if (!liveMode && matchId) { setLiveMode(true); setHomeScore(0); setAwayScore(0); setMinute(0); }
              else setLiveMode(false);
            }}
            disabled={!matchId}
            className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all ${
              liveMode
                ? "bg-red-600/10 border-red-600/30 text-red-400"
                : "bg-bg-overlay border-border-default hover:border-border-emphasis"
            }`}
          >
            {liveMode ? <><Pause size={14} className="inline mr-1" /> 关闭直播</> : <><Play size={14} className="inline mr-1" /> 直播模式</>}
          </button>
        </div>

        {selectedMatch && (
          <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
            <Calendar size={14} /> {new Date(selectedMatch.match_date).toLocaleString()}
            {selectedMatch.venue && ` · ${selectedMatch.venue}`}
          </div>
        )}

        {/* Live Mode Panel */}
        <AnimatePresence>
          {liveMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="bg-red-600/5 border border-red-600/20 rounded-2xl p-5 mb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live Simulator
                  </h3>
                  <button
                    onClick={() => { setHomeScore(0); setAwayScore(0); setMinute(0); }}
                    className="text-xs text-text-muted hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                </div>

                <div className="flex items-center justify-center gap-6">
                  <div className="text-center space-y-2">
                    <div className="text-xs text-text-muted">{selectedMatch?.home_team?.name || "Home"}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setHomeScore(s => Math.max(0, s - 1))}
                        className="w-8 h-8 rounded-lg bg-bg-overlay hover:bg-bg-hover flex items-center justify-center text-white transition-all active:scale-90">
                        <ChevronDown size={16} />
                      </button>
                      <motion.span
                        key={homeScore}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        className="text-3xl font-bold text-white w-10 text-center tabular-nums"
                      >{homeScore}</motion.span>
                      <button onClick={() => setHomeScore(s => Math.min(9, s + 1))}
                        className="w-8 h-8 rounded-lg bg-bg-overlay hover:bg-bg-hover flex items-center justify-center text-white transition-all active:scale-90">
                        <ChevronUp size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-text-muted text-lg font-bold">—</div>
                  <div className="text-center space-y-2">
                    <div className="text-xs text-text-muted">{selectedMatch?.away_team?.name || "Away"}</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAwayScore(s => Math.max(0, s - 1))}
                        className="w-8 h-8 rounded-lg bg-bg-overlay hover:bg-bg-hover flex items-center justify-center text-white transition-all active:scale-90">
                        <ChevronDown size={16} />
                      </button>
                      <motion.span
                        key={awayScore}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        className="text-3xl font-bold text-white w-10 text-center tabular-nums"
                      >{awayScore}</motion.span>
                      <button onClick={() => setAwayScore(s => Math.min(9, s + 1))}
                        className="w-8 h-8 rounded-lg bg-bg-overlay hover:bg-bg-hover flex items-center justify-center text-white transition-all active:scale-90">
                        <ChevronUp size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>0'</span><span>{minute}'</span><span>90'</span>
                  </div>
                  <input type="range" min={0} max={90} value={minute}
                    onChange={e => setMinute(Number(e.target.value))}
                    className="w-full h-2 bg-bg-overlay rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-gold" />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {minPresets.map(m => (
                    <button key={m} onClick={() => setMinute(m)}
                      className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                        minute === m
                          ? "border-brand-gold text-brand-gold bg-brand-gold/10"
                          : "border-border-subtle text-text-muted hover:border-border-default"
                      }`}>{m}'</button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Probability display */}
        {probs && probs.home_win_prob !== undefined ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                {liveMode ? <span className="text-red-400">Live Win Probability</span> : "Win Probability"}
              </h3>
              <ProbabilityBar
                homeProb={probs.home_win_prob}
                drawProb={probs.draw_prob}
                awayProb={probs.away_win_prob}
                homeLabel={selectedMatch?.home_team?.name || "Home"}
                awayLabel={selectedMatch?.away_team?.name || "Away"}
              />
              {livePred && (
                <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                  {[
                    { label: "Home", prob: probs.home_win_prob, color: "text-blue-400" },
                    { label: "Draw", prob: probs.draw_prob, color: "text-amber-400" },
                    { label: "Away", prob: probs.away_win_prob, color: "text-blue-400" },
                  ].map(({ label, prob, color }) => (
                    <div key={label} className="bg-bg-elevated rounded-xl p-2 border border-border-subtle">
                      <div className={`text-lg font-bold ${color} tabular-nums`}>
                        {(prob * 100).toFixed(1)}%
                      </div>
                      <div className="text-text-muted">{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Expected Score</h3>
              {topScores.length > 0 && !liveMode ? (
                <div className="space-y-1.5">
                  {topScores.map(([h, a, p], i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-12 text-right font-mono text-text-primary tabular-nums">{h} — {a}</span>
                      <div className="flex-1 h-2.5 bg-bg-overlay rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${p * 800}%` }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className="h-full bg-gradient-to-r from-brand-blue to-brand-gold rounded-full"
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-text-muted tabular-nums">{(p * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                  <div className="bg-bg-overlay rounded-lg p-2 text-center border border-border-subtle">
                    <div className="text-lg font-bold text-text-primary tabular-nums">
                      {probs.pred_home_score?.toFixed(1) || probs.pred_final_home?.toFixed(1) || "?"}
                    </div>
                    <div>Expected Home</div>
                  </div>
                  <div className="bg-bg-overlay rounded-lg p-2 text-center border border-border-subtle">
                    <div className="text-lg font-bold text-text-primary tabular-nums">
                      {probs.pred_away_score?.toFixed(1) || probs.pred_final_away?.toFixed(1) || "?"}
                    </div>
                    <div>Expected Away</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-text-muted text-sm py-8 text-center">
            选择比赛并点击 Predict 查看预测结果。
          </p>
        )}
      </motion.div>

      {/* Tournament Simulation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-elevated rounded-2xl p-6 border border-border-subtle"
      >
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-gold" /> Tournament Simulation
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Monte Carlo simulation with ELO + attack/defense stats. More runs = more accurate.
        </p>
        <div className="flex gap-3 mb-4">
          {[1000, 10000, 50000].map(n => (
            <button
              key={n}
              onClick={() => runSimulation(n)}
              disabled={simLoading}
              className="bg-bg-overlay hover:bg-bg-hover disabled:opacity-50 px-4 py-2 rounded-lg text-sm border border-border-subtle transition-all active:scale-95"
            >
              {simLoading ? "Running..." : `${n.toLocaleString()} Runs`}
            </button>
          ))}
        </div>
        {simResult?.results_json?.champions && Object.keys(simResult.results_json.champions).length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <h3 className="text-sm text-text-secondary font-medium mb-3">
              <Zap size={14} className="inline mr-1 text-brand-gold" />
              Champion Odds · {simResult.total_simulations?.toLocaleString()} simulations
            </h3>
            {Object.entries(simResult.results_json.champions as Record<string, number>)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([team, prob], i) => (
                <motion.div
                  key={team}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 group"
                >
                  <span className={`text-xs font-bold w-6 text-right tabular-nums ${
                    i < 3 ? "text-brand-gold" : "text-text-muted"
                  }`}>#{i + 1}</span>
                  <span className="text-sm w-24 truncate group-hover:text-white transition-colors">{team}</span>
                  <div className="flex-1 h-5 bg-bg-overlay rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(1, prob * 100)}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                      className="h-full bg-gradient-to-r from-brand-blue to-brand-gold rounded-full flex items-center justify-end pr-2"
                    />
                  </div>
                  <span className="text-sm font-semibold text-brand-gold w-16 text-right tabular-nums">
                    {(prob * 100).toFixed(1)}%
                  </span>
                </motion.div>
              ))}
            {simResult.results_json.finalists && (
              <div className="mt-6">
                <h3 className="text-sm text-text-secondary font-medium mb-3">Finalist Odds</h3>
                {Object.entries(simResult.results_json.finalists as Record<string, number>)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([team, prob]) => (
                    <div key={team} className="flex items-center gap-3 text-sm">
                      <span className="w-24 truncate text-text-muted">{team}</span>
                      <div className="flex-1 h-3 bg-bg-overlay rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(1, prob * 120)}%` }}
                          className="h-full bg-blue-600/50 rounded-full"
                        />
                      </div>
                      <span className="text-xs text-text-muted w-14 text-right tabular-nums">
                        {(prob * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  );
}
