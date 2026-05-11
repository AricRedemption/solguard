import type { LLMProvider } from "@/lib/llm/provider";
import type { LLMMessage } from "@/types/llm";
import { withRetry } from "@/lib/llm/provider";
import { buildAnalysisContext, renderPromptContext } from "../context-builder";
import type {
  AgentContext,
  AgentProgressCallback,
} from "./types";

const SOLANA_CONTEXT = `You are analyzing a Solana program for security vulnerabilities.

CRITICAL Solana equivalents:
- "contract" → "program" or "module"
- "msg.sender" → "signer" or "authority"
- "external calls" → "CPI (Cross-Program Invocations)"
- "storage" → "account data"
- "modifiers" → "Anchor constraints" or "account validation"
- "reentrancy" → "CPI reentrancy"
- "overflow/underflow" → Rust checked_* or wrapping arithmetic`;

function compact(text: string, limit = 220): string {
  return text.replace(/\s+/g, " ").trim().slice(0, limit);
}

/**
 * Phase 2: Deep Context Building with Sub-Agents
 *
 * The orchestrator identifies complex functions and spawns sub-agents
 * for deep micro-analysis. Results are synthesized back into the global model.
 */
export async function runContextBuildingPhase(
  provider: LLMProvider,
  context: AgentContext,
  onProgress: AgentProgressCallback
): Promise<{
  architecture: string;
  trustBoundaries: string[];
  keyInvariants: string[];
  complexFunctions: Array<{ name: string; file: string; analysis: string }>;
}> {
  onProgress({
    agentId: "orchestrator",
    agentName: "Orchestrator",
    workflow: "context-building",
    title: "Starting context building",
    detail: "Identifying complex functions and deep analysis targets",
    inputSummary: `files=${context.sourceFiles.length}, entryPoints=${context.entryPoints ? context.entryPoints.split("\n").filter(Boolean).length : 0}`,
    progress: 0,
    status: "running",
  });
  const analysisContext = context.analysisContext ?? buildAnalysisContext(context.sourceFiles);

  // Step 1: Orchestrator does initial scan and identifies complex functions
  const scanResult = await runOrchestratorScan(provider, context, analysisContext);
  onProgress({
    agentId: "orchestrator",
    agentName: "Orchestrator",
    workflow: "context-building",
    title: "Candidate functions selected",
    detail: `Identified ${scanResult.complexFunctions.length} complex functions for deep analysis`,
    outputSummary: scanResult.complexFunctions.slice(0, 4).map((fn) => `${fn.file}::${fn.name}`).join(", "),
    progress: 20,
    status: "running",
    metrics: [
      { label: "candidates", value: scanResult.complexFunctions.length },
    ],
  });

  // Step 2: Spawn sub-agents for deep analysis of each complex function
  const functionAnalyses = await Promise.all(
    scanResult.complexFunctions.map((func, idx) =>
      runFunctionAnalyzer(
        provider,
        func,
        context,
        analysisContext,
        (event) => onProgress({
          ...event,
          progress: 20 + (idx * 80 / Math.max(scanResult.complexFunctions.length, 1)),
        })
      )
    )
  );

  onProgress({
    agentId: "orchestrator",
    agentName: "Orchestrator",
    workflow: "context-building",
    title: "Synthesizing analyses",
    detail: "Merging sub-agent evidence into architectural context",
    outputSummary: "Synthesizing architectural context and invariants",
    progress: 90,
    status: "running",
  });

  // Step 3: Synthesize all analyses into global context
  const synthesized = synthesizeContext(scanResult, functionAnalyses);

  onProgress({
    agentId: "orchestrator",
    agentName: "Orchestrator",
    workflow: "context-building",
    title: "Context building complete",
    detail: "Architectural context synthesized successfully",
    outputSummary: `${synthesized.complexFunctions.length} analyzed functions, ${synthesized.keyInvariants.length} invariants`,
    progress: 100,
    status: "done",
  });

  return synthesized;
}

interface ScanResult {
  architecture: string;
  trustBoundaries: string[];
  complexFunctions: Array<{ name: string; file: string; code: string }>;
}

async function runOrchestratorScan(
  provider: LLMProvider,
  context: AgentContext,
  analysisContext: ReturnType<typeof buildAnalysisContext>
): Promise<ScanResult> {
  const contextSummary = renderPromptContext(analysisContext);
  const candidateFunctions = analysisContext.hotspots
    .slice(0, 10)
    .map((hotspot) => {
      const fn = analysisContext.functions.find((candidate) => candidate.name === hotspot.name && candidate.file === hotspot.file);
      return fn ? `- ${fn.file}::${fn.name} [${fn.complexity}] ${hotspot.reason}` : null;
    })
    .filter((value): value is string => Boolean(value))
    .join("\n");

  const messages: LLMMessage[] = [
    { role: "system", content: `${SOLANA_CONTEXT}

You are the ORCHESTRATOR agent. Your job is to:
1. Map the overall architecture of this Solana program
2. Identify trust boundaries
3. Identify which functions need deep sub-agent analysis (complex logic, CPI calls, state changes)

Analyze the code and output JSON:
{
  "architecture": "Brief description of overall architecture",
  "trustBoundaries": ["boundary1", "boundary2"],
  "complexFunctions": [
    { "name": "function_name", "file": "file.rs", "code": "code snippet to analyze" }
  ]
}

Focus on functions that:
- Make CPI calls
- Handle authentication/authorization
- Modify critical state
- Have complex conditional logic

Prefer the candidate functions from the structured context when they are available.` },
    { role: "user", content: `${contextSummary}

Existing entry point hints:
${context.entryPoints || "none"}

Candidate functions:
${candidateFunctions || "none"}` },
  ];

  let fullResponse = "";
  for await (const chunk of provider.callStreaming({ messages, maxTokens: 4096, temperature: 0 })) {
    fullResponse += chunk;
  }

  const jsonMatch = fullResponse.match(/```json\n?([\s\S]*?)```/)?.[1]
    || fullResponse.match(/\{[\s\S]*\}/)?.[0]
    || '{"architecture":"","trustBoundaries":[],"complexFunctions":[]}';

  const parsed = JSON.parse(jsonMatch) as ScanResult;
  if (!parsed.complexFunctions?.length) {
    parsed.complexFunctions = analysisContext.hotspots.slice(0, 6).map((hotspot) => {
      const fn = analysisContext.functions.find((candidate) => candidate.name === hotspot.name && candidate.file === hotspot.file);
      return {
        name: hotspot.name,
        file: hotspot.file,
        code: fn?.evidence[0]?.snippet || hotspot.reason,
      };
    });
  }

  return parsed;
}

async function runFunctionAnalyzer(
  provider: LLMProvider,
  func: { name: string; file: string; code: string },
  context: AgentContext,
  analysisContext: ReturnType<typeof buildAnalysisContext>,
  onProgress: AgentProgressCallback
): Promise<{ name: string; file: string; analysis: string }> {
  const functionInfo = analysisContext.functions.find((candidate) => candidate.name === func.name && candidate.file === func.file);
  onProgress({
    agentId: `analyzer-${func.name}`,
    agentName: "Analyzer",
    workflow: "context-building",
    title: `Analyzing ${func.name}`,
    detail: `Deep micro-analysis for ${func.file}`,
    inputSummary: compact(`${func.file}::${func.name} ${functionInfo?.signature || func.code}`),
    progress: 0,
    status: "running",
    metrics: [{ label: "function", value: func.name }],
  });
  const functionContext = functionInfo
    ? [
        `Signature: ${functionInfo.signature}`,
        `Line: ${functionInfo.line}`,
        `Complexity: ${functionInfo.complexity}`,
        `Visibility: ${functionInfo.visibility}`,
        `Calls: ${functionInfo.calls.join(", ") || "none"}`,
        `State writes: ${functionInfo.stateWrites ? "yes" : "no"}`,
        `External calls: ${functionInfo.externalCalls ? "yes" : "no"}`,
        `Signer checks: ${functionInfo.signerChecks ? "yes" : "no"}`,
        `Ownership checks: ${functionInfo.ownershipChecks ? "yes" : "no"}`,
        `Remaining accounts checks: ${functionInfo.remainingAccountsChecks ? "yes" : "no"}`,
        `Close authority checks: ${functionInfo.closeAuthorityChecks ? "yes" : "no"}`,
        `Risk signals: ${functionInfo.riskSignals.join(", ") || "none"}`,
        `Evidence:\n${functionInfo.evidence.map((span) => `--- ${span.file}:${span.startLine}-${span.endLine} ---\n${span.snippet}`).join("\n\n")}`,
      ].join("\n")
    : func.code;

  const messages: LLMMessage[] = [
    { role: "system", content: `${SOLANA_CONTEXT}

You are a SUB-AGENT performing deep micro-analysis.

For the given function, analyze:
1. Purpose and role in the system
2. Inputs, assumptions, preconditions
3. Outputs, effects (state writes, CPI calls, events)
4. Block-by-block analysis with invariants
5. Cross-function dependencies
6. Risk assessment for external interactions

Apply First Principles and 5 Whys methodology.` },
    { role: "user", content: `Function: ${func.name}
File: ${func.file}

Structured context:
${functionContext}

Context:
- Entry Points: ${context.entryPoints}
- Trust Boundaries: ${context.trustBoundaries.join(", ")}

Output your analysis as a structured report.` },
  ];

  let fullResponse = "";
  for await (const chunk of provider.callStreaming({ messages, maxTokens: 4096, temperature: 0 })) {
    fullResponse += chunk;
  }

  onProgress({
    agentId: `analyzer-${func.name}`,
    agentName: "Analyzer",
    workflow: "context-building",
    title: `Finished ${func.name}`,
    detail: "Deep micro-analysis completed",
    outputSummary: compact(fullResponse, 260),
    progress: 100,
    status: "done",
  });

  return {
    name: func.name,
    file: func.file,
    analysis: fullResponse,
  };
}

function synthesizeContext(
  scanResult: ScanResult,
  analyses: Array<{ name: string; file: string; analysis: string }>
): {
  architecture: string;
  trustBoundaries: string[];
  keyInvariants: string[];
  complexFunctions: Array<{ name: string; file: string; analysis: string }>;
} {
  // Extract key invariants from analyses
  const keyInvariants = analyses
    .flatMap((a) => {
      const match = a.analysis.match(/[Ii]nvariants?[:\s]*([^\n]+(?:\n[^\n]+)*)/);
      return match ? match[1].split("\n").filter(Boolean) : [];
    })
    .slice(0, 10);

  return {
    architecture: scanResult.architecture,
    trustBoundaries: scanResult.trustBoundaries,
    keyInvariants,
    complexFunctions: analyses,
  };
}

/**
 * Phase 4: Variant Analysis with Iterative Generalization
 *
 * For each finding from Phase 3, spawn an agent to iteratively
 * generalize the pattern through abstraction levels.
 */
export async function runVariantAnalysisPhase(
  provider: LLMProvider,
  findings: Array<{
    title: string;
    pattern: string;
    location: string;
    severity: string;
    codeSnippet: string;
  }>,
  context: AgentContext,
  onProgress: AgentProgressCallback
): Promise<{
  confirmed: string[];
  dismissed: string[];
  variants: Array<{
    title: string;
    location: string;
    pattern: string;
    level: number;
    severity: string;
  }>;
  }> {
  const confirmed: string[] = [];
  const dismissed: string[] = [];
  const allVariants: Array<{
    title: string;
    location: string;
    pattern: string;
    level: number;
    severity: string;
  }> = [];

  for (let i = 0; i < findings.length; i++) {
    const finding = findings[i];
    onProgress({
      agentId: "variant-agent",
      agentName: "Variant Analyst",
      workflow: "variant-analysis",
      title: `Analyzing finding ${i + 1}/${findings.length}`,
      detail: finding.title,
      inputSummary: compact(`${finding.location} | ${finding.severity} | ${finding.pattern}`),
      progress: (i * 100) / Math.max(findings.length, 1),
      status: "running",
      metrics: [
        { label: "severity", value: finding.severity },
        { label: "category", value: finding.pattern.slice(0, 24) },
      ],
    });

    const result = await runVariantAnalysis(provider, finding, context);

    if (result.confirmed) {
      confirmed.push(finding.title);
    } else {
      dismissed.push(finding.title);
    }

    allVariants.push(...result.variants);
  }

  onProgress({
    agentId: "variant-agent",
    agentName: "Variant Analyst",
    workflow: "variant-analysis",
    title: "Variant analysis complete",
    detail: `Confirmed ${confirmed.length}, dismissed ${dismissed.length}`,
    outputSummary: `${allVariants.length} variants discovered across ${findings.length} findings`,
    progress: 100,
    status: "done",
    metrics: [
      { label: "confirmed", value: confirmed.length },
      { label: "dismissed", value: dismissed.length },
    ],
  });

  return { confirmed, dismissed, variants: allVariants };
}

interface VariantResult {
  confirmed: boolean;
  variants: Array<{
    title: string;
    location: string;
    pattern: string;
    level: number;
    severity: string;
  }>;
}

async function runVariantAnalysis(
  provider: LLMProvider,
  finding: {
    title: string;
    pattern: string;
    location: string;
    severity: string;
    codeSnippet: string;
  },
  context: AgentContext
): Promise<VariantResult> {
  // keep source code available for the exact-match search agent
  const codeContent = context.sourceFiles
    .map((f) => `=== ${f.name} ===\n${f.content}`)
    .join("\n\n");

  const messages: LLMMessage[] = [
    { role: "system", content: `${SOLANA_CONTEXT}

You are a VARIANT ANALYSIS agent. Your mission is to:
1. CONFIRM or DISMISS the original finding
2. Search for VARIANTS by generalizing through abstraction levels:
   - Level 0: Exact match
   - Level 1: Variable abstraction (rename variables)
   - Level 2: Structural abstraction (generalize control flow)
   - Level 3: Semantic abstraction (same vulnerability class)

For each abstraction level, search the codebase and report matches.

Output JSON:
{
  "confirmed": true/false,
  "variants": [
    { "title": "...", "location": "...", "pattern": "...", "level": 0-3, "severity": "..." }
  ]
}` },
    { role: "user", content: `Original Finding:
- Title: ${finding.title}
- Location: ${finding.location}
- Severity: ${finding.severity}
- Code: ${finding.codeSnippet}

Source code to search:
${codeContent}

Perform iterative variant analysis starting from Level 0 (exact match) through Level 3.` },
  ];

  let fullResponse = "";
  try {
    fullResponse = await withRetry(
      async () => {
        for await (const chunk of provider.callStreaming({ messages, maxTokens: 8192, temperature: 0 })) {
          fullResponse += chunk;
        }
        return fullResponse;
      },
      { maxRetries: 2 }
    );
  } catch {
    return { confirmed: false, variants: [] };
  }

  const jsonMatch = fullResponse.match(/```json\n?([\s\S]*?)```/)?.[1]
    || fullResponse.match(/\{[\s\S]*\}/)?.[0]
    || '{"confirmed":false,"variants":[]}';

  try {
    return JSON.parse(jsonMatch);
  } catch {
    return { confirmed: false, variants: [] };
  }
}
