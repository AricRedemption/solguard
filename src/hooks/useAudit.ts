"use client";

import { useState, useCallback, useRef } from "react";
import type {
  AuditState,
  AuditSSEEvent,
  AuditRunSnapshot,
  SourceFile,
  AuditResult,
  Vulnerability,
  WorkflowEvent,
  AuditMemoryEntry,
} from "@/types/audit";
import type { LLMConfig } from "@/types/llm";
import { AuditResultSchema } from "@/lib/audit/result-parser";
import { getAwarenessEntries } from "@/lib/audit/awareness-store";

const PHASE_PROGRESS_MAP: Record<number, number> = {
  1: 10,
  2: 30,
  3: 55,
  4: 78,
  5: 93,
};

const PHASE_NAMES = [
  "Entry Point Discovery",
  "Context Building",
  "Security Audit",
  "Variant Analysis",
  "Report Generation",
] as const;

function normalizeCodeSnippet(snippet: string | { code: string; language: string; highlightLine: number } | undefined): { code: string; language: string; highlightLine: number } | undefined {
  if (!snippet) return undefined;
  if (typeof snippet === "string") {
    return { code: snippet, language: "rust", highlightLine: 1 };
  }
  return snippet;
}

function validateAuditResult(data: unknown): AuditResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const result = AuditResultSchema.safeParse(data);
  if (result.success) {
    // Ensure required fields with defaults and normalize vulnerabilities
    const vulnerabilities: Vulnerability[] = (result.data.vulnerabilities ?? []).map((v, i) => ({
      id: v.id ?? `vuln-${String(i + 1).padStart(3, "0")}`,
      title: v.title,
      severity: v.severity,
      description: v.description,
      location: v.location,
      impact: v.impact,
      recommendation: v.recommendation,
      confidence: v.confidence ?? 0.8,
      codeSnippet: normalizeCodeSnippet(v.codeSnippet),
      evidence: v.evidence,
      callChain: v.callChain,
      reviewStatus: v.reviewStatus,
      consensus: v.consensus,
    }));

    return {
      timestamp: result.data.timestamp ?? new Date().toISOString(),
      programAddress: result.data.programAddress,
      overallScore: result.data.overallScore ?? 75,
      summary: result.data.summary ?? { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      vulnerabilities,
      recommendations: result.data.recommendations ?? [],
      analysisContext: result.data.analysisContext,
    };
  }
  console.warn("[useAudit] Result validation errors:", result.error.flatten());
  return null;
}

function createWorkflowEvent(item: WorkflowEvent): WorkflowEvent {
  return item;
}

export function useAudit() {
  const [state, setState] = useState<AuditState>({ status: "idle" });
  const abortControllerRef = useRef<AbortController | null>(null);
  const resultDataRef = useRef<AuditResult | null>(null);
  const timelineRef = useRef<WorkflowEvent[]>([]);
  const runSnapshotRef = useRef<AuditRunSnapshot | null>(null);

  const updateRunSnapshot = (patch: Partial<AuditRunSnapshot>) => {
    if (!runSnapshotRef.current) return null;
    runSnapshotRef.current = {
      ...runSnapshotRef.current,
      ...patch,
    };
    return runSnapshotRef.current;
  };

  const startAudit = useCallback(async (files: SourceFile[], llmConfig: LLMConfig, githubUrls?: string[]) => {
    abortControllerRef.current = new AbortController();
    resultDataRef.current = null;
    timelineRef.current = [];
    runSnapshotRef.current = null;

    const awarenessEntries: AuditMemoryEntry[] = getAwarenessEntries(5);

    setState({ status: "loading", progress: 0, stage: "Starting audit...", timeline: [] });

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files, githubUrls, llmConfig, awarenessEntries }),
      signal: abortControllerRef.current.signal,
    });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: AuditSSEEvent = JSON.parse(line.slice(6));

              switch (event.type) {
                case "run_start":
                  runSnapshotRef.current = event.runSnapshot;
                  setState((prev) =>
                    prev.status === "loading"
                      ? {
                          ...prev,
                          progress: event.runSnapshot.progress,
                          phase: event.runSnapshot.currentPhase ?? prev.phase,
                          currentWorkflow: event.runSnapshot.currentWorkflow ?? prev.currentWorkflow,
                          currentAgent: event.runSnapshot.currentAgent ?? prev.currentAgent,
                          timeline: event.runSnapshot.timeline,
                          runSnapshot: event.runSnapshot,
                        }
                      : prev
                  );
                  break;

                case "progress":
                  if (runSnapshotRef.current) {
                    updateRunSnapshot({
                      progress: event.progress,
                      timeline: timelineRef.current,
                    });
                  }
                  setState((prev) =>
                    prev.status === "loading"
                      ? {
                          ...prev,
                          progress: event.progress,
                          stage: event.detail,
                          phaseDetail: event.detail,
                          runSnapshot: runSnapshotRef.current ?? prev.runSnapshot,
                        }
                      : prev
                  );
                  break;

                case "phase_start":
                  if (runSnapshotRef.current) {
                    updateRunSnapshot({
                      currentPhase: event.phase,
                      progress: PHASE_PROGRESS_MAP[event.phase] || runSnapshotRef.current.progress,
                      timeline: timelineRef.current,
                    });
                  }
                  setState((prev) =>
                    prev.status === "loading"
                      ? {
                          ...prev,
                          phase: event.phase,
                          stage: event.name || PHASE_NAMES[event.phase - 1] || "Processing...",
                          progress: PHASE_PROGRESS_MAP[event.phase] || 0,
                          runSnapshot: runSnapshotRef.current ?? prev.runSnapshot,
                        }
                      : prev
                  );
                  break;

                case "phase_progress":
                  if (runSnapshotRef.current) {
                    updateRunSnapshot({ timeline: timelineRef.current });
                  }
                  setState((prev) =>
                    prev.status === "loading"
                      ? { ...prev, phaseDetail: event.message, runSnapshot: runSnapshotRef.current ?? prev.runSnapshot }
                      : prev
                  );
                  break;

                case "phase_complete":
                  break;

                case "result": {
                  const validated = validateAuditResult(event.data);
                  if (validated) {
                    resultDataRef.current = validated;
                    if (runSnapshotRef.current) {
                      updateRunSnapshot({
                        progress: 100,
                        timeline: timelineRef.current,
                      });
                    }
                    setState((prev) =>
                      prev.status === "loading"
                        ? {
                          ...prev,
                          progress: 100,
                          stage: "Complete!",
                          phaseDetail: "done",
                          runSnapshot: runSnapshotRef.current ?? prev.runSnapshot,
                        }
                        : prev
                    );
                  } else {
                    console.error("[useAudit] Invalid result data from server");
                    setState({ status: "error", message: "Invalid response from server" });
                  }
                  break;
                }

                case "workflow_event":
                  timelineRef.current = [...timelineRef.current, createWorkflowEvent(event.item)].slice(-40);
                  if (runSnapshotRef.current) {
                    const nextSnapshot = updateRunSnapshot({
                      progress:
                        typeof event.item.progress === "number"
                          ? Math.max(runSnapshotRef.current.progress, event.item.progress)
                          : runSnapshotRef.current.progress,
                      currentPhase: event.item.phase ?? runSnapshotRef.current.currentPhase,
                      currentWorkflow: event.item.workflow ?? runSnapshotRef.current.currentWorkflow,
                      currentAgent: event.item.agent ?? runSnapshotRef.current.currentAgent,
                      timeline: timelineRef.current,
                    });
                    setState((prev) =>
                      prev.status === "loading"
                        ? {
                            ...prev,
                            timeline: timelineRef.current,
                            currentWorkflow: nextSnapshot?.currentWorkflow ?? prev.currentWorkflow,
                            currentAgent: nextSnapshot?.currentAgent ?? prev.currentAgent,
                            phase: nextSnapshot?.currentPhase ?? prev.phase,
                            stage: event.item.phaseName || event.item.title || prev.stage,
                            phaseDetail: event.item.detail || prev.phaseDetail,
                            progress:
                              typeof event.item.progress === "number"
                                ? Math.max(prev.progress, event.item.progress)
                                : prev.progress,
                            runSnapshot: nextSnapshot ?? prev.runSnapshot,
                          }
                        : prev
                    );
                  }
                  break;

                case "audit_complete": {
                  const validated = validateAuditResult(event.result);
                  if (validated) {
                    resultDataRef.current = validated;
                    if (runSnapshotRef.current) {
                      updateRunSnapshot({
                        progress: 100,
                        timeline: timelineRef.current,
                      });
                    }
                    setState({
                      status: "results",
                      data: validated,
                      timeline: timelineRef.current,
                      runSnapshot: runSnapshotRef.current as AuditRunSnapshot,
                    });
                  } else {
                    console.error("[useAudit] Invalid audit_complete data");
                    setState({ status: "error", message: "Invalid response from server" });
                  }
                  break;
                }

                case "complete":
                  if (resultDataRef.current) {
                    setState((prev) =>
                      prev.status === "loading"
                        ? {
                            status: "results",
                            data: resultDataRef.current as AuditResult,
                            timeline: timelineRef.current,
                            runSnapshot: runSnapshotRef.current as AuditRunSnapshot,
                          }
                        : prev
                    );
                  }
                  break;

                case "error":
                  setState({ status: "error", message: event.message });
                  break;
              }
            } catch (e) {
              console.error("Failed to parse SSE event:", e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setState({ status: "idle" });
      } else {
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }, []);

  const cancelAudit = useCallback(() => {
    abortControllerRef.current?.abort();
    runSnapshotRef.current = null;
    setState({ status: "idle" });
  }, []);

  const resetAudit = useCallback(() => {
    runSnapshotRef.current = null;
    setState({ status: "idle" });
  }, []);

  return { state, startAudit, cancelAudit, resetAudit };
}
