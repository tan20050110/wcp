import { motion } from "framer-motion";
import { cn } from "../lib/utils";

interface CardProps {
  variant?: "flat" | "elevated" | "interactive";
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const variants = {
  flat: "bg-bg-elevated border border-border-subtle",
  elevated: "bg-bg-overlay border border-border-default shadow-lg",
  interactive: "bg-bg-elevated border border-border-subtle hover:border-border-emphasis hover:bg-bg-hover cursor-pointer transition-all duration-300",
};

export default function Card({ variant = "flat", className, children, onClick }: CardProps) {
  const Comp = variant === "interactive" ? motion.div : "div";
  const motionProps = variant === "interactive"
    ? { whileHover: { y: -2, transition: { duration: 0.2 } }, whileTap: { scale: 0.995 } }
    : {};

  return (
    <Comp
      {...motionProps}
      onClick={onClick}
      className={cn("rounded-2xl p-5", variants[variant], className)}
    >
      {children}
    </Comp>
  );
}
