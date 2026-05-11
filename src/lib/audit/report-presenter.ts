import type { AuditReportSnapshot } from "@/lib/audit/report-store";
import type { TranslationKeys } from "@/lib/i18n";
import { buildConfidenceProfile } from "@/lib/audit/confidence";
import { formatEvidenceLocation, formatEvidenceSnippet, isDerivedEvidence, normalizeEvidence } from "./evidence";

type DashboardTranslations = TranslationKeys["dashboard"];

export type ReportVerdict = "good" | "mixed" | "risky";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function getReportVerdict(report: AuditReportSnapshot): ReportVerdict {
  const criticalHighCount = report.result.summary.critical + report.result.summary.high;
  if (criticalHighCount > 0) {
    return "risky";
  }

  if (report.result.overallScore >= 80) {
    return "good";
  }

  if (report.result.overallScore >= 60) {
    return "mixed";
  }

  return "risky";
}

export function getReportVerdictLabel(report: AuditReportSnapshot, t: DashboardTranslations): string {
  const verdict = getReportVerdict(report);
  return verdict === "good"
    ? t.summary.verdictGood
    : verdict === "risky"
      ? t.summary.verdictRisky
      : t.summary.verdictMixed;
}

export function buildReportShareSummary(report: AuditReportSnapshot, t: DashboardTranslations): string {
  const criticalHighCount = report.result.summary.critical + report.result.summary.high;
  const findingCount = report.result.vulnerabilities.length;
  const topFindings = report.result.vulnerabilities
    .slice(0, 3)
    .map((finding) => `${finding.severity.toUpperCase()}: ${finding.title}`);
  const verdictLabel = getReportVerdictLabel(report, t);
  const confidenceProfile = report.result.analysisContext
    ? buildConfidenceProfile(report.result.analysisContext as Parameters<typeof buildConfidenceProfile>[0], report.result)
    : null;
  const confidenceLabel =
    confidenceProfile?.bucket === "strong"
      ? "Strong confidence"
      : confidenceProfile?.bucket === "supported"
        ? "Supported confidence"
        : confidenceProfile?.bucket === "thin"
          ? "Thin confidence"
          : null;

  return [
    t.reportPage.title,
    `${t.overallScore}: ${report.result.overallScore}/100`,
    `${t.reportPage.findingsCount}: ${findingCount}`,
    `${t.reportPage.criticalHighCount}: ${criticalHighCount}`,
    `${t.reportPage.reportVerdict}: ${verdictLabel}`,
    confidenceLabel ? `Confidence: ${confidenceLabel}` : null,
    confidenceProfile?.thinSurface && confidenceProfile.missingSignals.length
      ? `Not verified: ${confidenceProfile.missingSignals.join(", ")}`
      : null,
    `${t.reportPage.savedAt}: ${formatDate(report.createdAt)}`,
    topFindings.length > 0 ? `${t.keyFindings}: ${topFindings.join(" | ")}` : null,
    `${t.reportPage.reportId}: ${report.id}`,
  ]
    .filter((item): item is string => Boolean(item))
    .join("\n");
}

export function buildReportMarkdown(report: AuditReportSnapshot, t: DashboardTranslations): string {
  const verdictLabel = getReportVerdictLabel(report, t);
  const criticalCount = report.result.summary.critical;
  const highCount = report.result.summary.high;
  const mediumCount = report.result.summary.medium;
  const lowCount = report.result.summary.low;
  const confidenceProfile = report.result.analysisContext
    ? buildConfidenceProfile(report.result.analysisContext as Parameters<typeof buildConfidenceProfile>[0], report.result)
    : null;
  const confidenceBucketLabel =
    confidenceProfile?.bucket === "strong"
      ? "Strong confidence"
      : confidenceProfile?.bucket === "supported"
        ? "Supported confidence"
        : confidenceProfile?.bucket === "thin"
          ? "Thin confidence"
          : null;

  const lines: string[] = [
    `# ${t.reportPage.title}`,
    "",
    `> ${t.reportPage.subtitle}`,
    "",
    "## Overview",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| ${t.reportPage.reportVerdict} | ${verdictLabel} |`,
    `| ${t.overallScore} | ${report.result.overallScore}/100 |`,
    `| ${t.reportPage.findingsCount} | ${report.result.vulnerabilities.length} |`,
    `| ${t.reportPage.criticalHighCount} | ${criticalCount + highCount} |`,
    `| ${t.reportPage.savedAt} | ${formatDate(report.createdAt)} |`,
    `| ${t.reportPage.inputMode} | ${report.sourceMode === "github" ? t.githubTab : t.sourceTab} |`,
    `| ${t.reportPage.model} | ${report.llm.model} |`,
    `| ${t.reportPage.reportId} | ${report.id} |`,
    "",
    "## Confidence Notes",
    "",
  ];

  if (confidenceProfile) {
    lines.push(
      `- Bucket: ${confidenceBucketLabel || "Unknown"}`,
      `- Average confidence: ${confidenceProfile.averageConfidencePercent}%`,
      `- Structural signals: ${confidenceProfile.structuralSignals}`,
      `- Evidence spans: ${confidenceProfile.evidenceSpans}`,
      `- Consensus findings: ${confidenceProfile.consensusCount}`
    );
    if (confidenceProfile.thinSurface && confidenceProfile.missingSignals.length > 0) {
      lines.push(`- Not verified: ${confidenceProfile.missingSignals.join(", ")}`);
    }
  } else {
    lines.push("- Not verified: structural context unavailable");
  }

  lines.push(
    "",
    "## Severity Breakdown",
    "",
    `- CRITICAL: ${criticalCount}`,
    `- HIGH: ${highCount}`,
    `- MEDIUM: ${mediumCount}`,
    `- LOW: ${lowCount}`,
    "",
    "## Key Findings",
  );

  if (report.result.vulnerabilities.length === 0) {
    lines.push("", t.noVulnerabilitiesFound, "", t.noVulnerabilitiesDesc);
  } else {
    for (const finding of report.result.vulnerabilities) {
      lines.push("", `### ${finding.title}`);
      lines.push(`- Severity: ${finding.severity.toUpperCase()}`);
      lines.push(`- Confidence: ${Math.round(finding.confidence * 100)}%`);
      if (finding.location) {
        lines.push(`- Location: ${finding.location}`);
      }
      lines.push(`- Status: ${finding.reviewStatus ?? t.reportPage.unreviewed}`);
      lines.push("", finding.description);

      lines.push("", "#### Evidence");
      const evidence = normalizeEvidence({
        evidence: finding.evidence,
        location: finding.location,
        codeSnippet: finding.codeSnippet,
      });
      if (evidence && evidence.length > 0) {
        for (const span of evidence) {
          lines.push(`- ${formatEvidenceLocation(span)}`);
          if (span.note) {
            lines.push(`  - Note: ${span.note}`);
          } else if (isDerivedEvidence(span)) {
            lines.push("  - Note: Thin evidence");
          }
          lines.push(`  - Snippet: ${formatEvidenceSnippet(span.snippet)}`);
        }
      } else {
        lines.push(`- ${t.evolutionPage.noEvidence}`);
      }

      if (finding.recommendation) {
        lines.push("", `Recommendation: ${finding.recommendation}`);
      }
    }
  }

  lines.push("", "## Recommendations", "");
  if (report.result.recommendations.length === 0) {
    lines.push(t.reportPage.noRecommendations);
  } else {
    for (const recommendation of report.result.recommendations) {
      lines.push(`- ${recommendation}`);
    }
  }

  lines.push("", "## Execution Timeline", "");
  if (report.timeline.length === 0) {
    lines.push(t.reportPage.noTimelineEvents);
  } else {
    for (const event of report.timeline) {
      lines.push(`- ${event.title} (${event.workflow}) - ${event.detail}`);
    }
  }

  return lines.join("\n");
}

export function buildReportFilename(report: AuditReportSnapshot): string {
  const safeId = report.id.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safeId}.md`;
}
