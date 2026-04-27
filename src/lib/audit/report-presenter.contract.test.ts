import { buildReportFilename, buildReportMarkdown, buildReportShareSummary, getReportVerdict } from "@/lib/audit/report-presenter";
import { translations } from "@/lib/i18n/translations";
import type { AuditReportSnapshot } from "@/lib/audit/report-store";

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
    vulnerabilities: [
      {
        id: "vuln_1",
        title: "Unsafe authority check",
        severity: "high",
        description: "An authority check can be bypassed under edge cases.",
        confidence: 0.91,
      },
    ],
    recommendations: ["Tighten the authority gate before shipping."],
  },
  timeline: [
    {
      id: "event_1",
      timestamp: "2026-04-27T00:00:00.000Z",
      workflow: "security-audit",
      title: "Security audit complete",
      detail: "Found 1 potential vulnerabilities",
      status: "done",
    },
  ],
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
} satisfies AuditReportSnapshot;

const dashboard = translations.en.dashboard;

const verdict = getReportVerdict(sampleReport);
const summary = buildReportShareSummary(sampleReport, dashboard);
const markdown = buildReportMarkdown(sampleReport, dashboard);
const filename = buildReportFilename(sampleReport);

void verdict;
void summary;
void markdown;
void filename;
