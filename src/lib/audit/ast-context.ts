/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import Parser from "tree-sitter";
import RustGrammar from "tree-sitter-rust";
import TypeScriptGrammar from "tree-sitter-typescript";
import type {
  AnalysisContext,
  CallGraphEdge,
  CodeSpan,
  FunctionInsight,
  SourceFile,
  StructuredFileSummary,
} from "@/types/audit";

type RustAttributeSet = {
  isAccounts: boolean;
  isProgram: boolean;
};

type RustAccountStruct = {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    attributes: string[];
  }>;
  hasSignerField: boolean;
  hasOwnershipField: boolean;
  hasAnchorConstraints: boolean;
  hasCloseAuthority: boolean;
  evidence: CodeSpan[];
};

type FileAnalysis = {
  summary: StructuredFileSummary;
  functions: FunctionInsight[];
  callGraph: CallGraphEdge[];
  accountStructs: RustAccountStruct[];
  framework: "anchor" | "native" | "unknown";
};

const COMMON_CALL_KEYWORDS = new Set([
  "if",
  "for",
  "while",
  "match",
  "loop",
  "return",
  "let",
  "const",
  "fn",
  "pub",
  "else",
  "true",
  "false",
  "Some",
  "None",
  "Ok",
  "Err",
  "await",
  "use",
  "struct",
  "enum",
  "impl",
  "self",
  "super",
]);

function detectLanguage(file: SourceFile): string {
  if (file.language) return file.language;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "rs":
      return "rust";
    case "sol":
      return "solidity";
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "toml":
      return "toml";
    case "py":
      return "python";
    default:
      return "text";
  }
}

function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}

function sourceLineCount(content: string): number {
  return splitLines(content).length;
}

function buildParser(language: string): Parser | null {
  const parser = new Parser();
  try {
    if (language === "rust") {
      parser.setLanguage(RustGrammar as any);
      return parser;
    }

    if (language === "tsx" || language === "jsx") {
      parser.setLanguage(TypeScriptGrammar.tsx as any);
      return parser;
    }

    if (language === "typescript" || language === "javascript") {
      parser.setLanguage(TypeScriptGrammar.typescript as any);
      return parser;
    }
  } catch (error) {
    console.warn(`[ast-context] Failed to initialize parser for ${language}:`, error);
  }

  return null;
}

function makeSpan(
  file: SourceFile,
  node: { startPosition: { row: number }; endPosition: { row: number } } & { text?: string },
  note?: string
): CodeSpan {
  return {
    file: file.name,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    snippet: (node.text || "").slice(0, 1400),
    note,
  };
}

function collectNamedChildren(node: any): any[] {
  const children: any[] = [];
  for (let i = 0; i < node.namedChildCount; i += 1) {
    children.push(node.namedChild(i));
  }
  return children;
}

function walk(node: any, visit: (node: any) => void): void {
  visit(node);
  for (let i = 0; i < node.namedChildCount; i += 1) {
    walk(node.namedChild(i), visit);
  }
}

function textFromNode(node: any | undefined): string {
  return node?.text || "";
}

function linePrefix(text: string, lineNumber: number): string {
  const lines = splitLines(text);
  return lines[lineNumber - 1] || "";
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function hasExplicitSignerSignal(text: string): boolean {
  const normalized = text.toLowerCase();
  return hasAny(normalized, [
    /signer<'info>/,
    /signer<\s*'info>/,
    /\bis_signer\b/,
  ]);
}

function hasExplicitOwnershipSignal(text: string): boolean {
  const normalized = text.toLowerCase();
  return hasAny(normalized, [
    /\bhas_one\b/,
    /\bowner\s*==/,
    /\baccount\.owner\b/,
    /\bexpected_owner\b/,
  ]);
}

function extractRustFieldSignals(fieldType: string, attributes: string[]): {
  signer: boolean;
  ownership: boolean;
  anchorConstraints: boolean;
  closeAuthority: boolean;
} {
  const combined = `${fieldType} ${attributes.join(" ")}`.toLowerCase();

  return {
    signer: hasExplicitSignerSignal(combined),
    ownership: hasExplicitOwnershipSignal(combined),
    anchorConstraints: hasAny(combined, [
      /\bseeds\b/,
      /\bbump\b/,
      /\bconstraint\b/,
      /\bhas_one\b/,
    ]),
    closeAuthority: hasAny(combined, [
      /\bclose\s*=/,
      /\bclose_authority\b/,
      /\bclose_account\b/,
    ]),
  };
}

function isRustAnchorAttribute(text: string): RustAttributeSet {
  const normalized = text.toLowerCase();
  return {
    isAccounts: normalized.includes("derive(accounts)"),
    isProgram: normalized.includes("program"),
  };
}

function extractRustAccountStructs(root: any, file: SourceFile): Map<string, RustAccountStruct> {
  const structs = new Map<string, RustAccountStruct>();

  function scanContainer(node: any): void {
    let pendingAttrs: string[] = [];
    for (let i = 0; i < node.namedChildCount; i += 1) {
      const child = node.namedChild(i);

      if (child.type === "attribute_item") {
        pendingAttrs.push(child.text);
        continue;
      }

      if (child.type === "struct_item") {
        const structAttrs = pendingAttrs.join("\n");
        pendingAttrs = [];
        const attrFlags = isRustAnchorAttribute(structAttrs);
        if (attrFlags.isAccounts) {
          const nameNode = child.childForFieldName("name") || child.namedChild(1);
          const fieldList = child.childForFieldName("body") || child.namedChild(child.namedChildCount - 1);
          const name = textFromNode(nameNode);
          const fields: RustAccountStruct["fields"] = [];
          let hasSignerField = false;
          let hasOwnershipField = false;
          let hasAnchorConstraints = false;
          let hasCloseAuthority = false;
          let fieldAttrs: string[] = [];

          if (fieldList) {
            for (let j = 0; j < fieldList.namedChildCount; j += 1) {
              const fieldChild = fieldList.namedChild(j);
              if (fieldChild.type === "attribute_item") {
                fieldAttrs.push(fieldChild.text);
                continue;
              }

              if (fieldChild.type === "field_declaration") {
                const fieldName = textFromNode(fieldChild.childForFieldName("name") || fieldChild.namedChild(1));
                const fieldType = textFromNode(
                  fieldChild.childForFieldName("type") ||
                    fieldChild.namedChild(fieldChild.namedChildCount - 1)
                );
                const attributes = fieldAttrs;
                fieldAttrs = [];

                const fieldSignals = extractRustFieldSignals(fieldType, attributes);

                hasSignerField = hasSignerField || fieldSignals.signer;
                hasOwnershipField = hasOwnershipField || fieldSignals.ownership;
                hasAnchorConstraints = hasAnchorConstraints || fieldSignals.anchorConstraints;
                hasCloseAuthority = hasCloseAuthority || fieldSignals.closeAuthority;

                fields.push({
                  name: fieldName,
                  type: fieldType,
                  attributes,
                });
              } else {
                fieldAttrs = [];
              }
            }
          }

          structs.set(name, {
            name,
            fields,
            hasSignerField,
            hasOwnershipField,
            hasAnchorConstraints,
            hasCloseAuthority,
            evidence: [makeSpan(file, child, "Anchor account struct")],
          });
        }
        continue;
      }

      if (child.namedChildCount > 0) {
        scanContainer(child);
      }

      pendingAttrs = [];
    }
  }

  scanContainer(root);
  return structs;
}

function normalizeCallName(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*!\s*$/, "")
    .replace(/\s*\(.*$/, "")
    .replace(/::/g, "::");
}

function collectRustCalls(node: any): Array<{ callee: string; node: any }> {
  const calls: Array<{ callee: string; node: any }> = [];

  walk(node, (current) => {
    if (current.type === "call_expression" || current.type === "macro_invocation") {
      const firstChild = current.childForFieldName("function") || current.namedChild(0);
      const callee = normalizeCallName(textFromNode(firstChild));
      if (callee) {
        calls.push({ callee, node: current });
      }
    }
  });

  return calls;
}

function detectRustSignals(
  file: SourceFile,
  functionNode: any,
  rustAccounts: Map<string, RustAccountStruct>
): {
  stateWrites: boolean;
  externalCalls: boolean;
  signerChecks: boolean;
  ownershipChecks: boolean;
  remainingAccountsChecks: boolean;
  closeAuthorityChecks: boolean;
  riskSignals: string[];
  calls: string[];
  evidence: CodeSpan[];
} {
  const body = functionNode.childForFieldName("body") || functionNode.namedChild(functionNode.namedChildCount - 1);
  const signatureText = functionNode.text.slice(0, functionNode.text.indexOf("{")).trim();
  const bodyText = textFromNode(body);
  const calls = collectRustCalls(body).map((entry) => entry.callee);
  const callSet = new Set(calls);
  const riskSignals: string[] = [];
  const evidence: CodeSpan[] = [makeSpan(file, functionNode, "Function body")];
  const bodyLower = bodyText.toLowerCase();

  let stateWrites =
    /assignment_expression/.test(body?.type || "") ||
    /compound_assignment_expr/.test(body?.type || "") ||
    /update_expression/.test(body?.type || "") ||
    hasAny(bodyText, [
      /\.[A-Za-z0-9_]+\s*=(?![=])/,
      /\*[A-Za-z0-9_]+\s*=(?![=])/,
    ]) ||
    /borrow_mut\s*\(/.test(bodyText) ||
    /try_borrow_mut_data\s*\(/.test(bodyText) ||
    /set_inner\s*\(/.test(bodyText) ||
    /serialize\s*\(/.test(bodyText) ||
    /realloc\s*\(/.test(bodyText) ||
    /close\s*\(/.test(bodyText);

  let externalCalls =
    [...callSet].some((call) => {
      const normalized = call.toLowerCase();
      return (
        normalized.includes("invoke_signed") ||
        normalized.includes("invoke(") ||
        normalized.includes("transfer(") ||
        normalized.includes("mint_to") ||
        normalized.includes("burn") ||
        normalized.includes("sync_native") ||
        normalized.includes("system_program::transfer") ||
        normalized.includes("token::transfer") ||
        normalized.includes("spl_token") ||
        normalized.includes("cpi")
      );
    }) ||
    /invoke_signed\s*\(/.test(bodyText) ||
    /invoke\s*\(/.test(bodyText);

  const signatureContextMatches = signatureText.match(/Context<([A-Za-z0-9_]+)>/g) || [];
  let signerChecks = hasExplicitSignerSignal(bodyText);

  let ownershipChecks = hasExplicitOwnershipSignal(bodyText);
  let remainingAccountsChecks = false;
  let closeAuthorityChecks = false;

  for (const match of signatureContextMatches) {
    const structName = match.slice("Context<".length, -1);
    const accountStruct = rustAccounts.get(structName);
    if (accountStruct) {
      signerChecks = signerChecks || accountStruct.hasSignerField;
      ownershipChecks = ownershipChecks || accountStruct.hasOwnershipField;
      closeAuthorityChecks = closeAuthorityChecks || accountStruct.hasCloseAuthority;
      if (accountStruct.hasAnchorConstraints) {
        riskSignals.push(`anchor-constraints:${structName}`);
      }
      if (accountStruct.hasCloseAuthority) {
        riskSignals.push(`close-authority:${structName}`);
      }
    }
  }

  const usesRemainingAccounts = /remaining_accounts/.test(bodyLower);
  if (usesRemainingAccounts) {
    const remainingAccountsValidated = hasRemainingAccountsValidation(bodyText);
    remainingAccountsChecks = remainingAccountsValidated;
    riskSignals.push("remaining-accounts-boundary");
    if (!remainingAccountsValidated) {
      riskSignals.push("missing-remaining-accounts-signal");
    }
  }

  if (hasAny(bodyLower, [/close\s*=/, /close_account/, /close_authority/])) {
    closeAuthorityChecks = true;
    riskSignals.push("close-authority-boundary");
  }

  if (externalCalls) riskSignals.push("external-call");
  if (stateWrites) riskSignals.push("state-write");
  if (!signerChecks) riskSignals.push("missing-signer-signal");
  if (!ownershipChecks) riskSignals.push("missing-ownership-signal");

  if (externalCalls) {
    const externalNode = body ? body.namedChild(0) : functionNode;
    evidence.push(makeSpan(file, externalNode || functionNode, "Potential external interaction"));
  }

  return {
    stateWrites,
    externalCalls,
    signerChecks,
    ownershipChecks,
    remainingAccountsChecks,
    closeAuthorityChecks,
    riskSignals,
    calls: [...new Set(calls)].filter(Boolean),
    evidence,
  };
}

function parseRustFile(file: SourceFile): FileAnalysis {
  const parser = buildParser("rust");
  if (!parser) {
    return fallbackAnalysis(file);
  }

  const tree = parser.parse(file.content);
  const root = tree.rootNode;
  const rustAccounts = extractRustAccountStructs(root, file);
  const functions: FunctionInsight[] = [];
  const callGraph: CallGraphEdge[] = [];
  let suspiciousCount = 0;
  let foundAnchor = false;

  walk(root, (node) => {
    if (node.type === "attribute_item") {
      const normalized = node.text.toLowerCase();
      if (normalized.includes("derive(accounts)") || normalized.includes("program")) {
        foundAnchor = true;
      }
    }
  });

  function collectFunction(node: any): void {
    const nameNode = node.childForFieldName("name") || node.namedChild(1);
    const bodyNode = node.childForFieldName("body") || node.namedChild(node.namedChildCount - 1);
    const name = textFromNode(nameNode);
    if (!name || !bodyNode) return;

    const signatureText = node.text.includes("{") ? node.text.slice(0, node.text.indexOf("{")).trim() : node.text.trim();
    const {
      stateWrites,
      externalCalls,
      signerChecks,
      ownershipChecks,
      remainingAccountsChecks,
      closeAuthorityChecks,
      riskSignals,
      calls,
      evidence,
    } =
      detectRustSignals(file, node, rustAccounts);

    const conditionCount = countRustConditionals(bodyNode);
    const complexityScore =
      calls.length +
      conditionCount * 2 +
      (externalCalls ? 3 : 0) +
      (stateWrites ? 2 : 0) +
      (signerChecks ? 0 : 2) +
      (ownershipChecks ? 0 : 2);
    const complexity = complexityScore >= 8 ? "high" : complexityScore >= 4 ? "medium" : "low";

    const visibility = signatureText.trim().startsWith("pub ")
      ? "public"
      : signatureText.trim().startsWith("fn ")
        ? "private"
        : "unknown";

    const entryPointCandidate =
      visibility === "public" ||
      externalCalls ||
      stateWrites ||
      /Context<([A-Za-z0-9_]+)>/.test(signatureText);

    const functionEvidence = [...evidence];
    if (rustAccounts.size > 0) {
      const contextMatch = signatureText.match(/Context<([A-Za-z0-9_]+)>/);
      if (contextMatch) {
        const accountStruct = rustAccounts.get(contextMatch[1]);
        if (accountStruct) {
          functionEvidence.push(...accountStruct.evidence);
        }
      }
    }

    if (stateWrites || externalCalls || !signerChecks || !ownershipChecks) {
      suspiciousCount += 1;
    }

    functions.push({
      name,
      file: file.name,
      signature: signatureText,
      line: node.startPosition.row + 1,
      complexity,
      visibility,
      calls,
      stateWrites,
      externalCalls,
      signerChecks,
      ownershipChecks,
      remainingAccountsChecks,
      closeAuthorityChecks,
      evidence: functionEvidence,
      riskSignals,
    });

    if (entryPointCandidate) {
      // no-op here; the caller derives entry point hints from the synthesized function metadata
    }

    for (const call of calls) {
      callGraph.push({
        from: name,
        to: call,
        kind: isRustCpiCall(call) ? "cpi" : "internal",
        file: file.name,
        line: node.startPosition.row + 1,
        evidence: signatureText,
      });
    }
  }

  function scanRust(node: any): void {
    let pendingAttrs: string[] = [];

    for (let i = 0; i < node.namedChildCount; i += 1) {
      const child = node.namedChild(i);

      if (child.type === "attribute_item") {
        pendingAttrs.push(child.text);
        const normalized = child.text.toLowerCase();
        if (normalized.includes("derive(accounts)") || normalized.includes("program")) {
          foundAnchor = true;
        }
        continue;
      }

      if (child.type === "function_item") {
        collectFunction(child);
        pendingAttrs = [];
        continue;
      }

      if (child.namedChildCount > 0) {
        scanRust(child);
      }

      pendingAttrs = [];
    }
  }

  scanRust(root);

  const framework = foundAnchor ? "anchor" : "native";
  const lineCount = sourceLineCount(file.content);

  return {
    summary: {
      name: file.name,
      language: "rust",
      size: file.size ?? Buffer.byteLength(file.content, "utf-8"),
      lineCount,
      functionCount: functions.length,
      suspiciousFunctionCount: suspiciousCount,
    },
    functions,
    callGraph,
    accountStructs: Array.from(rustAccounts.values()),
    framework,
  };
}

function countRustConditionals(node: any): number {
  let count = 0;
  walk(node, (current) => {
    if (
      current.type === "if_expression" ||
      current.type === "match_expression" ||
      current.type === "loop_expression" ||
      current.type === "for_expression" ||
      current.type === "while_expression" ||
      current.type === "let_chain"
    ) {
      count += 1;
    }
  });
  return count;
}

function fallbackAnalysis(file: SourceFile): FileAnalysis {
  const lineCount = sourceLineCount(file.content);
  return {
    summary: {
      name: file.name,
      language: detectLanguage(file),
      size: file.size ?? Buffer.byteLength(file.content, "utf-8"),
      lineCount,
      functionCount: 0,
      suspiciousFunctionCount: 0,
    },
    functions: [],
    callGraph: [],
    accountStructs: [],
    framework: "unknown",
  };
}

function parseTypeScriptLikeFile(file: SourceFile): FileAnalysis {
  const language = detectLanguage(file);
  const parser = buildParser(language === "javascript" || language === "jsx" ? "typescript" : language);
  if (!parser) {
    return fallbackAnalysis(file);
  }

  const tree = parser.parse(file.content);
  const root = tree.rootNode;
  const functions: FunctionInsight[] = [];
  const callGraph: CallGraphEdge[] = [];
  let suspiciousCount = 0;

  walk(root, (node) => {
    if (node.type === "function_declaration" || node.type === "method_definition") {
      const nameNode = node.childForFieldName("name") || node.namedChild(1);
      const bodyNode = node.childForFieldName("body") || node.namedChild(node.namedChildCount - 1);
      const name = textFromNode(nameNode);
      if (!name || !bodyNode) return;

      const signatureText = node.text.includes("{") ? node.text.slice(0, node.text.indexOf("{")).trim() : node.text.trim();
      const stats = collectTypeScriptSignals(file, node, bodyNode);
      const complexityScore =
        stats.calls.length +
        stats.conditionCount * 2 +
        (stats.externalCalls ? 2 : 0) +
        (stats.stateWrites ? 1 : 0) +
        (stats.signerChecks ? 0 : 1);

      const complexity = complexityScore >= 8 ? "high" : complexityScore >= 4 ? "medium" : "low";
      const visibility = signatureText.trim().startsWith("export ") || signatureText.trim().startsWith("public ")
        ? "public"
        : "private";

      if (stats.stateWrites || stats.externalCalls || !stats.signerChecks || !stats.ownershipChecks) {
        suspiciousCount += 1;
      }

      functions.push({
        name,
        file: file.name,
        signature: signatureText,
        line: node.startPosition.row + 1,
        complexity,
        visibility,
        calls: stats.calls,
        stateWrites: stats.stateWrites,
        externalCalls: stats.externalCalls,
        signerChecks: stats.signerChecks,
        ownershipChecks: stats.ownershipChecks,
        remainingAccountsChecks: stats.remainingAccountsChecks,
        closeAuthorityChecks: stats.closeAuthorityChecks,
        evidence: [makeSpan(file, node, "Function body")],
        riskSignals: stats.riskSignals,
      });

      for (const call of stats.calls) {
        callGraph.push({
          from: name,
          to: call,
          kind: isTypeScriptExternalCall(call) ? "external" : "internal",
          file: file.name,
          line: node.startPosition.row + 1,
          evidence: signatureText,
        });
      }
    }
  });

  const framework = "unknown";
  return {
    summary: {
      name: file.name,
      language,
      size: file.size ?? Buffer.byteLength(file.content, "utf-8"),
      lineCount: sourceLineCount(file.content),
      functionCount: functions.length,
      suspiciousFunctionCount: suspiciousCount,
    },
    functions,
    callGraph,
    accountStructs: [],
    framework,
  };
}

function collectTypeScriptSignals(
  file: SourceFile,
  functionNode: any,
  bodyNode: any
): {
  stateWrites: boolean;
  externalCalls: boolean;
  signerChecks: boolean;
  ownershipChecks: boolean;
  remainingAccountsChecks: boolean;
  closeAuthorityChecks: boolean;
  riskSignals: string[];
  calls: string[];
  conditionCount: number;
} {
  const bodyText = textFromNode(bodyNode);
  const calls: string[] = [];
  let stateWrites = false;
  let externalCalls = false;
  let signerChecks = hasExplicitSignerSignal(functionNode.text);
  let ownershipChecks = hasExplicitOwnershipSignal(functionNode.text);
  let remainingAccountsChecks = false;
  let closeAuthorityChecks = /close\s*=|close_authority|close_account/i.test(functionNode.text);
  let conditionCount = 0;
  const riskSignals: string[] = [];

  walk(bodyNode, (node) => {
    if (node.type === "call_expression") {
      const callee = normalizeCallName(textFromNode(node.childForFieldName("function") || node.namedChild(0)));
      if (callee && !COMMON_CALL_KEYWORDS.has(callee)) {
        calls.push(callee);
      }
      if (isTypeScriptExternalCall(callee)) {
        externalCalls = true;
      }
    }

    if (
      node.type === "assignment_expression" ||
      node.type === "augmented_assignment_expression" ||
      node.type === "update_expression"
    ) {
      stateWrites = true;
    }

    if (
      node.type === "if_statement" ||
      node.type === "switch_statement" ||
      node.type === "while_statement" ||
      node.type === "for_statement"
    ) {
      conditionCount += 1;
    }
  });

  if (hasExplicitSignerSignal(bodyText)) signerChecks = true;
  if (hasExplicitOwnershipSignal(bodyText)) ownershipChecks = true;
  if (/remaining_accounts/i.test(bodyText)) remainingAccountsChecks = hasRemainingAccountsValidation(bodyText);
  if (/close\s*=|close_authority|close_account/i.test(bodyText)) closeAuthorityChecks = true;

  if (externalCalls) riskSignals.push("external-call");
  if (stateWrites) riskSignals.push("state-write");
  if (!signerChecks) riskSignals.push("missing-signer-signal");
  if (!ownershipChecks) riskSignals.push("missing-ownership-signal");
  if (/remaining_accounts/i.test(bodyText)) {
    riskSignals.push("remaining-accounts-boundary");
    if (!remainingAccountsChecks) riskSignals.push("missing-remaining-accounts-signal");
  }
  if (closeAuthorityChecks) riskSignals.push("close-authority-boundary");

  return {
    stateWrites,
    externalCalls,
    signerChecks,
    ownershipChecks,
    remainingAccountsChecks,
    closeAuthorityChecks,
    riskSignals,
    calls: [...new Set(calls)],
    conditionCount,
  };
}

function buildTrustBoundaries(analyses: FileAnalysis[]): AnalysisContext["trustBoundaries"] {
  const boundaries: AnalysisContext["trustBoundaries"] = [];

  for (const analysis of analyses) {
    for (const account of analysis.accountStructs) {
      const fieldNames = account.fields.map((field) => field.name).join(", ");
      boundaries.push({
        name: account.name,
        file: analysis.summary.name,
        kind: "account",
        description: `Anchor account struct with fields: ${fieldNames || "none"}. Signer gating: ${account.hasSignerField ? "present" : "missing"}. Ownership coverage: ${account.hasOwnershipField ? "present" : "missing"}. Constraint coverage: ${account.hasAnchorConstraints ? "present" : "missing"}.`,
        evidence: account.evidence,
      });

      if (account.hasAnchorConstraints) {
        boundaries.push({
          name: `${account.name}:anchor-constraints`,
          file: analysis.summary.name,
          kind: "pda",
          description: `Anchor constraints are present on ${account.name}; seeds, bump, and has_one checks should be treated as a trust boundary.`,
          evidence: account.evidence,
        });
      }

      if (!account.hasSignerField) {
        boundaries.push({
          name: `${account.name}:authority-gap`,
          file: analysis.summary.name,
          kind: "authority",
          description: `No explicit signer-like field detected for ${account.name}; authority assumptions may be implicit and should be validated manually.`,
          evidence: account.evidence,
        });
      }

      if (account.hasCloseAuthority) {
        boundaries.push({
          name: `${account.name}:close-authority`,
          file: analysis.summary.name,
          kind: "authority",
          description: `Close authority is configured on ${account.name}; closing or re-opening flows should be validated against the expected recipient and post-close state.`,
          evidence: account.evidence,
        });
      }
    }

    for (const fn of analysis.functions) {
      if (fn.riskSignals.includes("remaining-accounts-boundary")) {
        boundaries.push({
          name: `${fn.name}:remaining-accounts`,
          file: analysis.summary.name,
          kind: "external",
          description: `Function ${fn.name} uses remaining_accounts; each supplied account should be validated individually before use.`,
          evidence: fn.evidence,
        });
      }
    }
  }

  const deduped = new Map<string, (typeof boundaries)[number]>();
  for (const boundary of boundaries) {
    const key = `${boundary.file}:${boundary.name}:${boundary.kind}`;
    if (!deduped.has(key)) deduped.set(key, boundary);
  }

  return [...deduped.values()];
}

function buildValidationRules(analyses: FileAnalysis[]): AnalysisContext["validationRules"] {
  const rules: AnalysisContext["validationRules"] = [];

  for (const analysis of analyses) {
    for (const account of analysis.accountStructs) {
      for (const field of account.fields) {
        const fieldSignals = extractRustFieldSignals(field.type, field.attributes);

        if (fieldSignals.signer) {
          rules.push({
            name: `${account.name}.${field.name}: signer`,
            file: analysis.summary.name,
            category: "signer",
            severity: "hard",
            description: `Field ${field.name} is used as signer gating in ${account.name}; callers should prove signer authority before state transitions.`,
            evidence: account.evidence,
          });
        }

        if (fieldSignals.ownership) {
          rules.push({
            name: `${account.name}.${field.name}: ownership`,
            file: analysis.summary.name,
            category: "ownership",
            severity: "hard",
            description: `Field ${field.name} carries ownership / has_one semantics in ${account.name}; account owner and relation checks should be enforced.`,
            evidence: account.evidence,
          });
        }

        if (fieldSignals.anchorConstraints) {
          rules.push({
            name: `${account.name}.${field.name}: pda`,
            file: analysis.summary.name,
            category: "pda",
            severity: "hard",
            description: `Field ${field.name} participates in PDA derivation for ${account.name}; seeds and bump must be validated against expected derivation.`,
            evidence: account.evidence,
          });
        }

        if (fieldSignals.anchorConstraints) {
          rules.push({
            name: `${account.name}.${field.name}: constraint`,
            file: analysis.summary.name,
            category: "constraint",
            severity: "soft",
            description: `Field ${field.name} has Anchor constraints in ${account.name}; the constraint expression should be treated as part of the trust boundary.`,
            evidence: account.evidence,
          });
        }
      }

      if (account.hasCloseAuthority) {
        rules.push({
          name: `${account.name}: close authority`,
          file: analysis.summary.name,
          category: "close_authority",
          severity: "hard",
          description: `Close authority is present on ${account.name}; closing flows should be treated as an explicit authorization boundary.`,
          evidence: account.evidence,
        });
      }
    }

    for (const fn of analysis.functions) {
      if (fn.externalCalls) {
        rules.push({
          name: `${fn.name}: cpi`,
          file: fn.file,
          category: "cpi",
          severity: "hard",
          description: `Function ${fn.name} performs an external call / CPI-like interaction and should validate target program identity and post-state assumptions.`,
          evidence: fn.evidence,
        });
      }

      if (fn.riskSignals.includes("remaining-accounts-boundary")) {
        rules.push({
          name: `${fn.name}: remaining accounts`,
          file: fn.file,
          category: "remaining_accounts",
          severity: "hard",
          description: `Function ${fn.name} uses remaining_accounts; every supplied account should be validated before trust is extended to it.`,
          evidence: fn.evidence,
        });
      }
    }
  }

  const deduped = new Map<string, (typeof rules)[number]>();
  for (const rule of rules) {
    const key = `${rule.file}:${rule.name}:${rule.category}`;
    if (!deduped.has(key)) deduped.set(key, rule);
  }

  return [...deduped.values()];
}

function buildSummaryString(context: AnalysisContext): string {
  const fileBlock = context.files
    .map(
      (file) =>
        `- ${file.name} (${file.language}, ${file.lineCount} lines, ${file.functionCount} functions, ${file.suspiciousFunctionCount} suspicious)`
    )
    .join("\n");

  const hotspotBlock = context.hotspots
    .map((hotspot, index) => `${index + 1}. ${hotspot.file}::${hotspot.name} [${hotspot.score}] ${hotspot.reason}`)
    .join("\n");

  const entryPointBlock = context.entryPointHints
    .map((hint, index) => `${index + 1}. ${hint.file}::${hint.name} - ${hint.reason}`)
    .join("\n");

  const functionBlock = context.functions
    .slice(0, 24)
    .map(
      (fn) =>
        `- ${fn.file}::${fn.name} [${fn.complexity}, ${fn.visibility}] calls=${fn.calls.slice(0, 6).join(", ") || "none"} state=${fn.stateWrites ? "yes" : "no"} cpi=${fn.externalCalls ? "yes" : "no"} signer=${fn.signerChecks ? "yes" : "no"} owner=${fn.ownershipChecks ? "yes" : "no"} remaining=${fn.remainingAccountsChecks ? "yes" : "no"} close=${fn.closeAuthorityChecks ? "yes" : "no"}`
    )
    .join("\n");

  const callGraphBlock = context.callGraph
    .slice(0, 30)
    .map((edge) => `- ${edge.from} -> ${edge.to} (${edge.kind}) @ ${edge.file}:${edge.line}`)
    .join("\n");

  const trustBoundaryBlock = context.trustBoundaries
    .slice(0, 24)
    .map((boundary) => `- ${boundary.file}::${boundary.name} [${boundary.kind}] ${boundary.description}`)
    .join("\n");

  const validationRuleBlock = context.validationRules
    .slice(0, 24)
    .map((rule) => `- ${rule.file}::${rule.name} [${rule.category}/${rule.severity}] ${rule.description}`)
    .join("\n");

  return [
    `Framework: ${context.framework}`,
    `Files:\n${fileBlock || "none"}`,
    `Hotspots:\n${hotspotBlock || "none"}`,
    `Entry point hints:\n${entryPointBlock || "none"}`,
    `Trust boundaries:\n${trustBoundaryBlock || "none"}`,
    `Validation rules:\n${validationRuleBlock || "none"}`,
    `Functions:\n${functionBlock || "none"}`,
    `Call graph:\n${callGraphBlock || "none"}`,
  ].join("\n\n");
}

function hasRemainingAccountsValidation(bodyText: string): boolean {
  const lines = splitLines(bodyText.toLowerCase());
  const validationPatterns = [
    /\baccount_info\.(?:owner|key)\s*==/,
    /==\s*.*\baccount_info\.(?:owner|key)\b/,
    /\brequire!\s*\([^)]*\baccount_info\./,
    /\brequire_eq!\s*\([^)]*\baccount_info\./,
    /\bvalidate\b.*\baccount_info\b/,
    /\bverify\b.*\baccount_info\b/,
    /\bcheck\b.*\baccount_info\b/,
    /\bensure\b.*\baccount_info\b/,
  ];
  const validationTargetPatterns = [
    /\baccount_info\b/,
    /\bremaining_account\b/,
    /\bremaining_accounts\b/,
    /\baccount\.owner\b/,
    /\bexpected_owner\b/,
  ];

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes("remaining_accounts")) {
      continue;
    }

    const window = lines.slice(index, Math.min(index + 4, lines.length)).join(" ");
    if (
      validationPatterns.some((pattern) => pattern.test(window)) &&
      validationTargetPatterns.some((pattern) => pattern.test(window))
    ) {
      return true;
    }
  }

  return false;
}

function isRustCpiCall(callee: string): boolean {
  const normalized = callee.toLowerCase();
  return (
    normalized.includes("invoke_signed") ||
    normalized.includes("invoke(") ||
    normalized.includes("transfer(") ||
    normalized.includes("mint_to") ||
    normalized.includes("burn") ||
    normalized.includes("sync_native") ||
    normalized.includes("system_program::transfer") ||
    normalized.includes("token::transfer") ||
    normalized.includes("spl_token") ||
    normalized.includes("cpi")
  );
}

function isTypeScriptExternalCall(callee: string): boolean {
  const normalized = callee.toLowerCase();
  return (
    normalized.includes("fetch") ||
    normalized.includes("axios") ||
    normalized.includes("invoke") ||
    normalized.includes("transfer") ||
    normalized.includes("send") ||
    normalized.includes("post")
  );
}

function truncateText(text: string, limit = 220): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit - 1).trimEnd()}…`;
}

function formatEvidenceSpan(span: CodeSpan | undefined): string {
  if (!span) return "none";
  const location = `${span.file}:${span.startLine}-${span.endLine}`;
  const note = span.note ? ` (${span.note})` : "";
  return `${location}${note}: ${truncateText(span.snippet, 260)}`;
}

function findFunction(context: AnalysisContext, name: string, file: string): FunctionInsight | undefined {
  return context.functions.find((candidate) => candidate.name === name && candidate.file === file);
}

function renderFocusSection(
  title: string,
  items: string[],
  emptyText: string
): string {
  return `${title}:\n${items.length ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`}`;
}

export function renderPromptContext(context: AnalysisContext): string {
  const hotspotItems = context.hotspots.slice(0, 8).map((hotspot) => {
    const fn = findFunction(context, hotspot.name, hotspot.file);
    const evidence = fn?.evidence?.[0];
    const signature = fn?.signature ? ` | ${truncateText(fn.signature, 140)}` : "";
    const snippet = evidence ? ` | evidence: ${truncateText(evidence.snippet, 180)}` : "";
    return `${hotspot.file}::${hotspot.name} [${hotspot.score}] ${hotspot.reason}${signature}${snippet}`;
  });

  const entryPointItems = context.entryPointHints.slice(0, 8).map((hint) => {
    const fn = findFunction(context, hint.name, hint.file);
    const evidence = fn?.evidence?.[0];
    const snippet = evidence ? ` | evidence: ${truncateText(evidence.snippet, 180)}` : "";
    return `${hint.file}::${hint.name} - ${hint.reason}${snippet}`;
  });

  const trustBoundaryItems = context.trustBoundaries.slice(0, 8).map((boundary) => {
    const evidence = boundary.evidence?.[0];
    return `${boundary.file}::${boundary.name} [${boundary.kind}] ${boundary.description}${evidence ? ` | evidence: ${formatEvidenceSpan(evidence)}` : ""}`;
  });

  const validationRuleItems = context.validationRules.slice(0, 8).map((rule) => {
    const evidence = rule.evidence?.[0];
    return `${rule.file}::${rule.name} [${rule.category}/${rule.severity}] ${rule.description}${evidence ? ` | evidence: ${formatEvidenceSpan(evidence)}` : ""}`;
  });

  const criticalCallGraphItems = context.callGraph
    .filter((edge) => edge.kind !== "internal")
    .slice(0, 8)
    .map((edge) => `${edge.from} -> ${edge.to} (${edge.kind}) @ ${edge.file}:${edge.line} | ${truncateText(edge.evidence, 160)}`);

  return [
    `Framework: ${context.framework}`,
    `Files: ${context.files.length}, functions: ${context.functions.length}, hotspots: ${context.hotspots.length}, trust boundaries: ${context.trustBoundaries.length}, validation rules: ${context.validationRules.length}`,
    renderFocusSection("Priority hotspots", hotspotItems, "none detected"),
    renderFocusSection("Entry points", entryPointItems, "none detected"),
    renderFocusSection("Trust boundaries", trustBoundaryItems, "none detected"),
    renderFocusSection("Validation rules", validationRuleItems, "none detected"),
    renderFocusSection("Non-internal call graph", criticalCallGraphItems, "none detected"),
  ].join("\n\n");
}

export function buildAnalysisContext(sourceFiles: SourceFile[]): AnalysisContext {
  const analyses = sourceFiles.map((file) => {
    const language = detectLanguage(file);
    if (language === "rust") return parseRustFile(file);
    if (language === "typescript" || language === "javascript" || language === "tsx" || language === "jsx") {
      return parseTypeScriptLikeFile(file);
    }
    return fallbackAnalysis(file);
  });

  const files = analyses.map((entry) => entry.summary);
  const functions = analyses.flatMap((entry) => entry.functions);
  const callGraph = analyses.flatMap((entry) => entry.callGraph);
  const trustBoundaries = buildTrustBoundaries(analyses);
  const validationRules = buildValidationRules(analyses);

  const hotspots = functions
    .map((fn) => {
      const score =
        (fn.complexity === "high" ? 30 : fn.complexity === "medium" ? 15 : 5) +
        (fn.externalCalls ? 30 : 0) +
        (fn.stateWrites ? 15 : 0) +
        (fn.signerChecks ? 0 : 20) +
        (fn.ownershipChecks ? 0 : 10) +
        (fn.riskSignals.includes("remaining-accounts-boundary") ? 8 : 0) +
        (fn.riskSignals.includes("close-authority-boundary") ? 6 : 0) +
        Math.min(fn.calls.length, 10);

      const reasons = [
        fn.externalCalls ? "external interaction" : null,
        fn.stateWrites ? "state mutation" : null,
        !fn.signerChecks ? "missing signer signal" : null,
        !fn.ownershipChecks ? "missing ownership signal" : null,
        fn.riskSignals.includes("remaining-accounts-boundary") ? "remaining accounts boundary" : null,
        fn.riskSignals.includes("close-authority-boundary") ? "close authority boundary" : null,
        fn.complexity === "high" ? "high complexity" : null,
      ].filter(Boolean);

      return {
        name: fn.name,
        file: fn.file,
        reason: reasons.join(", ") || "structural candidate",
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const entryPointHints = functions
    .filter((fn) => fn.visibility === "public" || fn.externalCalls || fn.stateWrites || /Context</.test(fn.signature))
    .slice(0, 16)
    .map((fn) => ({
      name: fn.name,
      file: fn.file,
      reason: fn.externalCalls
        ? "exposes CPI or external interaction"
        : fn.stateWrites
          ? "mutates state"
          : "public surface",
    }));

  const hasRust = analyses.some((entry) => entry.summary.language === "rust");
  const hasAnchor = analyses.some((entry) => entry.framework === "anchor");
  const framework: AnalysisContext["framework"] = hasAnchor ? "anchor" : hasRust ? "native" : "unknown";

  return {
    framework,
    files,
    functions,
    callGraph,
    trustBoundaries,
    validationRules,
    hotspots,
    entryPointHints,
  };
}

export function renderAnalysisContext(context: AnalysisContext): string {
  return buildSummaryString(context);
}
