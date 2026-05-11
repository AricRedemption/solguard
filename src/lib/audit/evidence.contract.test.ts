import { deriveEvidenceSpan, normalizeEvidence } from "@/lib/audit/evidence";

const unparseableLocation = normalizeEvidence({
  location: "definitely-not-a-file:or-line",
});

if (unparseableLocation !== undefined) {
  throw new Error("Expected an unparseable location without a snippet to return no evidence.");
}

const snippetOnlyEvidence = deriveEvidenceSpan("definitely-not-a-file:or-line", {
  code: "token::mint_to(ctx.accounts.mint_to_ctx(), amount)?;",
  language: "rust",
  highlightLine: 19,
});

if (!snippetOnlyEvidence) {
  throw new Error("Expected a code snippet to anchor snippet-only evidence.");
}

if (snippetOnlyEvidence.file !== "[inline code snippet]") {
  throw new Error("Expected snippet-only evidence to use an explicit inline label.");
}

if (snippetOnlyEvidence.startLine !== 19 || snippetOnlyEvidence.endLine !== 19) {
  throw new Error("Expected snippet-only evidence to preserve the snippet highlight line.");
}

if (!snippetOnlyEvidence.note?.includes("location hint not parsed")) {
  throw new Error("Expected snippet-only evidence to record that the location hint was not parsed.");
}
