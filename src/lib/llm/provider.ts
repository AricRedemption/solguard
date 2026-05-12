import type { LLMConfig, LLMCallOptions, LLMResponse } from "@/types/llm";

export interface LLMProvider {
  call(options: LLMCallOptions): Promise<LLMResponse>;
  callStreaming(options: LLMCallOptions): AsyncIterable<string>;
}

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

export async function createProvider(config: LLMConfig): Promise<LLMProvider> {
  switch (config.supplier) {
    case "anthropic-direct": {
      const { AnthropicProvider } = await import("./anthropic-provider");
      return new AnthropicProvider(config);
    }
    case "openai-direct":
      {
        const { OpenAIProvider } = await import("./openai-provider");
        return new OpenAIProvider(config);
      }
    case "minimax-cn":
    case "minimax-global":
    case "zai":
    case "glm": {
      const { AnthropicProvider } = await import("./anthropic-provider");
      return new AnthropicProvider(config);
    }
    case "custom": {
      if (config.provider === "anthropic") {
        const { AnthropicProvider } = await import("./anthropic-provider");
        return new AnthropicProvider(config);
      }
      const { OpenAIProvider } = await import("./openai-provider");
      return new OpenAIProvider(config);
    }
    default:
      throw new Error(`Unsupported supplier: ${config.supplier}`);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
  }
): Promise<T> {
  const config = { ...RETRY_CONFIG, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === config.maxRetries) {
        break;
      }

      // Don't retry on abort errors
      if (
        lastError.name === "AbortError" ||
        lastError.name === "Cancel" ||
        lastError.name === "TimeoutError"
      ) {
        throw lastError;
      }

      const delay = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs
      );

      config.onRetry?.(attempt + 1, lastError, delay);
      await sleep(delay);
    }
  }

  throw lastError!;
}
