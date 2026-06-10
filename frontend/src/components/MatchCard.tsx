import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin } from "lucide-react";
import { getFlagUrl } from "../lib/utils";
import { useT } from "../lib/i18n";

interface MatchCardProps {
  home_team: { name: string; fifa_code: string; flag_url?: string };
  away_team: { name: string; fifa_code: string; flag_url?: string };
  match_date: string;
  venue?: string;
  home_score?: number;
  away_score?: number;
  status: string;
  id?: string;
  showId?: boolean;
}

export default function MatchCard({ home_team, away_team, match_date, venue, home_score, away_score, status, id, showId }: MatchCardProps) {
  const isLive = status === "live";
  const date = new Date(match_date);
  const navigate = useNavigate();
  const { t } = useT();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={id ? { y: -4 } : undefined}
      whileTap={id ? { scale: 0.98 } : undefined}
      onClick={() => id && navigate(`/predictions?match=${id}`)}
      className={`bg-bg-elevated backdrop-blur rounded-xl p-4 border cursor-pointer transition-colors ${
        isLive
          ? "border-brand-gold/40 shadow-[0_0_20px_rgba(212,168,67,0.1)]"
          : "border-border-subtle hover:border-brand-blue/60"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted">
          <Calendar size={12} className="inline mr-1" />
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
          {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs bg-red-600/90 text-white px-2.5 py-0.5 rounded-full animate-pulse">
            <span className="w-1.5 h-1.5 bg-white rounded-full" />
            {t("liveLabel")}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="text-center flex-1">
          <img src={getFlagUrl(home_team.fifa_code)} alt="" className="w-10 h-7 object-cover rounded shadow-md mx-auto mb-1" />
          <div className="text-xs font-semibold leading-tight">{home_team.name}</div>
        </div>
        <div className="text-xl font-bold px-3 shrink-0 tabular-nums">
          {status === "finished" || isLive ? `${home_score ?? 0} - ${away_score ?? 0}` : "vs"}
        </div>
        <div className="text-center flex-1">
          <img src={getFlagUrl(away_team.fifa_code)} alt="" className="w-10 h-7 object-cover rounded shadow-md mx-auto mb-1" />
          <div className="text-xs font-semibold leading-tight">{away_team.name}</div>
        </div>
      </div>

      {venue && (
        <div className="text-xs text-text-muted mt-2 text-center">
          <MapPin size={10} className="inline mr-1" />{venue}
        </div>
      )}
      {showId && id && (
        <div className="text-[10px] text-text-muted mt-2 text-center font-mono">#{id.slice(0, 8)}</div>
      )}
    </motion.div>
  );
}
