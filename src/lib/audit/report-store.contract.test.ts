import { createReportStorageSnapshot, listAuditReports, loadAuditReport, type AuditReportSnapshot } from "@/lib/audit/report-store";
import type { AuditReportRecord } from "@/types/audit";

const sampleReport = {
  id: "report_123",
  createdAt: "2026-04-27T00:00:00.000Z",
  sourceMode: "files",
  memorySaved: true,
  inputSummary: {
    sourceMode: "files",
    fileCount: 1,
    fileNames: ["program.rs"],
    githubUrls: [],
  },
  llm: {
    provider: "openai",
    supplier: "openai-direct",
    model: "gpt-4.1",
  },
  result: {
    timestamp: "2026-04-27T00:00:00.000Z",
    overallScore: 91,
    summary: {
      critical: 0,
      high: 1,
      medium: 0,
      low: 0,
    },
    vulnerabilities: [],
    recommendations: [],
  },
  timeline: [],
  memory: {
    id: "memory_123",
    reportId: "report_123",
    createdAt: "2026-04-27T00:00:00.000Z",
    title: "Stable snapshot",
    summary: "Saved reports should be immutable once written.",
    keySignals: ["immutable"],
    focusAreas: ["snapshot"],
    confidence: 0.9,
    utility: 0.82,
    recency: 0.94,
    risk: 0.12,
    sourceType: "report",
    recallCount: 0,
  },
} satisfies AuditReportRecord;

const storageSnapshot = createReportStorageSnapshot(sampleReport);
void storageSnapshot;

const reportList = listAuditReports() satisfies readonly AuditReportSnapshot[];
void reportList;

const maybeReport = loadAuditReport(sampleReport.id);

if (maybeReport) {
  void maybeReport.result.overallScore;
  // @ts-expect-error Report snapshots must stay immutable after load.
  maybeReport.result.overallScore = 0;
  // @ts-expect-error Nested arrays must also stay immutable after load.
  maybeReport.timeline.push({
    id: "event_1",
    timestamp: "2026-04-27T00:00:00.000Z",
    workflow: "audit",
    title: "mutate",
    detail: "should not compile",
    status: "info",
  });
}
