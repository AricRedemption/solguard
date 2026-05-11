import type { LLMProvider } from "@/lib/llm/provider";
import type { LLMMessage } from "@/types/llm";
import type { AnalysisContext, SourceFile, WorkflowEvent } from "@/types/audit";
import type { PhasePrompt } from "../prompts/solana-adapter";
import type { Phase3Result } from "./security-audit";
import { Phase4ResultSchema } from "../result-parser";
import { withRetry } from "@/lib/llm/provider";
import { renderAnalysisContext } from "../context-builder";

export interface Phase4Result {
  variants: Phase3Result["findings"];
  confirmedOriginal: string[];
  dismissedOriginal: string[];
}

/**
 * Phase 4: Variant Analysis
 *
 * For each finding from Phase 3, performs iterative variant analysis
 * using the abstraction ladder methodology:
 * - Level 0: Exact match
 * - Level 1: Variable abstraction
 * - Level 2: Structural abstraction
 * - Level 3: Semantic abstraction
 *
 * Each finding spawns an analysis agent that confirms/dismisses and finds variants.
 */
export async function runPhase4(
  provider: LLMProvider,
  sourceFiles: SourceFile[],
  phase3Result: Phase3Result,
  phasePrompt: PhasePrompt,
  onProgress: (msg: string) => void,
  analysisContext?: AnalysisContext,
  emitWorkflowEvent?: (item: WorkflowEvent) => void
): Promise<Phase4Result> {
  if (phase3Result.findings.length === 0) {
    onProgress("No findings to analyze, skipping variant analysis");
    emitWorkflowEvent?.({
      id: `phase-4-skip-${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase: 4,
      phaseName: "Variant Analysis",
      workflow: "variant-analysis",
      title: "Variant analysis skipped",
      detail: "No findings were available for generalization",
      outputSummary: "Variant analysis skipped because no findings were available",
      status: "waiting",
      progress: 100,
    });
    return { variants: [], confirmedOriginal: [], dismissedOriginal: [] };
  }

  onProgress(`Starting variant analysis for ${phase3Result.findings.length} findings...`);
  emitWorkflowEvent?.({
    id: `phase-4-start-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 4,
    phaseName: "Variant Analysis",
    workflow: "variant-analysis",
    title: "Variant analysis started",
    detail: `Generalizing ${phase3Result.findings.length} findings`,
    inputSummary: `${phase3Result.findings.length} findings queued for abstraction ladder analysis`,
    status: "running",
    progress: 0,
  });

  const codeContent = sourceFiles
    .map((f) => `=== ${f.name} ===\n${f.content}`)
    .join("\n\n");

  // Group findings by category for efficient analysis
  const findingsByCategory = phase3Result.findings.reduce((acc, f) => {
    const cat = f.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {} as Record<string, typeof phase3Result.findings>);

  const allConfirmed: string[] = [];
  const allDismissed: string[] = [];
  const allVariants: Phase3Result["findings"] = [];

  // Process each category with iterative variant analysis
  let findingIndex = 0;
  for (const [category, findings] of Object.entries(findingsByCategory)) {
    onProgress(`Analyzing ${findings.length} ${category} findings...`);

    for (const finding of findings) {
      findingIndex++;
      onProgress(`[${findingIndex}/${phase3Result.findings.length}] Analyzing: ${finding.title}`);
      emitWorkflowEvent?.({
        id: `phase-4-finding-${findingIndex}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        phase: 4,
        phaseName: "Variant Analysis",
        agent: "Variant Analyst",
        workflow: "variant-analysis",
        title: `Analyzing finding ${findingIndex}/${phase3Result.findings.length}`,
        detail: finding.title,
        inputSummary: `${finding.location} · ${finding.severity} · ${finding.category || category}`,
        status: "running",
        progress: (findingIndex - 1) * 100 / Math.max(phase3Result.findings.length, 1),
        metrics: [
          { label: "severity", value: finding.severity },
          { label: "category", value: finding.category || category },
        ],
      });

      const result = await analyzeFindingWithVariants(
        provider,
        finding,
        codeContent,
        phasePrompt,
        category,
        analysisContext
      );

      if (result.confirmed) {
        allConfirmed.push(finding.title);
      } else {
        allDismissed.push(finding.title);
      }

      // Add confirmed variants
      for (const variant of result.variants) {
        const severity = (variant.severity || finding.severity) as "critical" | "high" | "medium" | "low";
        allVariants.push({
          title: variant.title,
          severity,
          description: `Variant of "${finding.title}": ${variant.description}`,
          location: variant.location,
          codeSnippet: variant.codeSnippet || finding.codeSnippet,
          recommendation: finding.recommendation,
          confidence: (variant.confidence || 0.8) * 0.9,
          category: finding.category,
        });
      }
    }
  }

  onProgress(
    `Variant analysis complete: ${allConfirmed.length} confirmed, ${allDismissed.length} dismissed, ${allVariants.length} new variants found`
  );
  emitWorkflowEvent?.({
    id: `phase-4-complete-${Date.now()}`,
    timestamp: new Date().toISOString(),
    phase: 4,
    phaseName: "Variant Analysis",
    workflow: "variant-analysis",
    title: "Variant analysis complete",
    detail: `Confirmed ${allConfirmed.length}, dismissed ${allDismissed.length}, variants ${allVariants.length}`,
    outputSummary: `${allConfirmed.length} confirmed, ${allDismissed.length} dismissed, ${allVariants.length} variants`,
    status: "done",
    progress: 100,
    metrics: [
      { label: "confirmed", value: allConfirmed.length },
      { label: "dismissed", value: allDismissed.length },
      { label: "variants", value: allVariants.length },
    ],
  });

  return {
    variants: allVariants,
    confirmedOriginal: allConfirmed,
    dismissedOriginal: allDismissed,
  };
}

interface VariantResult {
  confirmed: boolean;
  variants: Array<{
    title: string;
    description: string;
    location: string;
    codeSnippet: string;
    severity: string;
    confidence: number;
  }>;
}

async function analyzeFindingWithVariants(
  provider: LLMProvider,
  finding: {
    title: string;
    description: string;
    location: string;
    severity: string;
    codeSnippet: string;
    category?: string;
  },
  codeContent: string,
  phasePrompt: PhasePrompt,
  category: string,
  analysisContext?: AnalysisContext
): Promise<VariantResult> {
  const contextSummary = analysisContext ? renderAnalysisContext(analysisContext) : "";

  const messages: LLMMessage[] = [
    { role: "system", content: `${phasePrompt.system}

You are a VARIANT ANALYSIS AGENT. Your mission:
1. CONFIRM or DISMISS the original finding
2. Find VARIANTS using iterative abstraction ladder:
   - Level 0: Exact match of the vulnerable pattern
   - Level 1: Same pattern, different variable names
   - Level 2: Similar control flow, different implementation
   - Level 3: Same vulnerability class, different manifestation

For each level, search the code and report matches. Stop when false positive rate is too high.` },
    { role: "user", content: `Original Finding to Analyze:
- Title: ${finding.title}
- Category: ${category}
- Severity: ${finding.severity}
- Location: ${finding.location}
- Description: ${finding.description}
- Code Snippet: ${finding.codeSnippet}

Search for variants at each abstraction level.

Source code to search:
${codeContent}

Structured analysis context:
${contextSummary || "none"}

Output as JSON:
{
  "confirmed": true/false,
  "variants": [
    { "title": "variant title", "description": "how it differs", "location": "file:line", "codeSnippet": "variant code", "severity": "high", "confidence": 0.85 }
  ]
}` },
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
        maxRetries: 2,
        onRetry: (attempt, error) => {
          console.warn(`[Variant-${finding.title}] Retry ${attempt}: ${error.message}`);
        },
      }
    );
  } catch (error) {
    console.error(`[Variant-${finding.title}] Failed after retries:`, error);
    // Assume confirmed if we can't analyze variants
    return { confirmed: true, variants: [] };
  }

  const jsonMatch = fullResponse.match(/```json\n?([\s\S]*?)```/)?.[1]
    || fullResponse.match(/\{[\s\S]*\}/)?.[0]
    || '{"confirmed":true,"variants":[]}';

  try {
    const parsed = JSON.parse(jsonMatch);
    // Validate with schema
    const { success } = Phase4ResultSchema.safeParse({
      variants: parsed.variants || [],
      confirmedOriginal: parsed.confirmed ? [finding.title] : [],
      dismissedOriginal: parsed.confirmed ? [] : [finding.title],
    });

    if (success && parsed.variants) {
      return {
        confirmed: parsed.confirmed ?? true,
        variants: parsed.variants.map((v: {
          title?: string;
          description?: string;
          location?: string;
          codeSnippet?: string;
          severity?: string;
          confidence?: number;
        }) => ({
          title: v.title || `Variant of ${finding.title}`,
          description: v.description || "",
          location: v.location || "",
          codeSnippet: v.codeSnippet || "",
          severity: v.severity || finding.severity,
          confidence: v.confidence || 0.8,
        })),
      };
    }
  } catch (e) {
    console.error("[Variant] Parse error:", e);
  }

  // Default: assume finding is confirmed if parsing fails
  return { confirmed: true, variants: [] };
}
