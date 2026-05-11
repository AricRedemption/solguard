import type { AuditReportRecord } from "@/types/audit";
import { readStoredJson, writeStoredJson } from "@/lib/audit/storage";

const REPORT_INDEX_KEY = "solguard-audit-reports:index";
const REPORT_KEY_PREFIX = "solguard-audit-report:";

type JsonPrimitive = string | number | boolean | null | undefined;

type DeepReadonly<T> = T extends JsonPrimitive
  ? T
  : T extends (...args: unknown[]) => unknown
    ? T
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepReadonly<U>>
      : { readonly [K in keyof T]: DeepReadonly<T[K]> };

export type AuditReportSnapshot = DeepReadonly<AuditReportRecord>;

type ReportStorageSnapshotSource = {
  id: string;
  createdAt: string;
  sourceMode: AuditReportRecord["sourceMode"];
  inputSummary: {
    fileCount: number;
    githubUrls: readonly string[];
  };
  result: {
    overallScore: number;
    summary: AuditReportRecord["result"]["summary"];
  };
  memory: {
    title: string;
  };
};

function sortReports<T extends { createdAt: string }>(reports: readonly T[]): T[] {
  return [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value as DeepReadonly<T>;
  }

  Object.freeze(value);

  for (const key of Object.keys(value as Record<string, unknown>)) {
    const nested = (value as Record<string, unknown>)[key];
    if (nested && typeof nested === "object") {
      deepFreeze(nested);
    }
  }

  return value as DeepReadonly<T>;
}

export function createAuditReportId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `report_${crypto.randomUUID()}`;
  }

  return `report_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function saveAuditReport(record: AuditReportRecord): boolean {
  const reports = listAuditReports();
  const nextReports = sortReports([
    record,
    ...reports.filter((item) => item.id !== record.id),
  ]).slice(0, 25);

  const ok = writeStoredJson(REPORT_KEY_PREFIX + record.id, record);
  if (!ok) return false;

  return writeStoredJson(
    REPORT_INDEX_KEY,
    nextReports.map((item) => createReportStorageSnapshot(item))
  );
}

export function loadAuditReport(reportId: string): AuditReportSnapshot | null {
  if (!reportId) return null;
  return deepFreeze(readStoredJson<AuditReportRecord | null>(REPORT_KEY_PREFIX + reportId, null));
}

export function listAuditReports(): AuditReportSnapshot[] {
  const index = readStoredJson<Array<{ id: string }>>(REPORT_INDEX_KEY, []);
  const reports = index
    .map((item) => loadAuditReport(item.id))
    .filter((item): item is AuditReportSnapshot => Boolean(item));
  return sortReports(reports);
}

export function createReportStorageSnapshot(record: ReportStorageSnapshotSource): {
  id: string;
  createdAt: string;
  sourceMode: AuditReportRecord["sourceMode"];
  fileCount: number;
  githubUrls: string[];
  overallScore: number;
  summary: AuditReportRecord["result"]["summary"];
  memoryTitle: string;
} {
  return {
    id: record.id,
    createdAt: record.createdAt,
    sourceMode: record.sourceMode,
    fileCount: record.inputSummary.fileCount,
    githubUrls: [...record.inputSummary.githubUrls],
    overallScore: record.result.overallScore,
    summary: record.result.summary,
    memoryTitle: record.memory.title,
  };
}
