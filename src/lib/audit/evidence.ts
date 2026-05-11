import type { CodeSpan, Vulnerability } from "@/types/audit";

const DERIVED_SNIPPET_LIMIT = 160;
const INLINE_SNIPPET_FILE = "[inline code snippet]";

type EvidenceSource = {
  evidence?: readonly CodeSpan[];
  location?: string;
  codeSnippet?: Vulnerability["codeSnippet"] | string;
};

export function normalizeEvidence(source: EvidenceSource): CodeSpan[] | undefined {
  if (source.evidence && source.evidence.length > 0) {
    return [...source.evidence];
  }

  const derived = deriveEvidenceSpan(source.location, source.codeSnippet);
  return derived ? [derived] : undefined;
}

export function deriveEvidenceSpan(
  location?: string,
  codeSnippet?: Vulnerability["codeSnippet"] | string
): CodeSpan | undefined {
  const trimmedLocation = location?.trim();
  const snippet = extractSnippet(codeSnippet);
  const parsedLocation = trimmedLocation ? parseLocationHint(trimmedLocation) : null;

  if (!parsedLocation && !snippet) {
    return undefined;
  }

  if (parsedLocation) {
    const startLine = parsedLocation.startLine ?? snippet?.highlightLine ?? 1;
    const endLine = parsedLocation.endLine ?? startLine;

    return {
      file: parsedLocation.file,
      startLine,
      endLine,
      snippet: snippet ? compactSnippet(snippet.code, DERIVED_SNIPPET_LIMIT) : "",
      note: buildEvidenceNote({
        hasLocation: true,
        hasSnippet: Boolean(snippet),
        parsedLocation: true,
      }),
    };
  }

  return {
    file: INLINE_SNIPPET_FILE,
    startLine: snippet?.highlightLine ?? 1,
    endLine: snippet?.highlightLine ?? 1,
    snippet: compactSnippet(snippet?.code ?? "", DERIVED_SNIPPET_LIMIT),
    note: buildEvidenceNote({
      hasLocation: Boolean(trimmedLocation),
      hasSnippet: Boolean(snippet),
      parsedLocation: false,
    }),
  };
}

export function formatEvidenceLocation(span: CodeSpan): string {
  const range = span.startLine === span.endLine ? `${span.startLine}` : `${span.startLine}-${span.endLine}`;
  return `${span.file}:${range}`;
}

export function formatEvidenceSnippet(snippet: string, limit = DERIVED_SNIPPET_LIMIT): string {
  return compactSnippet(snippet, limit);
}

export function formatEvidenceSpan(span: CodeSpan, limit = DERIVED_SNIPPET_LIMIT): string {
  const note = span.note ? ` (${span.note})` : "";
  return `${formatEvidenceLocation(span)}${note}: ${formatEvidenceSnippet(span.snippet, limit)}`;
}

export function isDerivedEvidence(span: CodeSpan): boolean {
  return Boolean(span.note?.startsWith("Derived"));
}

function extractSnippet(codeSnippet: Vulnerability["codeSnippet"] | string | undefined): { code: string; highlightLine: number } | null {
  if (!codeSnippet) {
    return null;
  }

  if (typeof codeSnippet === "string") {
    const trimmedCode = codeSnippet.trim();
    if (!trimmedCode) {
      return null;
    }

    return {
      code: trimmedCode,
      highlightLine: 1,
    };
  }

  const trimmedCode = codeSnippet.code.trim();
  if (!trimmedCode) {
    return null;
  }

  return {
    code: trimmedCode,
    highlightLine: codeSnippet.highlightLine,
  };
}

function parseLocationHint(location: string): { file: string; startLine?: number; endLine?: number } | null {
  const match = location.match(/^(.*?)(?::L?(\d+)(?:-L?(\d+))?)$/);
  if (!match) {
    return null;
  }

  const [, file, start, end] = match;
  const trimmedFile = file.trim();
  if (!trimmedFile) {
    return null;
  }

  return {
    file: trimmedFile,
    startLine: start ? Number(start) : undefined,
    endLine: end ? Number(end) : undefined,
  };
}

function compactSnippet(value: string, limit: number): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) {
    return compact;
  }

  return `${compact.slice(0, limit - 1).trimEnd()}…`;
}

function buildEvidenceNote({
  hasLocation,
  hasSnippet,
  parsedLocation,
}: {
  hasLocation: boolean;
  hasSnippet: boolean;
  parsedLocation: boolean;
}): string {
  const parts: string[] = ["Thin evidence"];

  if (hasLocation && hasSnippet) {
    parts.push("derived from location and code snippet");
  } else if (hasLocation) {
    parts.push(parsedLocation ? "derived from location" : "location hint not parsed");
  } else if (hasSnippet) {
    parts.push("derived from code snippet");
  }

  return parts.join("; ");
}
