import { createEvolutionLogDisplaySnapshot, listEvolutionLogSnapshots } from "@/lib/audit/evolution-log";
import type { AuditEvolutionCandidateRecord } from "@/types/audit";

const evolutionRecord = {
  id: "evolution_123",
  createdAt: "2026-04-27T00:00:00.000Z",
  status: "applied",
  kind: "prompt_section_update",
  target: "security prompt: findings summary",
  before: "Keep the summary short.",
  after: "Include evidence and the main lesson.",
  reason: "The old summary was too vague to action.",
  evidence: ["report_123", "memory_456"],
  riskLevel: "medium",
  appliedAt: "2026-04-27T01:00:00.000Z",
  revertedAt: undefined,
} satisfies AuditEvolutionCandidateRecord;

const displaySnapshot = createEvolutionLogDisplaySnapshot(evolutionRecord);

void displaySnapshot.id;
void displaySnapshot.createdAt;
void displaySnapshot.kind;
void displaySnapshot.status;
void displaySnapshot.riskLevel;
void displaySnapshot.target;
void displaySnapshot.reason;
void displaySnapshot.lesson;
void displaySnapshot.evidence;
void displaySnapshot.appliedAt;
void displaySnapshot.revertedAt;

// @ts-expect-error Display snapshots must stay read-only.
displaySnapshot.target = "mutated";

// @ts-expect-error Display snapshot evidence must stay read-only.
displaySnapshot.evidence.push("mutated");

const displaySnapshots = listEvolutionLogSnapshots();
void displaySnapshots;
