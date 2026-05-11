import type { LLMProvider } from "@/lib/llm/provider";
import { runAuditPipelineWithDependencies } from "@/lib/audit/pipeline";
import type { AuditPipelineDependencies } from "@/lib/audit/pipeline";
import type { AuditResult, AuditSSEEvent } from "@/types/audit";
import type { LLMConfig } from "@/types/llm";

const llmConfig = {
  apiKey: "test-key",
  provider: "anthropic",
  supplier: "openai-direct",
  model: "glm-5.1-fp8",
  baseURL: "https://example.invalid/v1",
} satisfies LLMConfig;

const provider: LLMProvider = {
  async call() {
    throw new Error("Unexpected non-streaming provider call in pipeline contract test.");
  },
  async *callStreaming() {
    throw new Error("Unexpected streaming provider call in pipeline contract test.");
  },
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function collectPhases(
  events: AuditSSEEvent[],
  type: "phase_start" | "phase_complete"
): number[] {
  return events
    .filter((event): event is Extract<AuditSSEEvent, { type: typeof type }> => event.type === type)
    .map((event) => event.phase);
}

function createBaseDependencies(
  overrides: Partial<AuditPipelineDependencies>
): AuditPipelineDependencies {
  return {
    createProvider: async () => provider,
    loadPhasePrompts: async () => [
      { system: "phase-1", phaseName: "phase-1" },
      { system: "phase-2", phaseName: "phase-2" },
      { system: "phase-3", phaseName: "phase-3" },
      { system: "phase-4", phaseName: "phase-4" },
      { system: "phase-5", phaseName: "phase-5" },
    ],
    runPhase1: async () => ({ entryPoints: [] }),
    runPhase2: async () => ({
      architecture: "unknown",
      trustBoundaries: [],
      stateFlow: [],
      keyInvariants: [],
    }),
    runPhase3: async () => ({ findings: [] }),
    runPhase4: async () => ({
      variants: [],
      confirmedOriginal: [],
      dismissedOriginal: [],
    }),
    runPhase5: async () => ({
      timestamp: "2026-01-01T00:00:00.000Z",
      overallScore: 100,
      summary: { critical: 0, high: 0, medium: 0, low: 0 },
      vulnerabilities: [],
      recommendations: [],
    }),
    ...overrides,
  };
}

async function runEmptyAnalysisFailureRegression(): Promise<void> {
  const events: AuditSSEEvent[] = [];
  let phase3Calls = 0;
  let phase4Calls = 0;
  let phase5Calls = 0;

  await runAuditPipelineWithDependencies(
    {
      files: [{ name: "program.rs", content: "", language: "rust" }],
      llmConfig,
      onEvent: (event) => events.push(event),
    },
    createBaseDependencies({
      runPhase3: async () => {
        phase3Calls++;
        throw new Error("Phase 3 must not run when source analysis is empty.");
      },
      runPhase4: async () => {
        phase4Calls++;
        throw new Error("Phase 4 must not run when source analysis is empty.");
      },
      runPhase5: async () => {
        phase5Calls++;
        throw new Error("Phase 5 must not run when source analysis is empty.");
      },
    })
  );

  const errorEvents = events.filter((event): event is Extract<AuditSSEEvent, { type: "error" }> => event.type === "error");

  assert(
    JSON.stringify(collectPhases(events, "phase_start")) === JSON.stringify([1, 2]),
    `Expected phase_start only for phases 1 and 2, got ${JSON.stringify(events)}.`
  );
  assert(
    JSON.stringify(collectPhases(events, "phase_complete")) === JSON.stringify([1, 2]),
    `Expected phase_complete only for phases 1 and 2, got ${JSON.stringify(events)}.`
  );
  assert(errorEvents.length === 1, `Expected a single SSE error event, got ${JSON.stringify(events)}.`);
  assert(
    errorEvents[0]?.message === "Audit input did not yield analyzable source functions",
    `Expected the empty-analysis failure reason after phase 2, got ${JSON.stringify(events)}.`
  );
  assert(!events.some((event) => event.type === "result"), `Expected no result event, got ${JSON.stringify(events)}.`);
  assert(!events.some((event) => event.type === "complete"), `Expected no complete event, got ${JSON.stringify(events)}.`);
  assert(
    phase3Calls === 0 && phase4Calls === 0 && phase5Calls === 0,
    `Expected phases 3/4/5 not to run, got calls ${phase3Calls}/${phase4Calls}/${phase5Calls}.`
  );
}

async function runZeroEntryPointRegression(): Promise<void> {
  const events: AuditSSEEvent[] = [];
  let phase3Calls = 0;
  let phase4Calls = 0;
  let phase5Calls = 0;

  await runAuditPipelineWithDependencies(
    {
      files: [{ name: "program.rs", content: "pub fn process() {}", language: "rust" }],
      llmConfig,
      onEvent: (event) => events.push(event),
    },
    createBaseDependencies({
      runPhase3: async () => {
        phase3Calls++;
        return { findings: [] };
      },
      runPhase4: async () => {
        phase4Calls++;
        return {
          variants: [],
          confirmedOriginal: [],
          dismissedOriginal: [],
        };
      },
      runPhase5: async () => {
        phase5Calls++;
        const result: AuditResult = {
          timestamp: "2026-01-01T00:00:00.000Z",
          overallScore: 100,
          summary: { critical: 0, high: 0, medium: 0, low: 0 },
          vulnerabilities: [],
          recommendations: [],
        };
        return result;
      },
    })
  );

  assert(
    JSON.stringify(collectPhases(events, "phase_start")) === JSON.stringify([1, 2, 3, 4, 5]),
    `Expected analyzable zero-entry-point input to reach all phases, got ${JSON.stringify(events)}.`
  );
  assert(
    JSON.stringify(collectPhases(events, "phase_complete")) === JSON.stringify([1, 2, 3, 4, 5]),
    `Expected analyzable zero-entry-point input to complete all phases, got ${JSON.stringify(events)}.`
  );
  assert(!events.some((event) => event.type === "error"), `Expected no error event, got ${JSON.stringify(events)}.`);
  assert(events.some((event) => event.type === "result"), `Expected a result event, got ${JSON.stringify(events)}.`);
  assert(events.some((event) => event.type === "complete"), `Expected a complete event, got ${JSON.stringify(events)}.`);
  assert(
    phase3Calls === 1 && phase4Calls === 1 && phase5Calls === 1,
    `Expected phases 3/4/5 to run exactly once, got ${phase3Calls}/${phase4Calls}/${phase5Calls}.`
  );
}

void (async () => {
  await runEmptyAnalysisFailureRegression();
  await runZeroEntryPointRegression();
})();
