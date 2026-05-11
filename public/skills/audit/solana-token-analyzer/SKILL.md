---
name: solana-token-analyzer
description: >
  Use when auditing Solana programs that interact with SPL Token or Token-2022 and users mention:
  "SPL Token", "Token-2022", "token integration", "transfer tokens", "mint tokens",
  "token authority", "associated token account", "wSOL", "wrapped SOL", "token account",
  "mint authority", "freeze authority", "close token account", "CPI guard",
  "confidential transfer", "transfer fee", "immutable ownership", "permanent delegate",
  "non-transferable token", "interest-bearing token", "default account state",
  "memo transfer", "token extension", "Token-2022 extension", "ATA", "token delegate",
  "token close authority", "compressed NFT", "Metaplex", "token metadata",
  "PDA token authority", "approve tokens", "revoke tokens".
---

# Solana Token Analyzer Skill

## Purpose

Analyze Solana programs that integrate with SPL Token or Token-2022 for
security vulnerabilities specific to token operations, authority semantics,
and Token-2022 extension behavior.

## When to Use

This skill should be invoked when:
- The program imports `spl-token` or `spl-token-2022`
- The program creates, transfers, burns, or closes token accounts
- The program uses Associated Token Accounts (ATAs)
- The program sets or uses token delegates/approvals
- The program interacts with Token-2022 extensions
- The program uses PDA authorities for token operations

## Token Integration Audit Workflow

### Phase 1 — Identify Token Usage

1. Check `Cargo.toml` for `spl-token`, `spl-token-2022`, `spl-associated-token-account`
2. Identify all CPI calls to token programs (transfer, mint_to, burn, approve, close)
3. Map token authority patterns: who controls each mint/account authority?
4. Identify Token-2022 specific features in use

### Phase 2 — Authority Analysis

For each token operation, verify the authority model:

| Operation | Required Authority | Common Pattern |
|-----------|-------------------|----------------|
| `transfer` | Source account owner/delegate | User signs or PDA signs via CPI |
| `transfer_checked` | Source account owner/delegate | Same as transfer, but with decimals |
| `mint_to` | Mint authority | PDA or admin key |
| `burn` | Account owner/delegate | User signs or PDA signs |
| `approve` | Account owner | User signs (creates delegate) |
| `revoke` | Account owner | User signs (removes delegate) |
| `close_account` | Close authority or owner | User or PDA |
| `freeze_account` | Freeze authority | PDA or admin key |
| `thaw_account` | Freeze authority | PDA or admin key |

### Phase 3 — Token-2022 Extension Review

If Token-2022 is in use, check each extension:

| Extension | Security Concern |
|-----------|-----------------|
| CPI Guard | Blocks CPI-initiated transfers; program must use `transfer_checked` |
| Transfer Fee | Received amount < sent amount; balance checks must account for fees |
| Confidential Transfer | Balances are encrypted; cannot verify amounts on-chain |
| Immutable Ownership | Account owner cannot be changed; prevents authority transfer |
| Permanent Delegate | Mint authority can transfer any token without owner consent |
| Non-Transferable | Tokens cannot be transferred; check for transfer attempts |
| Interest-Bearing | Balance changes over time; stale balance reads |
| Default Account State | New accounts may be frozen by default |
| Memo Transfer | Requires memo on incoming transfers; missing memo = failed transfer |
| Required Memo | Same as memo transfer |

### Phase 4 — Vulnerability Check

Check for these token-specific vulnerabilities:

1. **Authority Confusion**: PDA authority vs user authority — who actually controls the token account?
2. **Approval Drain**: Delegate with unlimited approval can drain the account
3. **Close Authority Misuse**: Close authority can drain account even if not the owner
4. **Mint Authority Compromise**: If mint authority is a single key, it can mint unlimited tokens
5. **Freeze Authority Abuse**: Freeze authority can lock user funds
6. **ATA Derivation Mismatch**: Wrong seeds produce wrong ATA, funds sent to wrong address
7. **wSOL Sync Issues**: `sync_native` must be called after SOL transfer to wrapped SOL account
8. **Token Account Resurrection**: Closed token account can be recreated with different owner
9. **CPI Guard Bypass**: Token-2022 CPI guard can be bypassed with `invoke_signed` from program
10. **Transfer Fee Miscalculation**: Not accounting for Token-2022 transfer fees in balance checks

### Phase 5 — Report Token Findings

Structure token-specific findings using the standard format from
`references/spl-token-patterns.md`, including:
- Which token program is used (standard vs Token-2022)
- Which extensions are active
- Authority model for each token operation
- Specific token-related vulnerabilities found

## Key Patterns to Enforce

### Use transfer_checked for Token-2022 Compatibility

```rust
// PREFERRED: works with both SPL Token and Token-2022
token::transfer_checked(
    CpiContext::new_with_signer(
        token_program.to_account_info(),
        TransferChecked {
            source: source.to_account_info(),
            mint: mint.to_account_info(),
            destination: destination.to_account_info(),
            authority: authority.to_account_info(),
        },
        &[seeds],
    ),
    amount,
    decimals,
)?;

// AVOID: does not work with Token-2022 CPI guard
token::transfer(
    CpiContext::new_with_signer(
        token_program.to_account_info(),
        Transfer {
            source: source.to_account_info(),
            destination: destination.to_account_info(),
            authority: authority.to_account_info(),
        },
        &[seeds],
    ),
    amount,
)?;
```

### Verify Token Program ID

```rust
// Always check which token program owns the account
let token_program = if mint.owner == &spl_token_2022::id() {
    ctx.accounts.token_program_2022.to_account_info()
} else if mint.owner == &spl_token::id() {
    ctx.accounts.token_program.to_account_info()
} else {
    return Err(ErrorCode::InvalidTokenProgram);
};
```

### Validate ATA Derivation

```rust
// Verify the ATA is correctly derived
let expected_ata = get_associated_token_address(
    &owner.key(),
    &mint.key(),
);
require!(
    ctx.accounts.token_account.key() == expected_ata,
    ErrorCode::InvalidATA
);
```

### Handle wSOL Correctly

```rust
// After transferring SOL to a wrapped SOL account, must sync
if ctx.accounts.mint.key() == native_mint::id() {
    token::sync_native(CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        SyncNative {
            account: ctx.accounts.wsol_account.to_account_info(),
        },
    ))?;
}
```

## Reference Materials

- `references/spl-token-patterns.md` — SPL Token integration patterns, authority semantics, and Token-2022 extension details
