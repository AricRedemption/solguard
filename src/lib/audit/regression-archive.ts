import type {
  AuditEvolutionCandidateStatus,
  AuditRegressionArchiveClusterSnapshot,
  AuditRegressionArchiveRecordSnapshot,
  AuditRegressionArchiveSnapshot,
  AuditRegressionFailureClass,
} from "@/types/audit";
import { listEvolutionCandidates, type AuditEvolutionCandidateSnapshot } from "@/lib/audit/evolution-store";

const FAILURE_CLASS_PRIORITY: Record<AuditRegressionFailureClass, number> = {
  rollback: 0,
  rejected: 1,
  unproven: 2,
  under_review: 3,
  applied: 4,
};

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value as Record<string, unknown>)) {
    const nested = (value as Record<string, unknown>)[key];
    if (nested && typeof nested === "object") {
      deepFreeze(nested);
    }
  }

  return value;
}

function trimText(text: string): string {
  return text.trim().replace(/[.?!\s]+$/u, "");
}

function normalizeTarget(target: string): string {
  return target.trim();
}

export function deriveRegressionFailureClass(status: AuditEvolutionCandidateStatus): AuditRegressionFailureClass {
  switch (status) {
    case "reverted":
      return "rollback";
    case "rejected":
      return "rejected";
    case "candidate":
    case "approved":
      return "unproven";
    case "applied":
      return "applied";
    default:
      return "under_review";
  }
}

function describeRegressionLesson(record: Pick<AuditEvolutionCandidateSnapshot, "reason" | "status">): string {
  const reason = trimText(record.reason) || "the change";

  switch (record.status) {
    case "reverted":
      return `Rolled back because ${reason}.`;
    case "rejected":
      return `Rejected because ${reason}.`;
    case "candidate":
    case "approved":
      return `Still unproven because ${reason}.`;
    case "applied":
      return `Recorded as a contrast signal because ${reason}.`;
    default:
      return `Under review because ${reason}.`;
  }
}

function toRegressionRecordSnapshot(record: AuditEvolutionCandidateSnapshot): AuditRegressionArchiveRecordSnapshot {
  return deepFreeze({
    id: record.id,
    createdAt: record.createdAt,
    kind: record.kind,
    status: record.status,
    riskLevel: record.riskLevel,
    target: record.target,
    reason: record.reason,
    lesson: describeRegressionLesson(record),
    evidence: [...record.evidence],
    before: record.before,
    after: record.after,
    appliedAt: record.appliedAt,
    revertedAt: record.revertedAt,
    sourceReportId: record.sourceReportId,
    sourceMemoryId: record.sourceMemoryId,
    failureClass: deriveRegressionFailureClass(record.status),
  });
}

function compareRegressionRecords(
  left: AuditEvolutionCandidateSnapshot,
  right: AuditEvolutionCandidateSnapshot
): number {
  const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
  if (createdAtCompare !== 0) {
    return createdAtCompare;
  }

  return left.id.localeCompare(right.id);
}

function chooseDominantFailureClass(
  records: readonly AuditRegressionArchiveRecordSnapshot[]
): AuditRegressionFailureClass {
  const counts = new Map<AuditRegressionFailureClass, number>();
  const primaryRecords = records.filter((record) => record.failureClass !== "applied");

  if (primaryRecords.length === 0) {
    return "under_review";
  }

  for (const record of primaryRecords) {
    counts.set(record.failureClass, (counts.get(record.failureClass) ?? 0) + 1);
  }

  let dominant: AuditRegressionFailureClass = "under_review";
  let dominantCount = -1;

  for (const [failureClass, count] of counts) {
    if (
      count > dominantCount ||
      (count === dominantCount && FAILURE_CLASS_PRIORITY[failureClass] < FAILURE_CLASS_PRIORITY[dominant])
    ) {
      dominant = failureClass;
      dominantCount = count;
    }
  }

  return dominant;
}

function countClustersByFailureClass(
  snapshot: AuditRegressionArchiveSnapshot,
  failureClass: AuditRegressionFailureClass
): number {
  return snapshot.clusters.filter((cluster) => cluster.dominantFailureClass === failureClass).length;
}

function hasStrongEvidence(records: readonly AuditEvolutionCandidateSnapshot[]): boolean {
  if (records.length >= 2) {
    return true;
  }

  return records.some((record) => Boolean(record.sourceReportId && record.sourceMemoryId));
}

function compareRegressionClusters(
  left: AuditRegressionArchiveClusterSnapshot,
  right: AuditRegressionArchiveClusterSnapshot
): number {
  const leftPriority = Math.min(
    ...left.records.map((record) => FAILURE_CLASS_PRIORITY[record.failureClass])
  );
  const rightPriority = Math.min(
    ...right.records.map((record) => FAILURE_CLASS_PRIORITY[record.failureClass])
  );

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const createdAtCompare = right.createdAt.localeCompare(left.createdAt);
  if (createdAtCompare !== 0) {
    return createdAtCompare;
  }

  return left.id.localeCompare(right.id);
}

function createRegressionClusterSnapshot(
  records: readonly AuditEvolutionCandidateSnapshot[]
): AuditRegressionArchiveClusterSnapshot {
  const sortedRecords = [...records].sort(compareRegressionRecords).map(toRegressionRecordSnapshot);
  const headline = sortedRecords[0];
  const dominantFailureClass = chooseDominantFailureClass(sortedRecords);

  return deepFreeze({
    ...headline,
    clusterSize: sortedRecords.length,
    dominantFailureClass,
    strongEvidence: hasStrongEvidence(records),
    records: sortedRecords,
  });
}

function groupRegressionCandidates(
  records: readonly AuditEvolutionCandidateSnapshot[]
): AuditRegressionArchiveClusterSnapshot[] {
  const groups = new Map<string, AuditEvolutionCandidateSnapshot[]>();

  for (const record of records) {
    const key = `${record.kind}::${normalizeTarget(record.target)}`;
    const current = groups.get(key);
    if (current) {
      current.push(record);
      continue;
    }

    groups.set(key, [record]);
  }

  return [...groups.values()].map((group) => createRegressionClusterSnapshot(group)).sort(compareRegressionClusters);
}

export function createRegressionArchiveSnapshot(
  records: readonly AuditEvolutionCandidateSnapshot[] = listEvolutionCandidates()
): AuditRegressionArchiveSnapshot {
  return deepFreeze({
    clusters: groupRegressionCandidates(records),
  });
}

export function getRegressionArchiveTotalClusterCount(snapshot: AuditRegressionArchiveSnapshot): number {
  return snapshot.clusters.length;
}

export function getRegressionArchiveRollbackCount(snapshot: AuditRegressionArchiveSnapshot): number {
  return countClustersByFailureClass(snapshot, "rollback");
}

export function getRegressionArchiveRejectedCount(snapshot: AuditRegressionArchiveSnapshot): number {
  return countClustersByFailureClass(snapshot, "rejected");
}

export function getRegressionArchiveUnprovenCount(snapshot: AuditRegressionArchiveSnapshot): number {
  return countClustersByFailureClass(snapshot, "unproven");
}

export function getRegressionArchiveStrongEvidenceCount(snapshot: AuditRegressionArchiveSnapshot): number {
  return snapshot.clusters.filter((cluster) => cluster.strongEvidence).length;
}

export function getRegressionArchiveAppliedCount(snapshot: AuditRegressionArchiveSnapshot): number {
  return snapshot.clusters.filter((cluster) => cluster.records.some((record) => record.failureClass === "applied")).length;
}

export function getRegressionArchiveDominantFailureClass(
  snapshot: AuditRegressionArchiveSnapshot
): AuditRegressionFailureClass {
  const counts = new Map<AuditRegressionFailureClass, number>();

  for (const cluster of snapshot.clusters) {
    counts.set(cluster.dominantFailureClass, (counts.get(cluster.dominantFailureClass) ?? 0) + 1);
  }

  let dominant: AuditRegressionFailureClass = "under_review";
  let dominantCount = -1;

  for (const [failureClass, count] of counts) {
    if (
      count > dominantCount ||
      (count === dominantCount && FAILURE_CLASS_PRIORITY[failureClass] < FAILURE_CLASS_PRIORITY[dominant])
    ) {
      dominant = failureClass;
      dominantCount = count;
    }
  }

  return dominant;
}
