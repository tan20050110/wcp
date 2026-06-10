import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { useT } from "../lib/i18n";
import { API_BASE } from "../lib/utils";
import PageTransition from "../components/PageTransition";
import { Brain, BarChart3, TrendingUp, Zap, Target, GitCompare } from "lucide-react";

export default function AILab() {
  const { t } = useT();
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

  const metrics = [
    { label: "Accuracy", value: m.accuracy, color: "#1d4ed8", desc: "Overall match outcome prediction" },
    { label: "Precision", value: m.precision, color: "#d4a843", desc: "Macro-averaged precision" },
    { label: "Recall", value: m.recall, color: "#3b82f6", desc: "Macro-averaged recall" },
    { label: "F1 Score", value: m.f1, color: "#8b5cf6", desc: "Harmonic mean of P & R" },
  ];

  return (
    <PageTransition className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Brain className="text-brand-gold" size={28} />
        <div>
          <h1 className="text-2xl font-bold">{t("aiLab")}</h1>
          <p className="text-sm text-text-muted">Model training, evaluation & comparison</p>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-bg-elevated rounded-2xl p-6 border border-border-subtle"
        >
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Target size={18} className="text-brand-gold" /> Model Info
          </h2>
          <div className="space-y-3">
            {[
              ["Algorithm", "XGBoost Classifier"],
              ["Training Samples", `${perf?.training_samples || 0} matches`],
              ["Features", `${perf?.features || 0} engineered features`],
              ["Architecture", "200 trees, max_depth=4"],
              ["Status", perf?.model_trained ? "Trained & Ready" : "Not Trained"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-text-muted">{label}</span>
                <span className={
                  label === "Status"
                    ? perf?.model_trained ? "text-blue-400" : "text-red-400"
                    : "text-text-primary"
                }>{value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-bg-elevated rounded-2xl p-6 border border-border-subtle"
        >
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-gold" /> Performance Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {metrics.map(({ label, value, color, desc }) => (
              <div key={label} className="bg-bg-overlay rounded-xl p-4 border border-border-subtle">
                <div className="text-xs text-text-muted mb-1">{label}</div>
                <div className="text-2xl font-bold tabular-nums" style={{ color }}>
                  {value !== undefined ? `${(value * 100).toFixed(1)}%` : "N/A"}
                </div>
                <div className="text-[10px] text-text-muted mt-1">{desc}</div>
              </div>
            ))}
          </div>
          {m.calibration_error !== undefined && (
            <div className="mt-3 text-xs text-text-muted">
              Calibration Error: <span className="text-text-primary tabular-nums">{(m.calibration_error * 100).toFixed(2)}%</span>
              <span className="text-text-muted ml-1">(lower = better)</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Feature Importance */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-bg-elevated rounded-2xl p-6 border border-border-subtle"
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-gold" /> Feature Importance
        </h2>
        <p className="text-xs text-text-muted mb-4">
          What factors matter most for match prediction? Higher = more influence on the model's decision.
        </p>
        <div className="space-y-2">
          {Object.entries(featImp).slice(0, 10).map(([name, value]: [string, any]) => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-sm text-text-secondary w-40 shrink-0">{name}</span>
              <div className="flex-1 h-3 bg-bg-overlay rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(2, (value as number) * 500)}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-gradient-to-r from-brand-blue to-brand-gold rounded-full"
                />
              </div>
              <span className="text-xs text-brand-gold w-14 text-right tabular-nums">
                {((value as number) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Model Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-bg-elevated rounded-2xl p-6 border border-border-subtle"
      >
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <GitCompare size={18} className="text-brand-gold" /> Poisson vs XGBoost Comparison
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Compare the statistical Poisson model with the ML XGBoost model on the same match.
        </p>
        <div className="flex gap-3 mb-4">
          <select value={matchId} onChange={e => setMatchId(e.target.value)}
            className="bg-bg-overlay border border-border-default rounded-xl px-4 py-2 text-sm text-text-primary flex-1 outline-none focus:border-brand-blue transition-colors">
            <option value="">Select a match to compare...</option>
            {matches.filter((m: any) => m.status === "scheduled").slice(0, 20).map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.home_team?.name} vs {m.away_team?.name} ({new Date(m.match_date).toLocaleDateString()})
              </option>
            ))}
          </select>
          <button onClick={runCompare} disabled={!matchId}
            className="bg-brand-blue hover:bg-brand-blue/80 disabled:opacity-50 px-4 py-2 rounded-lg text-sm transition-all active:scale-95">
            Compare
          </button>
        </div>

        {compare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-6"
          >
            {[
              { title: "Poisson Model (Baseline)", data: compare.poisson, barColor: "bg-blue-500" },
              { title: "XGBoost Model", data: compare.xgboost, barColor: "bg-gradient-to-r from-brand-blue to-brand-gold", badge: "ML" },
            ].map(({ title, data, barColor, badge }) => (
              <div key={title} className="space-y-3">
                <h3 className="text-sm font-semibold text-text-secondary">
                  {title}
                  {badge && <span className="text-[10px] text-brand-gold ml-2">{badge}</span>}
                </h3>
                {data ? (
                  ["home_win", "draw", "away_win"].map(k => (
                    <div key={k} className="flex justify-between items-center">
                      <span className="text-sm text-text-muted capitalize">{k.replace("_", " ")}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-bg-overlay rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${data[k] * 100}%` }}
                            className={`h-full rounded-full ${barColor}`}
                          />
                        </div>
                        <span className="text-sm w-14 text-right tabular-nums">{data ? (data[k] * 100).toFixed(1) : "?"}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-muted">ML model not trained. Run training first.</p>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </PageTransition>
  );
}
