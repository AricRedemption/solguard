import { buildReportFilename, buildReportMarkdown, buildReportShareSummary, getReportVerdict } from "@/lib/audit/report-presenter";
import { translations } from "@/lib/i18n/translations";
import type { AuditReportSnapshot } from "@/lib/audit/report-store";

const sampleReport = {
  id: "report_123",
  createdAt: "2026-04-27T00:00:00.000Z",
  sourceMode: "files",
  memorySaved: true,
  inputSummary: {
    sourceMode: "files",
    fileCount: 1,
    fileNames: ["program.rs"],
    githubUrls: [],
  },
  llm: {
    provider: "openai",
    supplier: "openai-direct",
    model: "gpt-4.1",
  },
  result: {
    timestamp: "2026-04-27T00:00:00.000Z",
    overallScore: 91,
    summary: {
      critical: 0,
      high: 1,
      medium: 0,
      low: 0,
    },
    vulnerabilities: [
      {
        id: "vuln_1",
        title: "Unsafe authority check",
        severity: "high",
        description: "An authority check can be bypassed under edge cases.",
        location: "program.rs:L42",
        codeSnippet: {
          code: "if !authority.is_signer { return Err(ErrorCode::MissingAuthority.into()); }",
          language: "rust",
          highlightLine: 42,
        },
        confidence: 0.91,
      },
      {
        id: "vuln_2",
        title: "Unchecked mint authority",
        severity: "medium",
        description: "The mint authority is not validated before the CPI call.",
        location: "program.rs:88-91",
        codeSnippet: {
          code: "token::mint_to(ctx.accounts.mint_to_ctx(), amount)?;",
          language: "rust",
          highlightLine: 90,
        },
        evidence: [
          {
            file: "program.rs",
            startLine: 88,
            endLine: 91,
            snippet: "ctx.accounts.mint.authority == Some(ctx.accounts.authority.key())",
            note: "Anchor account constraint",
          },
        ],
        confidence: 0.84,
      },
    ],
    recommendations: [
      "Tighten the authority gate before shipping.",
      "Validate mint authority before invoking token minting.",
    ],
    analysisContext: {
      framework: "anchor",
      files: [
        {
          name: "program.rs",
          language: "rust",
          size: 1024,
          lineCount: 42,
          functionCount: 1,
          suspiciousFunctionCount: 1,
        },
      ],
      functions: [],
      callGraph: [],
      trustBoundaries: [],
      validationRules: [],
      hotspots: [],
      entryPointHints: [],
    },
  },
  timeline: [
    {
      id: "event_1",
      timestamp: "2026-04-27T00:00:00.000Z",
      workflow: "security-audit",
      title: "Security audit complete",
      detail: "Found 1 potential vulnerabilities",
      status: "done",
    },
  ],
  memory: {
    id: "memory_123",
    reportId: "report_123",
    createdAt: "2026-04-27T00:00:00.000Z",
    title: "Stable snapshot",
    summary: "Saved reports should be immutable once written.",
    keySignals: ["immutable"],
    focusAreas: ["snapshot"],
    confidence: 0.9,
    utility: 0.82,
    recency: 0.94,
    risk: 0.12,
    sourceType: "report",
    recallCount: 0,
  },
} satisfies AuditReportSnapshot;

const dashboard = translations.en.dashboard;

const verdict = getReportVerdict(sampleReport);
const summary = buildReportShareSummary(sampleReport, dashboard);
const markdown = buildReportMarkdown(sampleReport, dashboard);
const filename = buildReportFilename(sampleReport);

if (!markdown.includes("Evidence")) {
  throw new Error("Expected markdown export to render an evidence section.");
}

if (!markdown.includes("Confidence Notes")) {
  throw new Error("Expected markdown export to render a confidence section.");
}

if (!markdown.includes("Not verified")) {
  throw new Error("Expected markdown export to surface missing verification notes.");
}

if (!markdown.includes("Thin evidence")) {
  throw new Error("Expected markdown export to flag inferred evidence as thin.");
}

if (!markdown.includes("program.rs:42")) {
  throw new Error("Expected derived evidence to include the location line.");
}

if (!markdown.includes("Anchor account constraint")) {
  throw new Error("Expected explicit evidence notes to be preserved.");
}

void verdict;
void summary;
void markdown;
void filename;
