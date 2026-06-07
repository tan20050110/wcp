import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../lib/utils";

export default function Insights() {
  const [upsets, setUpsets] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`${API_BASE}/analysis/upsets`).then(r => setUpsets(r.data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Data Insights</h1>

      <div className="bg-white/5 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Upset Index Ranking</h2>
        <div className="space-y-2">
          {upsets.map((u: any, i: number) => (
            <div key={u.team_id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
              <span className="text-sm text-gray-400 w-6">#{i + 1}</span>
              <span className="flex-1">{u.name} ({u.fifa_code})</span>
              <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${u.upset_index * 100}%` }} />
              </div>
              <span className="text-sm w-12 text-right">{(u.upset_index * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
