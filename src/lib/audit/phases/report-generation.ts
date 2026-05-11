import type { LLMProvider } from "@/lib/llm/provider";
import type { LLMMessage } from "@/types/llm";
import type { PhasePrompt } from "../prompts/solana-adapter";
import type { Phase3Result } from "./security-audit";
import type { Phase4Result } from "./variant-analysis";
import type { AnalysisContext, AuditResult, WorkflowEvent } from "@/types/audit";
import { parseJSON, AuditResultSchema } from "../result-parser";
import { withRetry } from "@/lib/llm/provider";
import { renderPromptContext } from "../context-builder";
import { normalizeEvidence } from "../evidence";

export async function runPhase5(
  provider: LLMProvider,
  phase3Result: Phase3Result,
  phase4Result: Phase4Result,
  programAddress: string,
  phasePrompt: PhasePrompt,
  onProgress: (msg: string) => void,
  analysisContext?: AnalysisContext,
  emitWorkflowEvent?: (item: WorkflowEvent) => void
): Promise<AuditResult> {
  onProgress("Generating audit report...");
  emitWorkflowEvent?.({
    id: `phase-5-start-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 5,
    phaseName: "Report Generation",
    workflow: "report-generation",
    title: "Report generation started",
    detail: "Synthesizing findings into the final audit report",
    inputSummary: `${phase3Result.findings.length} phase-3 findings + ${phase4Result.variants.length} variants`,
    status: "running",
    progress: 0,
  });

  const allFindings = [...phase3Result.findings, ...phase4Result.variants];

  const findingsJson = JSON.stringify(allFindings, null, 2);
  const contextSummary = analysisContext ? renderPromptContext(analysisContext) : "";

  const messages: LLMMessage[] = [
    { role: "system", content: phasePrompt.system },
    {
      role: "user",
      content: `Generate a structured audit report from these findings.

Program address: ${programAddress || "unknown"}
Total findings: ${allFindings.length}

Findings:
${findingsJson}

Structured analysis context:
${contextSummary || "none"}

Generate a complete audit report as JSON:
{
  "overallScore": 0-100,
  "summary": { "critical": N, "high": N, "medium": N, "low": N },
  "vulnerabilities": [
    {
      "id": "vuln-001",
      "title": "...",
      "severity": "critical|high|medium|low",
      "description": "...",
      "codeSnippet": { "code": "...", "language": "rust", "highlightLine": N },
      "recommendation": "...",
      "confidence": 0-100
    }
  ],
  "recommendations": ["top recommendation 1", "top recommendation 2", "top recommendation 3"]
}

Scoring guide:
- 90-100: No critical/high findings, all medium/low have clear fixes
- 70-89: Some high findings but no critical
- 50-69: Critical findings present but limited
- 0-49: Multiple critical findings with systemic issues`,
    },
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
          console.warn(`[Phase5] Retry ${attempt} after ${delay}ms due to: ${error.message}`);
          onProgress(`Retrying... (attempt ${attempt + 1})`);
        },
      }
    );
  } catch (error) {
    console.error("[Phase5] Failed after retries:", error);
    onProgress("LLM call failed, building fallback report");
    return buildFallbackResult(programAddress, allFindings);
  }

  onProgress("Parsing audit report...");
    emitWorkflowEvent?.({
      id: `phase-5-parse-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 5,
      phaseName: "Report Generation",
      workflow: "report-generation",
      title: "Parsing audit report",
      detail: "Normalizing final vulnerability report",
      outputSummary: "Parsing report payload into normalized vulnerabilities",
      status: "running",
      progress: 80,
    });

  const { data: parsed, error: parseError } = parseJSON(fullResponse, AuditResultSchema);

  if (parseError) {
    console.error("[Phase5] Parse error:", parseError);
    onProgress("Failed to parse report, building fallback");
    emitWorkflowEvent?.({
      id: `phase-5-fallback-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 5,
      phaseName: "Report Generation",
      workflow: "report-generation",
      title: "Report parsing failed",
      detail: "Fallback report built from validated findings",
      outputSummary: "Fallback report generated from validated findings",
      status: "warning",
      progress: 100,
    });
    return buildFallbackResult(programAddress, allFindings);
  }

  if (!parsed) {
    console.warn("[Phase5] No parsed data, building fallback");
    emitWorkflowEvent?.({
      id: `phase-5-empty-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 5,
      phaseName: "Report Generation",
      workflow: "report-generation",
      title: "Report parsing returned empty data",
      detail: "Fallback report built from validated findings",
      outputSummary: "Fallback report generated from validated findings",
      status: "warning",
      progress: 100,
    });
    return buildFallbackResult(programAddress, allFindings);
  }

  const normalized: AuditResult = {
    programAddress,
    timestamp: new Date().toISOString(),
    overallScore: parsed.overallScore ?? 75,
    summary: {
      critical: parsed.summary?.critical ?? 0,
      high: parsed.summary?.high ?? 0,
      medium: parsed.summary?.medium ?? 0,
      low: parsed.summary?.low ?? 0,
      info: parsed.summary?.info ?? 0,
    },
    vulnerabilities: (parsed.vulnerabilities ?? []).map((v, i) => ({
      id: v.id ?? `vuln-${String(i + 1).padStart(3, "0")}`,
      title: v.title,
      severity: v.severity,
      description: v.description,
      location: v.location,
      impact: v.impact,
      recommendation: v.recommendation,
      confidence: v.confidence ?? 0.8,
      evidence: normalizeEvidence(v),
      callChain: v.callChain,
      reviewStatus: v.reviewStatus,
      consensus: v.consensus,
      codeSnippet: typeof v.codeSnippet === "string"
        ? { code: v.codeSnippet, language: "rust", highlightLine: 1 }
        : v.codeSnippet,
    })),
    recommendations: parsed.recommendations ?? [],
  };
  emitWorkflowEvent?.({
    id: `phase-5-complete-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 5,
    phaseName: "Report Generation",
    workflow: "report-generation",
    title: "Report generation complete",
    detail: `Final report ready with ${normalized.vulnerabilities.length} vulnerabilities`,
    outputSummary: `${normalized.vulnerabilities.length} vulnerabilities and ${normalized.recommendations.length} recommendations`,
    status: "done",
    progress: 100,
    metrics: [{ label: "vulnerabilities", value: normalized.vulnerabilities.length }],
  });
  return normalized;
}

function buildFallbackResult(programAddress: string, allFindings: Phase3Result["findings"]): AuditResult {
  const summary = { critical: 0, high: 0, medium: 0, low: 0 };
  allFindings.forEach((f) => {
    summary[f.severity as keyof typeof summary]++;
  });

  return {
    programAddress,
    timestamp: new Date().toISOString(),
    overallScore: Math.max(0, 100 - summary.critical * 20 - summary.high * 10 - summary.medium * 5 - summary.low * 2),
    summary,
    vulnerabilities: allFindings.map((f, i) => ({
      id: `vuln-${String(i + 1).padStart(3, "0")}`,
      title: f.title,
      severity: f.severity,
      description: f.description,
      location: f.location,
      codeSnippet: {
        code: f.codeSnippet,
        language: "rust",
        highlightLine: 1,
      },
      recommendation: f.recommendation,
      confidence: f.confidence,
      evidence: normalizeEvidence({
        location: f.location,
        codeSnippet: {
          code: f.codeSnippet,
          language: "rust",
          highlightLine: 1,
        },
      }),
    })),
    recommendations: allFindings.slice(0, 3).map((f) => f.recommendation),
  };
}
