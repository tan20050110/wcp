import { useState, useEffect } from "react";
import axios from "axios";
import { useT } from "../lib/i18n";
import { API_BASE } from "../lib/utils";
import { Brain, BarChart3, TrendingUp, Zap, Target, GitCompare } from "lucide-react";

export default function AILab() { const { t } = useT();
  const [perf, setPerf] = useState<any>(null);
  const [matchId, setMatchId] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [compare, setCompare] = useState<any>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/analysis/model-performance`).then(r => setPerf(r.data));
    axios.get(`${API_BASE}/matches`).then(r => setMatches(r.data));
  }, []);

  const runCompare = async () => {
    if (!matchId) return;
    const { data } = await axios.post(`${API_BASE}/analysis/model/compare/${matchId}`);
    setCompare(data);
  };

  const m = perf?.metrics || {};
  const featImp = m?.feature_importance || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="text-[#d4a843]" size={28} />
        <div>
          <h1 className="text-2xl font-bold">{t("aiLab")}</h1>
          <p className="text-sm text-gray-500">Model training, evaluation & comparison</p>
        </div>
      </div>

      {/* Model Card */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Target size={18} className="text-[#d4a843]" /> Model Info
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Algorithm</span><span className="text-white">XGBoost Classifier</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Training Samples</span><span className="text-white">{perf?.training_samples || 0} matches</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Features</span><span className="text-white">{perf?.features || 0} engineered features</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Architecture</span><span className="text-white">200 trees, max_depth=4</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span>
              <span className={perf?.model_trained ? "text-green-400" : "text-red-400"}>
                {perf?.model_trained ? "Trained & Ready" : "Not Trained"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-[#d4a843]" /> Performance Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Accuracy", value: m.accuracy, color: "#1a5632", desc: "Overall match outcome prediction" },
              { label: "Precision", value: m.precision, color: "#d4a843", desc: "Macro-averaged precision" },
              { label: "Recall", value: m.recall, color: "#3b82f6", desc: "Macro-averaged recall" },
              { label: "F1 Score", value: m.f1, color: "#8b5cf6", desc: "Harmonic mean of P & R" },
            ].map(({ label, value, color, desc }) => (
              <div key={label} className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.03]">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="text-2xl font-bold" style={{ color }}>
                  {value !== undefined ? `${(value * 100).toFixed(1)}%` : "N/A"}
                </div>
                <div className="text-[10px] text-gray-600 mt-1">{desc}</div>
              </div>
            ))}
          </div>
          {m.calibration_error !== undefined && (
            <div className="mt-3 text-xs text-gray-500">
              Calibration Error: <span className="text-white">{(m.calibration_error * 100).toFixed(2)}%</span>
              <span className="text-gray-600 ml-1">(lower = better probability estimates)</span>
            </div>
          )}
        </div>
      </div>

      {/* Feature Importance */}
      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-[#d4a843]" /> Feature Importance
        </h2>
        <p className="text-xs text-gray-600 mb-4">
          What factors matter most for match prediction? Higher = more influence on the model's decision.
        </p>
        <div className="space-y-2">
          {Object.entries(featImp).slice(0, 10).map(([name, value]: [string, any]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-sm text-gray-400 w-40 shrink-0">{name}</span>
              <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#1a5632] to-[#d4a843] rounded-full transition-all"
                  style={{ width: `${Math.max(2, (value as number) * 500)}%` }} />
              </div>
              <span className="text-xs text-[#d4a843] w-14 text-right">{((value as number) * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Model Comparison */}
      <div className="bg-white/[0.03] rounded-2xl p-6 border border-white/5">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <GitCompare size={18} className="text-[#d4a843]" /> Poisson vs XGBoost Comparison
        </h2>
        <p className="text-xs text-gray-600 mb-4">
          Compare the statistical Poisson model with the ML XGBoost model on the same match.
        </p>
        <div className="flex gap-3 mb-4">
          <select value={matchId} onChange={e => setMatchId(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-sm text-white flex-1">
            <option value="">Select a match to compare...</option>
            {matches.filter((m: any) => m.status === "scheduled").slice(0, 20).map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.home_team?.name} vs {m.away_team?.name} ({new Date(m.match_date).toLocaleDateString()})
              </option>
            ))}
          </select>
          <button onClick={runCompare} disabled={!matchId}
            className="bg-[#1a5632] hover:bg-[#1a5632]/80 disabled:opacity-50 px-4 py-2 rounded-lg text-sm">
            Compare
          </button>
        </div>

        {compare && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400">Poisson Model (Baseline)</h3>
              {["home_win", "draw", "away_win"].map(k => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 capitalize">{k.replace("_", " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${compare.poisson[k] * 100}%` }} />
                    </div>
                    <span className="text-sm w-14 text-right">{(compare.poisson[k] * 100).toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400">
                XGBoost Model
                <span className="text-[10px] text-[#d4a843] ml-2">ML</span>
              </h3>
              {compare.xgboost ? (
                ["home_win", "draw", "away_win"].map(k => (
                  <div key={k} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500 capitalize">{k.replace("_", " ")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#1a5632] to-[#d4a843] rounded-full"
                          style={{ width: `${compare.xgboost[k] * 100}%` }} />
                      </div>
                      <span className="text-sm w-14 text-right text-[#d4a843]">{(compare.xgboost[k] * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-600">ML model not trained. Run training first.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
