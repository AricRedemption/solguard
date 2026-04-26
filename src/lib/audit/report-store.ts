import type { AuditReportRecord } from "@/types/audit";

const REPORT_INDEX_KEY = "solguard-audit-reports:index";
const REPORT_KEY_PREFIX = "solguard-audit-report:";

function safeStorageAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJSON<T>(key: string, fallback: T): T {
  if (!safeStorageAvailable()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("[audit/report-store] Failed to read storage", error);
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  if (!safeStorageAvailable()) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("[audit/report-store] Failed to write storage", error);
    return false;
  }
}

function sortReports(reports: AuditReportRecord[]): AuditReportRecord[] {
  return [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

  const ok = writeJSON(REPORT_KEY_PREFIX + record.id, record);
  if (!ok) return false;

  return writeJSON(
    REPORT_INDEX_KEY,
    nextReports.map((item) => createReportStorageSnapshot(item))
  );
}

export function loadAuditReport(reportId: string): AuditReportRecord | null {
  if (!reportId) return null;
  return readJSON<AuditReportRecord | null>(REPORT_KEY_PREFIX + reportId, null);
}

export function listAuditReports(): AuditReportRecord[] {
  const index = readJSON<Array<{ id: string }>>(REPORT_INDEX_KEY, []);
  const reports = index
    .map((item) => loadAuditReport(item.id))
    .filter((item): item is AuditReportRecord => Boolean(item));
  return sortReports(reports);
}

export function createReportStorageSnapshot(record: AuditReportRecord): {
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
    githubUrls: record.inputSummary.githubUrls,
    overallScore: record.result.overallScore,
    summary: record.result.summary,
    memoryTitle: record.memory.title,
  };
}
