import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import CountdownTimer from "../components/CountdownTimer";
import MatchCard from "../components/MatchCard";
import ProbabilityBar from "../components/ProbabilityBar";
import { useMatches } from "../hooks/useMatchData";
import { API_BASE, getFlagUrl } from "../lib/utils";
import { Trophy, Users, CalendarDays, Zap, ArrowRight, TrendingUp, Clock } from "lucide-react";
import { useT } from "../lib/i18n";

export default function Dashboard() {
  const { t } = useT();
  const { matches: allMatches } = useMatches({});
  const [topTeams, setTopTeams] = useState<any[]>([]);
  const [featuredPred, setFeaturedPred] = useState<any>(null);
  const [nextMatch, setNextMatch] = useState<any>(null);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    axios.get(`${API_BASE}/teams`).then(r => {
      setTopTeams(r.data.sort((a: any, b: any) => b.elo_rating - a.elo_rating).slice(0, 8));
    });
  }, []);

  const upcomingMatches = allMatches.filter((m: any) => m.status === "scheduled")
    .sort((a: any, b: any) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());
  const featuredMatch = upcomingMatches[0];

  useEffect(() => {
    if (featuredMatch?.id) {
      axios.get(`${API_BASE}/predictions/match/${featuredMatch.id}`).then(r => setFeaturedPred(r.data)).catch(() => {});
    }
  }, [featuredMatch?.id]);

  // Next match countdown
  useEffect(() => {
    if (!featuredMatch) return;
    const tick = () => {
      const diff = new Date(featuredMatch.match_date).getTime() - Date.now();
      if (diff <= 0) { setCountdown("Kickoff!"); return; }
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

  // Find next match with countdown
  useEffect(() => {
    if (upcomingMatches.length > 0) setNextMatch(upcomingMatches[0]);
  }, [upcomingMatches]);

  const stats = [
    { icon: Users, label: t("heroTeams"), value: "48", color: "from-emerald-500 to-green-700" },
    { icon: CalendarDays, label: t("heroMatches"), value: "72", color: "from-amber-500 to-yellow-700" },
    { icon: Zap, label: t("heroGroups"), value: "12", color: "from-blue-500 to-indigo-700" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d1a0f] via-[#0a0f1a] to-[#1a0f0a] p-8 lg:p-10 border border-white/5">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-20 w-72 h-72 bg-[#1a5632] rounded-full blur-[100px]" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-[#d4a843] rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-blue-600 rounded-full blur-[100px]" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="text-[#d4a843]" size={24} />
              <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase">FIFA World Cup 2026</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-2">{t("heroTitle")}</h1>
            <p className="text-gray-400 text-sm">{t("heroSub")}</p>
          </div>
          <CountdownTimer />
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-8 max-w-2xl">
          {stats.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="group bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur rounded-2xl p-5 text-center border border-white/5 hover:border-white/10 transition-all duration-300">
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
                <Icon size={18} className="text-white" />
              </div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Next Match Countdown */}
      {nextMatch && (
        <Link to={`/predictions?match=${nextMatch.id}`}
          className="block bg-white/[0.03] hover:bg-white/[0.05] backdrop-blur rounded-2xl p-5 border border-white/5 hover:border-[#d4a843]/30 transition-all">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-[#d4a843]" />
            <span className="text-sm text-gray-400">Next Match</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={getFlagUrl(nextMatch.home_team?.fifa_code)} alt="" className="w-8 h-6 rounded shadow" />
              <span className="font-bold">{nextMatch.home_team?.name}</span>
            </div>
            <div className="text-center shrink-0">
              <div className="text-2xl font-mono font-bold text-[#d4a843]">{countdown}</div>
              <div className="text-[10px] text-gray-600">VS</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold">{nextMatch.away_team?.name}</span>
              <img src={getFlagUrl(nextMatch.away_team?.fifa_code)} alt="" className="w-8 h-6 rounded shadow" />
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 text-center">
            {new Date(nextMatch.match_date).toLocaleString()} · {nextMatch.venue}
          </div>
        </Link>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Top Teams */}
        <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-5 border border-white/5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-[#d4a843]" /> {t("topElo")}
            </h2>
            <Link to="/teams" className="text-xs text-[#d4a843] hover:underline flex items-center gap-1">
              All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-1">
            {topTeams.map((t: any, i: number) => (
              <Link key={t.id} to={`/teams/${t.id}`}
                className="flex items-center gap-3 hover:bg-white/[0.04] rounded-xl p-2.5 transition-all group">
                <span className={`text-xs font-bold w-6 text-right ${i < 3 ? "text-[#d4a843]" : "text-gray-600"}`}>#{i + 1}</span>
                <img src={getFlagUrl(t.fifa_code)} alt="" className="w-7 h-5 rounded shadow-sm" />
                <span className="flex-1 text-sm group-hover:text-white transition-colors">{t.name}</span>
                <span className="text-xs text-gray-600">{Math.round(t.elo_rating)}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Featured Prediction */}
        <div className="bg-white/[0.03] backdrop-blur rounded-2xl p-5 border border-white/5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Zap size={18} className="text-[#d4a843]" /> Featured Prediction
            </h2>
            <Link to="/predictions" className="text-xs text-[#d4a843] hover:underline flex items-center gap-1">
              Predictions <ArrowRight size={12} />
            </Link>
          </div>
          {featuredMatch ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="text-center flex-1">
                  <img src={getFlagUrl(featuredMatch.home_team?.fifa_code)} alt="" className="w-12 h-8 object-cover rounded shadow-md mx-auto mb-2" />
                  <div className="font-bold text-sm">{featuredMatch.home_team?.name}</div>
                </div>
                <div className="text-center shrink-0">
                  <div className="text-2xl font-black text-[#d4a843]">VS</div>
                  <div className="text-xs text-gray-500">{new Date(featuredMatch.match_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                <div className="text-center flex-1">
                  <img src={getFlagUrl(featuredMatch.away_team?.fifa_code)} alt="" className="w-12 h-8 object-cover rounded shadow-md mx-auto mb-2" />
                  <div className="font-bold text-sm">{featuredMatch.away_team?.name}</div>
                </div>
              </div>
              {featuredPred?.home_win_prob !== undefined ? (
                <ProbabilityBar
                  homeProb={featuredPred.home_win_prob}
                  drawProb={featuredPred.draw_prob}
                  awayProb={featuredPred.away_win_prob}
                  homeLabel={featuredMatch.home_team?.name || "Home"}
                  awayLabel={featuredMatch.away_team?.name || "Away"}
                />
              ) : (
                <p className="text-xs text-gray-600 text-center">Loading prediction...</p>
              )}
              <div className="text-xs text-gray-500 text-center">
                {featuredMatch.venue && <span><MapPinIcon /> {featuredMatch.venue}</span>}
              </div>
            </div>
          ) : (
            <p className="text-gray-600 text-sm py-4 text-center">No upcoming matches.</p>
          )}
        </div>
      </div>

      {/* Upcoming Matches */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upcoming Matches</h2>
          <Link to="/schedule" className="text-sm text-[#d4a843] hover:underline flex items-center gap-1">
            Full Schedule <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {upcomingMatches.slice(0, 6).map((m: any) => (
            <MatchCard key={m.id} {...m} showId />
          ))}
        </div>
      </section>
    </div>
  );
}

function MapPinIcon() {
  return <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
}
