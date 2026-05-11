# Solana Function Micro-Analysis Example

This example demonstrates ultra-granular analysis of an Anchor instruction handler,
following the same methodology as the Solidity example but adapted for Solana's
account model.

---

## Example: Anchor Vault Withdraw Handler

```rust
#[program]
pub mod vault_program {
    use super::*;

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        // Check if vault is paused
        require!(!vault.is_paused, ErrorCode::VaultPaused);

        // Check sufficient balance
        require!(vault.balance >= amount, ErrorCode::InsufficientBalance);

        // Update vault state BEFORE CPI (Checks → State → CPI pattern)
        vault.balance = vault.balance.checked_sub(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;

        // Transfer tokens via CPI
        let seeds = &[
            b"vault",
            vault.mint.as_ref(),
            &[vault.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        token::transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    source: ctx.accounts.vault_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    destination: ctx.accounts.destination.to_account_info(),
                    authority: vault.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
            ctx.accounts.mint.decimals,
        )?;

        // Emit event
        emit!(WithdrawEvent {
            amount,
            destination: ctx.accounts.destination.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"vault", mint.key().as_ref()],
        bump = vault.bump,
        has_one = authority,
    )]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
    #[account(
        mut,
        constraint = vault_token_account.owner == &spl_token::id()
            @ ErrorCode::InvalidTokenAccount,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub balance: u64,
    pub is_paused: bool,
    pub bump: u8,
}

#[event]
pub struct WithdrawEvent {
    pub amount: u64,
    pub destination: Pubkey,
    pub timestamp: i64,
}
```

---

## Micro-Analysis

### Purpose

The `withdraw` function allows the vault authority to withdraw a specified amount
of tokens from the vault to a destination token account. It enforces the
Checks → State → CPI pattern to prevent reentrancy and ensures the vault has
sufficient balance before transferring.

### Inputs & Assumptions

| Input | Type | Source | Trust Level |
|-------|------|--------|-------------|
| `amount` | `u64` | Instruction data | Untrusted — user-controlled |
| `vault` | `Account<Vault>` | Account validation | Trusted — Anchor verifies PDA + has_one |
| `authority` | `Signer` | Transaction signer | Trusted — Anchor verifies is_signer |
| `vault_token_account` | `Account<TokenAccount>` | Account validation | Partially trusted — constraint checks owner |
| `destination` | `Account<TokenAccount>` | Account validation | Untrusted — user-controlled, only mut constraint |
| `mint` | `Account<Mint>` | Account validation | Trusted — used in PDA seed derivation |
| `token_program` | `Program<Token>` | Account validation | Trusted — Anchor verifies program ID |

**Assumptions:**
1. Anchor's `has_one = authority` correctly verifies `vault.authority == authority.key()`
2. Anchor's `seeds` + `bump` correctly verify the PDA derivation
3. `vault.balance` accurately reflects the token balance in `vault_token_account`
4. The `is_paused` flag is correctly managed by admin functions
5. `checked_sub` prevents arithmetic overflow/underflow
6. `transfer_checked` handles Token-2022 compatibility

### Outputs & Effects

| Effect | Type | Details |
|--------|------|---------|
| State write | `vault.balance -= amount` | Deducts from vault balance |
| CPI call | `token::transfer_checked` | Transfers tokens from vault to destination |
| Event | `WithdrawEvent` | Logs amount, destination, timestamp |

**Postconditions:**
1. `vault.balance == old_balance - amount`
2. `destination.amount == old_dest_amount + amount` (minus any Token-2022 fees)
3. `vault_token_account.amount == old_vault_token - amount`

### Block-by-Block Analysis

#### Block 1: Pause Check

```rust
require!(!vault.is_paused, ErrorCode::VaultPaused);
```

- **What**: Guards against withdrawals when vault is paused
- **Why here**: First check — fail fast if paused, no state changes needed
- **Assumptions**: `is_paused` is only set by authorized admin function
- **Invariants**: If `is_paused == true`, no withdrawal can succeed
- **Risk**: If admin can pause without time lock, this is a centralization risk

#### Block 2: Balance Check

```rust
require!(vault.balance >= amount, ErrorCode::InsufficientBalance);
```

- **What**: Ensures vault has enough recorded balance
- **Why here**: Before state modification — prevents negative balance
- **Assumptions**: `vault.balance` tracks actual token balance accurately
- **Invariants**: `vault.balance >= 0` always (u64 type enforces this)
- **Risk**: If `vault.balance` can drift from actual token balance (e.g., direct token transfers to vault_token_account), this check is insufficient. Consider: can someone transfer tokens directly to `vault_token_account` without updating `vault.balance`?

#### Block 3: State Update

```rust
vault.balance = vault.balance.checked_sub(amount)
    .ok_or(ErrorCode::ArithmeticOverflow)?;
```

- **What**: Deducts amount from vault balance using checked arithmetic
- **Why here**: BEFORE CPI — this is the Checks → State → CPI pattern
- **Assumptions**: `checked_sub` prevents underflow (redundant with Block 2 but defense-in-depth)
- **Invariants**: After this line, `vault.balance` reflects the post-withdrawal state
- **Risk**: None — `checked_sub` is the correct pattern for Solana arithmetic

#### Block 4: CPI Transfer

```rust
let seeds = &[b"vault", vault.mint.as_ref(), &[vault.bump]];
let signer_seeds = &[&seeds[..]];

token::transfer_checked(
    CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        TransferChecked { ... },
        signer_seeds,
    ),
    amount,
    ctx.accounts.mint.decimals,
)?;
```

- **What**: Transfers tokens from vault to destination using PDA as authority
- **Why here**: AFTER state update — follows Checks → State → CPI
- **Assumptions**:
  1. `vault.bump` matches the canonical PDA bump (verified by Anchor `seeds` constraint)
  2. `vault_token_account` is the correct token account for the vault PDA
  3. `token_program` is the real SPL Token program (verified by Anchor `Program` type)
- **Invariants**: CPI uses the same `amount` as the state deduction
- **Risk**:
  - If `vault_token_account` is not actually owned by the vault PDA, the CPI will fail (safe)
  - If Token-2022 is used with transfer fees, `destination` receives less than `amount`
  - `transfer_checked` is Token-2022 compatible (good practice)

#### Block 5: Event Emission

```rust
emit!(WithdrawEvent { amount, destination: ctx.accounts.destination.key(), timestamp: Clock::get()?.unix_timestamp });
```

- **What**: Emits event for off-chain tracking
- **Why here**: After successful state change and CPI
- **Assumptions**: Events are reliable for off-chain indexing
- **Invariants**: Event amount matches state deduction and CPI amount
- **Risk**: None — informational only

### Cross-Function Dependencies

| Dependency | Type | Risk |
|------------|------|------|
| `initialize` | Sets `vault.authority`, `vault.bump`, `vault.mint` | If authority is set incorrectly, withdraws go to wrong person |
| `pause` / `unpause` | Sets `vault.is_paused` | If pause has no timelock, admin can grief users |
| `deposit` | Updates `vault.balance` on deposit | If deposit doesn't use checked arithmetic, balance can overflow |
| Token program | CPI target | External — verified by Anchor `Program` type |

### Identified Invariants

1. `vault.balance` always equals the total deposited minus total withdrawn (if no direct token transfers)
2. Only `vault.authority` can call `withdraw` (enforced by `has_one`)
3. PDA vault address is deterministic from `mint` + program ID
4. Withdrawals are atomic — state update and CPI happen in same transaction

### Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| Balance drift from direct token transfers | Medium | Consider using `vault_token_account.amount` as source of truth |
| Admin pause without timelock | Medium (centralization) | Add timelock or multisig for pause |
| Token-2022 transfer fee mismatch | High | Use `transfer_checked` and verify received amount |
| `destination` is user-controlled with no validation | Low | Could send to frozen account or wrong token type |
