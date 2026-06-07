import { useState, useEffect } from "react";

const WORLD_CUP_START = new Date("2026-06-11T00:00:00Z");

export default function CountdownTimer() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const diff = WORLD_CUP_START.getTime() - now.getTime();
  if (diff <= 0)
    return <div className="text-2xl font-bold text-[#d4a843]">The World Cup is here!</div>;

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  return (
    <div className="flex gap-4 text-center">
      {[{ v: days, l: "Days" }, { v: hours, l: "Hours" }, { v: minutes, l: "Minutes" }].map(({ v, l }) => (
        <div key={l} className="bg-white/5 backdrop-blur rounded-xl p-4 min-w-[80px]">
          <div className="text-3xl font-bold text-[#d4a843]">{v}</div>
          <div className="text-xs text-gray-400">{l}</div>
        </div>
      ))}
    </div>
  );
}
