import { useState } from "react";
import { useMatches } from "../hooks/useMatchData";
import MatchCard from "../components/MatchCard";

const STAGES = ["", "group", "round16", "quarter", "semi", "third", "final"];
const GROUPS = ["", "A", "B", "C", "D", "E", "F", "G", "H"];

export default function Schedule() {
  const [stage, setStage] = useState("");
  const [group, setGroup] = useState("");
  const { matches } = useMatches({ stage, group });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Schedule</h1>
      <div className="flex gap-3 flex-wrap">
        <select value={stage} onChange={e => setStage(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
          {STAGES.map(s => <option key={s} value={s}>{s || "All Stages"}</option>)}
        </select>
        <select value={group} onChange={e => setGroup(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
          {GROUPS.map(g => <option key={g} value={g}>{g ? `Group ${g}` : "All Groups"}</option>)}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {matches.map((m: any) => <MatchCard key={m.id} {...m} />)}
      </div>
    </div>
  );
}
