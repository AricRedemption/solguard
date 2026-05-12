import { createProvider } from "@/lib/llm/provider";
import { loadPhasePrompts, PHASE_NAMES, PHASE_DESCRIPTIONS } from "./prompts/solana-adapter";
import { PHASE_PROGRESS_MAP } from "./constants";
import { runPhase1 } from "./phases/entry-point-discovery";
import { runPhase2 } from "./phases/context-building";
import { runPhase3 } from "./phases/security-audit";
import { runPhase4 } from "./phases/variant-analysis";
import { runPhase5 } from "./phases/report-generation";
import { buildAnalysisContext } from "./context-builder";
import { renderAwarenessContext } from "./awareness-store";
import { prependPromptSystem } from "./prompts/loader";
import type { AnalysisContext, SourceFile, AuditSSEEvent, AuditResult, AuditMemoryEntry } from "@/types/audit";
import type { LLMConfig } from "@/types/llm";

export interface PipelineOptions {
  files: SourceFile[];
  llmConfig: LLMConfig;
  awarenessEntries?: AuditMemoryEntry[];
  onEvent: (event: AuditSSEEvent) => void;
  signal?: AbortSignal;
}

export interface AuditPipelineDependencies {
  createProvider: typeof createProvider;
  loadPhasePrompts: typeof loadPhasePrompts;
  runPhase1: typeof runPhase1;
  runPhase2: typeof runPhase2;
  runPhase3: typeof runPhase3;
  runPhase4: typeof runPhase4;
  runPhase5: typeof runPhase5;
}

const defaultDependencies: AuditPipelineDependencies = {
  createProvider,
  loadPhasePrompts,
  runPhase1,
  runPhase2,
  runPhase3,
  runPhase4,
  runPhase5,
};

function calculateScore(summary?: { critical?: number; high?: number; medium?: number; low?: number }): number {
  if (!summary) return 75;
  const c = summary.critical || 0;
  const h = summary.high || 0;
  const m = summary.medium || 0;
  const l = summary.low || 0;
  const deduction = c * 30 + h * 20 + m * 10 + l * 5;
  return Math.max(0, Math.min(100, 100 - deduction));
}

export function failOnMissingAnalyzableSource(params: {
  analysisContext: Pick<AnalysisContext, "functions"> | undefined;
  onEvent: (event: AuditSSEEvent) => void;
}): boolean {
  const functionCount = params.analysisContext?.functions.length ?? 0;
  if (functionCount > 0) {
    return false;
  }

  const message = "Audit input did not yield analyzable source functions";
  console.warn(`[AuditPipeline] Aborting empty analysis: ${message}`);
  params.onEvent({ type: "error", message });
  return true;
}

export async function runAuditPipeline(options: PipelineOptions): Promise<void> {
  return runAuditPipelineWithDependencies(options, defaultDependencies);
}

export async function runAuditPipelineWithDependencies(
  options: PipelineOptions,
  deps: AuditPipelineDependencies
): Promise<void> {
  const { files, llmConfig, awarenessEntries = [], onEvent, signal } = options;
  const emitWorkflowEvent = (item: import("@/types/audit").WorkflowEvent) => {
    onEvent({ type: "workflow_event", item });
  };

  if (!files.length) {
    onEvent({ type: "error", message: "No files provided" });
    return;
  }

  const provider = await deps.createProvider(llmConfig);
  const awarenessContext = renderAwarenessContext(awarenessEntries, 5);
  const awarenessPrompt = awarenessContext
    ? `High-signal memory from prior audits:\n${awarenessContext}`
    : "";

  // Load prompts from skills
  let phasePrompts;
  try {
    phasePrompts = await deps.loadPhasePrompts();
  } catch (error) {
    onEvent({ type: "error", message: `Failed to load prompts: ${error instanceof Error ? error.message : "Unknown error"}` });
    return;
  }

  const programAddress = files[0]?.name || "unknown";
  const analysisContext = buildAnalysisContext(files);

  try {
    // Phase 1: Entry Point Discovery
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onEvent({ type: "phase_start", phase: 1, name: PHASE_NAMES[0], description: PHASE_DESCRIPTIONS[0] });
    onEvent({ type: "progress", progress: PHASE_PROGRESS_MAP[1], phase: PHASE_NAMES[0], detail: PHASE_DESCRIPTIONS[0] });

    const phase1Result = await deps.runPhase1(
      provider,
      prependPromptSystem(phasePrompts[0], awarenessPrompt),
      (msg) => onEvent({ type: "phase_progress", phase: 1, message: msg }),
      analysisContext,
      emitWorkflowEvent,
      signal
    );
    onEvent({ type: "phase_complete", phase: 1, output: phase1Result });

    // Phase 2: Context Building
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onEvent({ type: "phase_start", phase: 2, name: PHASE_NAMES[1], description: PHASE_DESCRIPTIONS[1] });
    onEvent({ type: "progress", progress: PHASE_PROGRESS_MAP[2], phase: PHASE_NAMES[1], detail: PHASE_DESCRIPTIONS[1] });

    const phase2Result = await deps.runPhase2(
      provider,
      files,
      phase1Result,
      prependPromptSystem(phasePrompts[1], awarenessPrompt),
      (msg) => onEvent({ type: "phase_progress", phase: 2, message: msg }),
      analysisContext,
      emitWorkflowEvent,
      signal
    );
    onEvent({ type: "phase_complete", phase: 2, output: phase2Result });

    if (failOnMissingAnalyzableSource({ analysisContext, onEvent })) {
      return;
    }

    // Phase 3: Security Audit
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onEvent({ type: "phase_start", phase: 3, name: PHASE_NAMES[2], description: PHASE_DESCRIPTIONS[2] });
    onEvent({ type: "progress", progress: PHASE_PROGRESS_MAP[3], phase: PHASE_NAMES[2], detail: PHASE_DESCRIPTIONS[2] });

    const phase3Result = await deps.runPhase3(
      provider,
      phase1Result,
      phase2Result,
      prependPromptSystem(phasePrompts[2], awarenessPrompt),
      (msg) => onEvent({ type: "phase_progress", phase: 3, message: msg }),
      analysisContext,
      emitWorkflowEvent,
      signal
    );
    onEvent({ type: "phase_complete", phase: 3, output: phase3Result });

    // Phase 4: Variant Analysis
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onEvent({ type: "phase_start", phase: 4, name: PHASE_NAMES[3], description: PHASE_DESCRIPTIONS[3] });
    onEvent({ type: "progress", progress: PHASE_PROGRESS_MAP[4], phase: PHASE_NAMES[3], detail: PHASE_DESCRIPTIONS[3] });

    const phase4Result = await deps.runPhase4(
      provider,
      files,
      phase3Result,
      prependPromptSystem(phasePrompts[3], awarenessPrompt),
      (msg) => onEvent({ type: "phase_progress", phase: 4, message: msg }),
      analysisContext,
      emitWorkflowEvent,
      signal
    );
    onEvent({ type: "phase_complete", phase: 4, output: phase4Result });

    // Phase 5: Report Generation
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    onEvent({ type: "phase_start", phase: 5, name: PHASE_NAMES[4], description: PHASE_DESCRIPTIONS[4] });
    onEvent({ type: "progress", progress: PHASE_PROGRESS_MAP[5], phase: PHASE_NAMES[4], detail: PHASE_DESCRIPTIONS[4] });

    const finalResult = await deps.runPhase5(
      provider,
      phase3Result,
      phase4Result,
      programAddress,
      prependPromptSystem(phasePrompts[4], awarenessPrompt),
      (msg) => onEvent({ type: "phase_progress", phase: 5, message: msg }),
      analysisContext,
      emitWorkflowEvent,
      signal
    );
    onEvent({ type: "phase_complete", phase: 5, output: finalResult });

    // Ensure we have a valid result
    const result: AuditResult = {
      programAddress,
      timestamp: new Date().toISOString(),
      overallScore: finalResult.overallScore || calculateScore(finalResult.summary),
      summary: finalResult.summary || { critical: 0, high: 0, medium: 0, low: 0 },
      vulnerabilities: finalResult.vulnerabilities || [],
      recommendations: finalResult.recommendations || [],
      analysisContext,
    };

    onEvent({ type: "progress", progress: 100, phase: "complete", detail: "Audit complete" });
    onEvent({ type: "result", data: result });
    onEvent({ type: "complete" });

  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      onEvent({ type: "error", message: "Audit cancelled" });
    } else {
      onEvent({
        type: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
