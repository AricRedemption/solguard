import type { AuditEvolutionCandidateSnapshot } from "@/lib/audit/evolution-store";
import EvolutionLogPage, {
  buildEvolutionCardModel,
  buildEvolutionSummary,
} from "./page";

const sampleRecord = {
  id: "evolution_123",
  createdAt: "2026-04-27T00:00:00.000Z",
  status: "candidate",
  kind: "memory_ranking_update",
  target: "rankAwarenessEntries",
  before: "Utility score weighted below recency.",
  after: "Utility score weighted above recency for recall-heavy items.",
  reason: "Recent recalls were being buried behind older but high-utility entries.",
  evidence: ["report_123", "memory_123", "feedback_2026_04_27"],
  riskLevel: "low",
  sourceReportId: "report_123",
  sourceMemoryId: "memory_123",
} satisfies AuditEvolutionCandidateSnapshot;

void EvolutionLogPage;
void buildEvolutionSummary;
void buildEvolutionCardModel;

const summary = buildEvolutionSummary([sampleRecord]);
const model = buildEvolutionCardModel(sampleRecord);

void summary;
void model;
