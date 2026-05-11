"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface AuditProgressProps {
  progress: number;
  phase: string;
  detail: string;
}

const PHASE_KEYS = [
  "entryPointDiscovery",
  "contextBuilding",
  "securityAudit",
  "variantAnalysis",
  "reportGeneration",
] as const;

export function AuditProgress({ progress, phase, detail }: AuditProgressProps) {
  const { t } = useTranslation();

  const currentIndex = PHASE_KEYS.findIndex(
    (key) => key.toLowerCase().replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase() === phase.toLowerCase()
  );

  const phaseDescriptions = [
    t.dashboard.phaseDescriptions.entryPointDiscovery,
    t.dashboard.phaseDescriptions.contextBuilding,
    t.dashboard.phaseDescriptions.securityAudit,
    t.dashboard.phaseDescriptions.variantAnalysis,
    t.dashboard.phaseDescriptions.reportGeneration,
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white font-medium">{detail || phaseDescriptions[currentIndex >= 0 ? currentIndex : 0]}</span>
          <span className="text-solana-purple">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-solana-purple to-solana-blue"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex justify-between">
        {PHASE_KEYS.map((key, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;

          const phaseLabels = [
            t.dashboard.phases.entryPointDiscovery,
            t.dashboard.phases.contextBuilding,
            t.dashboard.phases.securityAudit,
            t.dashboard.phases.variantAnalysis,
            t.dashboard.phases.reportGeneration,
          ];

          return (
            <div
              key={key}
              className={cn(
                "flex flex-col items-center gap-2 flex-1",
                isPending ? "opacity-40" : ""
              )}
            >
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  isCompleted
                    ? "bg-solana-green text-white"
                    : isCurrent
                    ? "bg-solana-purple text-white ring-4 ring-solana-purple/20"
                    : "bg-white/10 text-white/60"
                )}
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  index + 1
                )}
              </motion.div>
              <span
                className={cn(
                  "text-xs text-center",
                  isCurrent ? "text-white font-medium" : "text-white/60"
                )}
              >
                {phaseLabels[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
