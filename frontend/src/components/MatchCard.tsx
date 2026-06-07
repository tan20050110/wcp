import { Calendar, MapPin } from "lucide-react";

interface MatchCardProps {
  home_team: { name: string; fifa_code: string; flag_url?: string };
  away_team: { name: string; fifa_code: string; flag_url?: string };
  match_date: string;
  venue?: string;
  home_score?: number;
  away_score?: number;
  status: string;
}

export default function MatchCard({ home_team, away_team, match_date, venue, home_score, away_score, status }: MatchCardProps) {
  const isLive = status === "live";
  const date = new Date(match_date);

  return (
    <div className={`bg-white/5 backdrop-blur rounded-xl p-4 border ${isLive ? "border-[#d4a843] animate-pulse" : "border-white/5"} hover:border-white/20 transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">
          <Calendar size={12} className="inline mr-1" />
          {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
          {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
        {isLive && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <div className="text-lg font-semibold">{home_team.name}</div>
          <div className="text-xs text-gray-400">{home_team.fifa_code}</div>
        </div>
        <div className="text-2xl font-bold px-4">
          {status === "finished" || isLive ? `${home_score ?? 0} - ${away_score ?? 0}` : "vs"}
        </div>
        <div className="text-center flex-1">
          <div className="text-lg font-semibold">{away_team.name}</div>
          <div className="text-xs text-gray-400">{away_team.fifa_code}</div>
        </div>
      </div>
      {venue && <div className="text-xs text-gray-500 mt-2 text-center"><MapPin size={10} className="inline mr-1" />{venue}</div>}
    </div>
  );
}
