import type { CodeSpan } from "@/types/audit";
import { buildReportEvidenceBlockModel } from "./evidence-block";

const explicitEvidence = [
  {
    file: "program.rs",
    startLine: 88,
    endLine: 91,
    snippet: "ctx.accounts.mint.authority == Some(ctx.accounts.authority.key())",
    note: "Anchor account constraint",
  },
  {
    file: "program.rs",
    startLine: 104,
    endLine: 104,
    snippet: "token::mint_to(ctx.accounts.mint_to_ctx(), amount)?;",
  },
  {
    file: "program.rs",
    startLine: 111,
    endLine: 113,
    snippet: "unchecked mint authority branch",
  },
] satisfies CodeSpan[];

const explicitBlock = buildReportEvidenceBlockModel(explicitEvidence, {
  spansLabel: "evidence spans",
  noEvidenceLabel: "No evidence captured.",
  snippetLimit: 120,
});

if (explicitBlock.summaryText !== "3 evidence spans") {
  throw new Error("Expected the compact evidence block to summarize the evidence count.");
}

if (explicitBlock.items.length !== 2) {
  throw new Error("Expected the compact evidence block to render only the first two spans.");
}

if (explicitBlock.moreCount !== 1) {
  throw new Error("Expected the compact evidence block to report the remaining span count.");
}

if (explicitBlock.items[0].note !== "Anchor account constraint") {
  throw new Error("Expected explicit evidence notes to be preserved in the compact block.");
}

const missingBlock = buildReportEvidenceBlockModel(undefined, {
  spansLabel: "evidence spans",
  noEvidenceLabel: "No evidence captured.",
  snippetLimit: 120,
});

if (missingBlock.summaryText !== "No evidence captured.") {
  throw new Error("Expected the compact evidence block to surface the empty-state label.");
}

if (missingBlock.items.length !== 0 || missingBlock.moreCount !== 0) {
  throw new Error("Expected the compact evidence block to stay empty when no evidence exists.");
}
