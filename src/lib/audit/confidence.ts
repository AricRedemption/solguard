import type { AnalysisContext } from "@/types/audit";

export type ConfidenceBucket = "strong" | "supported" | "thin";

export interface ConfidenceProfile {
  averageConfidencePercent: number;
  evidenceSpans: number;
  consensusCount: number;
  structuralSignals: number;
  bucket: ConfidenceBucket;
  thinSurface: boolean;
  missingSignals: string[];
}

type ConfidenceEvidenceSpan = {
  readonly file: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly snippet: string;
  readonly note?: string;
};

type ConfidenceVulnerability = {
  readonly confidence?: number;
  readonly evidence?: readonly ConfidenceEvidenceSpan[];
  readonly consensus?: {
    readonly supportingAgents: number;
    readonly totalAgents: number;
    readonly notes?: string;
  };
};

type ConfidenceAnalysisContext = {
  framework: AnalysisContext["framework"];
  readonly files: readonly AnalysisContext["files"][number][];
  readonly functions: readonly AnalysisContext["functions"][number][];
  readonly callGraph: readonly AnalysisContext["callGraph"][number][];
  readonly trustBoundaries: readonly AnalysisContext["trustBoundaries"][number][];
  readonly validationRules: readonly AnalysisContext["validationRules"][number][];
  readonly hotspots: readonly AnalysisContext["hotspots"][number][];
  readonly entryPointHints: readonly AnalysisContext["entryPointHints"][number][];
};

type ConfidenceResult = {
  readonly vulnerabilities?: readonly ConfidenceVulnerability[];
};

function countEvidenceSpans(result?: ConfidenceResult): number {
  return result?.vulnerabilities?.reduce((sum, vuln) => sum + (vuln.evidence?.length ?? 0), 0) ?? 0;
}

function countConsensusFindings(result?: ConfidenceResult): number {
  return result?.vulnerabilities?.filter((vuln) => Boolean(vuln.consensus)).length ?? 0;
}

function computeAverageConfidencePercent(result?: ConfidenceResult): number {
  const vulnerabilities = result?.vulnerabilities ?? [];
  if (vulnerabilities.length === 0) {
    return 0;
  }

  return Math.round(
    (vulnerabilities.reduce((sum, vuln) => sum + (vuln.confidence || 0), 0) / vulnerabilities.length) * 100
  );
}

function hasAnyValidationRule(
  analysisContext: ConfidenceAnalysisContext,
  categories: Array<"signer" | "ownership" | "pda" | "cpi" | "constraint" | "remaining_accounts" | "close_authority">
): boolean {
  return analysisContext.validationRules.some((rule) => categories.includes(rule.category));
}

function hasSignal(
  analysisContext: ConfidenceAnalysisContext,
  predicate: (fn: ConfidenceAnalysisContext["functions"][number]) => boolean
): boolean {
  return analysisContext.functions.some(predicate);
}

export function buildConfidenceProfile(
  analysisContext: ConfidenceAnalysisContext,
  result?: ConfidenceResult
): ConfidenceProfile {
  const evidenceSpans = countEvidenceSpans(result);
  const consensusCount = countConsensusFindings(result);
  const averageConfidencePercent = computeAverageConfidencePercent(result);

  const signerVerified =
    hasSignal(analysisContext, (fn) => fn.signerChecks) || hasAnyValidationRule(analysisContext, ["signer"]);
  const ownershipVerified =
    hasSignal(analysisContext, (fn) => fn.ownershipChecks) || hasAnyValidationRule(analysisContext, ["ownership"]);
  const pdaVerified =
    analysisContext.trustBoundaries.some((boundary) => boundary.kind === "pda") ||
    hasAnyValidationRule(analysisContext, ["pda"]);
  const cpiVerified =
    analysisContext.callGraph.some((edge) => edge.kind !== "internal") ||
    hasAnyValidationRule(analysisContext, ["cpi"]);
  const remainingAccountsVerified =
    hasSignal(analysisContext, (fn) => fn.remainingAccountsChecks) ||
    hasAnyValidationRule(analysisContext, ["remaining_accounts"]);
  const closeAuthorityVerified =
    hasSignal(analysisContext, (fn) => fn.closeAuthorityChecks) ||
    hasAnyValidationRule(analysisContext, ["close_authority"]);

  const missingSignals = [
    signerVerified ? null : "signer validation",
    ownershipVerified ? null : "ownership validation",
    pdaVerified ? null : "pda validation",
    cpiVerified ? null : "cpi validation",
    remainingAccountsVerified ? null : "remaining accounts validation",
    closeAuthorityVerified ? null : "close authority validation",
  ].filter((item): item is string => Boolean(item));

  const structuralSignals =
    analysisContext.trustBoundaries.length +
    analysisContext.validationRules.length +
    analysisContext.hotspots.length +
    analysisContext.functions.filter(
      (fn) =>
        fn.signerChecks ||
        fn.ownershipChecks ||
        fn.remainingAccountsChecks ||
        fn.closeAuthorityChecks ||
        fn.externalCalls
    ).length;

  const supportSignals = evidenceSpans + consensusCount;

  let bucket: ConfidenceBucket = "thin";
  if (structuralSignals >= 6 && supportSignals >= 3 && evidenceSpans >= 2) {
    bucket = "strong";
  } else if (structuralSignals >= 3 && supportSignals >= 1) {
    bucket = "supported";
  }

  const thinSurface =
    bucket === "thin" ||
    structuralSignals <= 3 ||
    evidenceSpans <= 1 ||
    consensusCount === 0;

  return {
    averageConfidencePercent,
    evidenceSpans,
    consensusCount,
    structuralSignals,
    bucket,
    thinSurface,
    missingSignals,
  };
}
