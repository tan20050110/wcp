import { cn } from "../lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
}

export default function Skeleton({ className, variant = "rect" }: SkeletonProps) {
  const shapes = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded h-4",
  };

  return (
    <div
      className={cn(
        "skeleton-shimmer",
        shapes[variant],
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-bg-elevated border border-border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" variant="text" />
        <Skeleton className="h-3 w-16" variant="text" />
      </div>
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-8 w-12" />
        <Skeleton className="h-6 w-8" />
        <Skeleton className="h-8 w-12" />
      </div>
      <Skeleton className="h-3 w-full" variant="text" />
      <Skeleton className="h-2 w-3/4 mx-auto" variant="text" />
    </div>
  );
}

export function SkeletonLine({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
