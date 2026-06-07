import CountdownTimer from "../components/CountdownTimer";
import MatchCard from "../components/MatchCard";
import { useMatches, useLiveMatches } from "../hooks/useMatchData";

export default function Dashboard() {
  const today = new Date().toISOString().split("T")[0];
  const { matches: todayMatches } = useMatches({ date: today });
  const liveMatches = useLiveMatches();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-1">World Cup 2026</h1>
        <p className="text-gray-400 mb-4">Prediction & Live Tracker</p>
        <CountdownTimer />
      </section>

      {liveMatches.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-[#d4a843] mb-3">Live Now</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveMatches.map((m: any) => <MatchCard key={m.id} {...m} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">Today's Matches</h2>
        {todayMatches.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {todayMatches.map((m: any) => <MatchCard key={m.id} {...m} />)}
          </div>
        ) : (
          <p className="text-gray-500">No matches scheduled for today.</p>
        )}
      </section>
    </div>
  );
}
