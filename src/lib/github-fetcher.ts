import type { SourceFile } from "@/types/audit";

const GITHUB_BLOB_PATTERN = /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/;
const GITHUB_RAW_PATTERN = /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)/;
const JINA_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const JINA_MARKDOWN_MARKER = "Markdown Content:";

function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    rs: "rust",
    toml: "toml",
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    sol: "solidity",
    py: "python",
  };
  return map[ext] || "text";
}

function extractPathFromGitHubUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (parsed.hostname === "github.com") {
      const blobIndex = segments.indexOf("blob");
      if (blobIndex === 2 && segments.length > blobIndex + 2) {
        return segments.slice(blobIndex + 2).join("/");
      }
    }

    if (parsed.hostname === "raw.githubusercontent.com" && segments.length >= 4) {
      return segments.slice(3).join("/");
    }
  } catch {
    // Fall through to regex parsing for malformed URLs or non-standard inputs.
  }

  const blobMatch = url.match(GITHUB_BLOB_PATTERN);
  if (blobMatch) return blobMatch[4];

  const rawMatch = url.match(GITHUB_RAW_PATTERN);
  if (rawMatch) return rawMatch[4];

  return null;
}

export function toRawGitHubUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "raw.githubusercontent.com") {
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    const blobIndex = segments.indexOf("blob");
    if (parsed.hostname === "github.com" && blobIndex === 2 && segments.length > blobIndex + 2) {
      const [owner, repo, , ...rest] = segments;
      parsed.hostname = "raw.githubusercontent.com";
      parsed.pathname = `/${owner}/${repo}/${rest.join("/")}`;
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    }
  } catch {
    return url;
  }

  return url;
}

export function toJinaReaderUrl(url: string, jinaBaseUrl: string): string {
  const base = jinaBaseUrl.endsWith("/") ? jinaBaseUrl : `${jinaBaseUrl}/`;
  return `${base}${toRawGitHubUrl(url)}`;
}

function extractLargestFencedBlock(content: string): string | null {
  const matches = [...content.matchAll(/```(?:[\w-]+)?\n([\s\S]*?)```/g)];
  if (!matches.length) {
    return null;
  }

  return matches.reduce((largest, match) => (match[1].length > largest.length ? match[1] : largest), "");
}

export function normalizeJinaContent(content: string): string {
  const trimmed = content.replace(/^\uFEFF/, "").trim();
  const markerIndex = trimmed.indexOf(JINA_MARKDOWN_MARKER);

  if (markerIndex !== -1 && trimmed.slice(0, markerIndex).includes("URL Source:")) {
    const unwrapped = trimmed.slice(markerIndex + JINA_MARKDOWN_MARKER.length).trimStart();
    const fenced = extractLargestFencedBlock(unwrapped);
    return (fenced || unwrapped).trim();
  }

  const fenced = extractLargestFencedBlock(trimmed);
  return (fenced || trimmed).trim();
}

export async function fetchGitHubUrls(
  urls: string[],
  jinaBaseUrl: string
): Promise<SourceFile[]> {
  const results: Array<SourceFile | null> = await Promise.all(
    urls.map(async (url) => {
      try {
        // Keep jina.ai in the loop, but give it a raw file URL so it returns source text.
        const response = await fetch(toJinaReaderUrl(url, jinaBaseUrl), {
          headers: {
            Accept: "text/plain",
            "User-Agent": JINA_USER_AGENT,
          },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          console.warn(`Failed to fetch ${url}: ${response.status}`);
          return null;
        }

        const content = normalizeJinaContent(await response.text());
        const path = extractPathFromGitHubUrl(url);
        const name = path || url.split("/").pop() || "unknown";

        return {
          name,
          content,
          language: getLanguageFromPath(name),
          size: Buffer.byteLength(content, "utf-8"),
        } satisfies SourceFile;
      } catch (error) {
        console.warn(`Failed to fetch ${url}:`, error);
        return null;
      }
    })
  );

  return results.filter((item): item is SourceFile => item !== null);
}
