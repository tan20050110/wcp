interface Props {
  homeProb: number; drawProb: number; awayProb: number;
  homeLabel: string; awayLabel: string;
}

export default function ProbabilityBar({ homeProb, drawProb, awayProb, homeLabel, awayLabel }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm"><span>{homeLabel}</span><span>{(homeProb * 100).toFixed(1)}%</span></div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#1a5632] rounded-full transition-all" style={{ width: `${homeProb * 100}%` }} />
      </div>
      <div className="flex justify-between text-sm"><span>Draw</span><span>{(drawProb * 100).toFixed(1)}%</span></div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#d4a843] rounded-full transition-all" style={{ width: `${drawProb * 100}%` }} />
      </div>
      <div className="flex justify-between text-sm"><span>{awayLabel}</span><span>{(awayProb * 100).toFixed(1)}%</span></div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${awayProb * 100}%` }} />
      </div>
    </div>
  );
}
