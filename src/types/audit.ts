export type Severity = "critical" | "high" | "medium" | "low";

export interface Vulnerability {
  id: string;
  title: string;
  severity: Severity;
  description: string;
  codeSnippet: {
    code: string;
    language: string;
    highlightLine: number;
  };
  recommendation: string;
  confidence: number;
}

export interface AuditResult {
  programAddress: string;
  timestamp: string;
  overallScore: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  vulnerabilities: Vulnerability[];
  recommendations: string[];
}

export type AuditState =
  | { status: "idle" }
  | { status: "loading"; progress: number; stage: string }
  | { status: "results"; data: AuditResult }
  | { status: "error"; message: string };
