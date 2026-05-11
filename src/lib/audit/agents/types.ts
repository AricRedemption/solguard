import type { AnalysisContext, SourceFile } from "@/types/audit";

export type AgentRole =
  | "orchestrator"    // Coordinates workflow
  | "analyzer"        // Deep function analysis
  | "specialist"      // Specific vulnerability categories
  | "synthesizer";    // Aggregates results

export interface AgentMessage {
  id: string;
  from: string;
  to: string | "broadcast";
  type: "task" | "result" | "error" | "progress";
  payload: unknown;
  timestamp: number;
}

export interface AgentTask {
  id: string;
  type: "analyze_function" | "check_pattern" | "generalize" | "confirm";
  priority: number;
  data: unknown;
  result?: unknown;
  status: "pending" | "running" | "completed" | "failed";
}

export interface FunctionAnalysisTask {
  functionName: string;
  file: string;
  code: string;
  complexity: "high" | "medium" | "low";
}

export interface VariantAnalysisTask {
  originalFinding: {
    title: string;
    pattern: string;
    location: string;
    severity: string;
  };
  abstractionLevel: 0 | 1 | 2 | 3;
  results: Array<{
    location: string;
    matchQuality: "exact" | "similar" | "heuristic";
    confirmed: boolean;
  }>;
}

export interface AgentContext {
  sourceFiles: SourceFile[];
  entryPoints: string;
  architecture: string;
  trustBoundaries: string[];
  keyInvariants: string[];
  analysisContext?: AnalysisContext;
}

export interface AgentProgressEvent {
  agentId: string;
  agentName: string;
  workflow: string;
  title: string;
  detail: string;
  inputSummary?: string;
  outputSummary?: string;
  progress: number;
  status: "running" | "done" | "waiting" | "info" | "warning" | "error";
  phase?: number;
  metrics?: Array<{ label: string; value: string | number }>;
}

export type AgentProgressCallback = (event: AgentProgressEvent) => void;
