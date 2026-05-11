"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { WorkflowEvent } from "@/types/audit";
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  ScrollText,
  MessageSquareMore,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

type WorkflowStatusLabels = {
  running: string;
  done: string;
  waiting: string;
  info: string;
  warning: string;
  error: string;
  archived: string;
};

const PHASE_KEYS = [
  "entryPointDiscovery",
  "contextBuilding",
  "securityAudit",
  "variantAnalysis",
  "reportGeneration",
] as const;

function statusConfig(
  status: WorkflowEvent["status"],
  finalized: boolean,
  labels: WorkflowStatusLabels
) {
  const archived = finalized && (status === "running" || status === "waiting" || status === "info");

  if (archived) {
    return {
      label: labels.archived,
      className: "border-dark-500/60 bg-dark-800/40 text-slate-300",
      dot: "bg-slate-400",
      icon: ScrollText,
    };
  }

  switch (status) {
    case "running":
      return {
        label: labels.running,
        className: "border-solana-purple/30 bg-solana-purple/10 text-solana-purple",
        dot: "bg-solana-purple",
        icon: Activity,
      };
    case "done":
      return {
        label: labels.done,
        className: "border-solana-green/30 bg-solana-green/10 text-solana-green",
        dot: "bg-solana-green",
        icon: CheckCircle2,
      };
    case "warning":
      return {
        label: labels.warning,
        className: "border-high/30 bg-high/10 text-high",
        dot: "bg-high",
        icon: TriangleAlert,
      };
    case "error":
      return {
        label: labels.error,
        className: "border-critical/30 bg-critical/10 text-critical",
        dot: "bg-critical",
        icon: TriangleAlert,
      };
    case "waiting":
      return {
        label: labels.waiting,
        className: "border-dark-500 bg-dark-800/60 text-slate-300",
        dot: "bg-slate-400",
        icon: Clock3,
      };
    default:
      return {
        label: labels.info,
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

function formatWorkflowLabel(
  workflow: string | undefined,
  labels: Record<string, string>,
  fallback: string
) {
  if (!workflow) return fallback;
  return labels[workflow] || workflow;
}

type TimelineGroup = {
  id: string;
  workflow: string;
  phase?: number;
  events: WorkflowEvent[];
  finalEvent: WorkflowEvent;
};

function groupTimelineEvents(timeline: WorkflowEvent[]): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>();
  const ordered: TimelineGroup[] = [];

  for (const item of timeline) {
    const phaseKey = typeof item.phase === "number" ? String(item.phase) : item.phaseName || item.title;
    const id = `${item.workflow}:${phaseKey}`;
    const existing = groups.get(id);

    if (existing) {
      existing.events.push(item);
      existing.finalEvent = item;
      continue;
    }

    const group: TimelineGroup = {
      id,
      workflow: item.workflow,
      phase: item.phase,
      events: [item],
      finalEvent: item,
    };

    groups.set(id, group);
    ordered.push(group);
  }

  return ordered;
}

type TimelineText = {
  title: string;
  detail: string;
};

function translateTimelineEvent(isZh: boolean, item: WorkflowEvent): TimelineText {
  if (!isZh) {
    return {
      title: item.title,
      detail: item.detail,
    };
  }

  const workflow = item.workflow;
  const title = item.title;
  const detail = item.detail;

  if (workflow === "entry-point-discovery") {
    if (title === "Entry point discovery started") {
      return { title: "入口点发现已开始", detail: "扫描结构化上下文中的程序入口点" };
    }
    if (title === "Parsing entry point analysis") {
      return { title: "正在解析入口点分析", detail: "规范化入口点分类" };
    }
    if (title === "Entry point parsing failed") {
      return { title: "入口点解析失败", detail: "回退：未返回入口点" };
    }
    if (title === "Entry point discovery complete") {
      return { title: "入口点发现完成", detail: detail.replace("Detected", "检测到").replace("entry points", "个入口点") };
    }
  }

  if (workflow === "context-building") {
    if (title === "Context building started") {
      return { title: "上下文构建已开始", detail: "编排器正在识别复杂函数和信任边界" };
    }
    if (title === "Parsing context analysis") {
      return { title: "正在解析上下文分析", detail: "规范化上下文结果" };
    }
    if (title === "Context parsing failed") {
      return { title: "上下文解析失败", detail: "回退上下文已返回" };
    }
    if (title === "Context parsing returned empty data") {
      return { title: "上下文解析返回空数据", detail: "回退上下文已返回" };
    }
    if (title === "Sub-agent analysis failed") {
      return { title: "子 Agent 分析失败", detail: "继续使用基础架构上下文" };
    }
    if (title === "Context building complete") {
      return { title: "上下文构建完成", detail: "架构上下文已准备好供后续阶段使用" };
    }
  }

  if (workflow === "security-audit") {
    if (title === "Security audit started") {
      return { title: "安全审计已开始", detail: "正在扫描 Solana 特有漏洞" };
    }
    if (title === "Parsing vulnerability findings") {
      return { title: "正在解析漏洞结果", detail: "规范化漏洞和证据" };
    }
    if (title === "Security audit fallback") {
      return { title: "安全审计回退", detail: "未返回漏洞，已进入回退结果" };
    }
    if (title === "Security audit complete") {
      return { title: "安全审计完成", detail: detail.replace("Found", "发现").replace("potential vulnerabilities", "个潜在漏洞") };
    }
  }

  if (workflow === "variant-analysis") {
    if (title === "Variant analysis skipped") {
      return { title: "变体分析已跳过", detail: "没有可用于泛化的漏洞" };
    }
    if (title === "Variant analysis started") {
      return { title: "变体分析已开始", detail: `正在泛化 ${item.inputSummary || ""}`.trim() || "正在泛化漏洞" };
    }
    if (title.startsWith("Analyzing finding ")) {
      return { title: title.replace("Analyzing finding", "正在分析漏洞"), detail: detail };
    }
    if (title === "Variant analysis complete") {
      return { title: "变体分析完成", detail: detail.replace("Confirmed", "确认").replace("dismissed", "驳回").replace("variants", "个变体") };
    }
    if (title === "Sub-agent analysis failed") {
      return { title: "子 Agent 分析失败", detail: "继续使用基础变体分析" };
    }
  }

  if (workflow === "report-generation") {
    if (title === "Report generation started") {
      return { title: "报告生成已开始", detail: "正在将发现综合成最终审计报告" };
    }
    if (title === "Parsing audit report") {
      return { title: "正在解析审计报告", detail: "规范化最终漏洞报告" };
    }
    if (title === "Report parsing failed") {
      return { title: "报告解析失败", detail: "已从已验证结果生成回退报告" };
    }
    if (title === "Report parsing returned empty data") {
      return { title: "报告解析返回空数据", detail: "已从已验证结果生成回退报告" };
    }
    if (title === "Report generation complete") {
      return { title: "报告生成完成", detail: detail.replace("Final report ready with", "最终报告已准备好，包含").replace("vulnerabilities", "个漏洞") };
    }
  }

  return {
    title,
    detail,
  };
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
  finalized = false,
  className,
}: {
  progress: number;
  stage: string;
  phase?: number;
  phaseDetail?: string;
  timeline: WorkflowEvent[];
  title?: string;
  finalized?: boolean;
  className?: string;
}) {
  const { t, isZh } = useTranslation();
  const currentEvent = timeline[timeline.length - 1];
  const groupedTimeline = useMemo(() => groupTimelineEvents(timeline), [timeline]);
  const statusLabels: WorkflowStatusLabels = {
    running: t.dashboard.reportPage.workflowStatusLabels.running,
    done: t.dashboard.reportPage.workflowStatusLabels.done,
    waiting: t.dashboard.reportPage.workflowStatusLabels.waiting,
    info: t.dashboard.reportPage.workflowStatusLabels.info,
    warning: t.dashboard.reportPage.workflowStatusLabels.warning,
    error: t.dashboard.reportPage.workflowStatusLabels.error,
    archived: t.dashboard.runPage.timeline.archived,
  };
  const workflowLabels = t.dashboard.runPage.timeline.workflowLabels as Record<string, string>;
  const phaseNames = t.dashboard.runPage.timeline.phaseNames as Record<string, string>;
  const phaseDescriptions = t.dashboard.runPage.timeline.phaseDescriptions as Record<string, string>;
  const snapshotsLabel = t.dashboard.runPage.timeline.snapshots;
  const systemFallback = t.dashboard.runPage.timeline.systemFallback;
  const workingFallback = t.dashboard.runPage.timeline.workingFallback;
  const preparingFallback = t.dashboard.runPage.timeline.preparingFallback;
  const currentEventConfig = currentEvent
    ? statusConfig(currentEvent.status, finalized, statusLabels)
    : null;
  const currentEventText = currentEvent ? translateTimelineEvent(isZh, currentEvent) : null;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const activeExpandedId = expandedId ?? groupedTimeline[groupedTimeline.length - 1]?.id ?? null;
  const stageLabel = isZh && currentEventText ? currentEventText.title : stage || workingFallback;
  const stageDescription =
    isZh && currentEventText
      ? currentEventText.detail
      : phaseDetail || currentEvent?.detail || preparingFallback;

  const traceStats = useMemo(() => {
    const agents = new Set<string>();
    const workflows = new Set<string>();
    let warnings = 0;
    let running = 0;
    let archived = 0;
    let done = 0;
    let metricCount = 0;

    for (const item of timeline) {
      if (item.agent) agents.add(item.agent);
      workflows.add(item.workflow);
      metricCount += item.metrics?.length ?? 0;

      if (item.status === "warning" || item.status === "error") warnings += 1;
      if (item.status === "running") running += 1;
      if (item.status === "done") done += 1;
      if (finalized && (item.status === "running" || item.status === "waiting" || item.status === "info")) {
        archived += 1;
      }
    }

    return {
      events: timeline.length,
      agents: agents.size,
      workflows: workflows.size,
      warnings,
      running,
      archived,
      done,
      metricCount,
    };
  }, [finalized, timeline]);

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
              <p className="text-sm font-medium text-white">{stageLabel}</p>
              <p className="text-xs text-slate-400">{stageDescription}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300">
                  {formatWorkflowLabel(
                    currentEvent?.workflow,
                    workflowLabels,
                    t.dashboard.runPage.timeline.workflowFallback
                  )}
                </Badge>
                <Badge variant="outline" className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300">
                  {currentEvent?.agent || t.dashboard.runPage.timeline.agentFallback}
                </Badge>
                <Badge variant="outline" className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300">
                  {currentEventConfig?.label || t.dashboard.runPage.timeline.running}
                </Badge>
              </div>
            </div>

            <div className="rounded-lg border border-dark-600/60 bg-dark-800/50 px-3 py-2 text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{t.dashboard.runPage.timeline.current}</p>
              <p className="text-sm font-medium text-white">
                {currentEvent?.agent || t.dashboard.runPage.timeline.agentFallback}
              </p>
              <p className="text-xs text-slate-400">
                {formatWorkflowLabel(
                  currentEvent?.workflow,
                  workflowLabels,
                  t.dashboard.runPage.timeline.workflowFallback
                )}
              </p>
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
          {PHASE_KEYS.map((key, index) => (
            <PhasePill
              key={key}
              index={index}
              currentPhase={phase}
              label={phaseNames[key] || key}
              description={phaseDescriptions[key] || ""}
            />
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricChip label={t.dashboard.runPage.timeline.events} value={traceStats.events} />
          <MetricChip label={t.dashboard.runPage.timeline.agents} value={traceStats.agents} />
          <MetricChip label={t.dashboard.runPage.timeline.workflows} value={traceStats.workflows} />
          <MetricChip label={t.dashboard.runPage.timeline.warnings} value={traceStats.warnings} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span>
            {finalized ? traceStats.archived : traceStats.running}{" "}
            {finalized ? t.dashboard.runPage.timeline.archived : t.dashboard.runPage.timeline.running}
          </span>
          <span>•</span>
          <span>
            {traceStats.done} {t.dashboard.runPage.timeline.done}
          </span>
          <span>•</span>
          <span>
            {traceStats.metricCount} {t.dashboard.runPage.timeline.metrics}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.dashboard.runPage.timeline.title}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {t.dashboard.runPage.timeline.description}
          </p>
          <div className="space-y-3">
            {groupedTimeline.length > 0 ? (
              groupedTimeline.map((group) => {
                const item = group.finalEvent;
                const translated = translateTimelineEvent(isZh, item);
                const config = statusConfig(
                  item.status,
                  finalized,
                  statusLabels
                );
                const Icon = config.icon;
                const expanded = activeExpandedId === group.id;

                return (
                  <div
                    key={group.id}
                    className={cn(
                      "rounded-2xl border bg-dark-800/40 p-3 shadow-sm transition-all",
                      config.className,
                      item.status === "running" ? "ring-1 ring-inset ring-current/20" : ""
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : group.id)}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <div className={cn("mt-1 h-2.5 w-2.5 rounded-full", config.dot)} />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-200"
                          >
                            {formatWorkflowLabel(
                              item.workflow,
                              workflowLabels,
                              t.dashboard.runPage.timeline.workflowFallback
                            )}
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
                          {group.events.length > 1 ? (
                            <Badge
                              variant="outline"
                              className="border-dark-500 bg-dark-900/40 text-[10px] uppercase tracking-wide text-slate-300"
                            >
                              {group.events.length} {snapshotsLabel}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">{translated.title}</p>
                          <p className="text-xs leading-relaxed text-slate-300">{translated.detail}</p>
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
                      <div className="mt-3 space-y-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          <TraceDetail
                            label={t.dashboard.runPage.timeline.timestamp}
                            value={formatTimestamp(item.timestamp)}
                          />
                          <TraceDetail
                            label={t.dashboard.runPage.timeline.phase}
                          value={
                            item.phase
                              ? `${formatWorkflowLabel(
                                  item.workflow,
                                  workflowLabels,
                                  t.dashboard.runPage.timeline.workflowFallback
                                )} · ${item.phase}`
                              : item.phaseName || t.dashboard.runPage.timeline.phaseFallback
                          }
                        />
                          <TraceDetail
                            label={t.dashboard.runPage.timeline.workflow}
                            value={formatWorkflowLabel(
                              item.workflow,
                              workflowLabels,
                              t.dashboard.runPage.timeline.workflowFallback
                            )}
                          />
                          <TraceDetail
                            label={t.dashboard.runPage.timeline.agent}
                            value={item.agent || systemFallback}
                          />
                          <TraceDetail
                            label={t.dashboard.runPage.timeline.input}
                            value={item.inputSummary || item.detail}
                          />
                          <TraceDetail
                            label={t.dashboard.runPage.timeline.output}
                            value={item.outputSummary || item.detail}
                          />
                        </div>

                        {group.events.length > 1 ? (
                          <div className="space-y-2 rounded-2xl border border-dark-600/60 bg-dark-900/30 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {group.events.length} {snapshotsLabel}
                            </p>
                            <div className="space-y-2">
                              {group.events.map((snapshot) => {
                                const snapshotText = translateTimelineEvent(isZh, snapshot);
                                const snapshotConfig = statusConfig(snapshot.status, finalized, statusLabels);
                                return (
                                  <div
                                    key={snapshot.id}
                                    className="rounded-xl border border-dark-600/60 bg-dark-900/50 p-3"
                                  >
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge
                                        variant="outline"
                                        className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300"
                                      >
                                        {formatWorkflowLabel(
                                          snapshot.workflow,
                                          workflowLabels,
                                          t.dashboard.runPage.timeline.workflowFallback
                                        )}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className={cn("text-[10px] uppercase tracking-wide", snapshotConfig.className)}
                                      >
                                        {snapshotConfig.label}
                                      </Badge>
                                      <span className="text-[10px] text-slate-500">
                                        {formatTimestamp(snapshot.timestamp)}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-xs font-medium text-white">{snapshotText.title}</p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{snapshotText.detail}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dark-600/60 bg-dark-800/40 p-4 text-sm text-slate-400">
                {t.dashboard.runPage.timeline.waitingForEvents}
              </div>
            )}
          </div>
        </div>

        {currentEvent ? (
          <div className="rounded-2xl border border-dark-600/60 bg-dark-900/50 p-4">
            <div className="flex items-center gap-2">
              <MessageSquareMore className="h-4 w-4 text-solana-blue" />
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t.dashboard.runPage.timeline.latestMessage}
              </p>
            </div>
            {(() => {
              const translated = translateTimelineEvent(isZh, currentEvent);
              return (
                <>
                  <p className="mt-2 text-sm font-medium text-white">{translated.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{translated.detail}</p>
                </>
              );
            })()}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
