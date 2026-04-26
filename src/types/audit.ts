import type { LLMConfig } from "./llm";

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Vulnerability {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  location?: string;
  impact?: string;
  recommendation?: string;
  codeSnippet?: {
    code: string;
    language: string;
    highlightLine: number;
  };
  confidence: number;
  evidence?: CodeSpan[];
  callChain?: string[];
  reviewStatus?: "confirmed" | "needs_review" | "dismissed";
  consensus?: {
    supportingAgents: number;
    totalAgents: number;
    notes?: string;
  };
}

export interface AuditResult {
  programAddress?: string;
  timestamp: string;
  overallScore: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info?: number;
  };
  vulnerabilities: Vulnerability[];
  recommendations: string[];
  analysisContext?: AnalysisContext;
}

export type AuditSourceMode = "files" | "github";

export interface AuditInputSummary {
  sourceMode: AuditSourceMode;
  fileCount: number;
  fileNames: string[];
  githubUrls: string[];
}

export interface AuditRunSnapshot {
  id: string;
  createdAt: string;
  progress: number;
  currentPhase: number | null;
  currentAgent: string | null;
  currentWorkflow: string | null;
  timeline: WorkflowEvent[];
  inputSummary: AuditInputSummary;
  resultId: string | null;
}

export interface AuditMemoryEntry {
  id: string;
  reportId: string;
  createdAt: string;
  title: string;
  summary: string;
  keySignals: string[];
  focusAreas: string[];
  confidence: number;
}

export interface AuditReportRecord {
  id: string;
  createdAt: string;
  sourceMode: AuditSourceMode;
  inputSummary: AuditInputSummary;
  llm: {
    provider: string;
    supplier: string;
    model: string;
    baseURL?: string;
  };
  result: AuditResult;
  timeline: WorkflowEvent[];
  memory: AuditMemoryEntry;
}

export interface SourceFile {
  name: string;
  content: string;
  language?: string;
  size?: number;
}

export interface CodeSpan {
  file: string;
  startLine: number;
  endLine: number;
  snippet: string;
  note?: string;
}

export interface CallGraphEdge {
  from: string;
  to: string;
  kind: "internal" | "cpi" | "external";
  file: string;
  line: number;
  evidence: string;
}

export interface FunctionInsight {
  name: string;
  file: string;
  signature: string;
  line: number;
  complexity: "low" | "medium" | "high";
  visibility: "public" | "private" | "unknown";
  calls: string[];
  stateWrites: boolean;
  externalCalls: boolean;
  signerChecks: boolean;
  ownershipChecks: boolean;
  evidence: CodeSpan[];
  riskSignals: string[];
}

export interface StructuredFileSummary {
  name: string;
  language: string;
  size: number;
  lineCount: number;
  functionCount: number;
  suspiciousFunctionCount: number;
}

export interface TrustBoundaryInsight {
  name: string;
  file: string;
  kind: "account" | "authority" | "cpi" | "pda" | "state" | "external";
  description: string;
  evidence: CodeSpan[];
}

export interface ValidationRule {
  name: string;
  file: string;
  category: "signer" | "ownership" | "pda" | "constraint" | "cpi";
  description: string;
  severity: "hard" | "soft";
  evidence: CodeSpan[];
}

export interface AnalysisContext {
  framework: "anchor" | "native" | "mixed" | "unknown";
  files: StructuredFileSummary[];
  functions: FunctionInsight[];
  callGraph: CallGraphEdge[];
  trustBoundaries: TrustBoundaryInsight[];
  validationRules: ValidationRule[];
  hotspots: Array<{
    name: string;
    file: string;
    reason: string;
    score: number;
  }>;
  entryPointHints: Array<{
    name: string;
    file: string;
    reason: string;
  }>;
}

export type WorkflowEventStatus = "running" | "done" | "waiting" | "info" | "warning" | "error";

export interface WorkflowEventMetric {
  label: string;
  value: string | number;
}

export interface WorkflowEvent {
  id: string;
  timestamp: string;
  phase?: number;
  phaseName?: string;
  agent?: string;
  workflow: string;
  title: string;
  detail: string;
  inputSummary?: string;
  outputSummary?: string;
  status: WorkflowEventStatus;
  progress?: number;
  metrics?: WorkflowEventMetric[];
}

export type AuditState =
  | { status: "idle" }
  | { status: "loading"; progress: number; stage: string; phase?: number; phaseDetail?: string; timeline: WorkflowEvent[]; currentWorkflow?: string; currentAgent?: string; runSnapshot?: AuditRunSnapshot }
  | { status: "results"; data: AuditResult; timeline: WorkflowEvent[]; runSnapshot: AuditRunSnapshot }
  | { status: "error"; message: string };

export type AuditSSEEvent =
  | { type: "run_start"; runSnapshot: AuditRunSnapshot }
  | { type: "phase_start"; phase: number; name: string; description?: string }
  | { type: "phase_progress"; phase: number; message: string }
  | { type: "phase_complete"; phase: number; output: unknown }
  | { type: "workflow_event"; item: WorkflowEvent }
  | { type: "audit_complete"; result: AuditResult }
  | { type: "progress"; progress: number; phase: string; detail: string }
  | { type: "result"; data: AuditResult }
  | { type: "complete" }
  | { type: "error"; message: string };

export interface AuditRequest {
  files?: SourceFile[];
  githubUrls?: string[];
  programAddress?: string;
  llmConfig: LLMConfig;
}
