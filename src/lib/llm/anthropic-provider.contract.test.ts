import type { LLMConfig } from "@/types/llm";
import { resolveAnthropicTransportMode } from "@/lib/llm/anthropic-provider";

const anthropicNativeConfig = {
  provider: "anthropic",
  supplier: "anthropic-direct",
  apiKey: "sk-test",
  baseURL: "https://api.anthropic.com",
  model: "claude-sonnet-4-6",
} satisfies LLMConfig;

const openAICompatConfig = {
  provider: "anthropic",
  supplier: "custom",
  apiKey: "sk-test",
  baseURL: "https://ai.bayesdl.com/api/maas/v1",
  model: "glm-5.1-fp8",
} satisfies LLMConfig;

if (resolveAnthropicTransportMode(anthropicNativeConfig) !== "anthropic") {
  throw new Error("Expected native Anthropic endpoints to stay on Anthropic transport.");
}

if (resolveAnthropicTransportMode(openAICompatConfig) !== "openai") {
  throw new Error("Expected custom /v1 endpoints to use OpenAI-compatible transport.");
}
