"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildConfidenceProfile } from "@/lib/audit/confidence";
import { useTranslation } from "@/lib/i18n";
import type { AnalysisContext, AuditResult } from "@/types/audit";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Layers3,
  ShieldCheck,
} from "lucide-react";

function SectionList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-dark-600/60 bg-dark-800/40 px-3 py-2 text-xs text-slate-300"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

function FocusItem({
  kind,
  title,
  detail,
  evidence,
}: {
  kind: string;
  title: string;
  detail: string;
  evidence?: string;
}) {
  return (
    <div className="rounded-xl border border-dark-600/60 bg-dark-800/40 p-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300">
          {kind}
        </Badge>
        <p className="text-sm font-medium text-white">{title}</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{detail}</p>
      {evidence ? (
        <p className="mt-2 rounded-lg border border-dark-600/50 bg-dark-900/60 px-2.5 py-2 text-[11px] leading-relaxed text-slate-300">
          {evidence}
        </p>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-dark-600/60 bg-dark-800/40 p-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function InlineMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "border-solana-green/20 bg-solana-green/10 text-solana-green"
      : tone === "warn"
        ? "border-high/20 bg-high/10 text-high"
        : tone === "bad"
          ? "border-critical/20 bg-critical/10 text-critical"
          : "border-dark-600/60 bg-dark-800/50 text-slate-200";

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-current">{value}</p>
    </div>
  );
}

type Verdict = "good" | "mixed" | "risky";

function formatMessage(
  template: string,
  values: Record<string, string | number>
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function buildExecutiveSummary({
  analysisContext,
  result,
  t,
}: {
  analysisContext: AnalysisContext;
  result?: AuditResult;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const vulns = result?.vulnerabilities ?? [];
  const criticalCount = result?.summary.critical ?? 0;
  const highCount = result?.summary.high ?? 0;
  const findingsCount = vulns.length;
  const confidenceProfile = buildConfidenceProfile(analysisContext, result);
  const trustBoundaries = analysisContext.trustBoundaries.length;
  const validationRules = analysisContext.validationRules.length;
  const evidenceSpans = confidenceProfile.evidenceSpans;
  const consensusCount = confidenceProfile.consensusCount;
  const strongStructure = trustBoundaries + validationRules + analysisContext.hotspots.length;
  const supportSignals = evidenceSpans + consensusCount;
  const confidenceLabel =
    confidenceProfile.bucket === "strong"
      ? t.dashboard.summary.confidenceStrong
      : confidenceProfile.bucket === "supported"
        ? t.dashboard.summary.confidenceSupported
        : t.dashboard.summary.confidenceThin;

  let verdict: Verdict = "mixed";
  if (criticalCount > 0 || highCount > 0) {
    verdict = "risky";
  } else if (findingsCount === 0 && strongStructure >= 4 && supportSignals >= 2) {
    verdict = "good";
  } else if (findingsCount === 0 && strongStructure <= 1) {
    verdict = "mixed";
  } else if (criticalCount === 0 && highCount === 0 && findingsCount > 0 && supportSignals >= 2) {
    verdict = "mixed";
  } else if (criticalCount === 0 && highCount === 0 && findingsCount === 0) {
    verdict = strongStructure >= 2 ? "good" : "mixed";
  } else if (criticalCount === 0 && highCount === 0) {
    verdict = "good";
  }

  const verdictText =
    verdict === "good"
      ? t.dashboard.summary.verdictGood
      : verdict === "risky"
        ? t.dashboard.summary.verdictRisky
        : t.dashboard.summary.verdictMixed;

  const strengths: string[] = [];
  const concerns: string[] = [];

  if (criticalCount === 0 && highCount === 0) {
    strengths.push(t.dashboard.summary.noCritical);
  } else {
    concerns.push(t.dashboard.summary.criticalDetected);
  }

  if (findingsCount === 0) {
    strengths.push(t.dashboard.summary.noFindings);
  } else {
    concerns.push(t.dashboard.summary.findingsFound);
  }

  if (trustBoundaries > 0 || validationRules > 0) {
    strengths.push(t.dashboard.summary.strongBoundaries);
  } else {
    concerns.push(t.dashboard.summary.weakBoundaries);
  }

  if (evidenceSpans >= 3 || consensusCount > 0) {
    strengths.push(t.dashboard.summary.evidenceRich);
  } else {
    concerns.push(t.dashboard.summary.evidenceThin);
  }

  const coverageHealthy = strongStructure >= 4;
  const coverage = coverageHealthy
    ? t.dashboard.summary.coverageHealthy
    : t.dashboard.summary.coverageThin;

  let summarySentence = "";
  if (criticalCount > 0 || highCount > 0) {
    summarySentence = t.dashboard.summary.riskyConfirmed;
  } else if (findingsCount === 0) {
    summarySentence = coverageHealthy
      ? t.dashboard.summary.noFindingsStrong
      : t.dashboard.summary.noFindingsThin;
  } else {
    summarySentence = formatMessage(t.dashboard.summary.findingsDetected, {
      count: findingsCount,
      evidence: evidenceSpans,
      consensus: consensusCount,
    });
  }

  const reliabilityNote =
    confidenceProfile.thinSurface
      ? `${t.dashboard.summary.thinSurfaceWarning}${confidenceProfile.missingSignals.length ? ` ${t.dashboard.summary.notVerified}: ${confidenceProfile.missingSignals.join(", ")}` : ""}`
      : confidenceProfile.bucket === "strong"
        ? t.dashboard.summary.reliabilityStrong
        : t.dashboard.summary.reliabilitySupported;

  const reliabilityLabel =
    verdict === "risky"
      ? t.dashboard.summary.verdictRisky
      : confidenceLabel;

  return {
    verdict,
    verdictText,
    headline: verdictText,
    subtitle: summarySentence,
    strengths,
    concerns,
    coverage,
    reliabilityNote,
    confidence: result?.vulnerabilities.length
      ? `${confidenceProfile.averageConfidencePercent}% ${t.dashboard.summary.averageConfidenceLabel} · ${evidenceSpans} ${t.dashboard.summary.evidenceSpansLabel} · ${consensusCount} ${t.dashboard.summary.consensusFindingsLabel}`
      : `${t.dashboard.summary.noFindings} · ${reliabilityNote}`,
    reliabilityLabel,
    signals: {
      trustBoundaries,
      validationRules,
      evidenceSpans,
      consensusCount,
      hotspots: analysisContext.hotspots.length,
      confidenceBucket: confidenceProfile.bucket,
    },
  };
}

export function AnalysisSummaryPanel({
  analysisContext,
  result,
}: {
  analysisContext?: AnalysisContext;
  result?: AuditResult;
}) {
  const { t } = useTranslation();

  if (!analysisContext) {
    return null;
  }

  const files = analysisContext.files.length;
  const functions = analysisContext.functions.length;
  const hotspots = analysisContext.hotspots.length;
  const trustBoundaries = analysisContext.trustBoundaries.length;
  const validationRules = analysisContext.validationRules.length;

  const languageBreakdown = analysisContext.files.reduce<Record<string, number>>((acc, file) => {
    acc[file.language] = (acc[file.language] || 0) + 1;
    return acc;
  }, {});

  const topTrustBoundaries = analysisContext.trustBoundaries
    .slice(0, 4)
    .map((boundary) => `${boundary.name} (${boundary.kind})`);

  const topValidationRules = analysisContext.validationRules
    .slice(0, 4)
    .map((rule) => `${rule.name} · ${rule.category}/${rule.severity}`);

  const focusItems = analysisContext.hotspots.slice(0, 4).map((hotspot) => {
    const fn = analysisContext.functions.find(
      (candidate) => candidate.name === hotspot.name && candidate.file === hotspot.file
    );
    return {
      kind: "hotspot",
      title: `${hotspot.file}::${hotspot.name}`,
      detail: hotspot.reason,
      evidence: fn?.evidence?.[0]?.snippet ? fn.evidence[0].snippet.slice(0, 260).replace(/\s+/g, " ").trim() : undefined,
    };
  });

  const validationFocus = analysisContext.validationRules.slice(0, 2).map((rule) => ({
    kind: `${rule.category}/${rule.severity}`,
    title: `${rule.file}::${rule.name}`,
    detail: rule.description,
    evidence: rule.evidence?.[0]?.snippet ? rule.evidence[0].snippet.slice(0, 260).replace(/\s+/g, " ").trim() : undefined,
  }));

  const vulns = result?.vulnerabilities ?? [];
  const confirmed = vulns.filter((vuln) => vuln.reviewStatus === "confirmed").length;
  const needsReview = vulns.filter((vuln) => vuln.reviewStatus === "needs_review").length;
  const dismissed = vulns.filter((vuln) => vuln.reviewStatus === "dismissed").length;
  const evidenceSpans = vulns.reduce((sum, vuln) => sum + (vuln.evidence?.length ?? 0), 0);
  const avgConfidence = vulns.length
    ? Math.round(
        (vulns.reduce((sum, vuln) => sum + (vuln.confidence || 0), 0) / vulns.length) * 100
      )
    : 0;
  const consensusCount = vulns.filter((vuln) => vuln.consensus).length;
  const criticalCount = result?.summary.critical ?? 0;
  const highCount = result?.summary.high ?? 0;
  const mediumCount = result?.summary.medium ?? 0;
  const lowCount = result?.summary.low ?? 0;
  const executiveSummary = buildExecutiveSummary({ analysisContext, result, t });

  return (
    <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-white">
          <Layers3 className="h-4 w-4 text-solana-purple" />
          {t.dashboard.summary.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-solana-green/20 bg-gradient-to-br from-solana-green/10 via-dark-800/70 to-dark-800/40">
          <div className="grid gap-5 border-b border-dark-600/50 p-5 lg:grid-cols-[1.45fr_0.85fr] lg:gap-6 lg:p-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    executiveSummary.verdict === "risky"
                      ? "border-critical/30 bg-critical/10 text-critical"
                      : executiveSummary.verdict === "good"
                        ? "border-solana-green/30 bg-solana-green/10 text-solana-green"
                        : "border-high/30 bg-high/10 text-high"
                  }
                >
                  {executiveSummary.verdictText}
                </Badge>
                <span className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                  {t.dashboard.summary.title}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-semibold leading-tight text-white lg:text-[2.05rem]">
                  {executiveSummary.headline}
                </h3>
                <p className="max-w-3xl text-sm leading-relaxed text-slate-300 lg:text-[0.95rem]">
                  {executiveSummary.subtitle}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="border-dark-500 text-slate-200">
                  {analysisContext.framework}
                </Badge>
                <Badge variant="outline" className="border-dark-500 text-slate-200">
                  {analysisContext.files.length} {t.dashboard.summary.filesLabel}
                </Badge>
                <Badge variant="outline" className="border-dark-500 text-slate-200">
                  {analysisContext.hotspots.length} {t.dashboard.summary.hotspotsLabel}
                </Badge>
                <Badge variant="outline" className="border-dark-500 text-slate-200">
                  {executiveSummary.signals.evidenceSpans} {t.dashboard.summary.evidenceSpansLabel}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InlineMetric
                  label={t.dashboard.summary.strengths}
                  value={executiveSummary.strengths.length}
                  tone="good"
                />
                <InlineMetric
                  label={t.dashboard.summary.concerns}
                  value={executiveSummary.concerns.length}
                  tone={executiveSummary.verdict === "risky" ? "bad" : "warn"}
                />
                <InlineMetric
                  label={t.dashboard.summary.reliability}
                  value={executiveSummary.reliabilityLabel}
                />
                <InlineMetric
                  label={t.dashboard.summary.scope}
                  value={executiveSummary.coverage}
                />
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-dark-600/60 bg-dark-900/45 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {t.dashboard.summary.reliability}
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {executiveSummary.reliabilityLabel}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {executiveSummary.reliabilityNote}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  {executiveSummary.confidence}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-dark-600/60 bg-dark-900/45 p-4">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {t.dashboard.summary.scope}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {analysisContext.functions.length}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{t.dashboard.summary.functionsAnalyzed}</p>
                </div>
                <div className="rounded-2xl border border-dark-600/60 bg-dark-900/45 p-4">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    {t.dashboard.summary.structureSignals}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {executiveSummary.signals.trustBoundaries + executiveSummary.signals.validationRules}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{t.dashboard.summary.structureSignals}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl border border-dark-600/60 bg-dark-900/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t.dashboard.summary.strengths}
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                {executiveSummary.strengths.map((item) => (
                  <li key={item} className="rounded-xl border border-solana-green/10 bg-solana-green/5 px-3 py-2 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-dark-600/60 bg-dark-900/35 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t.dashboard.summary.concerns}
              </p>
              <ul className="mt-2 space-y-2 text-sm text-slate-200">
                {executiveSummary.concerns.map((item) => (
                  <li key={item} className="rounded-xl border border-high/10 bg-high/5 px-3 py-2 leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-dark-600/60 bg-dark-900/35 p-4 md:col-span-2 xl:col-span-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t.dashboard.summary.scope}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <InlineMetric
                  label={t.dashboard.summary.filesLabel}
                  value={analysisContext.files.length}
                />
                <InlineMetric
                  label={t.dashboard.summary.functionsLabel}
                  value={analysisContext.functions.length}
                />
                <InlineMetric
                  label={t.dashboard.summary.hotspotsLabel}
                  value={analysisContext.hotspots.length}
                  tone={analysisContext.hotspots.length > 0 ? "warn" : "good"}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-solana-purple/30 text-slate-200">
            <ShieldCheck className="mr-1 h-3.5 w-3.5 text-solana-purple" />
            {analysisContext.framework}
          </Badge>
          <Badge variant="outline" className="border-dark-500 text-slate-200">
            <CircleDashed className="mr-1 h-3.5 w-3.5 text-slate-300" />
            {files} files
          </Badge>
          <Badge variant="outline" className="border-dark-500 text-slate-200">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-solana-green" />
            {functions} functions
          </Badge>
          <Badge variant="outline" className="border-dark-500 text-slate-200">
            <AlertTriangle className="mr-1 h-3.5 w-3.5 text-high" />
            {hotspots} hotspots
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <StatCard label="Trust Boundaries" value={trustBoundaries} hint="Account / authority / CPI edges" />
          <StatCard label="Validation Rules" value={validationRules} hint="Signer, ownership, PDA, remaining accounts, close authority, constraint checks" />
          <StatCard label="Call Graph Edges" value={analysisContext.callGraph.length} hint="Internal and external interactions" />
          <StatCard
            label="Signal Density"
            value={functions > 0 ? `${Math.round((hotspots / functions) * 100)}%` : "0%"}
            hint="Hotspots per function"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            label="Rust Files"
            value={languageBreakdown.rust || 0}
            hint="Native / Anchor analysis coverage"
          />
          <StatCard
            label="TypeScript Files"
            value={(languageBreakdown.typescript || 0) + (languageBreakdown.tsx || 0) + (languageBreakdown.javascript || 0) + (languageBreakdown.jsx || 0)}
            hint="Frontend / tooling support files"
          />
          <StatCard
            label="Evidence Spans"
            value={evidenceSpans}
            hint="Attached to current vulnerabilities"
          />
          <StatCard
            label="Consensus Findings"
            value={consensusCount}
            hint="Findings with agent agreement"
          />
        </div>

        {result ? (
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard label="Critical" value={criticalCount} />
            <StatCard label="High" value={highCount} />
            <StatCard label="Medium" value={mediumCount} />
            <StatCard label="Low" value={lowCount} />
          </div>
        ) : null}

        {result ? (
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Confirmed" value={confirmed} />
            <StatCard label="Needs Review" value={needsReview} />
            <StatCard label="Dismissed" value={dismissed} />
          </div>
        ) : null}

        {result ? (
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard label="Average Confidence" value={`${avgConfidence}%`} />
            <StatCard label="Findings" value={vulns.length} />
            <StatCard label="Consensus Ratio" value={vulns.length ? `${Math.round((consensusCount / vulns.length) * 100)}%` : "0%"} />
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <SectionList
            title="Top Trust Boundaries"
            items={topTrustBoundaries}
            emptyText="No account or authority boundaries detected."
          />
          <SectionList
            title="Validation Rules"
            items={topValidationRules}
            emptyText="No explicit validation rules detected."
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            High-Signal Focus
          </p>
          <div className="grid gap-3">
            {focusItems.length > 0 || validationFocus.length > 0 ? (
              <>
                {focusItems.map((item) => (
                  <FocusItem
                    key={item.title}
                    kind={item.kind}
                    title={item.title}
                    detail={item.detail}
                    evidence={item.evidence}
                  />
                ))}
                {validationFocus.map((item) => (
                  <FocusItem
                    key={item.title}
                    kind={item.kind}
                    title={item.title}
                    detail={item.detail}
                    evidence={item.evidence}
                  />
                ))}
              </>
            ) : (
              <div className="rounded-xl border border-dark-600/60 bg-dark-800/40 p-3">
                <p className="text-xs text-slate-500">No focus areas identified.</p>
              </div>
            )}
          </div>
        </div>

        {result && result.vulnerabilities.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Result Evidence
            </p>
            <div className="grid gap-3">
              {result.vulnerabilities.slice(0, 3).map((vuln) => (
                <div
                  key={vuln.id}
                  className="rounded-xl border border-dark-600/60 bg-dark-800/40 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-dark-500 text-[10px] uppercase tracking-wide text-slate-300">
                      {vuln.severity}
                    </Badge>
                    <p className="text-sm font-medium text-white">{vuln.title}</p>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{vuln.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-slate-400">
                    <span>confidence {Math.round(vuln.confidence * 100)}%</span>
                    <span>•</span>
                    <span>{vuln.evidence?.length ?? 0} spans</span>
                    <span>•</span>
                    <span>{vuln.reviewStatus || "unreviewed"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
