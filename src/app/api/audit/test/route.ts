import { NextRequest } from "next/server";
import { createProvider } from "@/lib/llm/provider";
import type { LLMConfig } from "@/types/llm";

export async function POST(request: NextRequest) {
  const { llm } = (await request.json()) as { llm: LLMConfig };

  if (!llm?.apiKey || !llm?.provider || !llm?.model) {
    return Response.json({ error: "LLM configuration required" }, { status: 400 });
  }

  try {
    const provider = await createProvider(llm);
    await provider.call({
      messages: [
        { role: "user", content: "Reply with OK" },
      ],
      maxTokens: 10,
      temperature: 0,
    });
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    return Response.json({ error: message }, { status: 400 });
  }
}