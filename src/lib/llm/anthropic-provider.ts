import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { LLMConfig, LLMCallOptions, LLMResponse, LLMMessage } from "@/types/llm";
import type { LLMProvider } from "./provider";

export type AnthropicTransportMode = "anthropic" | "openai";

function normalizeBaseURL(baseURL?: string): string {
  return (baseURL || "").trim().replace(/\/+$/, "");
}

export function resolveAnthropicTransportMode(config: LLMConfig): AnthropicTransportMode {
  const baseURL = normalizeBaseURL(config.baseURL);

  if (config.supplier !== "custom") {
    return "anthropic";
  }

  if (!baseURL) {
    return "anthropic";
  }

  const normalized = baseURL.toLowerCase();
  if (normalized.includes("anthropic")) {
    return "anthropic";
  }

  if (normalized.includes("/v1")) {
    return "openai";
  }

  return "anthropic";
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private openaiClient: OpenAI;
  private model: string;
  private transportMode: AnthropicTransportMode;

  constructor(config: LLMConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL || undefined,
    });
    this.openaiClient = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || undefined,
    });
    this.model = config.model;
    this.transportMode = resolveAnthropicTransportMode(config);
  }

  async call(options: LLMCallOptions): Promise<LLMResponse> {
    if (this.transportMode === "openai") {
      return this.callOpenAI(options);
    }

    const { system, messages } = this.splitMessages(options.messages);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0,
      system: system || undefined,
      messages,
    }, options.signal ? { signal: options.signal } : undefined);

    const textBlock = response.content.find((block) => block.type === "text");
    return {
      content: textBlock?.text || "",
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async *callStreaming(options: LLMCallOptions): AsyncIterable<string> {
    if (this.transportMode === "openai") {
      yield* this.callStreamingOpenAI(options);
      return;
    }

    const { system, messages } = this.splitMessages(options.messages);

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0,
      system: system || undefined,
      messages,
    }, options.signal ? { signal: options.signal } : undefined);

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const text = event.delta.text;
        options.onChunk?.(text);
        yield text;
      }
    }
  }

  private async callOpenAI(options: LLMCallOptions): Promise<LLMResponse> {
    const chatMessages = this.buildOpenAIMessages(options.messages);
    const response = await this.openaiClient.chat.completions.create({
      model: this.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0,
      messages: chatMessages,
    });

    const message = response.choices[0]?.message;
    const content = this.extractOpenAIContent(message?.content);

    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  private async *callStreamingOpenAI(options: LLMCallOptions): AsyncIterable<string> {
    const chatMessages = this.buildOpenAIMessages(options.messages);
    const stream = await this.openaiClient.chat.completions.create({
      model: this.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0,
      stream: true,
      messages: chatMessages,
    }, options.signal ? { signal: options.signal } : undefined);

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        options.onChunk?.(text);
        yield text;
      }
    }
  }

  private splitMessages(messages: LLMMessage[]): {
    system: string;
    messages: Anthropic.MessageParam[];
  } {
    const systemParts: string[] = [];
    const apiMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemParts.push(msg.content);
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    return { system: systemParts.join("\n\n"), messages: apiMessages };
  }

  private buildOpenAIMessages(messages: LLMMessage[]): ChatCompletionMessageParam[] {
    const chatMessages: ChatCompletionMessageParam[] = [];

    for (const message of messages) {
      if (message.role === "system") {
        chatMessages.push({ role: "system", content: message.content });
      } else {
        chatMessages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    return chatMessages;
  }

  private extractOpenAIContent(content: string | Array<{ text?: string }> | null | undefined): string {
    if (typeof content === "string") {
      return content;
    }

    if (!Array.isArray(content)) {
      return "";
    }

    return content
      .map((part) => (part && typeof part.text === "string" ? part.text : ""))
      .join("");
  }
}
