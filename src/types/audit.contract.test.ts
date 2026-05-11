import type { AuditMemoryEntry, AuditRequest, AuditRunSnapshot, AuditSSEEvent } from "@/types/audit";

const runSnapshot = {
  id: "run_123",
  createdAt: "2026-04-27T00:00:00.000Z",
  progress: 42,
  currentPhase: 3,
  currentAgent: "phase-3-auditor",
  currentWorkflow: "security_audit",
  timeline: [],
  inputSummary: {
    sourceMode: "files",
    fileCount: 1,
    fileNames: ["program.rs"],
    githubUrls: [],
  },
  resultId: "report_123",
} satisfies AuditRunSnapshot;

void runSnapshot;

const runStartEvent = {
  type: "run_start",
  runSnapshot,
} satisfies Extract<AuditSSEEvent, { type: "run_start" }>;

void runStartEvent;

const awarenessEntry = {
  id: "memory_123",
  reportId: "report_123",
  createdAt: "2026-04-27T00:00:00.000Z",
  title: "High-risk audit snapshot",
  summary: "High-risk signals were confirmed and should be revisited before shipping.",
  keySignals: ["Score 62/100"],
  focusAreas: ["High-severity vulnerabilities"],
  confidence: 0.84,
  utility: 0.91,
  recency: 0.73,
  risk: 0.18,
  sourceType: "report",
  recallCount: 2,
} satisfies AuditMemoryEntry;

void awarenessEntry;

const auditRequest = {
  llmConfig: {
    provider: "openai",
    supplier: "openai-direct",
    model: "gpt-4.1",
    apiKey: "sk-test",
  },
  awarenessEntries: [awarenessEntry],
} satisfies AuditRequest;

void auditRequest;
