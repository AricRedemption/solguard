import type { AuditRunSnapshot } from "@/types/audit";
import {
  createAuditRunStorageSnapshot,
  loadAuditRunSnapshot,
  saveAuditRunSnapshot,
} from "@/lib/audit/run-store";
import RunPage from "./page";

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
void RunPage;
void loadAuditRunSnapshot;
void saveAuditRunSnapshot;
void createAuditRunStorageSnapshot;
