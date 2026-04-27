import type { AuditEvolutionCandidateSnapshot } from "@/lib/audit/evolution-store";
import { createRegressionArchiveSnapshot } from "@/lib/audit/regression-archive";
import RegressionArchivePage, {
  buildRegressionArchiveClusterModel,
  buildRegressionArchiveLesson,
  buildRegressionArchiveSummary,
} from "./page";

const sampleRecords = [
  {
    id: "evolution_101",
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
    id: "evolution_102",
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
    id: "evolution_103",
    createdAt: "2026-04-27T02:00:00.000Z",
    status: "approved",
    kind: "prompt_section_update",
    target: "findingsSummary",
    before: "Summaries were sparse.",
    after: "Summaries include evidence and lessons.",
    reason: "The cluster is still awaiting proof.",
    evidence: ["report_789"],
    riskLevel: "high",
    sourceMemoryId: "memory_789",
  },
] satisfies readonly AuditEvolutionCandidateSnapshot[];

const archive = createRegressionArchiveSnapshot(sampleRecords);
const summary = buildRegressionArchiveSummary(archive);
const lesson = buildRegressionArchiveLesson(archive);
const clusters = archive.clusters.map((cluster) => buildRegressionArchiveClusterModel(cluster));

void RegressionArchivePage;
void summary;
void lesson;
void clusters;

// @ts-expect-error Regression archive models should stay read-only.
clusters[0].cluster.target = "mutated";
