import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import axios from "axios";
import CountdownTimer from "../components/CountdownTimer";
import MatchCard from "../components/MatchCard";
import ProbabilityBar from "../components/ProbabilityBar";
import PageTransition from "../components/PageTransition";
import StatCard from "../components/StatCard";
import TiltCard from "../components/TiltCard";
import ParticleBackground from "../components/ParticleBackground";
import { SkeletonCard } from "../components/Skeleton";
import { MapPinIcon } from "../components/icons";
import { useCountUp } from "../hooks/useCountUp";
import { useMatches } from "../hooks/useMatchData";
import { API_BASE, getFlagUrl } from "../lib/utils";
import { Trophy, Users, CalendarDays, Zap, ArrowRight, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { useT } from "../lib/i18n";

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};
const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

function AnimatedValue({ value, inView }: { value: number; inView: boolean }) {
  const count = useCountUp(value, 1000, inView);
  return <>{count}</>;
}

export default function Dashboard() {
  const { t } = useT();
  const { matches: allMatches } = useMatches({});
  const [topTeams, setTopTeams] = useState<any[]>([]);
  const [featuredPred, setFeaturedPred] = useState<any>(null);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [countdown, setCountdown] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPred, setLoadingPred] = useState(false);

  const statsRef = useRef<HTMLDivElement>(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-50px" });

  useEffect(() => {
    axios.get(`${API_BASE}/teams`).then(r => {
      setTopTeams(r.data.sort((a: any, b: any) => b.elo_rating - a.elo_rating).slice(0, 8));
      setLoadingTeams(false);
    });
  }, []);

  const upcomingMatches = allMatches.filter((m: any) => m.status === "scheduled")
    .sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  const featuredMatch = upcomingMatches[0];

  useEffect(() => {
    if (featuredMatch?.id) {
      setLoadingPred(true);
      axios.get(`${API_BASE}/predictions/match/${featuredMatch.id}`)
        .then(r => setFeaturedPred(r.data))
        .catch(() => {})
        .finally(() => setLoadingPred(false));
    }
  }, [featuredMatch?.id]);

  useEffect(() => {
    if (!featuredMatch) return;
    const tick = () => {
      const diff = new Date(featuredMatch.match_date).getTime() - Date.now();
      if (diff <= 0) { setCountdown("即将开赛!"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m ${s}s` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [featuredMatch]);

  useEffect(() => {
    if (upcomingMatches.length > 0) setNextMatch(upcomingMatches[0]);
  }, [upcomingMatches]);

  const statDefs = [
    { icon: Users, label: t("heroTeams"), value: 48, color: "from-blue-600 to-blue-800" },
    { icon: CalendarDays, label: t("heroMatches"), value: 72, color: "from-amber-500 to-yellow-700" },
    { icon: Zap, label: t("heroGroups"), value: 12, color: "from-blue-500 to-indigo-700" },
  ];

  const animatedBlobs = [
    "absolute top-10 right-20 w-72 h-72 bg-brand-blue rounded-full blur-[100px] animate-[pulse_8s_ease-in-out_infinite]",
    "absolute bottom-10 left-10 w-64 h-64 bg-brand-gold rounded-full blur-[100px] animate-[pulse_12s_ease-in-out_infinite_2s]",
    "absolute top-1/2 left-1/3 w-48 h-48 bg-blue-600 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite_4s]",
  ];

  return (
    <PageTransition className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#050d24] via-[#0a1229] to-[#0d051a] p-8 lg:p-10 border border-border-subtle">
        <ParticleBackground />
        <div className="absolute inset-0 opacity-20">
          {animatedBlobs.map((cls, i) => <div key={i} className={cls} />)}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
        >
          <div>
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 mb-3"
            >
              <Trophy className="text-brand-gold" size={24} />
              <span className="text-brand-gold text-xs font-semibold tracking-[0.2em] uppercase">
                FIFA World Cup 2026
              </span>
            </motion.div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2">
              {t("heroTitle")}
            </h1>
            <p className="text-text-secondary text-sm max-w-md">{t("heroSub")}</p>
          </div>
          <CountdownTimer />
        </motion.div>

        <motion.div
          ref={statsRef}
          variants={stagger}
          initial="initial"
          animate="animate"
          className="relative z-10 grid grid-cols-3 gap-4 mt-8 max-w-2xl"
        >
          {statDefs.map(s => (
            <motion.div key={s.label} variants={fadeInUp}>
              <StatCard
                icon={s.icon}
                label={s.label}
                value={<AnimatedValue value={s.value} inView={statsInView} />}
                color={s.color}
              />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Next Match */}
      {nextMatch && (
        <Link to={`/predictions?match=${nextMatch.id}`} className="block">
          <TiltCard intensity={3}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-bg-elevated hover:bg-bg-overlay backdrop-blur rounded-2xl p-5 border border-border-subtle hover:border-brand-gold/20 transition-all group"
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-brand-gold" />
                <span className="text-sm text-text-secondary">下一场比赛</span>
                <ChevronRight size={14} className="text-text-muted ml-auto group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src={getFlagUrl(nextMatch.home_team?.fifa_code)} alt="" className="w-9 h-6 rounded shadow" />
                  <span className="font-bold text-text-primary">{nextMatch.home_team?.name}</span>
                </div>
                <div className="text-center shrink-0">
                  <div className="text-2xl font-mono font-bold text-brand-gold tabular-nums">{countdown}</div>
                  <div className="text-[10px] text-text-muted">VS</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-text-primary">{nextMatch.away_team?.name}</span>
                  <img src={getFlagUrl(nextMatch.away_team?.fifa_code)} alt="" className="w-9 h-6 rounded shadow" />
                </div>
              </div>
              <div className="text-xs text-text-muted mt-2 text-center">
                {new Date(nextMatch.match_date).toLocaleString()} · {nextMatch.venue}
              </div>
            </motion.div>
          </TiltCard>
        </Link>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Top Teams */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-bg-elevated backdrop-blur rounded-2xl p-5 border border-border-subtle lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-gold" /> {t("topElo")}
            </h2>
            <Link to="/teams" className="text-xs text-brand-gold hover:underline flex items-center gap-1 transition-colors">
              全部 <ArrowRight size={12} />
            </Link>
          </div>

          {loadingTeams ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5">
                  <div className="w-6 h-4 skeleton-shimmer rounded" />
                  <div className="flex-1 h-4 skeleton-shimmer rounded" />
                  <div className="w-10 h-4 skeleton-shimmer rounded" />
                </div>
              ))}
            </div>
          ) : (
            <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-1">
              {topTeams.map((t: any, i: number) => (
                <motion.div key={t.id} variants={fadeInUp}>
                  <Link
                    to={`/teams/${t.id}`}
                    className="flex items-center gap-3 hover:bg-bg-hover rounded-xl p-2.5 transition-all group"
                  >
                    <span className={`text-xs font-bold w-6 text-right tabular-nums ${i < 3 ? "text-brand-gold" : "text-text-muted"}`}>
                      #{i + 1}
                    </span>
                    <img src={getFlagUrl(t.fifa_code)} alt="" className="w-7 h-5 rounded shadow-sm" />
                    <span className="flex-1 text-sm group-hover:text-white transition-colors">
                      {t.name}
                    </span>
                    <span className="text-xs text-text-muted tabular-nums">{Math.round(t.elo_rating)}</span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Featured Prediction */}
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-bg-elevated backdrop-blur rounded-2xl p-5 border border-border-subtle lg:col-span-3"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Zap size={18} className="text-brand-gold" /> Featured Prediction
            </h2>
            <Link to="/predictions" className="text-xs text-brand-gold hover:underline flex items-center gap-1 transition-colors">
              Predictions <ArrowRight size={12} />
            </Link>
          </div>

          {featuredMatch ? (
            <TiltCard intensity={4}>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-center flex-1">
                    <img src={getFlagUrl(featuredMatch.home_team?.fifa_code)} alt="" className="w-12 h-8 object-cover rounded shadow-md mx-auto mb-2" />
                    <div className="font-bold text-sm">{featuredMatch.home_team?.name}</div>
                  </div>
                  <div className="text-center shrink-0">
                    <div className="text-2xl font-black text-brand-gold">VS</div>
                    <div className="text-xs text-text-muted mt-1">
                      {new Date(featuredMatch.match_date).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="text-center flex-1">
                    <img src={getFlagUrl(featuredMatch.away_team?.fifa_code)} alt="" className="w-12 h-8 object-cover rounded shadow-md mx-auto mb-2" />
                    <div className="font-bold text-sm">{featuredMatch.away_team?.name}</div>
                  </div>
                </div>
                {loadingPred ? (
                  <div className="space-y-3">
                    <div className="h-2 skeleton-shimmer rounded-full" />
                    <div className="h-2 skeleton-shimmer rounded-full" />
                    <div className="h-2 skeleton-shimmer rounded-full" />
                  </div>
                ) : featuredPred?.home_win_prob !== undefined ? (
                  <ProbabilityBar
                    homeProb={featuredPred.home_win_prob}
                    drawProb={featuredPred.draw_prob}
                    awayProb={featuredPred.away_win_prob}
                    homeLabel={featuredMatch.home_team?.name || "Home"}
                    awayLabel={featuredMatch.away_team?.name || "Away"}
                  />
                ) : (
                  <p className="text-xs text-text-muted text-center py-2">预测加载中...</p>
                )}
                {featuredMatch.venue && (
                  <div className="text-xs text-text-muted text-center">
                    <MapPinIcon /> {featuredMatch.venue}
                  </div>
                )}
              </div>
            </TiltCard>
          ) : (
            <p className="text-text-muted text-sm py-4 text-center">暂无即将开始的比赛。</p>
          )}
        </motion.div>
      </div>

      {/* Upcoming Matches */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upcoming Matches</h2>
          <Link to="/schedule" className="text-sm text-brand-gold hover:underline flex items-center gap-1 transition-colors">
            完整赛程 <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upcomingMatches.slice(0, 6).map((m: any) => (
            <MatchCard key={m.id} {...m} showId />
          ))}
        </div>
      </section>
    </PageTransition>
  );
}
