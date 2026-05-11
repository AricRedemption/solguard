import type {
  AuditEvolutionCandidateInput,
  AuditEvolutionCandidateStatus,
} from "@/types/audit";
import {
  approveEvolutionCandidate,
  applyEvolutionCandidate,
  createEvolutionCandidate,
  createEvolutionCandidateStorageSnapshot,
  listEvolutionCandidates,
  loadEvolutionCandidate,
  rejectEvolutionCandidate,
  revertEvolutionCandidate,
  saveEvolutionCandidate,
  type AuditEvolutionCandidateSnapshot,
} from "@/lib/audit/evolution-store";

const candidateDraft = {
  sourceReportId: "report_123",
  sourceMemoryId: "memory_123",
  kind: "memory_ranking_update",
  target: "rankAwarenessEntries",
  before: "Utility score weighted below recency.",
  after: "Utility score weighted above recency for recall-heavy items.",
  reason: "Recent recalls were being buried behind older but high-utility entries.",
  evidence: ["report_123", "memory_123", "feedback_2026_04_27"],
  riskLevel: "low",
} satisfies AuditEvolutionCandidateInput;

// @ts-expect-error Only the defined evolution statuses should compile.
const invalidStatus: AuditEvolutionCandidateStatus = "pending";
void invalidStatus;

const candidate = createEvolutionCandidate(candidateDraft);
const candidateSnapshot = createEvolutionCandidateStorageSnapshot(candidate);
const stored = saveEvolutionCandidate(candidate);
const loaded = loadEvolutionCandidate(candidate.id);
const candidateList = listEvolutionCandidates() satisfies readonly AuditEvolutionCandidateSnapshot[];

void candidateSnapshot;
void stored;
void loaded;
void candidateList;

if (loaded) {
  if (loaded.status !== "candidate") {
    throw new Error("New evolution candidates should start in the candidate state.");
  }
}

const approved = approveEvolutionCandidate(candidate.id);
if (!approved) {
  throw new Error("Expected candidate approval to succeed.");
}

if (approved.status !== "approved") {
  throw new Error("Approved candidates should persist with approved status.");
}

const applied = applyEvolutionCandidate(candidate.id);
if (!applied) {
  throw new Error("Expected approved candidate application to succeed.");
}

if (applied.status !== "applied") {
  throw new Error("Applied candidates should persist with applied status.");
}

const reverted = revertEvolutionCandidate(candidate.id);
if (!reverted) {
  throw new Error("Expected applied candidate revert to succeed.");
}

if (reverted.status !== "reverted") {
  throw new Error("Reverted candidates should persist with reverted status.");
}

const rejectedDraft = {
  ...candidateDraft,
  kind: "prompt_section_update",
  target: "loadPhasePrompts",
  before: "All prompt sections were treated uniformly.",
  after: "Prompt sections are grouped by retrieval and routing sensitivity.",
  reason: "The candidate should be reviewable before changing prompt composition.",
  riskLevel: "medium",
} satisfies AuditEvolutionCandidateInput;

const rejectedCandidate = createEvolutionCandidate(rejectedDraft);
void saveEvolutionCandidate(rejectedCandidate);

const rejectedApproved = approveEvolutionCandidate(rejectedCandidate.id);
if (!rejectedApproved) {
  throw new Error("Expected candidate approval to succeed before rejection.");
}

const rejected = rejectEvolutionCandidate(rejectedCandidate.id);
if (!rejected) {
  throw new Error("Expected approved candidate rejection to succeed.");
}

if (rejected.status !== "rejected") {
  throw new Error("Rejected candidates should persist with rejected status.");
}
