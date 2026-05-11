"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useAudit } from "@/hooks/useAudit";
import {
  buildAwarenessEntry,
  getAwarenessEntries,
  saveAwarenessEntry,
} from "@/lib/audit/awareness-store";
import {
  createEvolutionCandidate,
  saveEvolutionCandidate,
} from "@/lib/audit/evolution-store";
import {
  createAuditReportId,
  saveAuditReport,
} from "@/lib/audit/report-store";
import {
  createAuditRunStorageSnapshot,
  saveAuditRunSnapshot,
} from "@/lib/audit/run-store";
import {
  setLatestRunSnapshot,
  useLatestRunSnapshot,
} from "@/lib/audit/session-store";
import type {
  AuditEvolutionCandidateInput,
  AuditReportRecord,
  AuditRunSnapshot,
  AuditSourceMode,
  AuditState,
  SourceFile,
} from "@/types/audit";
import type { LLMConfig } from "@/types/llm";

type AuditRunInputContext = {
  sourceMode: AuditSourceMode;
  files: SourceFile[];
  githubUrls: string[];
  llmConfig: LLMConfig;
};

type AuditSessionContextValue = {
  state: AuditState;
  latestRunSnapshot: AuditRunSnapshot | null;
  startAudit: (files: SourceFile[], llmConfig: LLMConfig, githubUrls?: string[]) => void;
  cancelAudit: () => void;
  resetAudit: () => void;
};

const AuditSessionContext = createContext<AuditSessionContextValue | null>(null);

function buildInputSummary(context: AuditRunInputContext) {
  return {
    sourceMode: context.sourceMode,
    fileCount:
      context.sourceMode === "files" ? context.files.length : context.githubUrls.length,
    fileNames: context.sourceMode === "files" ? context.files.map((file) => file.name) : [],
    githubUrls: context.githubUrls,
  };
}

function buildRunEvolutionCandidate(
  report: AuditReportRecord,
  awarenessEntries: ReturnType<typeof getAwarenessEntries>
): AuditEvolutionCandidateInput {
  const highSeverityCount = report.result.summary.critical + report.result.summary.high;
  const findingCount = report.result.vulnerabilities.length;
  const topAwarenessEntry = awarenessEntries[0];
  const lesson =
    highSeverityCount > 0
      ? `Keep report-derived lessons visible when a run surfaces ${highSeverityCount} high-severity findings.`
      : findingCount > 0
        ? `Keep lower-severity findings visible as review cues instead of burying them after a completed run.`
        : "Keep clean runs visible as calibration signals so future audits can compare against them.";

  return {
    sourceReportId: report.id,
    sourceMemoryId: report.memory.id,
    kind: "heuristic_ordering_update",
    target: lesson,
    before: topAwarenessEntry
      ? `Top awareness entry before append: ${topAwarenessEntry.title}`
      : "No awareness entries were present before append.",
    after: `${report.memory.title} | ${report.memory.summary}`,
    reason: [
      lesson,
      `Report: ${report.id}`,
      `Awareness snapshot size: ${awarenessEntries.length}`,
      topAwarenessEntry ? `Top awareness entry: ${topAwarenessEntry.title}` : null,
    ]
      .filter((item): item is string => Boolean(item))
      .join(" · "),
    evidence: [
      report.id,
      report.memory.id,
      ...awarenessEntries.slice(0, 3).map((entry) => entry.id),
    ],
    riskLevel: highSeverityCount > 0 ? "medium" : "low",
  };
}

export function AuditSessionProvider({ children }: { children: ReactNode }) {
  const audit = useAudit();
  const latestRunSnapshot = useLatestRunSnapshot();
  const inputContextRef = useRef<AuditRunInputContext | null>(null);
  const savedReportIdRef = useRef<string | null>(null);
  const liveRunSnapshot =
    audit.state.status === "loading" || audit.state.status === "results"
      ? audit.state.runSnapshot ?? null
      : null;

  const startAudit = useCallback(
    (files: SourceFile[], llmConfig: LLMConfig, githubUrls: string[] = []) => {
      const context: AuditRunInputContext = {
        sourceMode: githubUrls.length > 0 ? "github" : "files",
        files,
        githubUrls,
        llmConfig,
      };

      inputContextRef.current = context;
      savedReportIdRef.current = null;
      setLatestRunSnapshot(null);
      audit.startAudit(files, llmConfig, githubUrls);
    },
    [audit]
  );

  const cancelAudit = useCallback(() => {
    inputContextRef.current = null;
    savedReportIdRef.current = null;
    setLatestRunSnapshot(null);
    audit.cancelAudit();
  }, [audit]);

  const resetAudit = useCallback(() => {
    inputContextRef.current = null;
    savedReportIdRef.current = null;
    setLatestRunSnapshot(null);
    audit.resetAudit();
  }, [audit]);

  useEffect(() => {
    if (!liveRunSnapshot) {
      return;
    }

    const snapshot = createAuditRunStorageSnapshot(liveRunSnapshot);
    setLatestRunSnapshot(snapshot);
    saveAuditRunSnapshot(snapshot);
  }, [liveRunSnapshot]);

  useEffect(() => {
    if (audit.state.status !== "results") {
      return;
    }

    const context = inputContextRef.current;
    if (!context || savedReportIdRef.current) {
      return;
    }

    const reportId = createAuditReportId();
    const createdAt = audit.state.data.timestamp;
    const inputSummary = buildInputSummary(context);
    const reportMemory = buildAwarenessEntry({
      id: reportId,
      createdAt,
      sourceMode: context.sourceMode,
      inputSummary,
      llm: {
        provider: context.llmConfig.provider,
        supplier: context.llmConfig.supplier,
        model: context.llmConfig.model,
        baseURL: context.llmConfig.baseURL,
      },
      result: audit.state.data,
      timeline: audit.state.timeline,
    });

    const reportDraft: Omit<AuditReportRecord, "memorySaved"> = {
      id: reportId,
      createdAt,
      sourceMode: context.sourceMode,
      inputSummary,
      llm: {
        provider: context.llmConfig.provider,
        supplier: context.llmConfig.supplier,
        model: context.llmConfig.model,
        baseURL: context.llmConfig.baseURL,
      },
      result: audit.state.data,
      timeline: audit.state.timeline,
      memory: reportMemory,
    };

    const awarenessSnapshot = getAwarenessEntries(5);
    const memorySaved = saveAwarenessEntry(reportDraft.memory);
    const report: AuditReportRecord = {
      ...reportDraft,
      memorySaved,
    };

    const saved = saveAuditReport(report);
    if (!saved) {
      console.error("[AuditSessionProvider] Failed to persist audit report");
      return;
    }

    if (!memorySaved) {
      console.warn("[AuditSessionProvider] Failed to persist awareness memory");
    }

    const evolutionCandidate = createEvolutionCandidate(
      buildRunEvolutionCandidate(report, awarenessSnapshot)
    );
    const evolutionSaved = saveEvolutionCandidate(evolutionCandidate);
    if (!evolutionSaved) {
      console.warn("[AuditSessionProvider] Failed to persist evolution candidate");
    }

    savedReportIdRef.current = reportId;

    const runSnapshot = audit.state.runSnapshot;
    if (runSnapshot) {
      const nextSnapshot = createAuditRunStorageSnapshot({
        ...runSnapshot,
        resultId: reportId,
      });
      setLatestRunSnapshot(nextSnapshot);
      saveAuditRunSnapshot(nextSnapshot);
    }
  }, [audit.state]);

  const value = useMemo<AuditSessionContextValue>(
    () => ({
      state: audit.state,
      latestRunSnapshot,
      startAudit,
      cancelAudit,
      resetAudit,
    }),
    [audit.state, latestRunSnapshot, startAudit, cancelAudit, resetAudit]
  );

  return <AuditSessionContext.Provider value={value}>{children}</AuditSessionContext.Provider>;
}

export function useAuditSession() {
  const context = useContext(AuditSessionContext);
  if (!context) {
    throw new Error("useAuditSession must be used within an AuditSessionProvider");
  }

  return context;
}
