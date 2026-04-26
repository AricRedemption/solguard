import type { AuditRunSnapshot, AuditSSEEvent } from "@/types/audit";

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
