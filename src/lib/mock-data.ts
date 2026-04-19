import type { AuditResult } from "@/types/audit";

export const mockAuditResult: AuditResult = {
  programAddress: "9xK8a2tXp5RqFyYz3WvDmNcBqE7hJkLsPaUfRgTiVdSo",
  timestamp: new Date().toISOString(),
  overallScore: 72,
  summary: {
    critical: 2,
    high: 3,
    medium: 4,
    low: 2,
  },
  vulnerabilities: [
    {
      id: "vuln-001",
      title: "Unchecked Account Authority",
      severity: "critical",
      description:
        "The program does not verify that the account authority matches the expected signer before performing sensitive operations.",
      codeSnippet: {
        language: "rust",
        highlightLine: 5,
        code: `pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let account = &accounts[0];
    // Missing: check account.is_signer
    let mut data = account.try_borrow_mut_data()?;
    data[0] = instruction_data[0];
    Ok(())
}`,
      },
      recommendation:
        "Add a signer check: `if !account.is_signer { return Err(ProgramError::MissingRequiredSignature); }` before mutating account data.",
      confidence: 97,
    },
    {
      id: "vuln-002",
      title: "Missing Owner Check",
      severity: "critical",
      description:
        "The program processes accounts without verifying they are owned by the expected program, allowing cross-program invocation attacks.",
      codeSnippet: {
        language: "rust",
        highlightLine: 4,
        code: `pub fn process(ctx: Context<UpdateData>) -> ProgramResult {
    let account = &ctx.accounts.data_account;
    // Missing: account.owner != program_id check
    let mut data = account.try_borrow_mut_data()?;
    data[0] = 1;
    Ok(())
}`,
      },
      recommendation:
        "Validate account ownership: `if account.owner != program_id { return Err(ProgramError::InvalidAccountOwner); }`",
      confidence: 95,
    },
    {
      id: "vuln-003",
      title: "Potential Integer Overflow in Token Calculation",
      severity: "high",
      description:
        "Token amount calculations use unchecked arithmetic which can overflow in edge cases with large token supplies.",
      codeSnippet: {
        language: "rust",
        highlightLine: 3,
        code: `pub fn calculate_reward(amount: u64, rate: u64) -> u64 {
    // No overflow check
    let reward = amount * rate / 10000;
    reward
}`,
      },
      recommendation:
        "Use checked arithmetic: `amount.checked_mul(rate).and_then(|v| v.checked_div(10000)).ok_or(ErrorCode::Overflow)?`",
      confidence: 89,
    },
    {
      id: "vuln-004",
      title: "Unvalidated Program ID in CPI",
      severity: "high",
      description:
        "Cross-program invocations do not validate the target program ID, allowing calls to malicious programs.",
      codeSnippet: {
        language: "rust",
        highlightLine: 4,
        code: `pub fn process_cpi(ctx: Context<CpiCall>) -> ProgramResult {
    let target_program = &ctx.accounts.target_program;
    // No validation of target_program.key()
    invoke(
        &instruction,
        &[ctx.accounts.user.clone(), target_program.clone()],
    )
}`,
      },
      recommendation:
        "Validate the target program ID: `if target_program.key() != EXPECTED_PROGRAM_ID { return Err(ProgramError::InvalidProgramId); }`",
      confidence: 91,
    },
    {
      id: "vuln-005",
      title: "Missing Rent-Exempt Check",
      severity: "high",
      description:
        "Newly created accounts are not verified to be rent-exempt, which could lead to account deletion and fund loss.",
      codeSnippet: {
        language: "rust",
        highlightLine: 5,
        code: `pub fn create_account(ctx: Context<CreateAccount>) -> ProgramResult {
    let account = &ctx.accounts.new_account;
    // Missing rent-exempt check
    let mut data = account.try_borrow_mut_data()?;
    data[0] = 0;
    Ok(())
}`,
      },
      recommendation:
        "Add rent-exempt validation: `if !account.lamports().ge(&Rent::get()?.minimum_balance(account.data_len())) { return Err(ProgramError::InsufficientFunds); }`",
      confidence: 86,
    },
    {
      id: "vuln-006",
      title: "Reentrancy via CPI Callback",
      severity: "medium",
      description:
        "The program allows CPI calls that could trigger a callback into the same program, potentially causing reentrancy issues.",
      codeSnippet: {
        language: "rust",
        highlightLine: 6,
        code: `pub fn process_withdraw(ctx: Context<Withdraw>) -> ProgramResult {
    let amount = ctx.accounts.vault.amount;
    // CPI before state update - reentrancy risk
    **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += amount;
    Ok(())
}`,
      },
      recommendation:
        "Update state before performing CPI calls, or use a reentrancy guard to prevent recursive invocations.",
      confidence: 78,
    },
    {
      id: "vuln-007",
      title: "Hardcoded Program Addresses",
      severity: "medium",
      description:
        "Program addresses are hardcoded instead of being passed as accounts, making upgrades and testing difficult.",
      codeSnippet: {
        language: "rust",
        highlightLine: 2,
        code: `pub const TOKEN_PROGRAM: Pubkey = pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
pub const SYSTEM_PROGRAM: Pubkey = pubkey!("11111111111111111111111111111111");

pub fn process(ctx: Context<Transfer>) -> ProgramResult {
    // Hardcoded addresses prevent flexibility
    anchor_spl::token::transfer(ctx.accounts.transfer_ctx(), ctx.accounts.amount)
}`,
      },
      recommendation:
        "Pass program IDs as remaining accounts instead of hardcoding them. This improves testability and supports program upgrades.",
      confidence: 72,
    },
    {
      id: "vuln-008",
      title: "Missing Signer Validation",
      severity: "medium",
      description:
        "Admin-only functions do not properly validate the signer, allowing unauthorized access to privileged operations.",
      codeSnippet: {
        language: "rust",
        highlightLine: 3,
        code: `pub fn admin_update(ctx: Context<AdminUpdate>, new_value: u64) -> ProgramResult {
    // Missing: verify ctx.accounts.admin is the authority
    ctx.accounts.config.value = new_value;
    Ok(())
}`,
      },
      recommendation:
        "Add authority validation: `require!(ctx.accounts.admin.key() == ctx.accounts.config.authority, ErrorCode::Unauthorized);`",
      confidence: 93,
    },
    {
      id: "vuln-009",
      title: "Unused Account Validation",
      severity: "low",
      description:
        "Several instruction handlers accept accounts that are never used or validated, increasing transaction size and cost.",
      codeSnippet: {
        language: "rust",
        highlightLine: 1,
        code: `pub fn process(ctx: Context<UnusedAccounts>) -> ProgramResult {
    // ctx.accounts.extra_account is never used
    ctx.accounts.data.value += 1;
    Ok(())
}`,
      },
      recommendation:
        "Remove unused account references from the instruction context to reduce transaction size and improve clarity.",
      confidence: 65,
    },
    {
      id: "vuln-010",
      title: "Insufficient Error Handling",
      severity: "low",
      description:
        "Custom error codes lack descriptive messages, making debugging and user feedback difficult.",
      codeSnippet: {
        language: "rust",
        highlightLine: 2,
        code: `#[error_code]
pub enum ErrorCode {
    #[msg("")]  // Empty error message
    InvalidInput,
    #[msg("")]  // Empty error message
    Unauthorized,
}`,
      },
      recommendation:
        "Add descriptive error messages: `#[msg(\"The provided input is invalid. Expected a non-zero value.\")]` to improve debugging.",
      confidence: 70,
    },
  ],
  recommendations: [
    "Implement comprehensive signer and authority checks across all instruction handlers to prevent unauthorized access.",
    "Add overflow checks using checked arithmetic operations for all token and lamport calculations.",
    "Validate account ownership and program IDs before processing CPI calls to prevent cross-program invocation attacks.",
  ],
};
