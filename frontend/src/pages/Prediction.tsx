import { useState } from "react";
import { usePrediction } from "../hooks/usePrediction";
import ProbabilityBar from "../components/ProbabilityBar";

export default function Prediction() {
  const [matchId, setMatchId] = useState("");
  const { prediction, loading, fetchPrediction, simulate } = usePrediction();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Predictions</h1>

      <div className="bg-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Match Prediction</h2>
        <div className="flex gap-3">
          <input
            value={matchId} onChange={e => setMatchId(e.target.value)}
            placeholder="Enter match ID..." className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-1 text-white"
          />
          <button onClick={() => fetchPrediction(matchId)} className="bg-[#1a5632] hover:bg-[#1a5632]/80 px-4 py-2 rounded-lg text-sm">
            Predict
          </button>
        </div>
        {prediction && prediction.home_win_prob !== undefined && (
          <ProbabilityBar
            homeProb={prediction.home_win_prob} drawProb={prediction.draw_prob}
            awayProb={prediction.away_win_prob} homeLabel="Home" awayLabel="Away"
          />
        )}
      </div>

      <div className="bg-white/5 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">Tournament Simulation</h2>
        <button
          onClick={() => simulate(10000)} disabled={loading}
          className="bg-[#d4a843] hover:bg-[#d4a843]/80 text-black px-4 py-2 rounded-lg text-sm font-semibold"
        >
          {loading ? "Running..." : "Run 10,000 Simulations"}
        </button>
        {prediction?.results_json?.champions && (
          <div className="space-y-2">
            <h3 className="text-sm text-gray-400">Champion Odds</h3>
            {Object.entries(prediction.results_json.champions as Record<string, number>)
              .sort(([, a], [, b]) => b - a).slice(0, 10)
              .map(([team, prob]) => (
                <div key={team} className="flex items-center gap-3">
                  <span className="text-sm w-24 truncate">{team}</span>
                  <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-[#d4a843] rounded-full" style={{ width: `${prob * 100}%` }} />
                  </div>
                  <span className="text-sm text-[#d4a843] w-16 text-right">{(prob * 100).toFixed(1)}%</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
