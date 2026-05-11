import { buildConfidenceProfile } from "@/lib/audit/confidence";
import type { AnalysisContext } from "@/types/audit";

const strongContext: AnalysisContext = {
  framework: "anchor",
  files: [
    {
      name: "program.rs",
      language: "rust",
      size: 1,
      lineCount: 1,
      functionCount: 1,
      suspiciousFunctionCount: 1,
    },
  ],
  functions: [
    {
      name: "process",
      file: "program.rs",
      signature: "pub fn process(ctx: Context<Process>)",
      line: 1,
      complexity: "high",
      visibility: "public",
      calls: ["token::transfer"],
      stateWrites: true,
      externalCalls: true,
      signerChecks: true,
      ownershipChecks: true,
      remainingAccountsChecks: true,
      closeAuthorityChecks: true,
      evidence: [],
      riskSignals: [],
    },
  ],
  callGraph: [{ from: "process", to: "token::transfer", kind: "cpi", file: "program.rs", line: 1, evidence: "token::transfer" }],
  trustBoundaries: [
    {
      name: "Process",
      file: "program.rs",
      kind: "account",
      description: "anchor account",
      evidence: [],
    },
  ],
  validationRules: [
    {
      name: "Process.vault: signer",
      file: "program.rs",
      category: "signer",
      description: "signer",
      severity: "hard",
      evidence: [],
    },
    {
      name: "Process.vault: ownership",
      file: "program.rs",
      category: "ownership",
      description: "ownership",
      severity: "hard",
      evidence: [],
    },
    {
      name: "Process.vault: remaining accounts",
      file: "program.rs",
      category: "remaining_accounts",
      description: "remaining accounts",
      severity: "hard",
      evidence: [],
    },
  ],
  hotspots: [
    {
      name: "process",
      file: "program.rs",
      reason: "external interaction",
      score: 10,
    },
  ],
  entryPointHints: [],
};

const strongProfile = buildConfidenceProfile(strongContext, {
  vulnerabilities: [
    {
      confidence: 0.9,
      evidence: [{ file: "program.rs", startLine: 1, endLine: 1, snippet: "token::transfer" }],
      consensus: { supportingAgents: 2, totalAgents: 3 },
    },
    {
      confidence: 0.8,
      evidence: [{ file: "program.rs", startLine: 2, endLine: 2, snippet: "require!" }],
    },
  ],
});

if (strongProfile.bucket !== "strong") {
  throw new Error(`Expected strong profile bucket, got ${strongProfile.bucket}.`);
}

if (strongProfile.thinSurface) {
  throw new Error("Expected strong profile not to be marked thin.");
}

const thinContext: AnalysisContext = {
  framework: "native",
  files: strongContext.files,
  functions: [],
  callGraph: [],
  trustBoundaries: [],
  validationRules: [],
  hotspots: [],
  entryPointHints: [],
};

const thinProfile = buildConfidenceProfile(thinContext, {
  vulnerabilities: [],
});

if (thinProfile.bucket !== "thin") {
  throw new Error(`Expected thin profile bucket, got ${thinProfile.bucket}.`);
}

if (!thinProfile.thinSurface) {
  throw new Error("Expected thin profile to be marked thin.");
}

if (!thinProfile.missingSignals.includes("signer validation")) {
  throw new Error("Expected thin profile to report missing signer validation.");
}
