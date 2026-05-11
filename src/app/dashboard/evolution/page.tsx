"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpenText,
  Clock3,
  FileText,
  Link2,
  NotebookPen,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  EVOLUTION_STORE_EVENT,
  listEvolutionCandidates,
  type AuditEvolutionCandidateSnapshot,
} from "@/lib/audit/evolution-store";
import { useTranslation } from "@/lib/i18n";

const EVOLUTION_STORAGE_PREFIX = "solguard-audit-evolution:";
const EVOLUTION_INDEX_KEY = "solguard-audit-evolution:index";

type RiskTone = "neutral" | "good" | "warn" | "bad";

export interface EvolutionSummary {
  totalEntries: number;
  openCandidates: number;
  appliedChanges: number;
  linkedSources: number;
  latestAt?: string;
}

export interface EvolutionCardModel {
  record: AuditEvolutionCandidateSnapshot;
  statusLabel: string;
  kindLabel: string;
  sourceLinks: Array<{ id: string; href: string; kind: "report" | "memory" }>;
  evidence: string[];
}

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatKindLabel(kind: AuditEvolutionCandidateSnapshot["kind"]) {
  switch (kind) {
    case "prompt_section_update":
      return "Prompt section update";
    case "summary_template_update":
      return "Summary template update";
    case "retrieval_weight_update":
      return "Retrieval weight update";
    case "phase_routing_update":
      return "Phase routing update";
    case "memory_ranking_update":
      return "Memory ranking update";
    case "heuristic_ordering_update":
      return "Heuristic ordering update";
    default:
      return kind;
  }
}

function formatStatusLabel(status: AuditEvolutionCandidateSnapshot["status"]) {
  switch (status) {
    case "candidate":
      return "Candidate";
    case "approved":
      return "Approved";
    case "applied":
      return "Applied";
    case "rejected":
      return "Rejected";
    case "reverted":
      return "Reverted";
    default:
      return status;
  }
}

export function buildEvolutionSummary(records: readonly AuditEvolutionCandidateSnapshot[]): EvolutionSummary {
  const openCandidates = records.filter((record) => record.status === "candidate").length;
  const appliedChanges = records.filter((record) => record.status === "applied").length;
  const linkedSources = new Set(
    records.flatMap((record) => [record.sourceReportId, record.sourceMemoryId].filter(Boolean) as string[])
  ).size;

  return {
    totalEntries: records.length,
    openCandidates,
    appliedChanges,
    linkedSources,
    latestAt: records[0]?.createdAt,
  };
}

export function buildEvolutionCardModel(record: AuditEvolutionCandidateSnapshot): EvolutionCardModel {
  const sourceLinks = [
    record.sourceReportId
      ? {
          id: record.sourceReportId,
          href: `/dashboard/reports/${record.sourceReportId}`,
          kind: "report" as const,
        }
      : null,
    record.sourceMemoryId
      ? {
          id: record.sourceMemoryId,
          href: "/dashboard/memory",
          kind: "memory" as const,
        }
      : null,
  ].filter((item): item is { id: string; href: string; kind: "report" | "memory" } => Boolean(item));

  return {
    record,
    statusLabel: formatStatusLabel(record.status),
    kindLabel: formatKindLabel(record.kind),
    sourceLinks,
    evidence: record.evidence.slice(),
  };
}

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: RiskTone;
}) {
  const toneClass =
    tone === "good"
      ? "border-solana-green/20 bg-solana-green/10 text-solana-green"
      : tone === "warn"
        ? "border-high/20 bg-high/10 text-high"
        : tone === "bad"
          ? "border-critical/20 bg-critical/10 text-critical"
          : "border-dark-600/60 bg-dark-800/50 text-slate-200";

  return (
    <div className={cn("rounded-xl border px-3 py-2", toneClass)}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-current">{value}</p>
      {hint ? <p className="mt-1 text-[11px] opacity-70">{hint}</p> : null}
    </div>
  );
}

function useEvolutionCandidates() {
  const [records, setRecords] = useState<AuditEvolutionCandidateSnapshot[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const refresh = () => {
      setRecords(listEvolutionCandidates());
    };

    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === EVOLUTION_INDEX_KEY ||
        event.key.startsWith(EVOLUTION_STORAGE_PREFIX)
      ) {
        refresh();
      }
    };

    const handleEvolutionStore = () => {
      refresh();
    };

    refresh();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(EVOLUTION_STORE_EVENT, handleEvolutionStore);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(EVOLUTION_STORE_EVENT, handleEvolutionStore);
    };
  }, []);

  return records;
}

function StatusBadge({ status }: { status: AuditEvolutionCandidateSnapshot["status"] }) {
  const className =
    status === "applied"
      ? "border-solana-green/30 bg-solana-green/10 text-solana-green"
      : status === "approved"
        ? "border-high/30 bg-high/10 text-high"
        : status === "rejected"
          ? "border-critical/30 bg-critical/10 text-critical"
          : status === "reverted"
            ? "border-dark-500/60 bg-dark-800/60 text-slate-300"
            : "border-dark-500/60 bg-dark-800/60 text-slate-300";

  return <Badge variant="outline" className={className}>{formatStatusLabel(status)}</Badge>;
}

function SourceLink({
  id,
  href,
  label,
}: {
  id: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-dark-600/60 bg-dark-900/60 px-3 py-1 text-xs text-slate-200 transition-colors hover:border-slate-400/50 hover:text-white"
    >
      <Link2 className="h-3 w-3" />
      <span>{label}</span>
      <span className="font-mono text-slate-400">{id}</span>
    </Link>
  );
}

function EvolutionEntryCard({ model, index, total }: { model: EvolutionCardModel; index: number; total: number }) {
  const { t } = useTranslation();
  const { record, sourceLinks, evidence, kindLabel, statusLabel } = model;
  const hasLine = index < total - 1;

  return (
    <div className="flex gap-4">
      <div className="relative flex w-6 shrink-0 justify-center">
        <div className="mt-3 h-3 w-3 rounded-full border-2 border-solana-blue bg-dark-900 shadow-[0_0_0_6px_rgba(15,23,42,0.55)]" />
        {hasLine ? <div className="absolute top-6 h-full w-px bg-gradient-to-b from-solana-blue/60 via-dark-600/80 to-transparent" /> : null}
      </div>

      <Card className="flex-1 border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base text-white">{kindLabel}</CardTitle>
              <CardDescription className="mt-1 text-slate-400">
                {record.target}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={record.status} />
              <Badge
                variant="outline"
                className={
                  record.riskLevel === "high"
                    ? "border-critical/30 bg-critical/10 text-critical"
                    : record.riskLevel === "medium"
                      ? "border-high/30 bg-high/10 text-high"
                      : "border-solana-green/30 bg-solana-green/10 text-solana-green"
                }
              >
                {record.riskLevel.toUpperCase()} risk
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="font-mono">{formatTimestamp(record.createdAt)}</span>
            <span className="uppercase tracking-wide text-slate-500">{statusLabel}</span>
            <span className="uppercase tracking-wide text-slate-500">{record.kind}</span>
          </div>

          <p className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4 text-sm leading-relaxed text-slate-300">
            {record.reason}
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {t.dashboard.evolutionPage.before}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{record.before}</p>
            </div>
            <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {t.dashboard.evolutionPage.after}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{record.after}</p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <ScrollText className="h-3.5 w-3.5" />
                {t.dashboard.evolutionPage.evidenceTrail}
              </p>
              <div className="mt-3 space-y-2">
                {evidence.length > 0 ? (
                  evidence.map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-dark-600/60 bg-dark-800/40 px-3 py-2 font-mono text-xs leading-relaxed text-slate-300"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">{t.dashboard.evolutionPage.noEvidence}</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <BookOpenText className="h-3.5 w-3.5" />
                {t.dashboard.evolutionPage.sourceContext}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sourceLinks.length > 0 ? (
                  sourceLinks.map((link) => (
                    <SourceLink
                      key={link.id}
                      id={link.id}
                      href={link.href}
                      label={
                        link.kind === "report"
                          ? t.dashboard.evolutionPage.linkedReport
                          : t.dashboard.evolutionPage.linkedMemory
                      }
                    />
                  ))
                ) : (
                  <p className="text-sm text-slate-500">{t.dashboard.evolutionPage.noSources}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EvolutionLogPage() {
  const { t } = useTranslation();
  const records = useEvolutionCandidates();

  const summary = useMemo(() => buildEvolutionSummary(records), [records]);
  const cardModels = useMemo(() => records.map((record) => buildEvolutionCardModel(record)), [records]);
  const latestLabel = summary.latestAt ? formatTimestamp(summary.latestAt) : null;

  return (
    <div className="min-h-screen bg-dark-900 px-4 py-8 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <NotebookPen className="h-4 w-4 text-solana-purple" />
              {t.dashboard.evolutionPage.diaryLead}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              {t.dashboard.evolutionPage.title}
            </h1>
            <p className="mt-2 text-sm text-slate-400">{t.dashboard.evolutionPage.subtitle}</p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dark-600/50 bg-dark-800/50 px-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-dark-700/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.dashboard.evolutionPage.backToDashboard}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label={t.dashboard.evolutionPage.entries}
            value={summary.totalEntries}
            hint={t.dashboard.evolutionPage.diarySubtitle}
            tone="neutral"
          />
          <Metric
            label={t.dashboard.evolutionPage.openCandidates}
            value={summary.openCandidates}
            tone={summary.openCandidates > 0 ? "warn" : "good"}
          />
          <Metric
            label={t.dashboard.evolutionPage.appliedChanges}
            value={summary.appliedChanges}
            tone={summary.appliedChanges > 0 ? "good" : "neutral"}
          />
          <Metric
            label={t.dashboard.evolutionPage.linkedSources}
            value={summary.linkedSources}
            hint={latestLabel ? `${t.dashboard.evolutionPage.latestEntry}: ${latestLabel}` : undefined}
            tone={summary.linkedSources > 0 ? "good" : "neutral"}
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_340px]">
          <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <Clock3 className="h-4 w-4 text-solana-blue" />
                {t.dashboard.evolutionPage.chronology}
              </CardTitle>
              <CardDescription className="text-slate-400">
                {records.length} {t.dashboard.evolutionPage.entries}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {cardModels.length > 0 ? (
                <div className="space-y-5">
                  {cardModels.map((model, index) => (
                    <EvolutionEntryCard
                      key={model.record.id}
                      model={model}
                      index={index}
                      total={cardModels.length}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-dark-600/60 bg-dark-900/40 p-8 text-center">
                  <ShieldCheck className="mx-auto h-8 w-8 text-solana-green" />
                  <h2 className="mt-4 text-lg font-semibold text-white">
                    {t.dashboard.evolutionPage.emptyTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {t.dashboard.evolutionPage.emptySubtitle}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <FileText className="h-4 w-4 text-solana-green" />
                  {t.dashboard.evolutionPage.sourceContext}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t.dashboard.evolutionPage.diarySubtitle}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {records.length > 0 ? (
                  <>
                    <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {t.dashboard.evolutionPage.linkedReport}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Array.from(
                          new Set(records.map((record) => record.sourceReportId).filter(Boolean) as string[])
                        ).length > 0 ? (
                          Array.from(
                            new Set(records.map((record) => record.sourceReportId).filter(Boolean) as string[])
                          ).map((id) => (
                            <Link
                              key={id}
                              href={`/dashboard/reports/${id}`}
                              className="inline-flex items-center gap-1 rounded-full border border-dark-600/60 bg-dark-800/40 px-3 py-1 text-xs text-slate-200 transition-colors hover:border-slate-400/50 hover:text-white"
                            >
                              <Link2 className="h-3 w-3" />
                              <span className="font-mono">{id}</span>
                            </Link>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">{t.dashboard.evolutionPage.noSources}</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {t.dashboard.evolutionPage.linkedMemory}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Array.from(
                          new Set(records.map((record) => record.sourceMemoryId).filter(Boolean) as string[])
                        ).length > 0 ? (
                          Array.from(
                            new Set(records.map((record) => record.sourceMemoryId).filter(Boolean) as string[])
                          ).map((id) => (
                            <Link
                              key={id}
                              href="/dashboard/memory"
                              className="inline-flex items-center gap-1 rounded-full border border-dark-600/60 bg-dark-800/40 px-3 py-1 text-xs text-slate-200 transition-colors hover:border-slate-400/50 hover:text-white"
                            >
                              <Link2 className="h-3 w-3" />
                              <span className="font-mono">{id}</span>
                            </Link>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500">{t.dashboard.evolutionPage.noSources}</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-400">
                    {t.dashboard.evolutionPage.emptySubtitle}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <ShieldCheck className="h-4 w-4 text-solana-blue" />
                  {t.dashboard.evolutionPage.diaryLead}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <p className="text-sm leading-relaxed text-slate-300">{t.dashboard.evolutionPage.readOnlyNote}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Metric label={t.dashboard.evolutionPage.status} value="Read-only" tone="good" />
                  <Metric label={t.dashboard.evolutionPage.mode} value="Diary" tone="neutral" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
