"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PHASE_DESCRIPTIONS, PHASE_NAMES } from "@/lib/audit/constants";
import type { WorkflowEvent } from "@/types/audit";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  MessageSquareMore,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

function statusConfig(status: WorkflowEvent["status"]) {
  switch (status) {
    case "running":
      return {
        label: "Running",
        className: "border-solana-purple/30 bg-solana-purple/10 text-solana-purple",
        dot: "bg-solana-purple",
        icon: Activity,
      };
    case "done":
      return {
        label: "Done",
        className: "border-solana-green/30 bg-solana-green/10 text-solana-green",
        dot: "bg-solana-green",
        icon: CheckCircle2,
      };
    case "warning":
      return {
        label: "Warning",
        className: "border-high/30 bg-high/10 text-high",
        dot: "bg-high",
        icon: TriangleAlert,
      };
    case "error":
      return {
        label: "Error",
        className: "border-critical/30 bg-critical/10 text-critical",
        dot: "bg-critical",
        icon: TriangleAlert,
      };
    case "waiting":
      return {
        label: "Waiting",
        className: "border-dark-500 bg-dark-800/60 text-slate-300",
        dot: "bg-slate-400",
        icon: Clock3,
      };
    default:
      return {
        label: "Info",
        className: "border-solana-blue/30 bg-solana-blue/10 text-solana-blue",
        dot: "bg-solana-blue",
        icon: Sparkles,
      };
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function PhasePill({
  index,
  currentPhase,
  label,
  description,
}: {
  index: number;
  currentPhase?: number;
  label: string;
  description: string;
}) {
  const active = currentPhase === index + 1;
  const done = (currentPhase ?? 0) > index + 1;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1 rounded-xl border px-3 py-2 transition-all",
        active
          ? "border-solana-purple/40 bg-solana-purple/10 text-white"
          : done
            ? "border-solana-green/20 bg-solana-green/10 text-slate-100"
            : "border-dark-600/60 bg-dark-800/40 text-slate-400"
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            active
              ? "bg-solana-purple text-white"
              : done
                ? "bg-solana-green text-white"
                : "bg-dark-700 text-slate-400"
          )}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide">{label}</p>
        </div>
      </div>
      <p className="line-clamp-2 text-[11px] leading-relaxed text-slate-400">{description}</p>
    </div>
  );
}

function MetricChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-dark-600/60 bg-dark-800/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function TraceDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 rounded-xl border border-dark-600/60 bg-dark-900/60 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-xs leading-relaxed text-slate-200">{value}</p>
    </div>
  );
}

export function AuditExecutionPanel({
  progress,
  stage,
  phase,
  phaseDetail,
  timeline,
  title = "Live Workflow",
  className,
}: {
  progress: number;
  stage: string;
  phase?: number;
  phaseDetail?: string;
  timeline: WorkflowEvent[];
  title?: string;
  className?: string;
}) {
  const recentEvents = useMemo(() => timeline.slice(-12), [timeline]);
  const currentEvent = recentEvents[recentEvents.length - 1];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const activeExpandedId = expandedId ?? currentEvent?.id ?? null;

  const traceStats = useMemo(() => {
    const agents = new Set<string>();
    const workflows = new Set<string>();
    let warnings = 0;
    let running = 0;
    let done = 0;
    let metricCount = 0;

    for (const item of timeline) {
      if (item.agent) agents.add(item.agent);
      workflows.add(item.workflow);
      metricCount += item.metrics?.length ?? 0;

      if (item.status === "warning" || item.status === "error") warnings += 1;
      if (item.status === "running") running += 1;
      if (item.status === "done") done += 1;
    }

    return {
      events: timeline.length,
      agents: agents.size,
      workflows: workflows.size,
      warnings,
      running,
      done,
      metricCount,
    };
  }, [timeline]);

  return (
    <Card className={cn("border-dark-600/50 bg-dark-700/50 backdrop-blur-sm", className)}>
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Bot className="h-4 w-4 text-solana-purple" />
            {title}
          </CardTitle>
          <Badge variant="outline" className="border-dark-500 text-slate-200">
            {progress}%
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">{stage || "Working..."}</p>
              <p className="text-xs text-slate-400">
                {phaseDetail || currentEvent?.detail || "Preparing the next step..."}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300">
                  {currentEvent?.workflow || "workflow"}
                </Badge>
                <Badge variant="outline" className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300">
                  {currentEvent?.agent || "orchestrator"}
                </Badge>
                <Badge variant="outline" className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300">
                  {currentEvent?.status || "running"}
                </Badge>
              </div>
            </div>

            <div className="rounded-lg border border-dark-600/60 bg-dark-800/50 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Current</p>
              <p className="text-sm font-medium text-white">
                {currentEvent?.agent || "orchestrator"}
              </p>
              <p className="text-xs text-slate-400">{currentEvent?.workflow || "workflow"}</p>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-solana-purple via-solana-blue to-solana-green transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-5">
          {PHASE_NAMES.map((label, index) => (
            <PhasePill
              key={label}
              index={index}
              currentPhase={phase}
              label={label}
              description={PHASE_DESCRIPTIONS[index]}
            />
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricChip label="events" value={traceStats.events} />
          <MetricChip label="agents" value={traceStats.agents} />
          <MetricChip label="workflows" value={traceStats.workflows} />
          <MetricChip label="warnings" value={traceStats.warnings} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span>{traceStats.running} running</span>
          <span>•</span>
          <span>{traceStats.done} done</span>
          <span>•</span>
          <span>{traceStats.metricCount} metrics</span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Streaming Trace
          </p>
          <div className="space-y-3">
            {recentEvents.length > 0 ? (
              recentEvents.map((item) => {
                const config = statusConfig(item.status);
                const Icon = config.icon;
                const expanded = activeExpandedId === item.id;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border bg-dark-800/40 p-3 shadow-sm transition-all",
                      config.className,
                      item.status === "running" ? "ring-1 ring-inset ring-current/20" : ""
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <div className={cn("mt-1 h-2.5 w-2.5 rounded-full", config.dot)} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-200"
                          >
                            {item.workflow}
                          </Badge>
                          {item.agent ? (
                            <Badge
                              variant="outline"
                              className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300"
                            >
                              {item.agent}
                            </Badge>
                          ) : null}
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] uppercase tracking-wide", config.className)}
                          >
                            <Icon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">{item.title}</p>
                          <p className="text-xs leading-relaxed text-slate-300">{item.detail}</p>
                        </div>

                        {typeof item.progress === "number" ? (
                          <div className="space-y-1">
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-solana-purple to-solana-blue"
                                style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }}
                              />
                            </div>
                            <p className="text-[10px] uppercase tracking-wide text-slate-500">
                              {item.progress.toFixed(0)}%
                            </p>
                          </div>
                        ) : null}

                        {item.metrics?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {item.metrics.map((metric) => (
                              <Badge
                                key={`${item.id}-${metric.label}`}
                                variant="outline"
                                className="border-dark-500 bg-dark-900/40 text-[10px] uppercase tracking-wide text-slate-300"
                              >
                                {metric.label}: {metric.value}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-1 text-slate-400">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>

                    {expanded ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        <TraceDetail
                          label="timestamp"
                          value={formatTimestamp(item.timestamp)}
                        />
                        <TraceDetail
                          label="phase"
                          value={item.phaseName ? `${item.phaseName}${item.phase ? ` · ${item.phase}` : ""}` : item.phase ? `Phase ${item.phase}` : "n/a"}
                        />
                        <TraceDetail
                          label="workflow"
                          value={item.workflow}
                        />
                        <TraceDetail
                          label="agent"
                          value={item.agent || "system"}
                        />
                        <TraceDetail
                          label="input"
                          value={item.inputSummary || item.detail}
                        />
                        <TraceDetail
                          label="output"
                          value={item.outputSummary || item.detail}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dark-600/60 bg-dark-800/40 p-4 text-sm text-slate-400">
                Waiting for workflow events...
              </div>
            )}
          </div>
        </div>

        {currentEvent ? (
          <div className="rounded-2xl border border-dark-600/60 bg-dark-900/50 p-4">
            <div className="flex items-center gap-2">
              <MessageSquareMore className="h-4 w-4 text-solana-blue" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Latest Message
              </p>
            </div>
            <p className="mt-2 text-sm font-medium text-white">{currentEvent.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{currentEvent.detail}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
