import OpenAI from "openai";
import type { LLMConfig, LLMCallOptions, LLMResponse, LLMMessage } from "@/types/llm";
import type { LLMProvider } from "./provider";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL || undefined,
    });
    this.model = config.model;
  }

  async call(options: LLMCallOptions): Promise<LLMResponse> {
    const { system, messages } = this.splitMessages(options.messages);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0,
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const message = response.choices[0]?.message;
    return {
      content: message?.content || "",
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  async *callStreaming(options: LLMCallOptions): AsyncIterable<string> {
    const { system, messages } = this.splitMessages(options.messages);

    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature ?? 0,
      stream: true,
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

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
    messages: LLMMessage[];
  } {
    const systemParts: string[] = [];
    const apiMessages: LLMMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemParts.push(msg.content);
      } else {
        apiMessages.push(msg);
      }
    }

    return { system: systemParts.join("\n\n"), messages: apiMessages };
  }
}
