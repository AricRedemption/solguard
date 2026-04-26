import type { AuditRunSnapshot } from "@/types/audit";

const RUN_KEY_PREFIX = "solguard-audit-run:";
const RUN_STORE_EVENT = "solguard:audit-run-snapshot";
const runSnapshotCache = new Map<
  string,
  {
    raw: string;
    snapshot: AuditRunSnapshot;
  }
>();

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
  const key = RUN_KEY_PREFIX + snapshot.id;
  const raw = JSON.stringify(snapshot);

  if (!writeJSON(key, snapshot)) {
    return false;
  }

  runSnapshotCache.set(key, {
    raw,
    snapshot,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RUN_STORE_EVENT));
  }

  return true;
}

export function loadAuditRunSnapshot(runId: string): AuditRunSnapshot | null {
  if (!runId) return null;

  const key = RUN_KEY_PREFIX + runId;
  if (!safeStorageAvailable()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      runSnapshotCache.delete(key);
      return null;
    }

    const cached = runSnapshotCache.get(key);
    if (cached && cached.raw === raw) {
      return cached.snapshot;
    }

    const snapshot = JSON.parse(raw) as AuditRunSnapshot;
    runSnapshotCache.set(key, { raw, snapshot });
    return snapshot;
  } catch (error) {
    console.error("[audit/run-store] Failed to read storage", error);
    return readJSON<AuditRunSnapshot | null>(key, null);
  }
}
