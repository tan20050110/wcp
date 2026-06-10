import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useT } from "../lib/i18n";
import axios from "axios";
import { API_BASE, getFlagUrl } from "../lib/utils";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";
import PageTransition from "../components/PageTransition";
import { SkeletonLine } from "../components/Skeleton";
import { Shield, User } from "lucide-react";

const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};
const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function TeamAnalysis() {
  const { t } = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/teams`).then(r => { setTeams(r.data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!id) { setSelected(null); return; }
    axios.get(`${API_BASE}/teams/${id}`).then(r => setSelected(r.data));
    axios.get(`${API_BASE}/analysis/trends/${id}`).then(r => setTrend(r.data));
  }, [id]);

  return (
    <PageTransition className="space-y-6">
      <h1 className="text-2xl font-bold">Teams</h1>

      {!id && (
        loading ? (
          <SkeletonLine count={8} />
        ) : (
          <div className="space-y-6">
            {GROUPS.map(group => {
              const groupTeams = teams.filter(t => t.group === group);
              if (groupTeams.length === 0) return null;
              return (
                <motion.div
                  key={group}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: GROUPS.indexOf(group) * 0.05 }}
                >
                  <h2 className="text-lg font-semibold text-brand-gold mb-3">Group {group}</h2>
                  <motion.div
                    variants={stagger}
                    initial="initial"
                    animate="animate"
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  >
                    {groupTeams.map((t: any) => (
                      <motion.div
                        key={t.id}
                        variants={fadeInUp}
                        whileHover={{ y: -2 }}
                        onClick={() => navigate(`/teams/${t.id}`)}
                        className="bg-bg-elevated hover:bg-bg-overlay border border-border-subtle hover:border-brand-blue rounded-xl p-4 cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img src={getFlagUrl(t.fifa_code)} alt="" className="w-10 h-7 rounded shadow-md" />
                          <div>
                            <div className="font-semibold text-sm">{t.name}</div>
                            <div className="text-xs text-text-muted">
                              FIFA #{t.fifa_rank} · ELO {Math.round(t.elo_rating)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )
      )}

      {selected && (
        <div className="space-y-6">
          <button onClick={() => navigate("/teams")}
            className="text-sm text-text-muted hover:text-text-primary transition-colors">
            &larr; {t("allTeams")}
          </button>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-bg-elevated backdrop-blur rounded-xl p-6 space-y-4 border border-border-subtle"
          >
            <div className="flex items-center gap-4">
              <img src={getFlagUrl(selected.fifa_code)} alt="" className="w-16 h-11 rounded-lg shadow-lg" />
              <div>
                <h2 className="text-xl font-bold text-brand-gold">{selected.name} ({selected.fifa_code})</h2>
                <p className="text-sm text-text-secondary">
                  Group {selected.group} · FIFA #{selected.fifa_rank} · ELO {Math.round(selected.elo_rating)}
                </p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-bg-overlay rounded-lg p-4 border border-border-subtle">
                <h3 className="text-sm text-text-secondary mb-2">{t("attack")} / {t("defense")} / {t("midfield")}</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={[
                    { stat: "Attack", A: selected.stats_json?.attack || 0, fullMark: 2 },
                    { stat: "Defense", A: selected.stats_json?.defense || 0, fullMark: 2 },
                    { stat: "Midfield", A: selected.stats_json?.midfield || 0, fullMark: 2 },
                  ]}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="stat" stroke="#94a3b8" />
                    <Radar
                      dataKey="A"
                      stroke="#1d4ed8"
                      fill="#1d4ed8"
                      fillOpacity={0.4}
                      animationBegin={0}
                      animationDuration={800}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg-overlay rounded-lg p-3 border border-border-subtle">
                    <p className="text-xs text-text-muted">{t("fifaRank")}</p>
                    <p className="text-xl font-bold text-brand-gold">#{selected.fifa_rank || "?"}</p>
                  </div>
                  <div className="bg-bg-overlay rounded-lg p-3 border border-border-subtle">
                    <p className="text-xs text-text-muted">{t("eloRating")}</p>
                    <p className="text-xl font-bold text-brand-gold tabular-nums">{Math.round(selected.elo_rating || 0)}</p>
                  </div>
                </div>
                {trend && (
                  <p className="text-sm">{t("form")}: <span className={trend.trend === "improving" ? "text-blue-400" : "text-red-400"}>
                    {trend.trend} ({(trend.form_score * 100).toFixed(0)}%)
                  </span></p>
                )}
                {selected.coach_name && (
                  <div className="bg-bg-overlay rounded-lg p-3 flex items-center gap-3 border border-border-subtle">
                    <div className="w-9 h-9 rounded-full bg-brand-blue/60 flex items-center justify-center">
                      <User size={16} className="text-brand-gold" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">{t("headCoach")}</p>
                      <p className="text-sm font-semibold">{selected.coach_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {selected.squad_json?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-text-secondary mb-3">
                  {t("squad")} ({selected.squad_json.length} {t("players")})
                </h3>
                <motion.div
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                >
                  {selected.squad_json.map((p: any, i: number) => {
                    const statusColor = p.status === "injured"
                      ? "bg-red-600/20 border-red-600/20"
                      : p.status === "doubtful"
                      ? "bg-amber-600/15 border-amber-600/20"
                      : "bg-brand-blue/30 border-brand-blue/20";
                    return (
                      <motion.div
                        key={i}
                        variants={fadeInUp}
                        whileHover={{ scale: 1.02 }}
                        className={`flex items-center gap-3 rounded-lg p-2.5 border ${statusColor} transition-colors`}
                      >
                        <span className="w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center text-xs font-bold shrink-0">
                          {p.number || "?"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">{p.name}</div>
                          <div className="text-[10px] text-text-muted">{p.position} · {p.club}</div>
                        </div>
                        {p.status !== "fit" && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                            p.status === "injured" ? "bg-red-600/30 text-red-400" : "bg-amber-600/30 text-amber-400"
                          }`}>
                            {p.status}
                          </span>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}
            {!selected.squad_json?.length && (
              <p className="text-sm text-text-muted mt-4">{t("noSquad")}</p>
            )}
          </motion.div>
        </div>
      )}
    </PageTransition>
  );
}
