import { cn } from "@/lib/cn";
import type { Severity } from "@/types/audit";

interface BadgeProps {
  severity: Severity;
  className?: string;
}

const severityStyles: Record<Severity, string> = {
  critical: "bg-critical/20 text-critical border-critical/30",
  high: "bg-high/20 text-high border-high/30",
  medium: "bg-medium/20 text-medium border-medium/30",
  low: "bg-low/20 text-low border-low/30",
};

export function Badge({ severity, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        severityStyles[severity],
        className
      )}
    >
      {severity}
    </span>
  );
}
