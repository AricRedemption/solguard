"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock3, Layers3, ShieldCheck } from "lucide-react";
import { AnalysisSummaryPanel } from "@/components/dashboard/AnalysisSummaryPanel";
import { AuditExecutionPanel } from "@/components/dashboard/AuditExecutionPanel";
import { useAuditSession } from "@/components/dashboard/AuditSessionProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { loadAuditReport } from "@/lib/audit/report-store";
import { loadAuditRunSnapshot } from "@/lib/audit/run-store";

function formatTimestamp(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function useStoredRunSnapshot(runId: string | undefined) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!runId) {
        return () => {};
      }

      if (typeof window === "undefined") {
        return () => {};
      }

      const handleStorage = (event: StorageEvent) => {
        if (
          !event.key ||
          event.key === `solguard-audit-run:${runId}` ||
          event.key.startsWith("solguard-audit-run:")
        ) {
          onStoreChange();
        }
      };

      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    },
    () => (runId ? loadAuditRunSnapshot(runId) : null),
    () => null
  );
}

function useStoredAuditReport(reportId: string | null | undefined) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!reportId) {
        return () => {};
      }

      if (typeof window === "undefined") {
        return () => {};
      }

      const handleStorage = (event: StorageEvent) => {
        if (
          !event.key ||
          event.key === `solguard-audit-report:${reportId}` ||
          event.key.startsWith("solguard-audit-report:")
        ) {
          onStoreChange();
        }
      };

      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    },
    () => (reportId ? loadAuditReport(reportId) : null),
    () => null
  );
}

export default function AuditRunPage() {
  const params = useParams<{ runId: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { state, latestRunSnapshot, cancelAudit } = useAuditSession();
  const runId = Array.isArray(params?.runId) ? params.runId[0] : params?.runId;

  const storedSnapshot = useStoredRunSnapshot(runId);
  const liveSnapshot = latestRunSnapshot?.id === runId ? latestRunSnapshot : null;
  const snapshot = useMemo(() => {
    if (!runId) return null;
    if (liveSnapshot && storedSnapshot && liveSnapshot.id === storedSnapshot.id) {
      return {
        ...storedSnapshot,
        ...liveSnapshot,
        resultId: liveSnapshot.resultId ?? storedSnapshot.resultId,
      };
    }

    return liveSnapshot ?? storedSnapshot;
  }, [liveSnapshot, runId, storedSnapshot]);

  const report = useStoredAuditReport(snapshot?.resultId);
  const result = state.status === "results" ? state.data : report?.result;
  const analysisContext = result?.analysisContext;
  const isActiveRun = state.status === "loading" && snapshot?.id === runId;
  const isCompletedRun = Boolean(result || snapshot?.resultId);

  const openReport = () => {
    if (!snapshot?.resultId) {
      return;
    }

    router.push(`/dashboard/reports/${snapshot.resultId}`);
  };

  const backToDashboard = () => {
    router.push("/dashboard");
  };

  if (!runId) {
    return (
      <div className="min-h-screen bg-dark-900 px-4 py-8 text-slate-200 sm:px-6 lg:px-8">
        <Card className="mx-auto mt-16 max-w-2xl border-dark-600/50 bg-dark-700/50">
          <CardHeader>
            <CardTitle className="text-white">{t.dashboard.reportPage.reportMissing}</CardTitle>
            <CardDescription className="text-slate-400">
              {t.dashboard.reportPage.reportMissingDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-gradient-to-r from-solana-purple to-solana-blue text-white" onClick={backToDashboard}>
              {t.dashboard.reportPage.openDashboard}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-dark-900 px-4 py-8 text-slate-200 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" className="text-slate-300" onClick={backToDashboard}>
              <ArrowLeft className="h-4 w-4" />
              {t.dashboard.reportPage.backToDashboard}
            </Button>
          </div>
          <Card className="border-dark-600/50 bg-dark-700/50">
            <CardHeader>
              <CardTitle className="text-white">Run snapshot not found</CardTitle>
              <CardDescription className="text-slate-400">
                The stored run snapshot is no longer available in local storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-gradient-to-r from-solana-purple to-solana-blue text-white" onClick={backToDashboard}>
                {t.dashboard.reportPage.openDashboard}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 px-4 py-8 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Layers3 className="h-4 w-4 text-solana-purple" />
              Dedicated Run
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              {isCompletedRun ? "Run complete" : "Live audit run"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Snapshot {snapshot.id} saved {formatTimestamp(snapshot.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-dark-600/50 bg-dark-800/50 text-slate-200" onClick={backToDashboard}>
              <ArrowLeft className="h-4 w-4" />
              {t.dashboard.reportPage.backToDashboard}
            </Button>
            {snapshot.resultId ? (
              <Button variant="outline" className="border-dark-600/50 bg-dark-800/50 text-slate-200" onClick={openReport}>
                <ArrowUpRight className="h-4 w-4" />
                Open report
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-white">
                  <ShieldCheck className="h-4 w-4 text-solana-green" />
                  Run Snapshot
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {snapshot.inputSummary.sourceMode === "github"
                    ? t.dashboard.githubTab
                    : t.dashboard.sourceTab}
                  {" "}input captured for this run
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Run ID
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-white">{snapshot.id}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Badge variant="outline" className="border-dark-500 text-slate-200">
                    {snapshot.inputSummary.sourceMode === "github"
                      ? t.dashboard.githubTab
                      : t.dashboard.sourceTab}
                  </Badge>
                  <Badge variant="outline" className="border-dark-500 text-slate-200">
                    {snapshot.progress}% progress
                  </Badge>
                  <Badge variant="outline" className="border-dark-500 text-slate-200">
                    {snapshot.inputSummary.fileCount} files
                  </Badge>
                  <Badge variant="outline" className="border-dark-500 text-slate-200">
                    {snapshot.currentWorkflow || "workflow"}
                  </Badge>
                </div>

                <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Latest state
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {isActiveRun
                      ? state.stage
                      : isCompletedRun
                        ? "Results stored locally"
                        : "Waiting for the first snapshot"}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {isActiveRun
                      ? state.phaseDetail || "Streaming live audit progress..."
                      : snapshot.resultId
                        ? "A saved report is available from this run."
                        : "The latest snapshot is read from local storage."}
                  </p>
                </div>

                {snapshot.resultId ? (
                  <Button className="w-full bg-gradient-to-r from-solana-purple to-solana-blue text-white" onClick={openReport}>
                    <ArrowUpRight className="h-4 w-4" />
                    Open saved report
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            {isActiveRun ? (
              <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Clock3 className="h-4 w-4 text-solana-purple" />
                    Live status
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    The shared provider keeps this SSE stream alive while you navigate.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full border-dark-600/50 bg-dark-800/50 text-slate-200"
                    onClick={() => {
                      cancelAudit();
                      router.push("/dashboard");
                    }}
                  >
                    {t.dashboard.cancel}
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <AuditExecutionPanel
              progress={state.status === "loading" ? state.progress : snapshot.progress}
              stage={state.status === "loading" ? state.stage : isCompletedRun ? "Complete!" : "Waiting for updates"}
              phase={
                state.status === "loading"
                  ? state.phase
                  : snapshot.currentPhase ?? undefined
              }
              phaseDetail={
                state.status === "loading"
                  ? state.phaseDetail
                  : snapshot.resultId
                    ? "Run complete and report saved locally."
                    : "Latest run snapshot loaded from local storage."
              }
              timeline={
                state.status === "loading"
                  ? state.timeline
                  : snapshot.timeline
              }
            />

            {analysisContext ? (
              <AnalysisSummaryPanel analysisContext={analysisContext} result={result} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
