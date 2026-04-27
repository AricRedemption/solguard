"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock3, Layers3, ShieldCheck } from "lucide-react";
import { AuditExecutionPanel } from "@/components/dashboard/AuditExecutionPanel";
import { useAuditSession } from "@/components/dashboard/AuditSessionProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import {
  EVOLUTION_STORE_EVENT,
  listEvolutionCandidates,
} from "@/lib/audit/evolution-store";
import { loadAuditRunSnapshot } from "@/lib/audit/run-store";

const RUN_STORE_EVENT = "solguard:audit-run-snapshot";
const EVOLUTION_INDEX_KEY = "solguard-audit-evolution:index";
const evolutionCandidatesCache = new Map<
  string,
  {
    raw: string;
    records: ReturnType<typeof listEvolutionCandidates>;
  }
>();
const EMPTY_EVOLUTION_CANDIDATES: ReturnType<typeof listEvolutionCandidates> = [];

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

function formatWorkflowKey(
  workflow: string | null | undefined,
  labels: Record<string, string>,
  fallback: string
) {
  if (!workflow) {
    return fallback;
  }

  const normalized = workflow.replace(/_/g, "-");
  return labels[normalized] || labels[workflow] || workflow;
}

function useStoredRunSnapshot(runId: string | undefined) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!runId || typeof window === "undefined") {
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

      const handleCustomEvent = () => {
        onStoreChange();
      };

      window.addEventListener("storage", handleStorage);
      window.addEventListener(RUN_STORE_EVENT, handleCustomEvent);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(RUN_STORE_EVENT, handleCustomEvent);
      };
    },
    () => (runId ? loadAuditRunSnapshot(runId) : null),
    () => null
  );
}

function useStoredEvolutionCandidates() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }

      const handleStorage = (event: StorageEvent) => {
        if (
          !event.key ||
          event.key === "solguard-audit-evolution:index" ||
          event.key.startsWith("solguard-audit-evolution:")
        ) {
          onStoreChange();
        }
      };

      const handleCustomEvent = () => {
        onStoreChange();
      };

      window.addEventListener("storage", handleStorage);
      window.addEventListener(EVOLUTION_STORE_EVENT, handleCustomEvent);
      return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(EVOLUTION_STORE_EVENT, handleCustomEvent);
      };
    },
    () => {
      if (typeof window === "undefined") {
        return EMPTY_EVOLUTION_CANDIDATES;
      }

      try {
        const raw = window.localStorage.getItem(EVOLUTION_INDEX_KEY);
        if (!raw) {
          evolutionCandidatesCache.delete(EVOLUTION_INDEX_KEY);
          return EMPTY_EVOLUTION_CANDIDATES;
        }

        const cached = evolutionCandidatesCache.get(EVOLUTION_INDEX_KEY);
        if (cached && cached.raw === raw) {
          return cached.records;
        }

        const records = listEvolutionCandidates();
        evolutionCandidatesCache.set(EVOLUTION_INDEX_KEY, { raw, records });
        return records;
      } catch (error) {
        console.error("[audit/evolution-store] Failed to read storage", error);
        return EMPTY_EVOLUTION_CANDIDATES;
      }
    },
    () => EMPTY_EVOLUTION_CANDIDATES
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

  const isActiveRun = state.status === "loading" && snapshot?.id === runId;
  const isCompletedRun = Boolean(snapshot?.resultId || state.status === "results");
  const evolutionCandidates = useStoredEvolutionCandidates();
  const workflowLabels = t.dashboard.runPage.timeline.workflowLabels as Record<string, string>;
  const relatedEvolutionCandidate =
    snapshot?.resultId
      ? evolutionCandidates.find(
          (candidate) => candidate.sourceReportId === snapshot.resultId
        ) ?? null
      : null;

  useEffect(() => {
    if (!snapshot?.resultId) {
      return;
    }

    router.replace(`/dashboard/reports/${snapshot.resultId}`);
  }, [router, snapshot?.resultId]);

  const formatRunPageText = (text: string) =>
    text
      .replace("{id}", snapshot?.id ?? "")
      .replace("{time}", formatTimestamp(snapshot?.createdAt ?? new Date().toISOString()))
      .replace("{count}", String(evolutionCandidates.length));

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
            <CardTitle className="text-white">{t.dashboard.runPage.noRunIdTitle}</CardTitle>
            <CardDescription className="text-slate-400">{t.dashboard.runPage.noRunIdDesc}</CardDescription>
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
              <CardTitle className="text-white">{t.dashboard.runPage.noSnapshotTitle}</CardTitle>
              <CardDescription className="text-slate-400">{t.dashboard.runPage.noSnapshotDesc}</CardDescription>
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
              {t.dashboard.runPage.dedicatedRun}
            </div>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              {isCompletedRun ? t.dashboard.runPage.runCompleteTitle : t.dashboard.runPage.liveRunTitle}
            </h1>
            <p className="mt-2 text-sm text-slate-400">{formatRunPageText(t.dashboard.runPage.snapshotSaved)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-dark-600/50 bg-dark-800/50 text-slate-200" onClick={backToDashboard}>
              <ArrowLeft className="h-4 w-4" />
              {t.dashboard.reportPage.backToDashboard}
            </Button>
            {snapshot.resultId ? (
              <Button variant="outline" className="border-dark-600/50 bg-dark-800/50 text-slate-200" onClick={openReport}>
                <ArrowUpRight className="h-4 w-4" />
                {t.dashboard.runPage.openReport}
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
                  {t.dashboard.runPage.runSnapshot}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {snapshot.inputSummary.sourceMode === "github"
                    ? t.dashboard.githubTab
                    : t.dashboard.sourceTab}
                  {" "}
                  {t.dashboard.runPage.inputCaptured}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {t.dashboard.runPage.runId}
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
                    {snapshot.progress}% {t.dashboard.runPage.progress}
                  </Badge>
                  <Badge variant="outline" className="border-dark-500 text-slate-200">
                    {snapshot.inputSummary.fileCount} {t.dashboard.runPage.files}
                  </Badge>
                  <Badge variant="outline" className="border-dark-500 text-slate-200">
                    {formatWorkflowKey(
                      snapshot.currentWorkflow,
                      workflowLabels,
                      t.dashboard.runPage.timeline.workflowFallback
                    )}
                  </Badge>
                </div>

                <div className="rounded-2xl border border-dark-600/60 bg-dark-900/40 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {t.dashboard.runPage.latestState}
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {isActiveRun
                      ? state.stage
                      : isCompletedRun
                        ? t.dashboard.runPage.resultsStoredLocally
                        : t.dashboard.runPage.waitingForFirstSnapshot}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {isActiveRun
                      ? state.phaseDetail || t.dashboard.runPage.streamingLiveProgress
                      : snapshot.resultId
                        ? t.dashboard.runPage.savedReportAvailable
                        : t.dashboard.runPage.latestSnapshotFromStorage}
                  </p>
                </div>

                {snapshot.resultId ? (
                  <Button className="w-full bg-gradient-to-r from-solana-purple to-solana-blue text-white" onClick={openReport}>
                    <ArrowUpRight className="h-4 w-4" />
                    {t.dashboard.runPage.openSavedReport}
                  </Button>
                ) : null}

                <Card className="border-dark-600/50 bg-dark-900/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">{t.dashboard.runPage.selfEvolution.title}</CardTitle>
                    <CardDescription className="text-slate-400">
                      {snapshot.resultId
                        ? t.dashboard.runPage.selfEvolution.triggered
                        : t.dashboard.runPage.selfEvolution.notTriggered}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Badge
                        variant="outline"
                        className={relatedEvolutionCandidate ? "border-solana-green/30 bg-solana-green/10 text-solana-green" : "border-dark-500 text-slate-300"}
                      >
                        {relatedEvolutionCandidate ? t.dashboard.runPage.selfEvolution.yes : t.dashboard.runPage.selfEvolution.no}
                      </Badge>
                      <Badge variant="outline" className="border-dark-500 text-slate-200">
                        {relatedEvolutionCandidate
                          ? t.dashboard.regressionArchivePage.statusLabels[
                              relatedEvolutionCandidate.status as keyof typeof t.dashboard.regressionArchivePage.statusLabels
                            ]
                          : t.dashboard.runPage.selfEvolution.noCandidate}
                      </Badge>
                    </div>

                    {relatedEvolutionCandidate ? (
                      <div className="space-y-2 rounded-2xl border border-dark-600/60 bg-dark-900/40 p-3">
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          {t.dashboard.runPage.selfEvolution.candidate}
                        </p>
                        <p className="break-all text-xs text-slate-200">{relatedEvolutionCandidate.id}</p>
                        <p className="text-xs text-slate-400">
                          {t.dashboard.regressionArchivePage.kindLabels[
                            relatedEvolutionCandidate.kind as keyof typeof t.dashboard.regressionArchivePage.kindLabels
                          ]}{" "}
                          · {relatedEvolutionCandidate.target}
                        </p>
                        <p className="text-xs text-slate-500">
                          {relatedEvolutionCandidate.sourceReportId
                            ? `${t.dashboard.runPage.selfEvolution.reportLabel}: ${relatedEvolutionCandidate.sourceReportId}`
                            : null}
                          {relatedEvolutionCandidate.sourceMemoryId
                            ? `${relatedEvolutionCandidate.sourceReportId ? " · " : ""}${t.dashboard.runPage.selfEvolution.memoryLabel}: ${relatedEvolutionCandidate.sourceMemoryId}`
                            : null}
                        </p>
                      </div>
                    ) : snapshot.resultId ? (
                      <p className="text-xs leading-relaxed text-slate-400">
                        {t.dashboard.runPage.selfEvolution.waitingForCandidate}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>

            {isActiveRun ? (
              <Card className="border-dark-600/50 bg-dark-700/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Clock3 className="h-4 w-4 text-solana-purple" />
                    {t.dashboard.runPage.liveStatus}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {t.dashboard.runPage.sharedProviderKeepsStreamAlive}
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
              stage={state.status === "loading" ? state.stage : isCompletedRun ? t.dashboard.runPage.runCompleteTitle : t.dashboard.runPage.waitingForUpdates}
              phase={
                state.status === "loading"
                  ? state.phase
                  : snapshot.currentPhase ?? undefined
              }
              phaseDetail={
                state.status === "loading"
                  ? state.phaseDetail
                  : snapshot.resultId
                    ? t.dashboard.runPage.runCompleteDetail
                    : t.dashboard.runPage.snapshotLoadedFromStorage
              }
              timeline={
                state.status === "loading"
                  ? state.timeline
                  : snapshot.timeline
              }
              finalized={isCompletedRun}
              title={t.dashboard.runPage.liveWorkflowTitle}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
