import type { AuditRunSnapshot } from "@/types/audit";
import { readStoredJson, writeStoredJson } from "@/lib/audit/storage";

const RUN_KEY_PREFIX = "solguard-audit-run:";
const RUN_STORE_EVENT = "solguard:audit-run-snapshot";
const runSnapshotCache = new Map<
  string,
  {
    raw: string;
    snapshot: AuditRunSnapshot;
  }
>();

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

  if (!writeStoredJson(key, snapshot)) {
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
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storage = window.localStorage;
    const raw = storage.getItem(key);
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
    return readStoredJson<AuditRunSnapshot | null>(key, null);
  }
}
