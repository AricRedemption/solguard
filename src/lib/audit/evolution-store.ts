import type {
  AuditEvolutionCandidateInput,
  AuditEvolutionCandidateRecord,
  AuditEvolutionCandidateRiskLevel,
  AuditEvolutionCandidateStatus,
} from "@/types/audit";
import { readStoredJson, writeStoredJson } from "@/lib/audit/storage";

const EVOLUTION_INDEX_KEY = "solguard-audit-evolution:index";
const EVOLUTION_KEY_PREFIX = "solguard-audit-evolution-candidate:";
export const EVOLUTION_STORE_EVENT = "solguard:audit-evolution-candidate";

type JsonPrimitive = string | number | boolean | null | undefined;

type DeepReadonly<T> = T extends JsonPrimitive
  ? T
  : T extends (...args: unknown[]) => unknown
    ? T
    : T extends ReadonlyArray<infer U>
      ? ReadonlyArray<DeepReadonly<U>>
      : { readonly [K in keyof T]: DeepReadonly<T[K]> };

export type AuditEvolutionCandidateSnapshot = DeepReadonly<AuditEvolutionCandidateRecord>;

export interface AuditEvolutionCandidateListItem {
  id: string;
  createdAt: string;
  sourceReportId?: string;
  sourceMemoryId?: string;
  kind: AuditEvolutionCandidateRecord["kind"];
  target: string;
  riskLevel: AuditEvolutionCandidateRiskLevel;
  status: AuditEvolutionCandidateStatus;
}

export type AuditEvolutionCandidateStorageSnapshot = AuditEvolutionCandidateListItem;

const ALLOWED_TRANSITIONS: Record<AuditEvolutionCandidateStatus, readonly AuditEvolutionCandidateStatus[]> = {
  candidate: ["approved"],
  approved: ["applied", "rejected", "reverted"],
  applied: ["reverted"],
  rejected: [],
  reverted: [],
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

function sortCandidates<T extends { createdAt: string }>(candidates: readonly T[]): T[] {
  return [...candidates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createEvolutionCandidateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `evolution_${crypto.randomUUID()}`;
  }

  return `evolution_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createEvolutionCandidate(input: AuditEvolutionCandidateInput, createdAt = new Date().toISOString()): AuditEvolutionCandidateRecord {
  return {
    id: createEvolutionCandidateId(),
    createdAt,
    status: "candidate",
    ...input,
    evidence: [...input.evidence],
  };
}

export function createEvolutionCandidateStorageSnapshot(
  record: Pick<
    AuditEvolutionCandidateSnapshot,
    | "id"
    | "createdAt"
    | "sourceReportId"
    | "sourceMemoryId"
    | "kind"
    | "target"
    | "riskLevel"
    | "status"
  >
): AuditEvolutionCandidateStorageSnapshot {
  return {
    id: record.id,
    createdAt: record.createdAt,
    sourceReportId: record.sourceReportId,
    sourceMemoryId: record.sourceMemoryId,
    kind: record.kind,
    target: record.target,
    riskLevel: record.riskLevel,
    status: record.status,
  };
}

export function saveEvolutionCandidate(record: AuditEvolutionCandidateRecord): boolean {
  const candidates = listEvolutionCandidates();
  const nextCandidates = sortCandidates([
    record,
    ...candidates.filter((item) => item.id !== record.id),
  ]).slice(0, 25);

  const ok = writeStoredJson(EVOLUTION_KEY_PREFIX + record.id, record);
  if (!ok) return false;

  const stored = writeStoredJson(
    EVOLUTION_INDEX_KEY,
    nextCandidates.map((item) => createEvolutionCandidateStorageSnapshot(item))
  );

  if (stored && typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVOLUTION_STORE_EVENT));
  }

  return stored;
}

export function loadEvolutionCandidate(candidateId: string): AuditEvolutionCandidateSnapshot | null {
  if (!candidateId) return null;

  return deepFreeze(
    readStoredJson<AuditEvolutionCandidateRecord | null>(EVOLUTION_KEY_PREFIX + candidateId, null)
  );
}

export function listEvolutionCandidates(): AuditEvolutionCandidateSnapshot[] {
  const index = readStoredJson<AuditEvolutionCandidateListItem[]>(EVOLUTION_INDEX_KEY, []);
  const candidates = index
    .map((item) => loadEvolutionCandidate(item.id))
    .filter((item): item is AuditEvolutionCandidateSnapshot => Boolean(item));

  return sortCandidates(candidates);
}

function transitionEvolutionCandidate(
  candidateId: string,
  nextStatus: AuditEvolutionCandidateStatus
): AuditEvolutionCandidateSnapshot | null {
  const current = loadEvolutionCandidate(candidateId);
  if (!current) return null;

  const allowedNextStatuses = ALLOWED_TRANSITIONS[current.status] ?? [];
  if (!allowedNextStatuses.includes(nextStatus)) {
    return null;
  }

  const nextCandidate: AuditEvolutionCandidateRecord = {
    ...current,
    status: nextStatus,
    evidence: [...current.evidence],
    appliedAt:
      nextStatus === "applied"
        ? current.appliedAt ?? new Date().toISOString()
        : current.appliedAt,
    revertedAt:
      nextStatus === "reverted"
        ? current.revertedAt ?? new Date().toISOString()
        : current.revertedAt,
  };

  if (!saveEvolutionCandidate(nextCandidate)) {
    return null;
  }

  return loadEvolutionCandidate(candidateId);
}

export function approveEvolutionCandidate(candidateId: string): AuditEvolutionCandidateSnapshot | null {
  return transitionEvolutionCandidate(candidateId, "approved");
}

export function applyEvolutionCandidate(candidateId: string): AuditEvolutionCandidateSnapshot | null {
  return transitionEvolutionCandidate(candidateId, "applied");
}

export function rejectEvolutionCandidate(candidateId: string): AuditEvolutionCandidateSnapshot | null {
  return transitionEvolutionCandidate(candidateId, "rejected");
}

export function revertEvolutionCandidate(candidateId: string): AuditEvolutionCandidateSnapshot | null {
  return transitionEvolutionCandidate(candidateId, "reverted");
}
