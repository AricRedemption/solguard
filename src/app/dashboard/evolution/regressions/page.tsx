"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  BookMarked,
  FileText,
  Layers3,
  Link2,
  NotebookText,
  ScrollText,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  createRegressionArchiveSnapshot,
  getRegressionArchiveDominantFailureClass,
  getRegressionArchiveAppliedCount,
  getRegressionArchiveRejectedCount,
  getRegressionArchiveRollbackCount,
  getRegressionArchiveStrongEvidenceCount,
  getRegressionArchiveTotalClusterCount,
  getRegressionArchiveUnprovenCount,
} from "@/lib/audit/regression-archive";
import { EVOLUTION_STORE_EVENT } from "@/lib/audit/evolution-store";
import { useTranslation } from "@/lib/i18n";
import type {
  AuditRegressionArchiveClusterSnapshot,
  AuditRegressionArchiveSnapshot,
  AuditRegressionFailureClass,
} from "@/types/audit";

const EVOLUTION_STORAGE_PREFIX = "solguard-audit-evolution:";
const EVOLUTION_INDEX_KEY = "solguard-audit-evolution:index";

type Tone = "neutral" | "good" | "warn" | "bad";

type RegressionArchivePageCopy = {
  title: string;
  subtitle: string;
  backToDashboard: string;
  eyebrow: string;
  heading: string;
  description: string;
  dominantFailureClass: string;
  clustersArchived: string;
  latestClusterPrefix: string;
  waitingForFirstFailure: string;
  rollbackClusters: string;
  rollbackHint: string;
  rejectedClusters: string;
  rejectedHint: string;
  unprovenClusters: string;
  unprovenHint: string;
  appliedClusters: string;
  appliedHint: string;
  strongEvidence: string;
  strongEvidenceHint: string;
  lessonStrip: string;
  readOnly: string;
  noClustersTitle: string;
  noClustersBody: string;
  backToEvolution: string;
  failureCluster: string;
  failureNote: string;
  lesson: string;
  before: string;
  after: string;
  evidenceBlocks: string;
  noEvidence: string;
  linkedReportContext: string;
  noLinkedReports: string;
  linkedMemoryContext: string;
  noLinkedMemories: string;
  recordsSuffix: string;
  moreRecords: string;
  status: string;
  riskLevel: string;
  reportLabel: string;
  memoryLabel: string;
  kindLabels: {
    promptSectionUpdate: string;
    summaryTemplateUpdate: string;
    retrievalWeightUpdate: string;
    phaseRoutingUpdate: string;
    memoryRankingUpdate: string;
    heuristicOrderingUpdate: string;
  };
  failureClassLabels: {
    rollback: string;
    rejected: string;
    unproven: string;
    applied: string;
    underReview: string;
  };
  statusLabels: {
    candidate: string;
    approved: string;
    applied: string;
    rejected: string;
    reverted: string;
  };
  lessonLabels: {
    noRegression: string;
    noRegressionBody: string;
    rollbackDominates: string;
    rollbackBody: string;
    rejectionDominates: string;
    rejectionBody: string;
    unprovenDominates: string;
    unprovenBody: string;
    contrastOnly: string;
    contrastOnlyBody: string;
    underReview: string;
    underReviewBody: string;
    contrastCallout: string;
    failureEvidenceCallout: string;
    reviewBeforeReuse: string;
  };
};

export interface RegressionArchiveSummary {
  totalClusters: number;
  appliedClusters: number;
  rollbackClusters: number;
  rejectedClusters: number;
  unprovenClusters: number;
  strongEvidenceClusters: number;
  dominantFailureClass: AuditRegressionFailureClass;
  latestClusterAt?: string;
}

export interface RegressionArchiveLesson {
  title: string;
  body: string;
  tone: Tone;
  callouts: string[];
}

export interface RegressionArchiveClusterModel {
  cluster: AuditRegressionArchiveClusterSnapshot;
  kindLabel: string;
  failureClassLabel: string;
  reportIds: string[];
  memoryIds: string[];
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

function formatKindLabel(
  kind: AuditRegressionArchiveClusterSnapshot["kind"],
  copy?: RegressionArchivePageCopy
) {
  if (copy) {
    switch (kind) {
      case "prompt_section_update":
        return copy.kindLabels.promptSectionUpdate;
      case "summary_template_update":
        return copy.kindLabels.summaryTemplateUpdate;
      case "retrieval_weight_update":
        return copy.kindLabels.retrievalWeightUpdate;
      case "phase_routing_update":
        return copy.kindLabels.phaseRoutingUpdate;
      case "memory_ranking_update":
        return copy.kindLabels.memoryRankingUpdate;
      case "heuristic_ordering_update":
        return copy.kindLabels.heuristicOrderingUpdate;
      default:
        return kind;
    }
  }

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

function formatFailureClassLabel(
  failureClass: AuditRegressionFailureClass,
  copy?: RegressionArchivePageCopy
) {
  if (copy) {
    switch (failureClass) {
      case "rollback":
        return copy.failureClassLabels.rollback;
      case "rejected":
        return copy.failureClassLabels.rejected;
      case "unproven":
        return copy.failureClassLabels.unproven;
      case "applied":
        return copy.failureClassLabels.applied;
      case "under_review":
        return copy.failureClassLabels.underReview;
      default:
        return failureClass;
    }
  }

  switch (failureClass) {
    case "rollback":
      return "Rollback";
    case "rejected":
      return "Rejected";
    case "unproven":
      return "Unproven";
    case "applied":
      return "Contrast";
    case "under_review":
      return "Under review";
    default:
      return failureClass;
  }
}

function formatStatusLabel(
  status: AuditRegressionArchiveClusterSnapshot["status"],
  copy?: RegressionArchivePageCopy
) {
  if (copy) {
    switch (status) {
      case "candidate":
        return copy.statusLabels.candidate;
      case "approved":
        return copy.statusLabels.approved;
      case "applied":
        return copy.statusLabels.applied;
      case "rejected":
        return copy.statusLabels.rejected;
      case "reverted":
        return copy.statusLabels.reverted;
      default:
        return status;
    }
  }

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

function getFailureClassTone(failureClass: AuditRegressionFailureClass): Tone {
  switch (failureClass) {
    case "rollback":
      return "bad";
    case "rejected":
      return "warn";
    case "unproven":
      return "neutral";
    case "applied":
      return "neutral";
    case "under_review":
      return "neutral";
    default:
      return "neutral";
  }
}

function getStatusTone(summary: RegressionArchiveSummary): Tone {
  if (summary.totalClusters === 0) {
    return "neutral";
  }

  if (
    summary.appliedClusters > 0 &&
    summary.appliedClusters === summary.totalClusters &&
    summary.rollbackClusters === 0 &&
    summary.rejectedClusters === 0 &&
    summary.unprovenClusters === 0
  ) {
    return "neutral";
  }

  if (summary.rollbackClusters > summary.rejectedClusters) {
    return "bad";
  }

  if (summary.rejectedClusters > 0 || summary.unprovenClusters > 0) {
    return "warn";
  }

  return "good";
}

function useRegressionArchiveSnapshot() {
  const [archive, setArchive] = useState<AuditRegressionArchiveSnapshot>(() => createRegressionArchiveSnapshot([]));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const refresh = () => {
      setArchive(createRegressionArchiveSnapshot());
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === EVOLUTION_INDEX_KEY || event.key.startsWith(EVOLUTION_STORAGE_PREFIX)) {
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

  return archive;
}

function createArchiveSummary(snapshot: AuditRegressionArchiveSnapshot): RegressionArchiveSummary {
  return {
    totalClusters: getRegressionArchiveTotalClusterCount(snapshot),
    appliedClusters: getRegressionArchiveAppliedCount(snapshot),
    rollbackClusters: getRegressionArchiveRollbackCount(snapshot),
    rejectedClusters: getRegressionArchiveRejectedCount(snapshot),
    unprovenClusters: getRegressionArchiveUnprovenCount(snapshot),
    strongEvidenceClusters: getRegressionArchiveStrongEvidenceCount(snapshot),
    dominantFailureClass: getRegressionArchiveDominantFailureClass(snapshot),
    latestClusterAt: snapshot.clusters[0]?.createdAt,
  };
}

function buildArchiveLesson(
  summary: RegressionArchiveSummary,
  copy?: RegressionArchivePageCopy
): RegressionArchiveLesson {
  if (summary.totalClusters === 0) {
    if (copy) {
      return {
        title: copy.lessonLabels.noRegression,
        body: copy.lessonLabels.noRegressionBody,
        tone: "neutral",
        callouts: [copy.readOnly, copy.lessonStrip, copy.lessonLabels.reviewBeforeReuse],
      };
    }

    return {
      title: "No regressions archived yet",
      body:
        "This notebook stays blank until a failed change is captured. When it arrives, it will be grouped by kind and target so the blast radius is obvious at a glance.",
      tone: "neutral",
      callouts: ["Read-only archive", "Grouped by kind + target", "Failure-first layout"],
    };
  }

  if (
    summary.appliedClusters > 0 &&
    summary.appliedClusters === summary.totalClusters &&
    summary.rollbackClusters === 0 &&
    summary.rejectedClusters === 0 &&
    summary.unprovenClusters === 0
  ) {
    if (copy) {
      return {
        title: copy.lessonLabels.contrastOnly,
        body: copy.lessonLabels.contrastOnlyBody,
        tone: "neutral",
        callouts: [
          `${summary.appliedClusters} ${copy.appliedClusters}`,
          copy.lessonLabels.failureEvidenceCallout,
          copy.lessonLabels.reviewBeforeReuse,
        ],
      };
    }

    return {
      title: "Contrast-only archive",
      body:
        "These entries are retained as comparison signals, not as proof of improvement. The archive stays neutral until rollback, rejection, or unresolved proof appears.",
      tone: "neutral",
      callouts: [
        `${summary.appliedClusters} contrast clusters`,
        "Read-only archive",
        "No primary failure class yet",
      ],
    };
  }

  switch (summary.dominantFailureClass) {
    case "rollback":
      if (copy) {
        return {
          title: copy.lessonLabels.rollbackDominates,
          body: copy.lessonLabels.rollbackBody,
          tone: "bad",
          callouts: [
            `${summary.rollbackClusters} ${copy.rollbackClusters}`,
            `${summary.strongEvidenceClusters} ${copy.strongEvidence}`,
            `${summary.totalClusters} ${copy.clustersArchived}`,
          ],
        };
      }

      return {
        title: "Rollback dominates the archive",
        body:
          "Treat applied changes as provisional until the rollback evidence survives more than one pass. The archive is telling us that reversal is still the sharpest signal.",
        tone: "bad",
        callouts: [
          `${summary.rollbackClusters} rollback clusters`,
          `${summary.strongEvidenceClusters} strong-evidence clusters`,
          `${summary.totalClusters} total clusters`,
        ],
      };
    case "rejected":
      if (copy) {
        return {
          title: copy.lessonLabels.rejectionDominates,
          body: copy.lessonLabels.rejectionBody,
          tone: "warn",
          callouts: [
            `${summary.rejectedClusters} ${copy.rejectedClusters}`,
            `${summary.unprovenClusters} ${copy.unprovenClusters}`,
            `${summary.totalClusters} ${copy.clustersArchived}`,
          ],
        };
      }

      return {
        title: "Rejection is the main failure shape",
        body:
          "The archive is leaning toward explicit rejection rather than late reversal. That usually means the proof needs to arrive earlier, before the candidate gets too far downstream.",
        tone: "warn",
        callouts: [
          `${summary.rejectedClusters} rejected clusters`,
          `${summary.unprovenClusters} unproven clusters`,
          `${summary.totalClusters} total clusters`,
        ],
      };
    case "unproven":
      if (copy) {
        return {
          title: copy.lessonLabels.unprovenDominates,
          body: copy.lessonLabels.unprovenBody,
          tone: "neutral",
          callouts: [
            `${summary.unprovenClusters} ${copy.unprovenClusters}`,
            `${summary.strongEvidenceClusters} ${copy.strongEvidence}`,
            `${summary.totalClusters} ${copy.clustersArchived}`,
          ],
        };
      }

      return {
        title: "The archive is still proving itself",
        body:
          "Most clusters are still unproven, so the right move is restraint: keep the evidence visible, avoid over-committing, and let repeated signal do the work.",
        tone: "neutral",
        callouts: [
          `${summary.unprovenClusters} unproven clusters`,
          `${summary.strongEvidenceClusters} strong-evidence clusters`,
          `${summary.totalClusters} total clusters`,
        ],
      };
    case "applied":
      if (copy) {
        return {
          title: copy.lessonLabels.contrastOnly,
          body: copy.lessonLabels.contrastOnlyBody,
          tone: "neutral",
          callouts: [
            `${summary.appliedClusters} ${copy.appliedClusters}`,
            `${summary.strongEvidenceClusters} ${copy.strongEvidence}`,
            copy.lessonLabels.reviewBeforeReuse,
          ],
        };
      }

      return {
        title: "Applied records stay in contrast mode",
        body:
          "Applied entries are retained for comparison, but they do not drive the archive's main failure story. Wait for rollback, rejection, or unresolved proof before treating them as signal.",
        tone: "neutral",
        callouts: [
          "Contrast signal only",
          `${summary.totalClusters} total clusters`,
          `${summary.strongEvidenceClusters} strong-evidence clusters`,
        ],
      };
    case "under_review":
      if (copy) {
        return {
          title: copy.lessonLabels.underReview,
          body: copy.lessonLabels.underReviewBody,
          tone: "neutral",
          callouts: [
            `${summary.appliedClusters} ${copy.appliedClusters}`,
            `${summary.strongEvidenceClusters} ${copy.strongEvidence}`,
            copy.lessonLabels.reviewBeforeReuse,
          ],
        };
      }

      return {
        title: "The archive is still under review",
        body:
          "The failure pattern is not settled yet. Keep reading the clusters in the order they form, not the order they are edited, and let the evidence decide the story.",
        tone: "neutral",
        callouts: [
          `${summary.totalClusters} total clusters`,
          `${summary.strongEvidenceClusters} strong-evidence clusters`,
          "Review before reuse",
        ],
      };
  }
}

export function buildRegressionArchiveSummary(
  snapshot: AuditRegressionArchiveSnapshot
): RegressionArchiveSummary {
  return createArchiveSummary(snapshot);
}

export function buildRegressionArchiveLesson(
  snapshot: AuditRegressionArchiveSnapshot,
  copy?: RegressionArchivePageCopy
): RegressionArchiveLesson {
  return buildArchiveLesson(createArchiveSummary(snapshot), copy);
}

export function buildRegressionArchiveClusterModel(
  cluster: AuditRegressionArchiveClusterSnapshot,
  copy?: RegressionArchivePageCopy
): RegressionArchiveClusterModel {
  return {
    cluster,
    kindLabel: formatKindLabel(cluster.kind, copy),
    failureClassLabel: formatFailureClassLabel(cluster.dominantFailureClass, copy),
    reportIds: Array.from(
      new Set(cluster.records.flatMap((record) => (record.sourceReportId ? [record.sourceReportId] : [])))
    ),
    memoryIds: Array.from(
      new Set(cluster.records.flatMap((record) => (record.sourceMemoryId ? [record.sourceMemoryId] : [])))
    ),
    evidence: Array.from(new Set(cluster.records.flatMap((record) => [...record.evidence]))),
  };
}

function SeverityBadge({ label, tone }: { label: string; tone: Tone }) {
  const toneClass =
    tone === "bad"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : tone === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
        : tone === "good"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
          : "border-slate-500/40 bg-slate-500/10 text-slate-200";

  return <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]", toneClass)}>{label}</Badge>;
}

function MetricPill({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: Tone;
}) {
  const toneClass =
    tone === "bad"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
      : tone === "warn"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-50"
        : tone === "good"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-50"
          : "border-slate-600/60 bg-slate-900/50 text-slate-100";

  return (
    <div className={cn("rounded-2xl border px-4 py-3", toneClass)}>
      <p className="text-[10px] uppercase tracking-[0.24em] opacity-70">{label}</p>
      <p className="mt-2 text-base font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-[11px] leading-relaxed opacity-70">{hint}</p> : null}
    </div>
  );
}

function SourceLink({ href, id, label }: { href: string; id: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
    >
      <Link2 className="h-3 w-3" />
      <span>{label}</span>
      <span className="font-mono text-slate-400">{id}</span>
    </Link>
  );
}

function ClusterCard({
  model,
  index,
  total,
  copy,
}: {
  model: RegressionArchiveClusterModel;
  index: number;
  total: number;
  copy: RegressionArchivePageCopy;
}) {
  const { cluster, kindLabel, failureClassLabel, reportIds, memoryIds, evidence } = model;
  const headline = cluster.records[0];
  const hasDivider = index < total - 1;

  return (
    <div className="flex gap-4">
      <div className="relative flex w-6 shrink-0 justify-center">
        <div className="mt-3 h-3 w-3 rounded-full border-2 border-rose-400 bg-slate-950 shadow-[0_0_0_6px_rgba(15,23,42,0.7)]" />
        {hasDivider ? <div className="absolute top-6 h-full w-px bg-gradient-to-b from-rose-500/70 via-amber-500/40 to-transparent" /> : null}
      </div>

      <Card className="flex-1 overflow-hidden border-rose-950/40 bg-slate-950/75 backdrop-blur-sm">
        <CardHeader className="border-b border-rose-950/30 bg-gradient-to-r from-rose-950/30 via-slate-950 to-amber-950/20 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-200/70">{copy.failureCluster}</p>
              <CardTitle className="mt-2 text-lg text-white">{kindLabel}</CardTitle>
              <CardDescription className="mt-1 text-slate-400">{cluster.target}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge
                label={`${cluster.clusterSize} ${copy.recordsSuffix}`}
                tone={getStatusTone(createArchiveSummary({ clusters: [cluster] }))}
              />
              <SeverityBadge label={failureClassLabel} tone={getFailureClassTone(cluster.dominantFailureClass)} />
              <SeverityBadge
                label={cluster.strongEvidence ? copy.strongEvidence : copy.unprovenHint}
                tone={cluster.strongEvidence ? "good" : "warn"}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 font-mono">
              {formatTimestamp(cluster.createdAt)}
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 uppercase tracking-[0.24em] text-slate-300">
              {formatStatusLabel(cluster.status, copy)}
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 uppercase tracking-[0.24em] text-slate-300">
              {cluster.riskLevel} {copy.riskLevel}
            </span>
            {cluster.records.length > 1 ? (
              <span className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 uppercase tracking-[0.24em] text-slate-300">
                +{cluster.records.length - 1} {copy.moreRecords}
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <section className="rounded-2xl border border-rose-950/30 bg-slate-900/50 p-4">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200/70">
                  <TriangleAlert className="h-3.5 w-3.5" />
                  {copy.failureNote}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">{cluster.reason}</p>
              </section>

              <section className="rounded-2xl border border-rose-950/30 bg-slate-900/50 p-4">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-rose-200/70">
                  <BookMarked className="h-3.5 w-3.5" />
                  {copy.lesson}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-200">{cluster.lesson}</p>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{copy.before}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{headline.before}</p>
                </div>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{copy.after}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">{headline.after}</p>
                </div>
              </section>
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <ScrollText className="h-3.5 w-3.5" />
                  {copy.evidenceBlocks}
                </p>
                <div className="mt-3 space-y-2">
                  {evidence.length > 0 ? (
                    evidence.map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2 font-mono text-xs leading-relaxed text-slate-300"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">{copy.noEvidence}</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <FileText className="h-3.5 w-3.5" />
                  {copy.linkedReportContext}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {reportIds.length > 0 ? (
                    reportIds.map((id) => <SourceLink key={id} href={`/dashboard/reports/${id}`} id={id} label={copy.reportLabel} />)
                  ) : (
                    <p className="text-sm text-slate-500">{copy.noLinkedReports}</p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4">
                <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <Layers3 className="h-3.5 w-3.5" />
                  {copy.linkedMemoryContext}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {memoryIds.length > 0 ? (
                    memoryIds.map((id) => <SourceLink key={id} href="/dashboard/memory" id={id} label={copy.memoryLabel} />)
                  ) : (
                    <p className="text-sm text-slate-500">{copy.noLinkedMemories}</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyArchiveState({ copy }: { copy: RegressionArchivePageCopy }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-rose-950/40 bg-slate-950/60 p-8 text-center shadow-[0_0_0_1px_rgba(127,29,29,0.08)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
        <Archive className="h-7 w-7 text-rose-200" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white">{copy.noClustersTitle}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">{copy.noClustersBody}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/dashboard/evolution"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.backToEvolution}
        </Link>
      </div>
    </div>
  );
}

export default function RegressionArchivePage() {
  const { t } = useTranslation();
  const copy = t.dashboard.regressionArchivePage;
  const archive = useRegressionArchiveSnapshot();
  const summary = useMemo(() => createArchiveSummary(archive), [archive]);
  const lesson = useMemo(() => buildArchiveLesson(summary, copy), [summary, copy]);
  const clusterModels = useMemo(
    () => archive.clusters.map((cluster) => buildRegressionArchiveClusterModel(cluster, copy)),
    [archive, copy]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(127,29,29,0.24),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(217,119,6,0.18),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_40%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-rose-200/70">
              <NotebookText className="h-4 w-4 text-rose-300" />
              {copy.eyebrow}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{copy.heading}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{copy.description}</p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-950/50 px-3.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {copy.backToDashboard}
          </Link>
        </div>

        <section className="rounded-[1.75rem] border border-rose-950/30 bg-slate-950/55 p-4 shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[1.15fr_repeat(4,minmax(0,1fr))]">
            <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/40 via-slate-950/80 to-amber-950/25 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-rose-200/70">{copy.dominantFailureClass}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SeverityBadge
                  label={formatFailureClassLabel(summary.dominantFailureClass, copy)}
                  tone={getFailureClassTone(summary.dominantFailureClass)}
                />
                <span className="text-sm text-slate-300">
                  {summary.totalClusters} {copy.clustersArchived}
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {summary.latestClusterAt
                  ? `${copy.latestClusterPrefix}: ${formatTimestamp(summary.latestClusterAt)}`
                  : copy.waitingForFirstFailure}
              </p>
            </div>

            <MetricPill
              label={copy.rollbackClusters}
              value={summary.rollbackClusters}
              hint={copy.rollbackHint}
              tone={summary.rollbackClusters > 0 ? "bad" : "neutral"}
            />
            <MetricPill
              label={copy.rejectedClusters}
              value={summary.rejectedClusters}
              hint={copy.rejectedHint}
              tone={summary.rejectedClusters > 0 ? "warn" : "neutral"}
            />
            <MetricPill
              label={copy.unprovenClusters}
              value={summary.unprovenClusters}
              hint={copy.unprovenHint}
              tone={summary.unprovenClusters > 0 ? "warn" : "neutral"}
            />
            <MetricPill
              label={copy.strongEvidence}
              value={summary.strongEvidenceClusters}
              hint={copy.strongEvidenceHint}
              tone={summary.strongEvidenceClusters > 0 ? "good" : "neutral"}
            />
          </div>
        </section>

        <section className="mt-6 rounded-[1.75rem] border border-amber-950/30 bg-gradient-to-r from-amber-950/35 via-slate-950/80 to-rose-950/25 p-5 shadow-[0_24px_80px_rgba(2,6,23,0.2)] backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/80">
                <BookMarked className="h-4 w-4" />
                {copy.lessonStrip}
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">{lesson.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-200/90">{lesson.body}</p>
            </div>

            <SeverityBadge label={copy.readOnly} tone={getStatusTone(summary)} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {lesson.callouts.map((callout) => (
              <div
                key={callout}
                className="rounded-2xl border border-slate-700/60 bg-slate-950/55 px-4 py-3 text-sm text-slate-200"
              >
                {callout}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          {clusterModels.length > 0 ? (
            <div className="space-y-6">
              {clusterModels.map((model, index) => (
                <ClusterCard
                  key={model.cluster.id}
                  model={model}
                  index={index}
                  total={clusterModels.length}
                  copy={copy}
                />
              ))}
            </div>
          ) : (
            <EmptyArchiveState copy={copy} />
          )}
        </section>
      </div>
    </div>
  );
}
