import { useSyncExternalStore } from "react";
import type { AuditRunSnapshot } from "@/types/audit";

let latestRunSnapshot: AuditRunSnapshot | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function getLatestRunSnapshot(): AuditRunSnapshot | null {
  return latestRunSnapshot;
}

export function setLatestRunSnapshot(snapshot: AuditRunSnapshot | null): void {
  latestRunSnapshot = snapshot;
  emitChange();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useLatestRunSnapshot(): AuditRunSnapshot | null {
  return useSyncExternalStore(subscribe, getLatestRunSnapshot, () => null);
}
