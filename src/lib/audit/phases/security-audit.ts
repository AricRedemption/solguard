import type { LLMProvider } from "@/lib/llm/provider";
import type { AnalysisContext, WorkflowEvent } from "@/types/audit";
import type { PhasePrompt } from "../prompts/solana-adapter";
import type { Phase1Result } from "./entry-point-discovery";
import type { Phase2Result } from "./context-building";
import { withRetry } from "@/lib/llm/provider";
import { parseJSON, Phase3ResultSchema } from "../result-parser";
import { renderPromptContext } from "../context-builder";

export interface Phase3Result {
  findings: Array<{
    title: string;
    severity: "critical" | "high" | "medium" | "low";
    description: string;
    location: string;
    codeSnippet: string;
    recommendation: string;
    confidence: number;
    category?: string;
  }>;
  agentResults?: Array<{
    agentId: string;
    agentName: string;
    category: string;
    findings: number;
    duration: number;
  }>;
}

/**
 * Phase 3: Security Audit
 *
 * Uses the deep context from Phase 2 to perform comprehensive vulnerability analysis.
 * The orchestrator agent coordinates specialized analysis based on the vulnerability taxonomy.
 */
export async function runPhase3(
  provider: LLMProvider,
  phase1Result: Phase1Result,
  phase2Result: Phase2Result,
  phasePrompt: PhasePrompt,
  onProgress: (msg: string) => void,
  analysisContext?: AnalysisContext,
  emitWorkflowEvent?: (item: WorkflowEvent) => void
): Promise<Phase3Result> {
  onProgress("Starting security audit with orchestrator...");
  emitWorkflowEvent?.({
    id: `phase-3-start-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 3,
    phaseName: "Security Audit",
    workflow: "security-audit",
    title: "Security audit started",
    detail: "Scanning for Solana-specific vulnerabilities",
    inputSummary: `${phase1Result.entryPoints.length} entry points, ${phase2Result.complexFunctions?.length ?? 0} complex functions`,
    status: "running",
    progress: 0,
  });

  const contextSummary = analysisContext ? renderPromptContext(analysisContext) : "";

  const entryPointsSummary = phase1Result.entryPoints
    .map((ep) => `- ${ep.name} (${ep.accessLevel}) in ${ep.file}`)
    .join("\n");

  // Use orchestrator-led approach for comprehensive analysis
  const messages: import("@/types/llm").LLMMessage[] = [
    { role: "system", content: `${phasePrompt.system}

You are the SECURITY AUDIT ORCHESTRATOR for a Solana program. Your job:
1. Analyze the code systematically using the Solana vulnerability taxonomy
2. For CRITICAL vulnerabilities, check: Arbitrary CPI, Improper PDA Validation, Missing Signer Check, Account Substitution/Type Confusion
3. For HIGH vulnerabilities, check: Missing Ownership Check, Anchor Constraint Bypass, Remaining Accounts Abuse, Close Account Resurrection, Sysvar Spoofing, Token-2022 Extension Risks
4. For MEDIUM vulnerabilities, check: Rent-Exempt Violation, Compute Budget DoS, Instruction Introspection
5. For LOW, note code quality and best practices

Solana-specific audit methodology:
- Every instruction handler: verify all accounts are validated before use
- Every CPI call: verify target program ID is hardcoded
- Every PDA: verify seeds + bump against stored value
- Every signer: verify is_signer / Signer<'info> is enforced
- Every account: verify owner matches expected program
- Every state mutation: follows Validate Accounts → Update State → CPI pattern
- Remaining accounts: each must be validated before use
- Close operations: must clear discriminator to prevent resurrection` },
    { role: "user", content: `Perform comprehensive security audit.

Entry points:
${entryPointsSummary || "None found"}

Architecture context:
${phase2Result.architecture || "Not available"}

Trust boundaries: ${phase2Result.trustBoundaries.join(", ") || "None identified"}
Key invariants: ${phase2Result.keyInvariants.join(", ") || "None identified"}
Complex function analyses:
${(phase2Result.complexFunctions || []).map(f => `- ${f.name} (${f.file}): ${(f.analysis || "").slice(0, 200)}...`).join("\n")}

Structured analysis context:
${contextSummary || "none"}

Output as JSON:
{
  "findings": [
    { "title": "...", "severity": "critical|high|medium|low", "description": "...", "location": "file.rs:L42", "codeSnippet": "...", "recommendation": "...", "confidence": 95, "category": "access-control" }
  ]
}

If no vulnerabilities found, return: { "findings": [] }` },
  ];

  let fullResponse = "";

  try {
    fullResponse = await withRetry(
      async () => {
        let chunkBuffer = "";
        for await (const chunk of provider.callStreaming({ messages, maxTokens: 8192, temperature: 0 })) {
          chunkBuffer += chunk;
        }
        return chunkBuffer;
      },
      {
        maxRetries: 3,
        onRetry: (attempt, error, delay) => {
          console.warn(`[Phase3] Retry ${attempt} after ${delay}ms due to: ${error.message}`);
          onProgress(`Retrying audit... (attempt ${attempt + 1})`);
        },
      }
    );
  } catch (error) {
    console.error("[Phase3] Failed after retries:", error);
    onProgress("LLM call failed, returning empty results");
    return { findings: [] };
  }

  onProgress("Parsing vulnerability findings...");
    emitWorkflowEvent?.({
      id: `phase-3-parse-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 3,
      phaseName: "Security Audit",
      workflow: "security-audit",
      title: "Parsing vulnerability findings",
      detail: "Normalizing findings and evidence",
      outputSummary: "Parsing structured findings into normalized vulnerabilities",
      status: "running",
      progress: 80,
    });

  const { data, error } = parseJSON(fullResponse, Phase3ResultSchema);
  if (error) {
    console.error("[Phase3] Parse error:", error);
    onProgress("Failed to parse findings, returning empty results");
    emitWorkflowEvent?.({
      id: `phase-3-fallback-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 3,
      phaseName: "Security Audit",
      workflow: "security-audit",
      title: "Security audit fallback",
      detail: "No findings returned after parse failure",
      outputSummary: "No findings after parse failure",
      status: "warning",
      progress: 100,
    });
    return { findings: [] };
  }

  const findings = data?.findings || [];
  onProgress(`Found ${findings.length} potential vulnerabilities`);
  emitWorkflowEvent?.({
    id: `phase-3-complete-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 3,
    phaseName: "Security Audit",
    workflow: "security-audit",
    title: "Security audit complete",
    detail: `Found ${findings.length} potential vulnerabilities`,
    outputSummary: `${findings.length} vulnerabilities detected`,
    status: "done",
    progress: 100,
    metrics: [{ label: "findings", value: findings.length }],
  });

  return { findings };
}
