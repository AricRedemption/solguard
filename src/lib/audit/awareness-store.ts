import type {
  AuditInputSummary,
  AuditMemoryEntry,
  AuditMemoryFeedbackInput,
  AuditMemorySourceType,
  AuditReportRecord,
  WorkflowEvent,
} from "@/types/audit";
import { readStoredJson, writeStoredJson } from "@/lib/audit/storage";

const AWARENESS_KEY = "solguard-audit-awareness:index";
const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};
const SOURCE_TYPE_WEIGHT: Record<AuditMemorySourceType, number> = {
  report: 0.08,
  feedback: 0.12,
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function isAuditMemorySourceType(value: string): value is AuditMemorySourceType {
  return value === "report" || value === "feedback";
}

function normalizeMemoryEntry(entry: Partial<AuditMemoryEntry> & { id: string; reportId: string; createdAt: string; title: string; summary: string; keySignals: string[]; focusAreas: string[]; confidence: number }): AuditMemoryEntry {
  const sourceType = typeof entry.sourceType === "string" && isAuditMemorySourceType(entry.sourceType)
    ? entry.sourceType
    : "report";
  const recency = ageDecay(entry.createdAt, entry.lastRecalledAt);

  return {
    ...entry,
    utility: typeof entry.utility === "number" ? clamp(entry.utility) : clamp(entry.confidence),
    recency,
    risk: typeof entry.risk === "number" ? clamp(entry.risk) : 0,
    sourceType,
    recallCount: typeof entry.recallCount === "number" ? Math.max(0, Math.floor(entry.recallCount)) : 0,
    lastRecalledAt: typeof entry.lastRecalledAt === "string" ? entry.lastRecalledAt : undefined,
  };
}

function ageDecay(createdAt: string, recalledAt?: string): number {
  const anchor = Date.parse(recalledAt ?? createdAt);
  if (Number.isNaN(anchor)) return 0.5;

  const hours = Math.max(0, (Date.now() - anchor) / (1000 * 60 * 60));
  return clamp(Math.exp(-hours / 72));
}

function scoreEntry(entry: AuditMemoryEntry): number {
  const recencyScore = entry.recency;
  const recallBoost = Math.log1p(entry.recallCount) * 0.06;
  const sourceBoost = SOURCE_TYPE_WEIGHT[entry.sourceType] ?? 0;

  return (
    entry.utility * 0.4 +
    recencyScore * 0.3 +
    entry.confidence * 0.1 +
    recallBoost +
    sourceBoost -
    entry.risk * 0.18
  );
}

function sortEntries(entries: AuditMemoryEntry[]): AuditMemoryEntry[] {
  return [...entries]
    .map(normalizeMemoryEntry)
    .sort(
      (a, b) =>
        scoreEntry(b) - scoreEntry(a) ||
        b.recallCount - a.recallCount ||
        b.createdAt.localeCompare(a.createdAt)
    );
}

type AwarenessSource = {
  id: string;
  createdAt: string;
  sourceMode: AuditReportRecord["sourceMode"];
  inputSummary: AuditInputSummary;
  llm: AuditReportRecord["llm"];
  result: AuditReportRecord["result"];
  timeline: WorkflowEvent[];
};

function buildFocusAreas(report: AwarenessSource): string[] {
  const areas = new Set<string>();
  const context = report.result.analysisContext;

  if (report.result.summary.critical + report.result.summary.high > 0) {
    areas.add("High-severity vulnerabilities");
  }

  if (context?.trustBoundaries.length) {
    areas.add(`Trust boundaries: ${context.trustBoundaries.slice(0, 3).map((item) => item.name).join(", ")}`);
  }

  if (context?.validationRules.length) {
    areas.add(`Validation rules: ${context.validationRules.slice(0, 3).map((item) => item.name).join(", ")}`);
  }

  if (context?.hotspots.length) {
    areas.add(`Hotspots: ${context.hotspots.slice(0, 3).map((item) => item.name).join(", ")}`);
  }

  if (report.result.vulnerabilities.length) {
    areas.add(`Findings: ${report.result.vulnerabilities.slice(0, 3).map((item) => item.title).join(", ")}`);
  }

  if (areas.size === 0) {
    areas.add("No dominant risk cluster detected");
  }

  return [...areas];
}

export function buildAwarenessEntry(report: AwarenessSource): AuditMemoryEntry {
  const highRiskCount = report.result.summary.critical + report.result.summary.high;
  const mediumRiskCount = report.result.summary.medium;
  const lowRiskCount = report.result.summary.low + (report.result.summary.info ?? 0);
  const hasContext = Boolean(report.result.analysisContext);
  const confidence =
    report.result.vulnerabilities.length > 0
      ? Math.max(
          0.45,
          Math.min(
            0.98,
            report.result.vulnerabilities.reduce((sum, finding) => sum + finding.confidence, 0) /
              report.result.vulnerabilities.length
          )
        )
      : report.result.overallScore >= 80
        ? 0.88
        : 0.72;

  const topFindings = report.result.vulnerabilities
    .slice()
    .sort(
      (a, b) =>
        (SEVERITY_WEIGHT[b.severity] ?? 0) - (SEVERITY_WEIGHT[a.severity] ?? 0) ||
        b.confidence - a.confidence
    )
    .slice(0, 3)
    .map((finding) => finding.title);

  const keySignals = [
    `Score ${report.result.overallScore}/100`,
    `${report.result.summary.critical + report.result.summary.high} high-severity findings`,
    `${report.result.summary.medium + report.result.summary.low + (report.result.summary.info ?? 0)} lower-severity findings`,
  ];

  if (report.result.analysisContext?.framework) {
    keySignals.push(`Framework: ${report.result.analysisContext.framework}`);
  }

  if (report.inputSummary.githubUrls.length) {
    keySignals.push(`GitHub sources: ${report.inputSummary.githubUrls.length}`);
  } else {
    keySignals.push(`Local files: ${report.inputSummary.fileCount}`);
  }

  const utility = clamp(
    0.28 +
      confidence * 0.34 +
      (highRiskCount > 0 ? 0.2 : 0.06) +
      (hasContext ? 0.08 : 0) +
      (report.result.vulnerabilities.length > 0 ? 0.08 : 0.02) +
      (report.inputSummary.githubUrls.length > 0 ? 0.04 : 0) +
      (mediumRiskCount > 0 ? 0.03 : 0) +
      (lowRiskCount > 0 ? 0.02 : 0)
  );
  const risk = clamp(
    report.result.summary.critical * 0.22 +
      report.result.summary.high * 0.14 +
      report.result.summary.medium * 0.06 +
      report.result.summary.low * 0.03 +
      (report.result.analysisContext?.hotspots.length ? 0.05 : 0)
  );

  return {
    id: `memory_${report.id}`,
    reportId: report.id,
    createdAt: report.createdAt,
    title: topFindings[0] || (report.result.summary.critical + report.result.summary.high > 0 ? "Risky audit snapshot" : "Clean audit snapshot"),
    summary:
      report.result.summary.critical + report.result.summary.high > 0
        ? "High-risk signals were confirmed and should be revisited before shipping."
        : report.result.vulnerabilities.length > 0
          ? "Findings were detected, but most are lower severity or need review."
          : "No confirmed vulnerabilities were found in this run.",
    keySignals,
    focusAreas: buildFocusAreas(report),
    confidence,
    utility,
    recency: ageDecay(report.createdAt),
    risk,
    sourceType: "report",
    recallCount: 0,
  };
}

export function buildFeedbackAwarenessEntry(
  report: AwarenessSource,
  feedback: AuditMemoryFeedbackInput
): AuditMemoryEntry {
  const base = buildAwarenessEntry(report);
  const feedbackWeight = feedback.outcome === "confirmed" ? 0.14 : feedback.outcome === "needs_review" ? 0.08 : 0.04;
  const noteBonus = feedback.note?.trim() ? 0.04 : 0;

  return normalizeMemoryEntry({
    ...base,
    id: `memory_feedback_${report.id}`,
    title: `${base.title} · feedback`,
    summary:
      feedback.outcome === "confirmed"
        ? "User feedback confirmed the risk pattern and reinforced the memory."
        : feedback.outcome === "needs_review"
          ? "User feedback asked for a second look, so the memory stays visible."
          : "User feedback dismissed the original signal, so the memory is kept but softened.",
    keySignals: [
      ...base.keySignals,
      `Feedback outcome: ${feedback.outcome}`,
      feedback.note?.trim() ? `Feedback note: ${feedback.note.trim()}` : "No feedback note provided",
    ].filter((item): item is string => Boolean(item)),
    focusAreas: [
      ...base.focusAreas,
      feedback.memoryId ? `Feedback linked to memory: ${feedback.memoryId}` : "Feedback linked to report history",
    ],
    confidence: clamp(
      feedback.outcome === "confirmed"
        ? Math.max(base.confidence, 0.9)
        : feedback.outcome === "needs_review"
          ? Math.max(base.confidence, 0.78)
          : Math.min(base.confidence, 0.65)
    ),
    utility: clamp(base.utility + feedbackWeight + noteBonus),
    recency: ageDecay(report.createdAt),
    risk: clamp(
      feedback.outcome === "confirmed"
        ? Math.max(base.risk, 0.12)
        : feedback.outcome === "needs_review"
          ? Math.max(base.risk, 0.08)
          : Math.min(base.risk, 0.05)
    ),
    sourceType: "feedback",
    recallCount: 0,
    lastRecalledAt: undefined,
  });
}

export function touchAwarenessEntry(entry: AuditMemoryEntry, recalledAt = new Date().toISOString()): AuditMemoryEntry {
  return normalizeMemoryEntry({
    ...entry,
    recallCount: entry.recallCount + 1,
    lastRecalledAt: recalledAt,
  });
}

export function rankAwarenessEntries(entries: AuditMemoryEntry[]): AuditMemoryEntry[] {
  return sortEntries(entries);
}

export function getAwarenessEntries(limit = 10): AuditMemoryEntry[] {
  return listAwarenessEntries().slice(0, Math.max(0, Math.floor(limit)));
}

export function getAwarenessEntryRationale(entry: AuditMemoryEntry): string[] {
  const rationale = [
    `Utility ${Math.round(entry.utility * 100)}%`,
    `Recency ${Math.round(entry.recency * 100)}%`,
  ];

  if (entry.recallCount > 0) {
    rationale.push(`Recalled ${entry.recallCount}x`);
  } else {
    rationale.push("Not recalled yet");
  }

  rationale.push(entry.sourceType === "feedback" ? "Feedback source" : "Report source");

  return rationale.slice(0, 4);
}

export function renderAwarenessContext(entries: AuditMemoryEntry[], limit = 5): string {
  const ranked = rankAwarenessEntries(entries).slice(0, Math.max(0, Math.floor(limit)));
  if (ranked.length === 0) {
    return "";
  }

  return ranked
    .map((entry, index) => {
      const rationale = getAwarenessEntryRationale(entry).slice(0, 3).join(" · ");
      const focus = entry.focusAreas.slice(0, 2).join(", ");
      return [
        `${index + 1}. ${entry.title}`,
        `   source: ${entry.sourceType} · report: ${entry.reportId}`,
        `   rationale: ${rationale}`,
        focus ? `   focus: ${focus}` : null,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n");
    })
    .join("\n\n");
}

export function saveAwarenessEntry(entry: AuditMemoryEntry): boolean {
  const entries = listAwarenessEntries();
  const nextEntries = rankAwarenessEntries([
    entry,
    ...entries.filter((item) => item.id !== entry.id),
  ]).slice(0, 50);

  return writeStoredJson(AWARENESS_KEY, nextEntries);
}

export function listAwarenessEntries(): AuditMemoryEntry[] {
  return rankAwarenessEntries(readStoredJson<AuditMemoryEntry[]>(AWARENESS_KEY, []));
}
