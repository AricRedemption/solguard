import type { LLMProvider } from "@/lib/llm/provider";
import type { LLMMessage } from "@/types/llm";
import type { AnalysisContext, SourceFile, WorkflowEvent } from "@/types/audit";
import type { PhasePrompt } from "../prompts/solana-adapter";
import type { Phase1Result } from "./entry-point-discovery";
import { parseJSON, Phase2ResultSchema } from "../result-parser";
import { withRetry } from "@/lib/llm/provider";
import { runContextBuildingPhase } from "../agents";
import { renderPromptContext } from "../context-builder";
import type { AgentProgressEvent } from "../agents/types";

export interface Phase2Result {
  architecture: string;
  trustBoundaries: string[];
  stateFlow: string[];
  keyInvariants: string[];
  complexFunctions?: Array<{ name: string; file: string; analysis?: string; code?: string }>;
}

export async function runPhase2(
  provider: LLMProvider,
  sourceFiles: SourceFile[],
  phase1Result: Phase1Result,
  phasePrompt: PhasePrompt,
  onProgress: (msg: string) => void,
  analysisContext?: AnalysisContext,
  emitWorkflowEvent?: (item: WorkflowEvent) => void
): Promise<Phase2Result> {
  onProgress("Building architectural context with multi-agent analysis...");
  emitWorkflowEvent?.({
    id: `phase-2-start-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 2,
    phaseName: "Context Building",
    workflow: "context-building",
    title: "Context building started",
    detail: "Orchestrator is identifying complex functions and trust boundaries",
    inputSummary: `entry points: ${phase1Result.entryPoints.length}`,
    status: "running",
    progress: 0,
  });

  const contextSummary = analysisContext ? renderPromptContext(analysisContext) : "";

  const entryPointsSummary = phase1Result.entryPoints
    .map((ep) => `- ${ep.name} (${ep.accessLevel}) in ${ep.file}`)
    .join("\n");

  const messages: LLMMessage[] = [
    { role: "system", content: phasePrompt.system },
    {
      role: "user",
      content: `Build deep architectural context for this Solana program using multi-agent analysis.

Entry points discovered in Phase 1:
${entryPointsSummary || "No entry points found."}

Structured analysis context:
${contextSummary || "none"}

Workflow:
1. First, identify complex functions that need deep sub-agent analysis
2. Spawn sub-agents to analyze each complex function
3. Synthesize all analyses into architectural context

Output as JSON:
{
  "architecture": "description of the overall architecture",
  "trustBoundaries": ["boundary1", "boundary2"],
  "stateFlow": ["flow1", "flow2"],
  "keyInvariants": ["invariant1", "invariant2"],
  "complexFunctions": [{"name": "func_name", "file": "file.rs", "analysis": "deep analysis"}]
}`,
    },
  ];

  let fullResponse = "";

  try {
    fullResponse = await withRetry(
      async () => {
        let chunkBuffer = "";
        for await (const chunk of provider.callStreaming({ messages, maxTokens: 4096, temperature: 0 })) {
          chunkBuffer += chunk;
        }
        return chunkBuffer;
      },
      {
        maxRetries: 3,
        onRetry: (attempt, error, delay) => {
          console.warn(`[Phase2] Retry ${attempt} after ${delay}ms due to: ${error.message}`);
          onProgress(`Retrying context building... (attempt ${attempt + 1})`);
        },
      }
    );
  } catch (error) {
    console.error("[Phase2] Failed after retries:", error);
    onProgress("LLM call failed, returning empty results");
    return { architecture: "", trustBoundaries: [], stateFlow: [], keyInvariants: [] };
  }

  onProgress("Parsing context analysis...");

  const { data, error } = parseJSON(fullResponse, Phase2ResultSchema);
  if (error) {
    console.error("[Phase2] Parse error:", error);
    onProgress("Failed to parse context, using fallback");
    emitWorkflowEvent?.({
      id: `phase-2-parse-failed-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 2,
      phaseName: "Context Building",
      workflow: "context-building",
      title: "Context parsing failed",
      detail: "Fallback context returned",
      status: "warning",
      progress: 100,
    });
    return { architecture: "", trustBoundaries: [], stateFlow: [], keyInvariants: [] };
  }

  if (!data) {
    emitWorkflowEvent?.({
      id: `phase-2-empty-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 2,
      phaseName: "Context Building",
      workflow: "context-building",
      title: "Context parsing returned empty data",
      detail: "Fallback context returned",
      status: "warning",
      progress: 100,
    });
    return { architecture: "", trustBoundaries: [], stateFlow: [], keyInvariants: [] };
  }

  let finalData = data;

  // If complex functions were identified, run deep sub-agent analysis
  if (data.complexFunctions && data.complexFunctions.length > 0) {
    onProgress(`Running deep analysis on ${data.complexFunctions.length} complex functions...`);

    try {
      const contextForAgents = {
        sourceFiles,
        entryPoints: entryPointsSummary,
        architecture: data.architecture,
        trustBoundaries: data.trustBoundaries,
        keyInvariants: data.keyInvariants,
        analysisContext,
      };

      const deepAnalysis = await runContextBuildingPhase(
        provider,
        contextForAgents,
        (event: AgentProgressEvent) => {
          onProgress(`[${event.agentName}] ${event.detail}`);
          emitWorkflowEvent?.({
            id: `phase-2-${event.agentId}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            phase: event.phase ?? 2,
            phaseName: "Context Building",
            agent: event.agentName,
            workflow: event.workflow,
            title: event.title,
            detail: event.detail,
            inputSummary: event.inputSummary,
            outputSummary: event.outputSummary,
            status: event.status,
            progress: event.progress,
            metrics: event.metrics,
          });
        }
      );

      // Merge deep analysis results
      finalData = {
        ...data,
        keyInvariants: deepAnalysis.keyInvariants.length > 0 ? deepAnalysis.keyInvariants : data.keyInvariants,
        complexFunctions: deepAnalysis.complexFunctions,
      };
    } catch (error) {
      console.error("[Phase2] Sub-agent analysis failed:", error);
      emitWorkflowEvent?.({
        id: `phase-2-subagent-failed-${Date.now()}`,
        timestamp: new Date().toISOString(),
        phase: 2,
        phaseName: "Context Building",
        workflow: "context-building",
        title: "Sub-agent analysis failed",
        detail: "Continuing with base architectural context",
        status: "warning",
        progress: 90,
      });
      // Continue with basic analysis even if sub-agents fail
    }
  }

  emitWorkflowEvent?.({
    id: `phase-2-complete-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 2,
    phaseName: "Context Building",
    workflow: "context-building",
    title: "Context building complete",
    detail: "Architectural context ready for downstream phases",
    outputSummary: `${finalData.complexFunctions?.length ?? 0} complex functions, ${finalData.keyInvariants.length} invariants`,
    status: "done",
    progress: 100,
  });

  return finalData;
}
