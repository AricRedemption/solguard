import { buildAnalysisContext, renderPromptContext } from "@/lib/audit/ast-context";
import type { ValidationRule } from "@/types/audit";
import type { SourceFile } from "@/types/audit";

const anchorFixture: SourceFile[] = [
  {
    name: "program.rs",
    content: `
use anchor_lang::prelude::*;
use anchor_spl::token;

declare_id!("Fg6PaFpoGXkYsidMpWxTWqkqK1kQjQfN3X8m8bXz1nZ");

#[program]
pub mod sample_program {
    use super::*;

    pub fn process(ctx: Context<Process>, amount: u64) -> Result<()> {
        for account_info in ctx.remaining_accounts.iter() {
            require!(account_info.owner == ctx.accounts.receiver.key(), ErrorCode::InvalidRemainingAccount);
        }

        token::transfer(ctx.accounts.transfer_ctx(), amount)?;
        Ok(())
    }

    pub fn loose_process(ctx: Context<Loose>) -> Result<()> {
        let _ = ctx.accounts.vault.amount;
        Ok(())
    }

    pub fn loose_remaining(ctx: Context<LooseRemaining>) -> Result<()> {
        require!(ctx.accounts.authority.key() != Pubkey::default(), ErrorCode::InvalidRemainingAccount);
        for account_info in ctx.remaining_accounts.iter() {
            let _ = account_info.key();
        }
        Ok(())
    }

    pub fn loose_keywords(ctx: Context<LooseKeywords>) -> Result<()> {
        let signer = ctx.accounts.vault.key();
        let owner = ctx.accounts.vault.owner;
        let address = ctx.accounts.vault.key();
        let _ = (signer, owner, address);
        Ok(())
    }

    pub fn loose_remaining_window(ctx: Context<LooseRemainingWindow>) -> Result<()> {
        for account_info in ctx.remaining_accounts.iter() {
            let _ = account_info.key();
        }
        require!(ctx.accounts.authority.key() != Pubkey::default(), ErrorCode::InvalidRemainingAccount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Process<'info> {
    #[account(mut, has_one = authority, seeds = [b"vault"], bump, close = receiver)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
    #[account(mut)]
    pub receiver: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct Loose<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct LooseRemaining<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct LooseKeywords<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct LooseRemainingWindow<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Vault {
    pub amount: u64,
}

#[error_code]
pub enum ErrorCode {
    InvalidRemainingAccount,
}
    `.trim(),
    language: "rust",
  },
];

const nativeFixture: SourceFile[] = [
  {
    name: "processor.rs",
    content: `
use anchor_lang::prelude::*;
use anchor_spl::token;

pub fn swap(ctx: Context<Swap>, amount: u64) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    vault.amount = vault.amount.checked_sub(amount).ok_or(ErrorCode::MathOverflow)?;
    helper();
    token::transfer(ctx.accounts.transfer_ctx(), amount)?;
    Ok(())
}

pub fn helper() {
    let _ = 1;
}
    `.trim(),
    language: "rust",
  },
];

const anchorContext = buildAnalysisContext(anchorFixture);
const anchorFunction = anchorContext.functions.find((fn) => fn.name === "process");

if (anchorContext.framework !== "anchor") {
  throw new Error(`Expected Anchor fixture to be classified as anchor, got ${anchorContext.framework}.`);
}

if (!anchorFunction) {
  throw new Error("Expected to find the Anchor process function in the analysis context.");
}

if (!anchorFunction.signerChecks || !anchorFunction.ownershipChecks) {
  throw new Error("Expected the Anchor function to surface signer and ownership checks.");
}

if (!anchorFunction.remainingAccountsChecks) {
  throw new Error("Expected the Anchor function to surface remaining accounts checks.");
}

if (!anchorFunction.closeAuthorityChecks) {
  throw new Error("Expected the Anchor function to surface close authority checks.");
}

const looseOwnershipFunction = anchorContext.functions.find((fn) => fn.name === "loose_process");
if (!looseOwnershipFunction) {
  throw new Error("Expected to find the loose_process function in the analysis context.");
}

if (looseOwnershipFunction.ownershipChecks) {
  throw new Error("Expected a plain mut Anchor account not to count as ownership-checked.");
}

const looseRemainingFunction = anchorContext.functions.find((fn) => fn.name === "loose_remaining");
if (!looseRemainingFunction) {
  throw new Error("Expected to find the loose_remaining function in the analysis context.");
}

if (looseRemainingFunction.remainingAccountsChecks) {
  throw new Error("Expected plain remaining_accounts iteration without validation to stay unverified.");
}

const looseKeywordFunction = anchorContext.functions.find((fn) => fn.name === "loose_keywords");
if (!looseKeywordFunction) {
  throw new Error("Expected to find the loose_keywords function in the analysis context.");
}

if (looseKeywordFunction.signerChecks || looseKeywordFunction.ownershipChecks) {
  throw new Error("Expected generic signer/owner/address words not to count as real security checks.");
}

const looseRemainingWindowFunction = anchorContext.functions.find((fn) => fn.name === "loose_remaining_window");
if (!looseRemainingWindowFunction) {
  throw new Error("Expected to find the loose_remaining_window function in the analysis context.");
}

if (looseRemainingWindowFunction.remainingAccountsChecks) {
  throw new Error("Expected unrelated validation near remaining_accounts not to mark the boundary as verified.");
}

const anchorCategories = new Set<ValidationRule["category"]>(anchorContext.validationRules.map((rule) => rule.category));
for (const category of [
  "signer",
  "ownership",
  "pda",
  "constraint",
  "remaining_accounts",
  "close_authority",
  "cpi",
 ] satisfies ValidationRule["category"][]) {
  if (!anchorCategories.has(category)) {
    throw new Error(`Expected Anchor validation rules to include ${category}.`);
  }
}

if (!renderPromptContext(anchorContext).includes("remaining_accounts")) {
  throw new Error("Expected prompt context to mention the remaining accounts boundary.");
}

const nativeContext = buildAnalysisContext(nativeFixture);
const nativeFunction = nativeContext.functions.find((fn) => fn.name === "swap");

if (nativeContext.framework !== "native") {
  throw new Error(`Expected native fixture to be classified as native, got ${nativeContext.framework}.`);
}

if (!nativeFunction) {
  throw new Error("Expected to find the native swap function in the analysis context.");
}

if (!nativeFunction.externalCalls || !nativeFunction.stateWrites) {
  throw new Error("Expected the native function to surface CPI and state-write signals.");
}

if (!nativeFunction.riskSignals.includes("external-call") || !nativeFunction.riskSignals.includes("state-write")) {
  throw new Error("Expected the native function to include external-call and state-write risk signals.");
}

const helperEdge = nativeContext.callGraph.find((edge) => edge.from === "swap" && edge.to === "helper");
if (!helperEdge || helperEdge.kind !== "internal") {
  throw new Error("Expected helper calls to stay internal even when the function also performs a CPI.");
}

const transferEdge = nativeContext.callGraph.find((edge) => edge.from === "swap" && edge.to === "token::transfer");
if (!transferEdge || transferEdge.kind !== "cpi") {
  throw new Error("Expected the token transfer call to be classified as CPI.");
}

if (!nativeContext.validationRules.some((rule) => rule.category === "cpi")) {
  throw new Error("Expected the native context to emit a CPI validation rule.");
}
