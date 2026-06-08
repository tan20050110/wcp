import { useState, useEffect } from "react";
import axios from "axios";
import { useT } from "../lib/i18n";
import { API_BASE } from "../lib/utils";
import { AlertTriangle } from "lucide-react";

export default function Insights() { const { t } = useT();
  const [upsets, setUpsets] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`${API_BASE}/analysis/upsets`).then(r => setUpsets(r.data));
  }, []);

  const topCold = upsets.filter((u: any) => u.upset_index > 0.5);
  const allRanked = [...upsets].sort((a, b) => b.upset_index - a.upset_index);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dataInsights")}</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{topCold.length}</div>
          <div className="text-xs text-gray-400">{t("highRisk")} (&gt;50%)</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-[#d4a843]">{upsets.filter((u: any) => u.upset_index > 0.3 && u.upset_index <= 0.5).length}</div>
          <div className="text-xs text-gray-400">{t("medRisk")} (30-50%)</div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{upsets.filter((u: any) => u.upset_index <= 0.3).length}</div>
          <div className="text-xs text-gray-400">{t("lowRisk")} (&lt;30%)</div>
        </div>
      </div>

      {/* Full Upset Ranking */}
      <div className="bg-white/5 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle size={18} className="text-orange-400" /> {t("upsetTitle")}
        </h2>
        <p className="text-xs text-gray-500 mb-4">Higher = more likely to cause an upset. Based on FIFA rank, ELO rating, and group strength.</p>
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {allRanked.map((u: any, i: number) => (
            <div key={u.team_id} className="flex items-center gap-3 hover:bg-white/5 rounded-lg p-2 transition-all">
              <span className="text-xs text-gray-500 w-8 text-right">#{i + 1}</span>
              <span className="inline-flex items-center justify-center w-9 h-6 rounded bg-[#1a5632] text-white text-[10px] font-bold">{u.fifa_code}</span>
              <span className="flex-1 text-sm">{u.name}</span>
              <span className="text-xs text-gray-500 w-10">Gr.{u.group}</span>
              <span className="text-xs text-gray-600 w-10 text-right">#{u.fifa_rank}</span>
              <div className="w-28 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${u.upset_index > 0.5 ? "bg-orange-500" : u.upset_index > 0.3 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${Math.max(2, u.upset_index * 100)}%` }} />
              </div>
              <span className={`text-xs w-12 text-right font-medium ${u.upset_index > 0.5 ? "text-orange-400" : u.upset_index > 0.3 ? "text-yellow-400" : "text-green-400"}`}>
                {(u.upset_index * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
