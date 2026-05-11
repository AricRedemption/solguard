import type { ConfidenceBucket } from "@/lib/audit/confidence";
import type { SourceFile } from "@/types/audit";

export type BenchmarkCorpusCategory = "known-bad" | "known-good" | "boundary";

export interface BenchmarkCorpusSample {
  id: string;
  title: string;
  category: BenchmarkCorpusCategory;
  sourceFiles: SourceFile[];
  expected: {
    snapshot: string;
    framework: "anchor" | "native" | "mixed" | "unknown";
    fileCount?: number;
    functionCount: number;
    suspiciousFunctionCount: number;
    hotspotCount: number;
    topHotspotScore: number;
    trustBoundaryCount: number;
    validationRuleCount: number;
    profileBucket: ConfidenceBucket;
    profileStructuralSignals: number;
    profileEvidenceSpans: number;
    profileConsensusCount: number;
    profileThinSurface: boolean;
    requiredValidationCategories?: Array<"signer" | "ownership" | "pda" | "constraint" | "cpi" | "remaining_accounts" | "close_authority">;
    requiredRiskSignals?: string[];
    forbiddenRiskSignals?: string[];
    requiredMissingSignals?: string[];
  };
}

function rustSource(content: string): SourceFile {
  return {
    name: "program.rs",
    language: "rust",
    content: content.trim(),
  };
}

function programPrelude(): string {
  return `
use anchor_lang::prelude::*;
use anchor_spl::token;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqkqK1kQjQfN3X8m8bXz1nZ");

#[account]
pub struct Vault {
    pub amount: u64,
    pub authority: Pubkey,
}
  `;
}

function accountStruct(options: {
  structName: string;
  vaultAttrs?: string;
  authorityField?: string;
  extraFields?: string[];
}): string {
  const { structName, vaultAttrs = "", authorityField = "pub authority: Signer<'info>,", extraFields = [] } = options;
  const lines = [
    "",
    "#[derive(Accounts)]",
    `pub struct ${structName}<'info> {`,
    `    #[account(mut${vaultAttrs ? `, ${vaultAttrs}` : ""})]`,
    "    pub vault: Account<'info, Vault>,",
  ];

  if (authorityField) {
    lines.push(`    ${authorityField}`);
  }

  for (const field of extraFields) {
    lines.push(`    ${field}`);
  }

  lines.push("}");
  return lines.join("\n");
}

function fnBlock(signature: string, body: string): string {
  return `
pub fn ${signature} {
${body.trimEnd()}
}
  `;
}

function buildProgram(options: {
  structName: string;
  vaultAttrs?: string;
  authorityField?: string;
  extraFields?: string[];
  functions?: string[];
}): SourceFile[] {
  const { functions = [] } = options;
  return [
    rustSource(
      [
        programPrelude(),
        accountStruct(options),
        ...functions,
      ].join("\n")
    ),
  ];
}

function makeSnapshot(expected: Omit<BenchmarkCorpusSample["expected"], "snapshot">): string {
  const topHotspotBand = Math.floor(expected.topHotspotScore / 10) * 10;

  return [
    `fw=${expected.framework}`,
    `files=${expected.fileCount ?? 1}`,
    `funcs=${expected.functionCount}`,
    `susp=${expected.suspiciousFunctionCount}`,
    `hot=${expected.hotspotCount}`,
    `topBand=${topHotspotBand}`,
    `rules=${expected.validationRuleCount}`,
    `profile=${expected.profileBucket}`,
    `struct=${expected.profileStructuralSignals}`,
    `ev=${expected.profileEvidenceSpans}`,
    `cons=${expected.profileConsensusCount}`,
    `thin=${expected.profileThinSurface ? "1" : "0"}`,
  ].join("|");
}

function expected(
  spec: Omit<BenchmarkCorpusSample["expected"], "snapshot">
): BenchmarkCorpusSample["expected"] {
  return {
    ...spec,
    snapshot: makeSnapshot(spec),
  };
}

const highTrustAttrs = "has_one = authority, seeds = [b\"vault\", authority.key().as_ref()], bump, close = authority";

export const benchmarkCorpus = [
  {
    id: "bad-01",
    title: "Unchecked remaining accounts with state write",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "UncheckedSweep",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "sweep(ctx: Context<UncheckedSweep>, amount: u64) -> Result<()>",
          `
    for account_info in ctx.remaining_accounts.iter() {
        let _ = account_info.key();
    }
    ctx.accounts.vault.amount = ctx.accounts.vault.amount.saturating_add(amount);
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 57,
      trustBoundaryCount: 3,
      validationRuleCount: 6,
      profileBucket: "strong",
      profileStructuralSignals: 12,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["remaining-accounts-boundary", "missing-remaining-accounts-signal", "state-write"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "remaining_accounts"],
    }),
  },
  {
    id: "bad-02",
    title: "Token transfer plus unchecked boundary",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "UncheckedTransfer",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "transfer(ctx: Context<UncheckedTransfer>, amount: u64) -> Result<()>",
          `
    for account_info in ctx.remaining_accounts.iter() {
        let _ = account_info.owner;
    }
    token::transfer(ctx.accounts.transfer_ctx(), amount)?;
    ctx.accounts.vault.amount = ctx.accounts.vault.amount.checked_sub(amount).unwrap();
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 88,
      trustBoundaryCount: 4,
      validationRuleCount: 7,
      profileBucket: "strong",
      profileStructuralSignals: 13,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["external-call", "state-write", "remaining-accounts-boundary", "missing-remaining-accounts-signal"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "remaining_accounts", "cpi"],
    }),
  },
  {
    id: "bad-03",
    title: "System transfer with unchecked state mutation",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "UncheckedSystemTransfer",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "forward(ctx: Context<UncheckedSystemTransfer>, lamports: u64) -> Result<()>",
          `
    system_program::transfer(&ctx.accounts.authority.to_account_info(), &ctx.accounts.vault.to_account_info(), lamports)?;
    ctx.accounts.vault.amount = ctx.accounts.vault.amount.saturating_sub(lamports);
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 80,
      trustBoundaryCount: 3,
      validationRuleCount: 6,
      profileBucket: "strong",
      profileStructuralSignals: 11,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["external-call", "state-write"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "cpi"],
    }),
  },
  {
    id: "bad-04",
    title: "Invoke signed without boundary validation",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "UncheckedInvoke",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "invoke(ctx: Context<UncheckedInvoke>) -> Result<()>",
          `
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.vault.key(),
        accounts: vec![],
        data: vec![],
    };
    invoke_signed(&ix, &[], &[])?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 49,
      trustBoundaryCount: 4,
      validationRuleCount: 6,
      profileBucket: "strong",
      profileStructuralSignals: 11,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["external-call"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "cpi"],
    }),
  },
  {
    id: "bad-05",
    title: "Mint to with state write",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "UncheckedMint",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "mint(ctx: Context<UncheckedMint>, amount: u64) -> Result<()>",
          `
    token::mint_to(ctx.accounts.mint_to_ctx(), amount)?;
    ctx.accounts.vault.amount = ctx.accounts.vault.amount.checked_add(amount).unwrap();
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 79,
      trustBoundaryCount: 3,
      validationRuleCount: 6,
      profileBucket: "strong",
      profileStructuralSignals: 11,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["external-call", "state-write"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "cpi"],
    }),
  },
  {
    id: "bad-06",
    title: "Close authority with unchecked remaining accounts",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "UncheckedClose",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "close(ctx: Context<UncheckedClose>) -> Result<()>",
          `
    for account_info in ctx.remaining_accounts.iter() {
        let _ = account_info.key();
    }
    ctx.accounts.vault.close(ctx.accounts.authority.to_account_info())?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 58,
      trustBoundaryCount: 3,
      validationRuleCount: 6,
      profileBucket: "strong",
      profileStructuralSignals: 12,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["remaining-accounts-boundary", "missing-remaining-accounts-signal", "state-write"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "remaining_accounts"],
    }),
  },
  {
    id: "bad-07",
    title: "Realloc with missing ownership proof",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "MissingOwnership",
      vaultAttrs: "seeds = [b\"vault\", authority.key().as_ref()], bump, close = authority",
      functions: [
        fnBlock(
          "resize(ctx: Context<MissingOwnership>) -> Result<()>",
          `
    ctx.accounts.vault.to_account_info().realloc(128, false)?;
    ctx.accounts.vault.amount = 0;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 42,
      trustBoundaryCount: 3,
      validationRuleCount: 4,
      profileBucket: "strong",
      profileStructuralSignals: 9,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["state-write", "missing-ownership-signal"],
      requiredValidationCategories: ["signer", "pda", "constraint", "close_authority"],
      requiredMissingSignals: ["ownership validation", "cpi validation", "remaining accounts validation"],
    }),
  },
  {
    id: "bad-08",
    title: "Burn plus unchecked remaining accounts",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "UncheckedBurn",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "burn(ctx: Context<UncheckedBurn>, amount: u64) -> Result<()>",
          `
    for account_info in ctx.remaining_accounts.iter() {
        let _ = account_info.key();
    }
    token::burn(ctx.accounts.burn_ctx(), amount)?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 73,
      trustBoundaryCount: 3,
      validationRuleCount: 7,
      profileBucket: "strong",
      profileStructuralSignals: 13,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["external-call", "remaining-accounts-boundary", "missing-remaining-accounts-signal"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "remaining_accounts", "cpi"],
    }),
  },
  {
    id: "bad-09",
    title: "Serialize after token transfer",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "UncheckedSerialize",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "serialize(ctx: Context<UncheckedSerialize>, amount: u64) -> Result<()>",
          `
    token::transfer(ctx.accounts.transfer_ctx(), amount)?;
    ctx.accounts.vault.serialize(&mut &mut [0u8; 64][..])?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 79,
      trustBoundaryCount: 4,
      validationRuleCount: 6,
      profileBucket: "strong",
      profileStructuralSignals: 11,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["external-call", "state-write"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "cpi"],
    }),
  },
  {
    id: "bad-10",
    title: "Remaining accounts plus close plus transfer",
    category: "known-bad",
    sourceFiles: buildProgram({
      structName: "UncheckedCombo",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "combo(ctx: Context<UncheckedCombo>, amount: u64) -> Result<()>",
          `
    for account_info in ctx.remaining_accounts.iter() {
        let _ = account_info.owner;
    }
    token::transfer(ctx.accounts.transfer_ctx(), amount)?;
    ctx.accounts.vault.close(ctx.accounts.authority.to_account_info())?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 89,
      trustBoundaryCount: 4,
      validationRuleCount: 7,
      profileBucket: "strong",
      profileStructuralSignals: 13,
      profileEvidenceSpans: 2,
      profileConsensusCount: 1,
      profileThinSurface: false,
      requiredRiskSignals: ["external-call", "state-write", "remaining-accounts-boundary", "missing-remaining-accounts-signal"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "remaining_accounts", "cpi"],
    }),
  },
  {
    id: "good-01",
    title: "Signer and ownership gate only",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "Initialize",
      vaultAttrs: "has_one = authority",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 2,
      validationRuleCount: 4,
      profileBucket: "thin",
      profileStructuralSignals: 6,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint"],
    }),
  },
  {
    id: "good-02",
    title: "Signer, ownership, and PDA guard",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "Rotate",
      vaultAttrs: "has_one = authority, seeds = [b\"vault\", authority.key().as_ref()], bump",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 2,
      validationRuleCount: 4,
      profileBucket: "thin",
      profileStructuralSignals: 6,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint"],
    }),
  },
  {
    id: "good-03",
    title: "Signer, ownership, and close authority",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "CloseOnly",
      vaultAttrs: "has_one = authority, close = authority",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 3,
      validationRuleCount: 5,
      profileBucket: "thin",
      profileStructuralSignals: 8,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority"],
    }),
  },
  {
    id: "good-04",
    title: "Signer, ownership, PDA, and close authority",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "Finalize",
      vaultAttrs: "has_one = authority, seeds = [b\"vault\", authority.key().as_ref()], bump, close = authority",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 3,
      validationRuleCount: 5,
      profileBucket: "thin",
      profileStructuralSignals: 8,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority"],
    }),
  },
  {
    id: "good-05",
    title: "Another clean signer and owner gate",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "Approve",
      vaultAttrs: "has_one = authority",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 2,
      validationRuleCount: 4,
      profileBucket: "thin",
      profileStructuralSignals: 6,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint"],
    }),
  },
  {
    id: "good-06",
    title: "PDA guarded account without logic",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "Prepare",
      vaultAttrs: "has_one = authority, seeds = [b\"vault\", authority.key().as_ref()], bump",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 2,
      validationRuleCount: 4,
      profileBucket: "thin",
      profileStructuralSignals: 6,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint"],
    }),
  },
  {
    id: "good-07",
    title: "Close authority only account",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "Archive",
      vaultAttrs: "has_one = authority, close = authority",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 3,
      validationRuleCount: 5,
      profileBucket: "thin",
      profileStructuralSignals: 8,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority"],
    }),
  },
  {
    id: "good-08",
    title: "PDA plus close authority without handlers",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "Seal",
      vaultAttrs: "has_one = authority, seeds = [b\"vault\", authority.key().as_ref()], bump, close = authority",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 3,
      validationRuleCount: 5,
      profileBucket: "thin",
      profileStructuralSignals: 8,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority"],
    }),
  },
  {
    id: "good-09",
    title: "Minimal signer and ownership gate",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "Confirm",
      vaultAttrs: "has_one = authority",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 2,
      validationRuleCount: 4,
      profileBucket: "thin",
      profileStructuralSignals: 6,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint"],
    }),
  },
  {
    id: "good-10",
    title: "Another PDA and close account",
    category: "known-good",
    sourceFiles: buildProgram({
      structName: "Lock",
      vaultAttrs: "has_one = authority, seeds = [b\"vault\", authority.key().as_ref()], bump, close = authority",
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 0,
      suspiciousFunctionCount: 0,
      hotspotCount: 0,
      topHotspotScore: 0,
      trustBoundaryCount: 3,
      validationRuleCount: 5,
      profileBucket: "thin",
      profileStructuralSignals: 8,
      profileEvidenceSpans: 0,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority"],
    }),
  },
  {
    id: "boundary-01",
    title: "Validated remaining accounts with small state write",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "ValidatedSweep",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "sweep(ctx: Context<ValidatedSweep>, amount: u64) -> Result<()>",
          `
    for account_info in ctx.remaining_accounts.iter() {
        require!(
            account_info.owner == ctx.accounts.authority.key(),
            ErrorCode::InvalidRemainingAccount
        );
    }
    ctx.accounts.vault.amount = ctx.accounts.vault.amount.saturating_add(amount);
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 57,
      trustBoundaryCount: 4,
      validationRuleCount: 6,
      profileBucket: "supported",
      profileStructuralSignals: 12,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["remaining-accounts-boundary", "state-write"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "remaining_accounts"],
    }),
  },
  {
    id: "boundary-02",
    title: "Token transfer without extra noise",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "TransferCheck",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "transfer(ctx: Context<TransferCheck>, amount: u64) -> Result<()>",
          `
    token::transfer(ctx.accounts.transfer_ctx(), amount)?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 48,
      trustBoundaryCount: 3,
      validationRuleCount: 6,
      profileBucket: "supported",
      profileStructuralSignals: 11,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["external-call"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "cpi"],
    }),
  },
  {
    id: "boundary-03",
    title: "System transfer as a thin boundary",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "SystemForward",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "forward(ctx: Context<SystemForward>, lamports: u64) -> Result<()>",
          `
    system_program::transfer(&ctx.accounts.authority.to_account_info(), &ctx.accounts.vault.to_account_info(), lamports)?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 49,
      trustBoundaryCount: 3,
      validationRuleCount: 6,
      profileBucket: "supported",
      profileStructuralSignals: 11,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["external-call"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "cpi"],
    }),
  },
  {
    id: "boundary-04",
    title: "Invoke signed boundary",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "InvokeCheck",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "invoke(ctx: Context<InvokeCheck>) -> Result<()>",
          `
    let ix = anchor_lang::solana_program::instruction::Instruction {
        program_id: ctx.accounts.vault.key(),
        accounts: vec![],
        data: vec![],
    };
    invoke_signed(&ix, &[], &[])?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 49,
      trustBoundaryCount: 3,
      validationRuleCount: 6,
      profileBucket: "supported",
      profileStructuralSignals: 11,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["external-call"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "cpi"],
    }),
  },
  {
    id: "boundary-05",
    title: "Mint to boundary",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "MintCheck",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "mint(ctx: Context<MintCheck>, amount: u64) -> Result<()>",
          `
    token::mint_to(ctx.accounts.mint_to_ctx(), amount)?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 48,
      trustBoundaryCount: 3,
      validationRuleCount: 6,
      profileBucket: "supported",
      profileStructuralSignals: 11,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["external-call"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "cpi"],
    }),
  },
  {
    id: "boundary-06",
    title: "Close authority without extra state churn",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "CloseCheck",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "close(ctx: Context<CloseCheck>) -> Result<()>",
          `
    ctx.accounts.vault.close(ctx.accounts.authority.to_account_info())?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 33,
      trustBoundaryCount: 3,
      validationRuleCount: 5,
      profileBucket: "supported",
      profileStructuralSignals: 10,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["state-write"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority"],
    }),
  },
  {
    id: "boundary-07",
    title: "Set inner state at the edge",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "InnerCheck",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "set_inner(ctx: Context<InnerCheck>) -> Result<()>",
          `
    ctx.accounts.vault.set_inner(Vault {
        amount: 1,
        authority: ctx.accounts.authority.key(),
    });
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 33,
      trustBoundaryCount: 3,
      validationRuleCount: 5,
      profileBucket: "supported",
      profileStructuralSignals: 10,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["state-write"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority"],
    }),
  },
  {
    id: "boundary-08",
    title: "Realloc boundary",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "ResizeCheck",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "resize(ctx: Context<ResizeCheck>) -> Result<()>",
          `
    ctx.accounts.vault.to_account_info().realloc(128, false)?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 32,
      trustBoundaryCount: 3,
      validationRuleCount: 5,
      profileBucket: "supported",
      profileStructuralSignals: 10,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["state-write"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority"],
    }),
  },
  {
    id: "boundary-09",
    title: "Remaining accounts validated only",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "ValidateOnly",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "validate(ctx: Context<ValidateOnly>) -> Result<()>",
          `
    for account_info in ctx.remaining_accounts.iter() {
        require!(
            account_info.owner == ctx.accounts.authority.key(),
            ErrorCode::InvalidRemainingAccount
        );
    }
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 0,
      hotspotCount: 1,
      topHotspotScore: 26,
      trustBoundaryCount: 4,
      validationRuleCount: 6,
      profileBucket: "supported",
      profileStructuralSignals: 12,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["remaining-accounts-boundary"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "remaining_accounts"],
    }),
  },
  {
    id: "boundary-10",
    title: "Burn boundary with no state churn",
    category: "boundary",
    sourceFiles: buildProgram({
      structName: "BurnCheck",
      vaultAttrs: highTrustAttrs,
      functions: [
        fnBlock(
          "burn(ctx: Context<BurnCheck>, amount: u64) -> Result<()>",
          `
    token::burn(ctx.accounts.burn_ctx(), amount)?;
    Ok(())
          `
        ),
      ],
    }),
    expected: expected({
      framework: "anchor",
      functionCount: 1,
      suspiciousFunctionCount: 1,
      hotspotCount: 1,
      topHotspotScore: 48,
      trustBoundaryCount: 3,
      validationRuleCount: 6,
      profileBucket: "supported",
      profileStructuralSignals: 11,
      profileEvidenceSpans: 1,
      profileConsensusCount: 0,
      profileThinSurface: true,
      requiredRiskSignals: ["external-call"],
      requiredValidationCategories: ["signer", "ownership", "pda", "constraint", "close_authority", "cpi"],
    }),
  },
] satisfies readonly BenchmarkCorpusSample[];
