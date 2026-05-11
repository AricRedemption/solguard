import type { AuditMemoryEntry } from "@/types/audit";
import {
  buildFeedbackAwarenessEntry,
  getAwarenessEntryRationale,
  rankAwarenessEntries,
  touchAwarenessEntry,
} from "@/lib/audit/awareness-store";

const staleMemoryEntry = {
  id: "memory_stale",
  reportId: "report_stale",
  createdAt: "2026-04-01T00:00:00.000Z",
  title: "Stale audit snapshot",
  summary: "Old findings should not outrank fresher, useful memories.",
  keySignals: ["Score 18/100"],
  focusAreas: ["Legacy issue"],
  confidence: 0.55,
  utility: 0.22,
  recency: 0.05,
  risk: 0.12,
  sourceType: "report",
  recallCount: 0,
} satisfies AuditMemoryEntry;

const freshMemoryEntry = {
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
  lastRecalledAt: "2026-04-27T02:00:00.000Z",
} satisfies AuditMemoryEntry;

void staleMemoryEntry;
void freshMemoryEntry;

const rankedEntries = rankAwarenessEntries([staleMemoryEntry, freshMemoryEntry]);
const recalledEntry = touchAwarenessEntry(freshMemoryEntry);
const rationale = getAwarenessEntryRationale(freshMemoryEntry);
const feedbackEntry = buildFeedbackAwarenessEntry(
  {
    id: "report_feedback",
    createdAt: "2026-04-27T00:00:00.000Z",
    sourceMode: "files",
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
      overallScore: 62,
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
  },
  {
    reportId: "report_feedback",
    memoryId: "memory_123",
    outcome: "confirmed",
    note: "Validated by user review.",
  }
);

void rankedEntries;
void recalledEntry;
void rationale;
void feedbackEntry;

if (rankedEntries[0]?.id !== freshMemoryEntry.id) {
  throw new Error("Expected the fresh, useful memory to rank ahead of the stale memory.");
}
