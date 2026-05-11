import { loadSkillWithReferences } from "./loader";

const SOLANA_PREPEND = `IMPORTANT: You are auditing a Solana program written in Rust. Adapt all Solidity/EVM-specific guidance to Solana equivalents:
- "contract" means "program" or "module"
- "msg.sender" means "signer" or "authority"
- "external calls" means "CPI (Cross-Program Invocations)"
- "storage" means "account data"
- "modifiers" means "Anchor constraints" or "account validation"
- "reentrancy" means "CPI reentrancy"
- "Checks-Effects-Interactions" becomes "Validate Accounts → Update State → CPI"
- "overflow/underflow" in Rust uses checked_* methods or wrapping arithmetic
- Access control in Solana is via account constraints (has_one, constraint), not function modifiers
- PDA derivation can serve as implicit authorization
- Rent-exempt accounts are a Solana-specific concern

Solana Critical Vulnerability Patterns (always check for these):
1. Arbitrary CPI — CPI target program ID is user-controlled, allowing redirect to malicious program
2. Improper PDA Validation — PDA seeds not verified or bump seed not checked against stored value
3. Missing Signer Check — Sensitive operations lack is_signer / Signer<'info> verification
4. Account Substitution / Type Confusion — Account discriminator not checked; wrong type accepted
5. Missing Ownership Check — Account owner not verified as expected program
6. Anchor Constraint Bypass — has_one, constraint, mut constraints can be circumvented
7. Remaining Accounts Abuse — ctx.remaining_accounts used without per-account validation
8. Close Account Resurrection — Closed accounts can be re-opened if lamports are sent back
9. Token-2022 Extension Risks — CPI guard, confidential transfers, transfer fee bypass

You MUST output your analysis as structured JSON as specified in the user prompt.`;

const PHASE_CONFIG = [
  {
    skill: "entry-point-analyzer",
    references: ["references/solana.md"],
  },
  {
    skill: "audit-context-building",
    references: [
      "resources/OUTPUT_REQUIREMENTS.md",
      "resources/COMPLETENESS_CHECKLIST.md",
      "resources/SOLANA_PROJECT_STRUCTURE.md",
      "resources/SOLANA_MICRO_ANALYSIS_EXAMPLE.md",
    ],
  },
  {
    skill: "solana-security-audit",
    references: [
      "references/solana-vulnerability-patterns.md",
      "references/solana-severity-decision-tree.md",
      "references/solana-secure-patterns.md",
    ],
  },
  {
    skill: "variant-analysis",
    references: [
      "resources/variant-report-template.md",
      "resources/solana-variant-patterns.md",
    ],
  },
  {
    skill: "solana-security-audit",
    references: ["references/solana-report-template.md"],
  },
] as const;

export interface PhasePrompt {
  system: string;
  phaseName: string;
}

export async function loadPhasePrompts(): Promise<PhasePrompt[]> {
  const results = await Promise.all(
    PHASE_CONFIG.map(async (config) => {
      const { skillPrompt, references } = await loadSkillWithReferences(
        config.skill,
        [...config.references]
      );

      const refContent = Object.entries(references)
        .map(([name, content]) => `\n\n--- Reference: ${name} ---\n${content}`)
        .join("");

      return {
        system: SOLANA_PREPEND + "\n\n" + skillPrompt + refContent,
        phaseName: config.skill,
      };
    })
  );

  return results;
}

export const PHASE_NAMES = [
  "Entry Point Discovery",
  "Context Building",
  "Security Audit",
  "Variant Analysis",
  "Report Generation",
] as const;

export const PHASE_DESCRIPTIONS = [
  "Discovering entry points and classifying access levels",
  "Building deep architectural context and trust boundaries",
  "Analyzing for vulnerabilities using Solana-specific taxonomy",
  "Searching for vulnerability variants and confirming findings",
  "Generating structured audit report with scores and recommendations",
] as const;
