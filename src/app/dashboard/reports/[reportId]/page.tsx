"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock3, Copy, Download, Link2, ShieldCheck, Sparkles, Layers3 } from "lucide-react";
import { AnalysisSummaryPanel } from "@/components/dashboard/AnalysisSummaryPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { loadAuditReport, type AuditReportSnapshot } from "@/lib/audit/report-store";
import type { AnalysisContext, AuditReportRecord, AuditResult, Severity } from "@/types/audit";
import {
  buildReportFilename,
  buildReportMarkdown,
  buildReportShareSummary,
  getReportVerdictLabel,
} from "@/lib/audit/report-presenter";
import { buildReportEvidenceBlockModel } from "./evidence-block";

const severityOrder: Severity[] = ["critical", "high", "medium", "low"];

function severityLabel(
  severity: Severity,
  t: ReturnType<typeof useTranslation>["t"]
) {
  return t.dashboard.reportPage.severityLabels[severity];
}

function scoreTone(score: number, hasCritical: boolean): "good" | "warn" | "bad" {
  if (hasCritical) return "bad";
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

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

function sourceModeLabel(mode: AuditReportRecord["sourceMode"], t: ReturnType<typeof useTranslation>["t"]) {
  return mode === "github" ? t.dashboard.githubTab : t.dashboard.sourceTab;
}

function reviewStatusLabel(
  status: NonNullable<AuditReportRecord["result"]["vulnerabilities"][number]["reviewStatus"]> | undefined,
  t: ReturnType<typeof useTranslation>["t"]
) {
  if (!status) {
    return t.dashboard.reportPage.unreviewed;
  }

  return t.dashboard.reportPage.reviewStatusLabels[status];
}

function workflowStatusLabel(status: string, t: ReturnType<typeof useTranslation>["t"]) {
  return t.dashboard.reportPage.workflowStatusLabels[
    status as keyof typeof t.dashboard.reportPage.workflowStatusLabels
  ] ?? status;
}

function useStoredAuditSnapshot(reportId: string | undefined) {
  const [report, setReport] = useState<AuditReportSnapshot | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const refresh = () => {
      if (!reportId) {
        setReport(null);
        return;
      }

      setReport(loadAuditReport(reportId));
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith("solguard-audit-report:") || event.key === "solguard-audit-reports:index") {
        refresh();
      }
    };

    refresh();
    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, [reportId]);

  return report;
}

function Metric({
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
    <div className={cn("rounded-xl border px-3 py-2", toneClass)}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-current">{value}</p>
    </div>
  );
}

export default function AuditReportPage() {
  const params = useParams<{ reportId: string }>();
  const router = useRouter();
  const reportId = Array.isArray(params?.reportId) ? params.reportId[0] : params?.reportId;
  const { t } = useTranslation();
  const [copiedAction, setCopiedAction] = useState<"summary" | "link" | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"good" | "bad" | null>(null);
  const [exportAction, setExportAction] = useState<"markdown" | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const exportTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }
      if (exportTimerRef.current) {
        window.clearTimeout(exportTimerRef.current);
      }
    };
  }, []);

  const report = useStoredAuditSnapshot(reportId);

  const groupedFindings = useMemo(() => {
    if (!report) return [];

    return severityOrder
      .map((severity) => ({
        severity,
        findings: report.result.vulnerabilities.filter((finding) => finding.severity === severity),
      }))
      .filter((group) => group.findings.length > 0);
  }, [report]);

  if (!reportId) {
    return (
      <div className="min-h-screen bg-dark-900 p-6 text-slate-200">
        <Card className="mx-auto mt-16 max-w-2xl border-dark-600/50 bg-dark-700/50">
          <CardHeader>
            <CardTitle className="text-white">{t.dashboard.reportPage.reportMissing}</CardTitle>
            <CardDescription className="text-slate-400">{t.dashboard.reportPage.reportMissingDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-gradient-to-r from-solana-purple to-solana-blue text-white"
              onClick={() => router.push("/dashboard")}
            >
              {t.dashboard.reportPage.openDashboard}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-dark-900 px-4 py-8 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <Button variant="ghost" className="text-slate-300" onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
              {t.dashboard.reportPage.backToDashboard}
            </Button>
          </div>
          <Card className="border-dark-600/50 bg-dark-700/50">
            <CardHeader>
              <CardTitle className="text-white">{t.dashboard.reportPage.reportMissing}</CardTitle>
              <CardDescription className="text-slate-400">{t.dashboard.reportPage.reportMissingDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                {t.dashboard.reportPage.noRecentReports}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const highRiskCount = report.result.summary.critical + report.result.summary.high;
  const scoreLabelText = getReportVerdictLabel(report, t.dashboard);
  const tone = scoreTone(report.result.overallScore, highRiskCount > 0);
  const analysisContext = report.result.analysisContext;
  const summaryAnalysisContext = analysisContext as unknown as AnalysisContext | undefined;
  const summaryResult = report.result as unknown as AuditResult;

  const handleCopy = async (kind: "summary" | "link") => {
    try {
      const text =
        kind === "summary"
          ? buildReportShareSummary(report, t.dashboard)
          : `${window.location.origin}/dashboard/reports/${report.id}`;

      await navigator.clipboard.writeText(text);
      setCopiedAction(kind);
      setFeedbackMessage(kind === "summary" ? t.dashboard.reportPage.summaryCopied : t.dashboard.reportPage.linkCopied);
      setFeedbackTone("good");

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current);
      }

      copyTimerRef.current = window.setTimeout(() => {
        setCopiedAction(null);
        setFeedbackMessage(null);
        setFeedbackTone(null);
      }, 1800);
    } catch (error) {
      console.error("[report-page] copy failed", error);
      setCopiedAction(null);
      setFeedbackMessage(t.dashboard.reportPage.copyFailed);
      setFeedbackTone("bad");
    }
  };

  const handleDownloadMarkdown = () => {
    try {
      const markdown = buildReportMarkdown(report, t.dashboard);
      const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = buildReportFilename(report);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);

      setExportAction("markdown");
      setFeedbackMessage(t.dashboard.reportPage.markdownDownloaded);
      setFeedbackTone("good");
      if (exportTimerRef.current) {
        window.clearTimeout(exportTimerRef.current);
      }
      exportTimerRef.current = window.setTimeout(() => {
        setExportAction(null);
        setFeedbackMessage(null);
        setFeedbackTone(null);
      }, 1800);
    } catch (error) {
      console.error("[report-page] export failed", error);
      setExportAction(null);
      setFeedbackMessage(t.dashboard.reportPage.exportFailed);
      setFeedbackTone("bad");
    }
  };

  const handleReturnToExecution = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-dark-900 px-4 py-8 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Layers3 className="h-4 w-4 text-solana-purple" />
              {t.dashboard.reportPage.title}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              {scoreLabelText}
            </h1>
            <p className="mt-2 text-sm text-slate-400">{t.dashboard.reportPage.subtitle}</p>
          </div>
          <Button variant="outline" className="border-dark-600/50 bg-dark-800/50 text-slate-200" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            {t.dashboard.reportPage.backToDashboard}
          </Button>
          <Button variant="outline" className="border-dark-600/50 bg-dark-800/50 text-slate-200" onClick={handleReturnToExecution}>
            <ArrowLeft className="h-4 w-4" />
            {t.dashboard.reportPage.returnToExecution}
          </Button>
        </div>

        <Card className="relative overflow-hidden border-dark-600/50 bg-gradient-to-br from-solana-purple/10 via-dark-800/80 to-dark-900/95 shadow-2xl shadow-solana-purple/5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.12),transparent_28%)]" />
          <CardContent className="relative space-y-6 p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-solana-purple/30 bg-solana-purple/10 text-solana-purple">
                {t.dashboard.reportPage.title}
              </Badge>
              <Badge variant="outline" className="border-dark-500 text-slate-200">
                {report.id}
              </Badge>
              {analysisContext ? (
                <Badge variant="outline" className="border-dark-500 text-slate-200">
                  {analysisContext.framework}
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {scoreLabelText}
                  </h2>
                  <p className="max-w-3xl text-sm leading-relaxed text-slate-300">
                    {t.dashboard.reportPage.subtitle}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="bg-gradient-to-r from-solana-purple to-solana-blue text-white"
                    onClick={() => router.push("/dashboard")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t.dashboard.reportPage.backToDashboard}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-dark-600/50 bg-dark-800/50 text-slate-200"
                    onClick={() => document.getElementById("findings")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    <Sparkles className="h-4 w-4" />
                    {t.dashboard.keyFindings}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-dark-600/50 bg-dark-800/50 text-slate-200"
                    onClick={() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    <Clock3 className="h-4 w-4" />
                    {t.dashboard.reportPage.timeline}
                  </Button>
                </div>
                {feedbackMessage ? (
                  <p className={feedbackTone === "bad" ? "text-sm text-critical" : "text-sm text-solana-green"}>
                    {feedbackMessage}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-dark-600/60 bg-dark-900/45 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    {t.dashboard.overallScore}
                  </p>
                  <div className="mt-2 flex items-baseline gap-3">
                    <p className="text-4xl font-semibold tracking-tight text-white">
                      {report.result.overallScore}
                    </p>
                    <span className="text-sm text-slate-500">{t.dashboard.reportPage.scoreSuffix}</span>
                    <Badge
                      variant="outline"
                      className={
                        tone === "bad"
                          ? "border-critical/30 bg-critical/10 text-critical"
                          : tone === "warn"
                            ? "border-high/30 bg-high/10 text-high"
                            : "border-solana-green/30 bg-solana-green/10 text-solana-green"
                      }
                    >
                      {scoreLabelText}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {highRiskCount > 0
                      ? t.dashboard.summary.criticalDetected
                      : report.result.vulnerabilities.length > 0
                        ? t.dashboard.summary.findingsFound
                        : t.dashboard.summary.noFindingsStrong}
                  </p>
                </div>

                <Metric label={t.dashboard.reportPage.savedAt} value={formatDate(report.createdAt)} tone="good" />
                <Metric label={t.dashboard.reportPage.inputMode} value={sourceModeLabel(report.sourceMode, t)} tone="good" />
                <Metric label={t.dashboard.reportPage.model} value={report.llm.model} />
                <Metric
                  label={t.dashboard.reportPage.memorySynced}
                  value={report.memorySaved ? t.dashboard.reportPage.yes : t.dashboard.reportPage.no}
                  tone={report.memorySaved ? "good" : "bad"}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-white">
              <Link2 className="h-4 w-4 text-solana-purple" />
              {t.dashboard.reportPage.shareTitle}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {t.dashboard.reportPage.shareSubtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <Button
              variant="outline"
              className="border-dark-600/50 bg-dark-800/50 text-slate-200"
              onClick={() => handleCopy("summary")}
            >
              {copiedAction === "summary" ? <Check className="h-4 w-4 text-solana-green" /> : <Copy className="h-4 w-4" />}
              {copiedAction === "summary" ? t.dashboard.reportPage.summaryCopied : t.dashboard.reportPage.copySummary}
            </Button>
            <Button
              variant="outline"
              className="border-dark-600/50 bg-dark-800/50 text-slate-200"
              onClick={() => handleCopy("link")}
            >
              {copiedAction === "link" ? <Check className="h-4 w-4 text-solana-green" /> : <Link2 className="h-4 w-4" />}
              {copiedAction === "link" ? t.dashboard.reportPage.linkCopied : t.dashboard.reportPage.copyLink}
            </Button>
            <Button
              variant="outline"
              className="border-dark-600/50 bg-dark-800/50 text-slate-200"
              onClick={handleDownloadMarkdown}
            >
              {exportAction === "markdown" ? <Check className="h-4 w-4 text-solana-green" /> : <Download className="h-4 w-4" />}
              {exportAction === "markdown" ? t.dashboard.reportPage.markdownDownloaded : t.dashboard.reportPage.downloadMarkdown}
            </Button>
            <Button
              variant="outline"
              className="border-dark-600/50 bg-dark-800/50 text-slate-200"
              onClick={() => document.getElementById("findings")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <Sparkles className="h-4 w-4" />
              {t.dashboard.reportPage.openFindings}
            </Button>
            <Button
              variant="outline"
              className="border-dark-600/50 bg-dark-800/50 text-slate-200"
              onClick={() => document.getElementById("timeline")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <Clock3 className="h-4 w-4" />
              {t.dashboard.reportPage.openTimeline}
            </Button>
          </CardContent>
        </Card>

        {summaryAnalysisContext ? (
          <div className="mt-6">
            <AnalysisSummaryPanel analysisContext={summaryAnalysisContext} result={summaryResult} />
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <ShieldCheck className="h-4 w-4 text-solana-green" />
                  {t.dashboard.reportPage.storageStatus}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {t.dashboard.reportPage.savedAt}: {formatDate(report.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {t.dashboard.reportPage.sourceSummary}
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-slate-200">
                    <p>{sourceModeLabel(report.sourceMode, t)}</p>
                    <p>{report.llm.provider} · {report.llm.supplier}</p>
                    <p className="break-all text-xs text-slate-500">{report.id}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Metric label={t.dashboard.reportPage.localSaved} value={t.dashboard.reportPage.yes} tone="good" />
                  <Metric
                    label={t.dashboard.reportPage.memorySynced}
                    value={report.memorySaved ? t.dashboard.reportPage.yes : t.dashboard.reportPage.no}
                    tone={report.memorySaved ? "good" : "bad"}
                  />
                </div>

                <Separator className="bg-dark-600/60" />

                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
                    {t.dashboard.reportPage.sourceSummary}
                  </p>
                  <div className="grid gap-2">
                    <Metric label={t.dashboard.reportPage.files} value={report.inputSummary.fileCount} />
                    <Metric label={t.dashboard.reportPage.githubUrlCount} value={report.inputSummary.githubUrls.length} />
                  </div>
                  <div className="rounded-xl border border-dark-600/60 bg-dark-900/40 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">{t.dashboard.reportPage.protocol}</p>
                    <p className="mt-1 text-sm text-slate-200">{report.llm.provider}</p>
                    <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-500">{t.dashboard.reportPage.supplier}</p>
                    <p className="mt-1 text-sm text-slate-200">{report.llm.supplier}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card id="findings" className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm scroll-mt-24">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Sparkles className="h-4 w-4 text-solana-green" />
                  {t.dashboard.keyFindings}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {report.result.vulnerabilities.length === 0
                    ? t.dashboard.noFindingsReportDesc
                    : t.dashboard.severityBreakdown}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {groupedFindings.length === 0 ? (
                  <div className="rounded-2xl border border-dark-600/60 bg-dark-900/45 p-6">
                    <p className="text-sm font-medium text-white">
                      {t.dashboard.noVulnerabilitiesFound}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {t.dashboard.noVulnerabilitiesDesc}
                    </p>
                  </div>
                ) : (
                  groupedFindings.map((group) => (
                    <details
                      key={group.severity}
                      open={group.severity === "critical" || group.severity === "high"}
                      className="rounded-2xl border border-dark-600/50 bg-dark-900/40"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={
                              group.severity === "critical"
                                ? "border-critical/30 bg-critical/10 text-critical"
                                : group.severity === "high"
                                  ? "border-high/30 bg-high/10 text-high"
                                  : group.severity === "medium"
                                    ? "border-medium/30 bg-medium/10 text-medium"
                                    : "border-low/30 bg-low/10 text-low"
                            }
                          >
                            {severityLabel(group.severity, t)}
                          </Badge>
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {severityLabel(group.severity, t)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {group.findings.length} {t.dashboard.reportPage.findingCountSuffix}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          {t.dashboard.keyFindings}
                        </span>
                      </summary>

                      <div className="border-t border-dark-600/50 p-4 pt-3">
                        <div className="space-y-3">
                          {group.findings.map((finding) => {
                            const evidenceBlock = buildReportEvidenceBlockModel(finding.evidence, {
                              spansLabel: t.dashboard.evidenceSpansLabel,
                              noEvidenceLabel: t.dashboard.evolutionPage.noEvidence,
                              snippetLimit: 120,
                            });

                            return (
                              <div
                                key={finding.id}
                                className="rounded-2xl border border-dark-600/50 bg-dark-800/45 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-white">
                                      {finding.title}
                                    </p>
                                    {finding.location ? (
                                      <p className="mt-1 truncate text-xs font-mono text-slate-500">
                                        {finding.location}
                                      </p>
                                    ) : null}
                                  </div>
                                  <div className="text-right text-[10px] uppercase tracking-wide text-slate-400">
                                    <p>
                                      {Math.round(finding.confidence * 100)}%
                                      {" "}
                                      {t.dashboard.reportPage.confidenceLabel}
                                    </p>
                                    <p className="mt-1">{reviewStatusLabel(finding.reviewStatus, t)}</p>
                                  </div>
                                </div>
                                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                                  {finding.description}
                                </p>
                                <div className="mt-3 rounded-xl border border-dark-600/60 bg-dark-900/40 p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                                      {t.dashboard.evidenceLabel}
                                    </p>
                                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                                      {evidenceBlock.summaryText}
                                    </p>
                                  </div>
                                  {evidenceBlock.items.length > 0 ? (
                                    <div className="mt-2 space-y-2">
                                      {evidenceBlock.items.map((item) => (
                                        <div key={item.key} className="rounded-lg border border-dark-600/50 bg-dark-950/50 p-2">
                                          <p className="truncate font-mono text-[11px] text-slate-300">
                                            {item.location}
                                          </p>
                                          {item.note ? (
                                            <p className="mt-1 text-[11px] text-slate-500">
                                              {item.note}
                                            </p>
                                          ) : null}
                                          <p className="mt-1 text-xs text-slate-400">
                                            {item.snippet}
                                          </p>
                                        </div>
                                      ))}
                                      {evidenceBlock.moreCount > 0 ? (
                                        <p className="text-[11px] text-slate-500">
                                          +{evidenceBlock.moreCount} more
                                        </p>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <p className="mt-2 text-xs text-slate-500">
                                      {evidenceBlock.emptyText}
                                    </p>
                                  )}
                                </div>
                                {finding.recommendation ? (
                                  <div className="mt-3 rounded-xl border border-solana-green/20 bg-solana-green/10 p-3">
                                    <p className="text-xs font-medium text-solana-green">
                                      {t.dashboard.recommendation}
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-200">
                                      {finding.recommendation}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </details>
                  ))
                )}
              </CardContent>
            </Card>

            <Card id="timeline" className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm scroll-mt-24">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <Clock3 className="h-4 w-4 text-solana-blue" />
                  {t.dashboard.reportPage.timeline}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {report.timeline.length} {t.dashboard.reportPage.eventsRecorded}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {report.timeline.length > 0 ? (
                  report.timeline.map((event) => (
                    <div key={event.id} className="rounded-xl border border-dark-600/60 bg-dark-900/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">{event.title}</p>
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">
                          {workflowStatusLabel(event.status, t)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {event.workflow}
                        {event.agent ? ` · ${event.agent}` : ""}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">{event.detail}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">{t.dashboard.reportPage.noRecentReports}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
