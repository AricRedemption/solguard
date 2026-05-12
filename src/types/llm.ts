export type LLMProviderType = "anthropic" | "openai";
export type LLMSupplierType =
  | "anthropic-direct"
  | "openai-direct"
  | "minimax-cn"
  | "minimax-global"
  | "zai"
  | "glm"
  | "custom";

export interface LLMConfig {
  provider: LLMProviderType;
  supplier: LLMSupplierType;
  apiKey: string;
  baseURL?: string;
  model: string;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCallOptions {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface LLMResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ModelPreset {
  id: string;
  label: string;
}

export interface SupplierPreset {
  id: LLMSupplierType;
  label: string;
  protocols: readonly LLMProviderType[];
  getBaseURL: (protocol: LLMProviderType) => string;
  getModels: (protocol: LLMProviderType) => readonly ModelPreset[];
  getDefaultModel: (protocol: LLMProviderType) => string;
}

export const ANTHROPIC_MODEL_PRESETS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
] as const satisfies readonly ModelPreset[];

export const OPENAI_MODEL_PRESETS = [
  { id: "gpt-5.2", label: "GPT-5.2" },
  { id: "gpt-5.2-pro", label: "GPT-5.2 Pro" },
  { id: "gpt-5.2-codex", label: "GPT-5.2 Codex" },
  { id: "gpt-5-mini", label: "GPT-5 mini" },
  { id: "gpt-5-nano", label: "GPT-5 nano" },
] as const satisfies readonly ModelPreset[];

export const MINIMAX_MODEL_PRESETS = [
  { id: "MiniMax-M2.7", label: "MiniMax M2.7" },
  { id: "MiniMax-M2.7-highspeed", label: "MiniMax M2.7 High Speed" },
  { id: "MiniMax-M2.5", label: "MiniMax M2.5" },
  { id: "MiniMax-M2.5-highspeed", label: "MiniMax M2.5 High Speed" },
  { id: "MiniMax-M2.1", label: "MiniMax M2.1" },
] as const satisfies readonly ModelPreset[];

export const ZAI_MODEL_PRESETS = [
  { id: "glm-5.1", label: "GLM-5.1" },
  { id: "glm-5-turbo", label: "GLM-5 Turbo" },
  { id: "glm-5", label: "GLM-5" },
  { id: "glm-4.7", label: "GLM-4.7" },
] as const satisfies readonly ModelPreset[];

export const MODEL_PRESETS_BY_PROTOCOL = {
  anthropic: ANTHROPIC_MODEL_PRESETS,
  openai: OPENAI_MODEL_PRESETS,
} as const satisfies Record<LLMProviderType, readonly ModelPreset[]>;

export const SUPPLIER_PRESETS = [
  {
    id: "anthropic-direct",
    label: "Anthropic",
    protocols: ["anthropic"] as const,
    getBaseURL: (protocol) => {
      void protocol;
      return "https://api.anthropic.com";
    },
    getModels: (protocol) => {
      void protocol;
      return ANTHROPIC_MODEL_PRESETS;
    },
    getDefaultModel: (protocol) => {
      void protocol;
      return ANTHROPIC_MODEL_PRESETS[0].id;
    },
  },
  {
    id: "openai-direct",
    label: "OpenAI",
    protocols: ["openai"] as const,
    getBaseURL: (protocol) => {
      void protocol;
      return "https://api.openai.com/v1";
    },
    getModels: (protocol) => {
      void protocol;
      return OPENAI_MODEL_PRESETS;
    },
    getDefaultModel: (protocol) => {
      void protocol;
      return OPENAI_MODEL_PRESETS[0].id;
    },
  },
  {
    id: "minimax-cn",
    label: "MiniMax (CN)",
    protocols: ["anthropic"] as const,
    getBaseURL: (protocol) => {
      void protocol;
      return "https://api.minimaxi.com/anthropic";
    },
    getModels: (protocol) => {
      void protocol;
      return MINIMAX_MODEL_PRESETS;
    },
    getDefaultModel: (protocol) => {
      void protocol;
      return MINIMAX_MODEL_PRESETS[0].id;
    },
  },
  {
    id: "minimax-global",
    label: "MiniMax (Global)",
    protocols: ["anthropic"] as const,
    getBaseURL: (protocol) => {
      void protocol;
      return "https://api.minimax.io/anthropic";
    },
    getModels: (protocol) => {
      void protocol;
      return MINIMAX_MODEL_PRESETS;
    },
    getDefaultModel: (protocol) => {
      void protocol;
      return MINIMAX_MODEL_PRESETS[0].id;
    },
  },
  {
    id: "zai",
    label: "Z.AI",
    protocols: ["anthropic"] as const,
    getBaseURL: (protocol) => {
      void protocol;
      return "https://api.z.ai/api/anthropic";
    },
    getModels: (protocol) => {
      void protocol;
      return ZAI_MODEL_PRESETS;
    },
    getDefaultModel: (protocol) => {
      void protocol;
      return ZAI_MODEL_PRESETS[0].id;
    },
  },
  {
    id: "glm",
    label: "GLM Coding",
    protocols: ["anthropic"] as const,
    getBaseURL: (protocol) => {
      void protocol;
      return "https://api.z.ai/api/coding/paas/v4";
    },
    getModels: (protocol) => {
      void protocol;
      return ZAI_MODEL_PRESETS;
    },
    getDefaultModel: (protocol) => {
      void protocol;
      return ZAI_MODEL_PRESETS[0].id;
    },
  },
  {
    id: "custom",
    label: "Custom",
    protocols: ["anthropic", "openai"] as const,
    getBaseURL: () => "",
    getModels: (protocol) => MODEL_PRESETS_BY_PROTOCOL[protocol],
    getDefaultModel: (protocol) => MODEL_PRESETS_BY_PROTOCOL[protocol][0].id,
  },
] as const satisfies readonly SupplierPreset[];

export const SUPPLIER_PRESETS_BY_PROTOCOL = {
  anthropic: SUPPLIER_PRESETS.filter((preset) =>
    [
      "anthropic-direct",
      "minimax-cn",
      "minimax-global",
      "zai",
      "glm",
      "custom",
    ].includes(preset.id)
  ),
  openai: SUPPLIER_PRESETS.filter((preset) => preset.id === "openai-direct"),
} as const satisfies Record<LLMProviderType, readonly SupplierPreset[]>;

export const DEFAULT_SUPPLIER_BY_PROTOCOL: Record<LLMProviderType, LLMSupplierType> = {
  anthropic: "anthropic-direct",
  openai: "openai-direct",
};

export const DEFAULT_MODEL_BY_PROTOCOL: Record<LLMProviderType, string> = {
  anthropic: ANTHROPIC_MODEL_PRESETS[0].id,
  openai: OPENAI_MODEL_PRESETS[0].id,
};

export const DEFAULT_BASE_URL_BY_PROTOCOL: Record<LLMProviderType, string> = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com/v1",
};

export function getSupplierPreset(
  supplier: LLMSupplierType
): SupplierPreset {
  return (
    SUPPLIER_PRESETS.find((preset) => preset.id === supplier) ||
    SUPPLIER_PRESETS[0]
  );
}

export function getSupplierPresetsByProtocol(
  protocol: LLMProviderType
): readonly SupplierPreset[] {
  return SUPPLIER_PRESETS_BY_PROTOCOL[protocol];
}

export function getModelPresetsForProtocol(
  protocol: LLMProviderType
): readonly ModelPreset[] {
  return MODEL_PRESETS_BY_PROTOCOL[protocol];
}

export function getDefaultBaseURLForProtocol(protocol: LLMProviderType): string {
  return DEFAULT_BASE_URL_BY_PROTOCOL[protocol];
}

export function getDefaultModelForProtocol(protocol: LLMProviderType): string {
  return DEFAULT_MODEL_BY_PROTOCOL[protocol];
}

export function inferSupplierForConfig(
  protocol: LLMProviderType,
  baseURL?: string,
  model?: string
): LLMSupplierType {
  const normalizedBaseURL = (baseURL || "").trim();
  const normalizedModel = (model || "").trim();

  const candidates = SUPPLIER_PRESETS_BY_PROTOCOL[protocol];
  const matched = candidates.find((preset) => {
    const presetBaseURL = preset.getBaseURL(protocol);
    const models = preset.getModels(protocol);
    const baseURLMatches = presetBaseURL
      ? normalizedBaseURL === presetBaseURL
      : normalizedBaseURL.length === 0;
    const modelMatches = models.some((item) => item.id === normalizedModel);
    return baseURLMatches && modelMatches;
  });

  if (matched) {
    return matched.id;
  }

  return protocol === "anthropic" ? "custom" : DEFAULT_SUPPLIER_BY_PROTOCOL[protocol];
}
