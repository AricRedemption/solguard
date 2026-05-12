import { NextRequest } from "next/server";
import { runAuditPipeline } from "@/lib/audit/pipeline";
import { fetchGitHubUrls } from "@/lib/github-fetcher";
import type { AuditRequest, AuditSSEEvent } from "@/types/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 50;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
const ALLOWED_EXTENSIONS = [".rs", ".toml", ".ts", ".tsx", ".js", ".jsx", ".sol", ".py"];
const DEFAULT_JINA_READER_BASE_URL = "https://r.jina.ai/";

function createAuditRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `run_${crypto.randomUUID()}`;
  }

  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function validateFileName(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  return ALLOWED_EXTENSIONS.includes(ext);
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 255);
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: AuditSSEEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      const abortController = new AbortController();
      const cleanup = () => abortController.abort();
      request.signal.addEventListener("abort", cleanup);

      try {
        const body: AuditRequest = await request.json();
        const runId = createAuditRunId();
        const createdAt = new Date().toISOString();
        const awarenessEntries = Array.isArray(body.awarenessEntries) ? body.awarenessEntries : [];

        // Validate files or GitHub URLs exist
        if ((!body.files || body.files.length === 0) && (!body.githubUrls || body.githubUrls.length === 0)) {
          sendEvent({ type: "error", message: "No files provided" });
          controller.close();
          return;
        }

        // Validate file count
        if (body.files && body.files.length > MAX_FILES) {
          sendEvent({
            type: "error",
            message: `Too many files. Maximum allowed: ${MAX_FILES}`,
          });
          controller.close();
          return;
        }

        // Validate file size and extensions
        let totalSize = 0;
        if (body.files) {
          for (const file of body.files) {
            // Check file name extension
            if (!validateFileName(file.name)) {
              sendEvent({
                type: "error",
                message: `Invalid file type: ${file.name}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`,
              });
              controller.close();
              return;
            }

            // Check individual file size
            const fileSize = Buffer.byteLength(file.content, "utf-8");
            if (fileSize > MAX_FILE_SIZE) {
              sendEvent({
                type: "error",
                message: `File too large: ${file.name}. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
              });
              controller.close();
              return;
            }

            totalSize += fileSize;

            // Check total size
            if (totalSize > MAX_TOTAL_SIZE) {
              sendEvent({
                type: "error",
                message: `Total size too large. Maximum: ${MAX_TOTAL_SIZE / 1024 / 1024}MB`,
              });
              controller.close();
              return;
            }

            // Sanitize file name for safety
            file.name = sanitizeFileName(file.name);
          }
        }

        // Validate LLM config
        if (!body.llmConfig?.apiKey) {
          sendEvent({ type: "error", message: "API key not configured" });
          controller.close();
          return;
        }

        const inputSummary = {
          sourceMode: body.githubUrls && body.githubUrls.length > 0 ? "github" : "files",
          fileCount: body.files?.length ?? 0,
          fileNames: body.files?.map((file) => file.name) ?? [],
          githubUrls: body.githubUrls ?? [],
        } as const;

        sendEvent({
          type: "run_start",
          runSnapshot: {
            id: runId,
            createdAt,
            progress: 0,
            currentPhase: null,
            currentAgent: null,
            currentWorkflow: null,
            timeline: [],
            inputSummary,
            resultId: null,
          },
        });

        sendEvent({ type: "progress", progress: 0, phase: "start", detail: "Starting audit..." });

        // Fetch GitHub URLs if provided
        let allFiles = body.files || [];
        if (body.githubUrls && body.githubUrls.length > 0) {
          sendEvent({ type: "progress", progress: 2, phase: "start", detail: "Fetching GitHub URLs..." });
          try {
            const githubFiles = await fetchGitHubUrls(body.githubUrls, DEFAULT_JINA_READER_BASE_URL);
            allFiles = [...allFiles, ...githubFiles];
            sendEvent({ type: "progress", progress: 5, phase: "start", detail: `Fetched ${githubFiles.length} file(s) from GitHub` });
          } catch {
            sendEvent({ type: "progress", progress: 5, phase: "start", detail: "Warning: Failed to fetch some GitHub URLs" });
          }
        }

        if (allFiles.length === 0) {
          sendEvent({ type: "error", message: "No files available after fetching" });
          controller.close();
          return;
        }

        await runAuditPipeline({
          files: allFiles,
          llmConfig: body.llmConfig,
          awarenessEntries,
          onEvent: sendEvent,
          signal: abortController.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          sendEvent({ type: "error", message: "Audit cancelled" });
        } else {
          console.error("[Audit API Error]", error);
          sendEvent({
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } finally {
        request.signal.removeEventListener("abort", cleanup);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
