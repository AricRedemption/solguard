import { formatEvidenceLocation, formatEvidenceSnippet, isDerivedEvidence } from "@/lib/audit/evidence";
import type { CodeSpan } from "@/types/audit";

export type ReportEvidenceBlockItem = {
  key: string;
  location: string;
  note?: string;
  snippet: string;
};

export type ReportEvidenceBlockModel = {
  summaryText: string;
  emptyText: string;
  items: ReportEvidenceBlockItem[];
  moreCount: number;
};

type ReportEvidenceBlockOptions = {
  spansLabel: string;
  noEvidenceLabel: string;
  snippetLimit?: number;
};

export function buildReportEvidenceBlockModel(
  evidence: ReadonlyArray<CodeSpan> | undefined,
  { spansLabel, noEvidenceLabel, snippetLimit = 120 }: ReportEvidenceBlockOptions
): ReportEvidenceBlockModel {
  if (!evidence || evidence.length === 0) {
    return {
      summaryText: noEvidenceLabel,
      emptyText: noEvidenceLabel,
      items: [],
      moreCount: 0,
    };
  }

  return {
    summaryText: `${evidence.length} ${spansLabel}`,
    emptyText: noEvidenceLabel,
    items: evidence.slice(0, 2).map((span) => ({
      key: `${span.file}:${span.startLine}-${span.endLine}:${span.snippet}`,
      location: formatEvidenceLocation(span),
      note: span.note ?? (isDerivedEvidence(span) ? "Thin evidence" : undefined),
      snippet: formatEvidenceSnippet(span.snippet, snippetLimit),
    })),
    moreCount: Math.max(0, evidence.length - 2),
  };
}
