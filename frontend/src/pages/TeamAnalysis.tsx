import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../lib/utils";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

export default function TeamAnalysis() {
  const { id } = useParams();
  const [teams, setTeams] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [trend, setTrend] = useState<any>(null);

  useEffect(() => { axios.get(`${API_BASE}/teams`).then(r => setTeams(r.data)); }, []);

  useEffect(() => {
    if (!id) return;
    axios.get(`${API_BASE}/teams/${id}`).then(r => setSelected(r.data));
    axios.get(`${API_BASE}/analysis/trends/${id}`).then(r => setTrend(r.data));
  }, [id]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team Analysis</h1>
      <select
        onChange={e => { if (e.target.value) window.location.hash = `/teams/${e.target.value}`; }}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
      >
        <option value="">Select a team...</option>
        {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.fifa_code})</option>)}
      </select>

      {selected && (
        <div className="bg-white/5 backdrop-blur rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-[#d4a843]">{selected.name} - Group {selected.group}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-sm text-gray-400 mb-2">Attack / Defense / Midfield</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={[
                  { stat: "Attack", A: selected.stats_json?.attack || 0, fullMark: 2 },
                  { stat: "Defense", A: selected.stats_json?.defense || 0, fullMark: 2 },
                  { stat: "Midfield", A: selected.stats_json?.midfield || 0, fullMark: 2 },
                ]}>
                  <PolarGrid stroke="#333" />
                  <PolarAngleAxis dataKey="stat" stroke="#888" />
                  <Radar dataKey="A" stroke="#1a5632" fill="#1a5632" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              <p>FIFA Rank: <span className="text-[#d4a843] font-bold">{selected.fifa_rank}</span></p>
              <p>ELO Rating: <span className="text-[#d4a843] font-bold">{selected.elo_rating}</span></p>
              {trend && (
                <p>Form: <span className={trend.trend === "improving" ? "text-green-400" : "text-red-400"}>
                  {trend.trend} ({(trend.form_score * 100).toFixed(0)}%)
                </span></p>
              )}
              {selected.availability_json?.unavailable?.length > 0 && (
                <div className="text-red-400 text-sm">
                  Unavailable: {selected.availability_json.unavailable.map((u: any) => u.name).join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
