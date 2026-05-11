"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { SolGuardSettings } from "@/types/settings";
import type { LLMConfig } from "@/types/llm";
import { loadSettings, saveSettings, SETTINGS_STORE_EVENT } from "@/lib/settings";

const SETTINGS_KEY = "solguard-settings";

export function useSettings() {
  const [settings, setSettings] = useState<SolGuardSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      const loaded = loadSettings();
      setSettings(loaded);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const refresh = () => {
      setSettings(loadSettings());
      setLoading(false);
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === SETTINGS_KEY) {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SETTINGS_STORE_EVENT, refresh);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SETTINGS_STORE_EVENT, refresh);
    };
  }, []);

  const updateLLMConfig = useCallback((updates: Partial<LLMConfig>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        llm: { ...prev.llm, ...updates },
      };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<SolGuardSettings>) => {
    setSettings((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const isConfigured = Boolean(settings?.llm?.apiKey?.length);

  return {
    settings,
    loading,
    updateLLMConfig,
    updateSettings,
    isConfigured,
  };
}
