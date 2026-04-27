import type { AuditEvolutionCandidateRecord } from "@/types/audit";
import {
  createRegressionArchiveSnapshot,
  getRegressionArchiveDominantFailureClass,
  getRegressionArchiveRejectedCount,
  getRegressionArchiveRollbackCount,
  getRegressionArchiveStrongEvidenceCount,
  getRegressionArchiveTotalClusterCount,
  getRegressionArchiveUnprovenCount,
} from "@/lib/audit/regression-archive";

const regressionCandidates = [
  {
    id: "evolution_001",
    createdAt: "2026-04-27T00:00:00.000Z",
    status: "reverted",
    kind: "memory_ranking_update",
    target: "rankAwarenessEntries",
    sourceReportId: "report_123",
    sourceMemoryId: "memory_123",
    before: "Utility score was weighted too low.",
    after: "Utility score now weights recent recalls.",
    reason: "The original weighting caused repeated rollbacks.",
    evidence: ["report_123", "memory_123"],
    riskLevel: "low",
    appliedAt: "2026-04-27T00:30:00.000Z",
    revertedAt: "2026-04-27T00:45:00.000Z",
  },
  {
    id: "evolution_002",
    createdAt: "2026-04-27T01:00:00.000Z",
    status: "rejected",
    kind: "memory_ranking_update",
    target: "rankAwarenessEntries",
    sourceReportId: "report_456",
    before: "Recency dominated the score.",
    after: "Recency was rebalanced against utility.",
    reason: "The candidate did not justify a rollout.",
    evidence: ["report_456"],
    riskLevel: "medium",
  },
  {
    id: "evolution_003",
    createdAt: "2026-04-27T02:00:00.000Z",
    status: "approved",
    kind: "prompt_section_update",
    target: "findingsSummary",
    before: "Summaries were sparse.",
    after: "Summaries include evidence and lessons.",
    reason: "The cluster is still awaiting proof.",
    evidence: ["report_789"],
    riskLevel: "high",
  },
] satisfies readonly AuditEvolutionCandidateRecord[];

const archive = createRegressionArchiveSnapshot(regressionCandidates);

void archive.clusters[0].id;
void archive.clusters[0].createdAt;
void archive.clusters[0].kind;
void archive.clusters[0].status;
void archive.clusters[0].riskLevel;
void archive.clusters[0].target;
void archive.clusters[0].reason;
void archive.clusters[0].lesson;
void archive.clusters[0].evidence;
void archive.clusters[0].before;
void archive.clusters[0].after;
void archive.clusters[0].appliedAt;
void archive.clusters[0].revertedAt;
void archive.clusters[0].failureClass;
void archive.clusters[0].clusterSize;
void archive.clusters[0].dominantFailureClass;
void archive.clusters[0].strongEvidence;

// @ts-expect-error Regression archive clusters must stay read-only.
archive.clusters[0].target = "mutated";

void getRegressionArchiveTotalClusterCount(archive);
void getRegressionArchiveRollbackCount(archive);
void getRegressionArchiveRejectedCount(archive);
void getRegressionArchiveUnprovenCount(archive);
void getRegressionArchiveStrongEvidenceCount(archive);
void getRegressionArchiveDominantFailureClass(archive);
