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
import { buildAwarenessEntry, saveAwarenessEntry } from "@/lib/audit/awareness-store";
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

export function AuditSessionProvider({ children }: { children: ReactNode }) {
  const audit = useAudit();
  const latestRunSnapshot = useLatestRunSnapshot();
  const inputContextRef = useRef<AuditRunInputContext | null>(null);
  const savedReportIdRef = useRef<string | null>(null);

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
    const runSnapshot =
      audit.state.status === "loading" || audit.state.status === "results"
        ? audit.state.runSnapshot ?? null
        : null;

    if (!runSnapshot) {
      return;
    }

    const snapshot = createAuditRunStorageSnapshot(runSnapshot);
    setLatestRunSnapshot(snapshot);
    saveAuditRunSnapshot(snapshot);
  }, [audit.state]);

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
    const report: AuditReportRecord = {
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
      memory: buildAwarenessEntry({
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
      }),
    };

    const saved = saveAuditReport(report);
    if (!saved) {
      console.error("[AuditSessionProvider] Failed to persist audit report");
      return;
    }

    saveAwarenessEntry(report.memory);
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
