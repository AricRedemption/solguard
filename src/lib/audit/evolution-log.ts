import type {
  AuditEvolutionCandidateRecord,
  AuditEvolutionLogDisplaySnapshot,
} from "@/types/audit";
import {
  listEvolutionCandidates,
  loadEvolutionCandidate,
  type AuditEvolutionCandidateSnapshot,
} from "@/lib/audit/evolution-store";

type JsonPrimitive = string | number | boolean | null | undefined;

type DeepReadonly<T> = T extends JsonPrimitive
  ? T
  : T extends (...args: unknown[]) => unknown
    ? T
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepReadonly<U>>
      : { readonly [K in keyof T]: DeepReadonly<T[K]> };

export type AuditEvolutionLogSnapshot = DeepReadonly<AuditEvolutionLogDisplaySnapshot>;

const KIND_LABELS: Record<AuditEvolutionCandidateRecord["kind"], string> = {
  prompt_section_update: "prompt section update",
  summary_template_update: "summary template update",
  retrieval_weight_update: "retrieval weight update",
  phase_routing_update: "phase routing update",
  memory_ranking_update: "memory ranking update",
  heuristic_ordering_update: "heuristic ordering update",
};

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

function trimSentence(text: string): string {
  return text.trim().replace(/[.?!\s]+$/u, "");
}

function describeLesson(record: Pick<AuditEvolutionCandidateRecord, "kind" | "status" | "target" | "reason" | "riskLevel">): string {
  const kindLabel = KIND_LABELS[record.kind];
  const target = record.target.trim() || "the target";
  const reason = trimSentence(record.reason);
  const risk = `${record.riskLevel} risk`;

  switch (record.status) {
    case "candidate":
      return `Observed a ${risk} ${kindLabel} for ${target} because ${reason}.`;
    case "approved":
      return `Validated the ${kindLabel} for ${target} after checking ${reason}.`;
    case "applied":
      return `Carried the ${kindLabel} into ${target} so the system can keep ${reason}.`;
    case "rejected":
      return `Kept the ${kindLabel} out of ${target} because ${reason}.`;
    case "reverted":
      return `Rolled back the ${kindLabel} on ${target} after ${reason}.`;
  }
}

export function createEvolutionLogDisplaySnapshot(
  record: AuditEvolutionCandidateSnapshot
): AuditEvolutionLogSnapshot {
  return deepFreeze({
    id: record.id,
    createdAt: record.createdAt,
    kind: record.kind,
    status: record.status,
    riskLevel: record.riskLevel,
    target: record.target,
    reason: record.reason,
    lesson: describeLesson(record),
    evidence: [...record.evidence],
    appliedAt: record.appliedAt,
    revertedAt: record.revertedAt,
  });
}

export function loadEvolutionLogSnapshot(candidateId: string): AuditEvolutionLogSnapshot | null {
  const record = loadEvolutionCandidate(candidateId);
  return record ? createEvolutionLogDisplaySnapshot(record) : null;
}

export function listEvolutionLogSnapshots(): AuditEvolutionLogSnapshot[] {
  return listEvolutionCandidates().map((record) => createEvolutionLogDisplaySnapshot(record));
}
