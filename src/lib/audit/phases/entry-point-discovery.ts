import type { LLMProvider } from "@/lib/llm/provider";
import type { LLMMessage } from "@/types/llm";
import type { AnalysisContext } from "@/types/audit";
import type { PhasePrompt } from "../prompts/solana-adapter";
import { parseJSON, Phase1ResultSchema } from "../result-parser";
import { withRetry } from "@/lib/llm/provider";
import { renderPromptContext } from "../context-builder";

export interface Phase1Result {
  entryPoints: Array<{
    name: string;
    file: string;
    accessLevel: "public" | "role-restricted" | "contract-only" | "review-required";
    notes?: string;
  }>;
}

export async function runPhase1(
  provider: LLMProvider,
  phasePrompt: PhasePrompt,
  onProgress: (msg: string) => void,
  analysisContext?: AnalysisContext,
  emitWorkflowEvent?: (item: import("@/types/audit").WorkflowEvent) => void
): Promise<Phase1Result> {
  onProgress("Analyzing structured context for entry points...");
  emitWorkflowEvent?.({
    id: `phase-1-start-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 1,
    phaseName: "Entry Point Discovery",
    workflow: "entry-point-discovery",
    title: "Entry point discovery started",
    detail: "Scanning structured context for program entry points",
    inputSummary: analysisContext ? `${analysisContext.files.length} files, ${analysisContext.functions.length} functions` : "structured context unavailable",
    status: "running",
    progress: 0,
  });

  const contextSummary = analysisContext ? renderPromptContext(analysisContext) : "";

  const messages: LLMMessage[] = [
    { role: "system", content: phasePrompt.system },
    {
      role: "user",
      content: `Analyze the structured Solana program context below and identify all state-changing entry points.

For each entry point, classify its access level:
- "public": No access restrictions
- "role-restricted": Requires specific signer/authority (admin, owner, governance, etc.)
- "contract-only": Only callable via CPI
- "review-required": Has some constraints but needs manual review

Output your analysis as JSON matching this schema:
{
  "entryPoints": [
    { "name": "function_name", "file": "file.rs", "accessLevel": "public|role-restricted|contract-only|review-required", "notes": "optional notes" }
  ]
}

Structured context:
${contextSummary || "none"}`,
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
          console.warn(`[Phase1] Retry ${attempt} after ${delay}ms due to: ${error.message}`);
          onProgress(`Retrying... (attempt ${attempt + 1})`);
        },
      }
    );
  } catch (error) {
    console.error("[Phase1] Failed after retries:", error);
    onProgress("LLM call failed, returning empty results");
    return { entryPoints: [] };
  }

  onProgress("Parsing entry point analysis...");
  emitWorkflowEvent?.({
    id: `phase-1-parse-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 1,
    phaseName: "Entry Point Discovery",
    workflow: "entry-point-discovery",
    title: "Parsing entry point analysis",
    detail: "Normalizing entry point classifications",
    status: "running",
    progress: 80,
  });

  const { data, error } = parseJSON(fullResponse, Phase1ResultSchema);
  if (error) {
    console.error("[Phase1] Parse error:", error);
    onProgress("Failed to parse entry points, returning empty results");
    emitWorkflowEvent?.({
      id: `phase-1-fallback-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 1,
      phaseName: "Entry Point Discovery",
      workflow: "entry-point-discovery",
      title: "Entry point parsing failed",
      detail: "Fallback: no entry points returned",
      outputSummary: "No entry points identified after parse failure",
      status: "warning",
      progress: 100,
    });
    return { entryPoints: [] };
  }

  emitWorkflowEvent?.({
    id: `phase-1-complete-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 1,
    phaseName: "Entry Point Discovery",
    workflow: "entry-point-discovery",
    title: "Entry point discovery complete",
    detail: `Detected ${data?.entryPoints.length ?? 0} entry points`,
    outputSummary: `${data?.entryPoints.length ?? 0} entry points classified`,
    status: "done",
    progress: 100,
    metrics: [{ label: "entryPoints", value: data?.entryPoints.length ?? 0 }],
  });

  return data ?? { entryPoints: [] };
}
