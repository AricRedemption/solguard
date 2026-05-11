import { z } from "zod";

const ConsensusSchema = z.object({
  supportingAgents: z.number(),
  totalAgents: z.number(),
  notes: z.string().optional(),
});

const CodeSpanSchema = z.object({
  file: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  snippet: z.string(),
  note: z.string().optional(),
});

const TrustBoundarySchema = z.object({
  name: z.string(),
  file: z.string(),
  kind: z.enum(["account", "authority", "cpi", "pda", "state", "external"]),
  description: z.string(),
  evidence: z.array(CodeSpanSchema),
});

const ValidationRuleSchema = z.object({
  name: z.string(),
  file: z.string(),
  category: z.enum([
    "signer",
    "ownership",
    "pda",
    "constraint",
    "cpi",
    "remaining_accounts",
    "close_authority",
  ]),
  description: z.string(),
  severity: z.enum(["hard", "soft"]),
  evidence: z.array(CodeSpanSchema),
});

const FileSummarySchema = z.object({
  name: z.string(),
  language: z.string(),
  size: z.number(),
  lineCount: z.number(),
  functionCount: z.number(),
  suspiciousFunctionCount: z.number(),
});

const FunctionInsightSchema = z.object({
  name: z.string(),
  file: z.string(),
  signature: z.string(),
  line: z.number(),
  complexity: z.enum(["low", "medium", "high"]),
  visibility: z.enum(["public", "private", "unknown"]),
  calls: z.array(z.string()),
  stateWrites: z.boolean(),
  externalCalls: z.boolean(),
  signerChecks: z.boolean(),
  ownershipChecks: z.boolean(),
  remainingAccountsChecks: z.boolean(),
  closeAuthorityChecks: z.boolean(),
  evidence: z.array(CodeSpanSchema),
  riskSignals: z.array(z.string()),
});

const CallGraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  kind: z.enum(["internal", "cpi", "external"]),
  file: z.string(),
  line: z.number(),
  evidence: z.string(),
});

const HotspotSchema = z.object({
  name: z.string(),
  file: z.string(),
  reason: z.string(),
  score: z.number(),
});

const EntryPointHintSchema = z.object({
  name: z.string(),
  file: z.string(),
  reason: z.string(),
});

const AnalysisContextSchema = z.object({
  framework: z.enum(["anchor", "native", "mixed", "unknown"]),
  files: z.array(FileSummarySchema),
  functions: z.array(FunctionInsightSchema),
  callGraph: z.array(CallGraphEdgeSchema),
  trustBoundaries: z.array(TrustBoundarySchema),
  validationRules: z.array(ValidationRuleSchema),
  hotspots: z.array(HotspotSchema),
  entryPointHints: z.array(EntryPointHintSchema),
});

export const VulnerabilitySchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  description: z.string(),
  location: z.string().optional(),
  impact: z.string().optional(),
  recommendation: z.string().optional(),
  codeSnippet: z.union([z.string(), z.object({
    code: z.string(),
    language: z.string(),
    highlightLine: z.number(),
  })]).optional(),
  confidence: z.number().default(0.8),
  evidence: z.array(CodeSpanSchema).optional(),
  callChain: z.array(z.string()).optional(),
  reviewStatus: z.enum(["confirmed", "needs_review", "dismissed"]).optional(),
  consensus: ConsensusSchema.optional(),
});

export const EntryPointSchema = z.object({
  name: z.string(),
  file: z.string(),
  accessLevel: z.enum(["public", "role-restricted", "contract-only", "review-required"]),
  notes: z.string().optional(),
});

export const Phase1ResultSchema = z.object({
  entryPoints: z.array(EntryPointSchema),
});

export const Phase3FindingSchema = z.object({
  title: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  description: z.string(),
  location: z.string(),
  codeSnippet: z.string(),
  recommendation: z.string(),
  confidence: z.number(),
  category: z.string().optional(),
});

export const Phase3ResultSchema = z.object({
  findings: z.array(Phase3FindingSchema),
});

export const Phase2ResultSchema = z.object({
  architecture: z.string(),
  trustBoundaries: z.array(z.string()),
  stateFlow: z.array(z.string()),
  keyInvariants: z.array(z.string()),
  complexFunctions: z.array(z.object({
    name: z.string(),
    file: z.string(),
    analysis: z.string().optional(),
  })).optional(),
});

export const Phase4ResultSchema = z.object({
  variants: z.array(z.object({
    title: z.string(),
    severity: z.enum(["critical", "high", "medium", "low"]),
    description: z.string(),
    location: z.string(),
    codeSnippet: z.string(),
    recommendation: z.string(),
    confidence: z.number(),
    category: z.string().optional(),
  })),
  confirmedOriginal: z.array(z.string()),
  dismissedOriginal: z.array(z.string()),
});

export const AuditResultSchema = z.object({
  timestamp: z.string().optional(),
  programAddress: z.string().optional(),
  overallScore: z.number().default(75),
  summary: z.object({
    critical: z.number().default(0),
    high: z.number().default(0),
    medium: z.number().default(0),
    low: z.number().default(0),
    info: z.number().default(0),
  }).default(() => ({ critical: 0, high: 0, medium: 0, low: 0, info: 0 })),
  vulnerabilities: z.array(VulnerabilitySchema).default([]),
  recommendations: z.array(z.string()).default([]),
  analysisContext: AnalysisContextSchema.optional(),
  phase: z.string().optional(),
  details: z.string().optional(),
});

export type ParsedVulnerability = z.infer<typeof VulnerabilitySchema>;
export type ParsedAuditResult = z.infer<typeof AuditResultSchema>;

export function parseJSON<T>(text: string, schema: z.ZodType<T>): { data: T | null; error: string | null } {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;

    const cleaned = jsonStr.trim();
    const parsed = JSON.parse(cleaned);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return { data: result.data, error: null };
    } else {
      return { data: null, error: result.error.message };
    }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed to parse JSON" };
  }
}

export function extractJSON(text: string): string | null {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  const braceStart = text.indexOf("{");
  if (braceStart !== -1) {
    let depth = 0;
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      if (depth === 0) {
        return text.slice(braceStart, i + 1);
      }
    }
  }

  return null;
}
