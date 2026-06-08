import { useNavigate } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { getFlagUrl } from "../lib/utils"; import { useT } from "../lib/i18n";

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
  const navigate = useNavigate(); const { t } = useT();

  return (
    <div
      onClick={() => id && navigate(`/predictions?match=${id}`)}
      className={`bg-white/5 backdrop-blur rounded-xl p-4 border cursor-pointer ${isLive ? "border-[#d4a843] animate-pulse" : "border-white/5"} hover:border-[#1a5632] hover:bg-white/10 transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">
          <Calendar size={12} className="inline mr-1" />
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
          {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
        {isLive && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">{t("liveLabel")}</span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-center flex-1">
          <img src={getFlagUrl(home_team.fifa_code)} alt="" className="w-10 h-7 object-cover rounded shadow-md mx-auto mb-1" />
          <div className="text-xs font-semibold leading-tight">{home_team.name}</div>
        </div>
        <div className="text-xl font-bold px-3 shrink-0">
          {status === "finished" || isLive ? `${home_score ?? 0} - ${away_score ?? 0}` : "vs"}
        </div>
        <div className="text-center flex-1">
          <img src={getFlagUrl(away_team.fifa_code)} alt="" className="w-10 h-7 object-cover rounded shadow-md mx-auto mb-1" />
          <div className="text-xs font-semibold leading-tight">{away_team.name}</div>
        </div>
      </div>
      {venue && <div className="text-xs text-gray-500 mt-2 text-center"><MapPin size={10} className="inline mr-1" />{venue}</div>}
      {showId && id && <div className="text-[10px] text-gray-600 mt-2 text-center font-mono">ID: {id.slice(0, 8)}</div>}
    </div>
  );
}
