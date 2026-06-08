import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import ProbabilityBar from "../components/ProbabilityBar";
import { API_BASE } from "../lib/utils";
import { useT } from "../lib/i18n";
import { Calendar, Target, TrendingUp, Play, Pause, RotateCcw, ChevronUp, ChevronDown } from "lucide-react";

export default function Prediction() {
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const urlMatchId = searchParams.get("match") || "";
  const [matches, setMatches] = useState<any[]>([]);
  const [matchId, setMatchId] = useState(urlMatchId);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ---- tournament simulation state (separate from match prediction) ----
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  // ---- live in-play state ----
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
        home_score: hs, away_score: aws, minute: min
      });
      setLivePred(data);
    } catch { /* ignore */ }
  };

  // Debounced live prediction fetch
  useEffect(() => {
    if (!liveMode) { setLivePred(null); return; }
    const t = setTimeout(() => fetchLivePrediction(homeScore, awayScore, minute), 200);
    return () => clearTimeout(t);
  }, [liveMode, homeScore, awayScore, minute, matchId]);

  const selectedMatch = matches.find((m: any) => m.id === matchId);

  // Top scores from score matrix
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Target className="text-[#d4a843]" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Predictions</h1>
          <p className="text-sm text-gray-500">
            {prediction?.model_type?.startsWith("ml_blend")
              ? `ML-Enhanced (${prediction.model_type})`
              : "Poisson statistical model"}
          </p>
        </div>
      </div>

      {/* Match Selector */}
      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-[#d4a843]" /> Match Prediction
        </h2>
        <div className="flex gap-3 mb-4">
          <select value={matchId} onChange={e => { setMatchId(e.target.value); setLiveMode(false); if (e.target.value) fetchPrediction(e.target.value); }}
            className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 flex-1 text-sm text-white">
            <option value="">Select a match...</option>
            {matches.filter((m: any) => m.status === "scheduled").map((m: any) => (
              <option key={m.id} value={m.id}>
                [{m.group ? `Group ${m.group}` : m.stage}] {m.home_team?.name} vs {m.away_team?.name}
              </option>
            ))}
          </select>
          <button onClick={() => matchId && fetchPrediction(matchId)} disabled={!matchId || loading}
            className="bg-[#1a5632] hover:bg-[#1a5632]/80 disabled:opacity-50 px-5 py-2 rounded-xl text-sm font-medium">
            {loading ? "..." : "Predict"}
          </button>
          <button onClick={() => { if (!liveMode && matchId) { setLiveMode(true); setHomeScore(0); setAwayScore(0); setMinute(0); } else setLiveMode(false); }}
            disabled={!matchId}
            className={`px-5 py-2 rounded-xl text-sm font-medium border transition-all ${
              liveMode ? "bg-red-600/20 border-red-600/50 text-red-400" : "bg-white/[0.04] border-white/10 hover:border-white/20"
            }`}>
            {liveMode ? <><Pause size={14} className="inline mr-1" /> Live Off</> : <><Play size={14} className="inline mr-1" /> Live Mode</>}
          </button>
        </div>

        {selectedMatch && (
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Calendar size={14} /> {new Date(selectedMatch.match_date).toLocaleString()}
            {selectedMatch.venue && ` · ${selectedMatch.venue}`}
          </div>
        )}

        {/* ---- LIVE MODE PANEL ---- */}
        {liveMode && (
          <div className="bg-red-600/5 border border-red-600/20 rounded-2xl p-5 mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> Live Simulator
              </h3>
              <button onClick={() => { setHomeScore(0); setAwayScore(0); setMinute(0); }}
                className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                <RotateCcw size={12} /> Reset
              </button>
            </div>

            {/* Score controls */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-center space-y-2">
                <div className="text-xs text-gray-500">{selectedMatch?.home_team?.name || "Home"}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setHomeScore(s => Math.max(0, s - 1))}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white">
                    <ChevronDown size={16} />
                  </button>
                  <span className="text-3xl font-bold text-white w-10 text-center">{homeScore}</span>
                  <button onClick={() => setHomeScore(s => Math.min(9, s + 1))}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white">
                    <ChevronUp size={16} />
                  </button>
                </div>
              </div>
              <div className="text-gray-600 text-lg font-bold">—</div>
              <div className="text-center space-y-2">
                <div className="text-xs text-gray-500">{selectedMatch?.away_team?.name || "Away"}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setAwayScore(s => Math.max(0, s - 1))}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white">
                    <ChevronDown size={16} />
                  </button>
                  <span className="text-3xl font-bold text-white w-10 text-center">{awayScore}</span>
                  <button onClick={() => setAwayScore(s => Math.min(9, s + 1))}
                    className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-white">
                    <ChevronUp size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Minute slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>0'</span>
                <span>{minute}'</span>
                <span>90'</span>
              </div>
              <input type="range" min={0} max={90} value={minute}
                onChange={e => setMinute(Number(e.target.value))}
                className="w-full h-2 bg-white/[0.05] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#d4a843]" />
            </div>

            {/* Quick-set buttons */}
            <div className="flex gap-2 flex-wrap">
              {[15, 30, 45, 60, 75, 85].map(m => (
                <button key={m} onClick={() => setMinute(m)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                    minute === m ? "border-[#d4a843] text-[#d4a843] bg-[#d4a843]/10" : "border-white/5 text-gray-400 hover:border-white/20"
                  }`}>{m}'</button>
              ))}
            </div>
          </div>
        )}

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
                  <div className="bg-white/[0.03] rounded-xl p-2">
                    <div className="text-lg font-bold text-emerald-400">{(probs.home_win_prob * 100).toFixed(1)}%</div>
                    <div className="text-gray-500">Home</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-2">
                    <div className="text-lg font-bold text-amber-400">{(probs.draw_prob * 100).toFixed(1)}%</div>
                    <div className="text-gray-500">Draw</div>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-2">
                    <div className="text-lg font-bold text-blue-400">{(probs.away_win_prob * 100).toFixed(1)}%</div>
                    <div className="text-gray-500">Away</div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3">Expected Score</h3>
              {topScores.length > 0 && !liveMode ? (
                <div className="space-y-1.5">
                  {topScores.map(([h, a, p], i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-12 text-right font-mono text-white">{h} — {a}</span>
                      <div className="flex-1 h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#1a5632] to-[#d4a843] rounded-full"
                          style={{ width: `${p * 800}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs text-gray-400">{(p * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-white">{probs.pred_home_score?.toFixed(1) || probs.pred_final_home?.toFixed(1)}</div>
                    <div>Expected Home</div>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-white">{probs.pred_away_score?.toFixed(1) || probs.pred_final_away?.toFixed(1)}</div>
                    <div>Expected Away</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-600 text-sm py-8 text-center">Select a match and click Predict to see results.</p>
        )}
      </div>

      {/* Tournament Simulation */}
      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <TrendingUp size={18} className="text-[#d4a843]" /> Tournament Simulation
        </h2>
        <p className="text-xs text-gray-600 mb-4">
          Monte Carlo simulation with ELO + attack/defense stats. More runs = more accurate.
        </p>
        <div className="flex gap-3 mb-4">
          {[1000, 10000, 50000].map(n => (
            <button key={n} onClick={() => runSimulation(n)} disabled={simLoading}
              className="bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-50 px-4 py-2 rounded-lg text-sm border border-white/5 transition-all">
              {simLoading ? "Running..." : `${n.toLocaleString()} Runs`}
            </button>
          ))}
        </div>
        {simResult?.results_json?.champions && Object.keys(simResult.results_json.champions).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm text-gray-400 font-medium mb-3">
              Champion Odds · {simResult.total_simulations?.toLocaleString()} simulations
            </h3>
            {Object.entries(simResult.results_json.champions as Record<string, number>)
              .sort(([, a], [, b]) => b - a).slice(0, 10)
              .map(([team, prob], i) => (
                <div key={team} className="flex items-center gap-3 group">
                  <span className={`text-xs font-bold w-6 text-right ${i < 3 ? "text-[#d4a843]" : "text-gray-600"}`}>#{i + 1}</span>
                  <span className="text-sm w-24 truncate group-hover:text-white transition-colors">{team}</span>
                  <div className="flex-1 h-5 bg-white/[0.03] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#1a5632] to-[#d4a843] rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(1, prob * 100)}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-[#d4a843] w-16 text-right">{(prob * 100).toFixed(1)}%</span>
                </div>
              ))}
            {simResult.results_json.finalists && (
              <div className="mt-6">
                <h3 className="text-sm text-gray-400 font-medium mb-3">Finalist Odds</h3>
                {Object.entries(simResult.results_json.finalists as Record<string, number>)
                  .sort(([, a], [, b]) => b - a).slice(0, 5)
                  .map(([team, prob]) => (
                    <div key={team} className="flex items-center gap-3 text-sm">
                      <span className="w-24 truncate text-gray-400">{team}</span>
                      <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600/50 rounded-full" style={{ width: `${Math.max(1, prob * 120)}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-14 text-right">{(prob * 100).toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
