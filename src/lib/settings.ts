import type { SolGuardSettings } from "@/types/settings";
import {
  DEFAULT_BASE_URL_BY_PROTOCOL,
  DEFAULT_MODEL_BY_PROTOCOL,
  DEFAULT_SUPPLIER_BY_PROTOCOL,
  inferSupplierForConfig,
  type LLMConfig,
  type LLMProviderType,
  type LLMSupplierType,
} from "@/types/llm";

const SETTINGS_KEY = "solguard-settings";
export const SETTINGS_STORE_EVENT = "solguard:settings-changed";

export const DEFAULT_SETTINGS: SolGuardSettings = {
  llm: {
    provider: "anthropic",
    supplier: DEFAULT_SUPPLIER_BY_PROTOCOL.anthropic,
    apiKey: "",
    baseURL: DEFAULT_BASE_URL_BY_PROTOCOL.anthropic,
    model: DEFAULT_MODEL_BY_PROTOCOL.anthropic,
  },
};

function normalizeLLMConfig(llm: Partial<LLMConfig> | undefined): LLMConfig {
  const provider: LLMProviderType =
    llm?.provider === "anthropic" ? "anthropic" : "openai";
  const legacySupplier = (llm as { supplier?: string } | undefined)?.supplier;

  let baseURL = llm?.baseURL?.trim() || DEFAULT_BASE_URL_BY_PROTOCOL[provider];
  const model = llm?.model?.trim() || DEFAULT_MODEL_BY_PROTOCOL[provider];
  let supplier: LLMSupplierType = inferSupplierForConfig(provider, baseURL, model);

  if (legacySupplier === "minimax") {
    supplier = "minimax-cn";
    baseURL = "https://api.minimaxi.com/anthropic";
  } else if (legacySupplier === "zai") {
    supplier = "zai";
    baseURL = "https://api.z.ai/api/anthropic";
  }

  return {
    provider,
    supplier,
    apiKey: llm?.apiKey || "",
    baseURL,
    model,
  };
}

export function loadSettings(): SolGuardSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as SolGuardSettings;
      return {
        llm: normalizeLLMConfig(parsed?.llm),
      };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }

  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: SolGuardSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new Event(SETTINGS_STORE_EVENT));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}
