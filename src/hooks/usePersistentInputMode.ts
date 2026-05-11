"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { InputMode } from "@/components/dashboard/FileUploadZone";

const STORAGE_KEY = "solguard.audit.inputMode";
const STORE_EVENT = "solguard:audit-input-mode";
const DEFAULT_MODE: InputMode = "files";

function getStoredMode(): InputMode {
  if (typeof window === "undefined") {
    return DEFAULT_MODE;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "github" ? "github" : DEFAULT_MODE;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback();
    }
  };

  const handleCustom = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORE_EVENT, handleCustom);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORE_EVENT, handleCustom);
  };
}

export function usePersistentInputMode() {
  const mode = useSyncExternalStore(subscribe, getStoredMode, () => DEFAULT_MODE);

  const setMode = useCallback((nextMode: InputMode) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, nextMode);
    window.dispatchEvent(new Event(STORE_EVENT));
  }, []);

  return [mode, setMode] as const;
}
