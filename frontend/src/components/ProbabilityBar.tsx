import { motion } from "framer-motion";

interface Props {
  homeProb: number;
  drawProb: number;
  awayProb: number;
  homeLabel: string;
  awayLabel: string;
}

function AnimatedBar({ prob, color }: { prob: number; color: string }) {
  return (
    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${prob * 100}%` }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

export default function ProbabilityBar({ homeProb, drawProb, awayProb, homeLabel, awayLabel }: Props) {
  const rows = [
    { label: homeLabel, prob: homeProb, color: "bg-brand-blue" },
    { label: "Draw", prob: drawProb, color: "bg-brand-gold" },
    { label: awayLabel, prob: awayProb, color: "bg-blue-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-2.5"
    >
      {rows.map(({ label, prob, color }) => (
        <div key={label}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">{label}</span>
            <span className="text-text-primary font-medium tabular-nums">
              {(prob * 100).toFixed(1)}%
            </span>
          </div>
          <AnimatedBar prob={prob} color={color} />
        </div>
      ))}
    </motion.div>
  );
}
