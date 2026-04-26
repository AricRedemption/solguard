import type { AuditRunSnapshot } from "@/types/audit";

const RUN_KEY_PREFIX = "solguard-audit-run:";

function safeStorageAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJSON<T>(key: string, fallback: T): T {
  if (!safeStorageAvailable()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("[audit/run-store] Failed to read storage", error);
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  if (!safeStorageAvailable()) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error("[audit/run-store] Failed to write storage", error);
    return false;
  }
}

export function createAuditRunStorageSnapshot(record: AuditRunSnapshot): AuditRunSnapshot {
  return {
    ...record,
    timeline: [...record.timeline],
    inputSummary: {
      ...record.inputSummary,
      fileNames: [...record.inputSummary.fileNames],
      githubUrls: [...record.inputSummary.githubUrls],
    },
  };
}

export function saveAuditRunSnapshot(record: AuditRunSnapshot): boolean {
  const snapshot = createAuditRunStorageSnapshot(record);
  return writeJSON(RUN_KEY_PREFIX + snapshot.id, snapshot);
}

export function loadAuditRunSnapshot(runId: string): AuditRunSnapshot | null {
  if (!runId) return null;
  return readJSON<AuditRunSnapshot | null>(RUN_KEY_PREFIX + runId, null);
}
