import { buildAnalysisContext } from "@/lib/audit/ast-context";
import { buildConfidenceProfile } from "@/lib/audit/confidence";
import type { AuditResult, ValidationRule } from "@/types/audit";
import { benchmarkCorpus, type BenchmarkCorpusCategory, type BenchmarkCorpusSample } from "./__fixtures__/benchmark-corpus";

const bucketByCategory: Record<BenchmarkCorpusCategory, "thin" | "supported" | "strong"> = {
  "known-good": "thin",
  boundary: "supported",
  "known-bad": "strong",
};

function sorted(values: string[]): string[] {
  return [...values].sort();
}

function buildSyntheticResult(sample: BenchmarkCorpusSample, context: ReturnType<typeof buildAnalysisContext>): AuditResult {
  const fileName = context.files[0]?.name ?? sample.sourceFiles[0]?.name ?? "program.rs";
  const makeEvidence = (snippet: string) =>
    Array.from({ length: sample.expected.profileEvidenceSpans }, (_, index) => ({
      file: fileName,
      startLine: index + 1,
      endLine: index + 1,
      snippet: `${snippet} #${index + 1}`,
    }));

  if (sample.category === "known-good") {
    return {
      timestamp: "2026-04-27T00:00:00.000Z",
      overallScore: 98,
      summary: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      vulnerabilities: [],
      recommendations: [],
    };
  }

  if (sample.category === "boundary") {
    return {
      timestamp: "2026-04-27T00:00:00.000Z",
      overallScore: 71,
      summary: { critical: 0, high: 1, medium: 0, low: 0, info: 0 },
      vulnerabilities: [
        {
          id: `${sample.id}-v0`,
          title: `${sample.title} finding`,
          severity: "high",
          description: sample.title,
          confidence: 0.72,
          evidence: sample.expected.profileEvidenceSpans > 0 ? makeEvidence(sample.title) : undefined,
        },
      ],
      recommendations: [],
    };
  }

  return {
    timestamp: "2026-04-27T00:00:00.000Z",
    overallScore: 34,
    summary: { critical: 0, high: 1, medium: 1, low: 0, info: 0 },
    vulnerabilities: [
        {
          id: `${sample.id}-v0`,
          title: `${sample.title} finding`,
          severity: "high",
          description: sample.title,
          confidence: 0.93,
          evidence: sample.expected.profileEvidenceSpans > 0 ? makeEvidence(sample.title) : undefined,
          consensus: { supportingAgents: 2, totalAgents: 3 },
        },
      ],
    recommendations: [],
  };
}

function summarize(context: ReturnType<typeof buildAnalysisContext>, profile: ReturnType<typeof buildConfidenceProfile>): string {
  const suspiciousTotal = context.files.reduce((sum, file) => sum + file.suspiciousFunctionCount, 0);
  const topHotspotBand = context.hotspots.length ? Math.floor(context.hotspots[0].score / 10) * 10 : 0;

  return [
    `fw=${context.framework}`,
    `files=${context.files.length}`,
    `funcs=${context.functions.length}`,
    `susp=${suspiciousTotal}`,
    `hot=${context.hotspots.length}`,
    `topBand=${topHotspotBand}`,
    `rules=${context.validationRules.length}`,
    `profile=${profile.bucket}`,
    `struct=${profile.structuralSignals}`,
    `ev=${profile.evidenceSpans}`,
    `cons=${profile.consensusCount}`,
    `thin=${profile.thinSurface ? "1" : "0"}`,
  ].join("|");
}

function assertIncludesAll(actual: Iterable<string>, expected: string[], label: string): void {
  const actualValues = sorted([...actual]);
  for (const value of expected) {
    if (!actualValues.includes(value)) {
      throw new Error(`Expected ${label} to include ${value}, got ${actualValues.join(", ") || "none"}.`);
    }
  }
}

for (const sample of benchmarkCorpus) {
  const context = buildAnalysisContext(sample.sourceFiles);
  const profile = buildConfidenceProfile(context, buildSyntheticResult(sample, context));
  const snapshot = summarize(context, profile);

  if (snapshot !== sample.expected.snapshot) {
    throw new Error(
      `Snapshot mismatch for ${sample.id}.\nExpected: ${sample.expected.snapshot}\nActual:   ${snapshot}`
    );
  }

  if (context.framework !== sample.expected.framework) {
    throw new Error(`Expected ${sample.id} to classify as ${sample.expected.framework}, got ${context.framework}.`);
  }

  const suspiciousTotal = context.files.reduce((sum, file) => sum + file.suspiciousFunctionCount, 0);
  const validationCategories = context.validationRules.map((rule: ValidationRule) => rule.category);
  const riskSignals = context.functions.flatMap((fn) => fn.riskSignals);

  if (context.functions.length !== sample.expected.functionCount) {
    throw new Error(`Expected ${sample.id} to expose ${sample.expected.functionCount} functions, got ${context.functions.length}.`);
  }

  if (suspiciousTotal !== sample.expected.suspiciousFunctionCount) {
    throw new Error(`Expected ${sample.id} to expose ${sample.expected.suspiciousFunctionCount} suspicious functions, got ${suspiciousTotal}.`);
  }

  if (context.hotspots.length !== sample.expected.hotspotCount) {
    throw new Error(`Expected ${sample.id} to expose ${sample.expected.hotspotCount} hotspots, got ${context.hotspots.length}.`);
  }

  const topHotspotScore = context.hotspots[0]?.score ?? 0;

  if (topHotspotScore <= 0 && sample.expected.hotspotCount > 0) {
    throw new Error(`Expected ${sample.id} to produce a positive hotspot score.`);
  }

  if (context.validationRules.length !== sample.expected.validationRuleCount) {
    throw new Error(
      `Expected ${sample.id} to expose ${sample.expected.validationRuleCount} validation rules, got ${context.validationRules.length}.`
    );
  }

  if (profile.bucket !== bucketByCategory[sample.category]) {
    throw new Error(`Expected ${sample.id} to land in the ${bucketByCategory[sample.category]} bucket, got ${profile.bucket}.`);
  }

  if (profile.thinSurface !== sample.expected.profileThinSurface) {
    throw new Error(`Expected ${sample.id} thinSurface=${sample.expected.profileThinSurface}, got ${profile.thinSurface}.`);
  }

  if (profile.structuralSignals !== sample.expected.profileStructuralSignals) {
    throw new Error(
      `Expected ${sample.id} structural signals ${sample.expected.profileStructuralSignals}, got ${profile.structuralSignals}.`
    );
  }

  if (profile.evidenceSpans !== sample.expected.profileEvidenceSpans) {
    throw new Error(`Expected ${sample.id} evidence spans ${sample.expected.profileEvidenceSpans}, got ${profile.evidenceSpans}.`);
  }

  if (profile.consensusCount !== sample.expected.profileConsensusCount) {
    throw new Error(`Expected ${sample.id} consensus count ${sample.expected.profileConsensusCount}, got ${profile.consensusCount}.`);
  }

  if (sample.expected.requiredValidationCategories) {
    assertIncludesAll(validationCategories, sample.expected.requiredValidationCategories, `${sample.id} validation categories`);
  }

  if (sample.expected.requiredRiskSignals) {
    for (const signal of sample.expected.requiredRiskSignals) {
      if (!riskSignals.includes(signal)) {
        throw new Error(`Expected ${sample.id} to include risk signal ${signal}.`);
      }
    }
  }

  if (sample.expected.forbiddenRiskSignals) {
    for (const forbidden of sample.expected.forbiddenRiskSignals) {
      if (riskSignals.includes(forbidden)) {
        throw new Error(`Expected ${sample.id} not to include risk signal ${forbidden}.`);
      }
    }
  }

  if (sample.expected.requiredMissingSignals) {
    for (const required of sample.expected.requiredMissingSignals) {
      if (!profile.missingSignals.includes(required)) {
        throw new Error(`Expected ${sample.id} to report missing signal ${required}.`);
      }
    }
  }

  if (sample.category === "known-good") {
    if (context.hotspots.length !== 0) {
      throw new Error(`Expected ${sample.id} to stay hotspot-free.`);
    }

    if (suspiciousTotal !== 0) {
      throw new Error(`Expected ${sample.id} to stay suspicious-function-free.`);
    }

    if (context.functions.length !== 0) {
      throw new Error(`Expected ${sample.id} to stay function-free.`);
    }
  }

  if (sample.category === "boundary") {
    if (context.hotspots.length !== 1) {
      throw new Error(`Expected ${sample.id} to expose a single boundary hotspot.`);
    }

    if (topHotspotScore > 60) {
      throw new Error(`Expected ${sample.id} hotspot score to stay in supported/thin territory, got ${topHotspotScore}.`);
    }
  }

  if (sample.category === "known-bad") {
    if (context.hotspots.length < 1) {
      throw new Error(`Expected ${sample.id} to expose at least one hotspot.`);
    }

    if (topHotspotScore < 40) {
      throw new Error(`Expected ${sample.id} hotspot score to stay clearly elevated, got ${topHotspotScore}.`);
    }

    if (!riskSignals.some((signal) => signal === "state-write" || signal === "external-call" || signal === "missing-remaining-accounts-signal")) {
      throw new Error(`Expected ${sample.id} to surface a bad structural signal.`);
    }
  }
}

const actualSnapshots = benchmarkCorpus.map((sample) => {
  const context = buildAnalysisContext(sample.sourceFiles);
  const profile = buildConfidenceProfile(context, buildSyntheticResult(sample, context));
  return `${sample.id}: ${summarize(context, profile)}`;
});

const expectedSnapshots = benchmarkCorpus.map((sample) => `${sample.id}: ${sample.expected.snapshot}`);

if (actualSnapshots.join("\n") !== expectedSnapshots.join("\n")) {
  throw new Error("Benchmark corpus snapshot drifted.");
}

if (benchmarkCorpus.length !== 30) {
  throw new Error(`Expected 30 benchmark samples, got ${benchmarkCorpus.length}.`);
}

const categoryCounts = benchmarkCorpus.reduce<Record<BenchmarkCorpusCategory, number>>(
  (counts, sample) => {
    counts[sample.category] += 1;
    return counts;
  },
  { "known-bad": 0, "known-good": 0, boundary: 0 }
);

if (categoryCounts["known-bad"] !== 10 || categoryCounts["known-good"] !== 10 || categoryCounts.boundary !== 10) {
  throw new Error(`Expected 10 samples per category, got ${JSON.stringify(categoryCounts)}.`);
}
