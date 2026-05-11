# Solana Variant Analysis Patterns

Patterns for finding vulnerability variants in Solana programs.
Use these when searching for the same vulnerability across different
instruction handlers.

---

## Anchor Constraint Consistency

### Pattern: Missing has_one Across Instructions

When one instruction uses `has_one = authority` for an account, check that
ALL instructions using the same account type enforce the same constraint.

```rust
// Instruction A: properly constrained
#[derive(Accounts)]
pub struct AdminUpdate<'info> {
    pub admin: Signer<'info>,
    #[account(has_one = admin)]
    pub config: Account<'info, Config>,
}

// Instruction B: MISSING has_one — variant of same vulnerability
#[derive(Accounts)]
pub struct UserRead<'info> {
    // No has_one check — anyone can read/modify config
    pub config: Account<'info, Config>,
}
```

**Search Strategy**: Find all `#[derive(Accounts)]` structs that reference
the same account type and check if constraints are consistent.

---

## Account Validation Consistency

### Pattern: Mixed Typed and Untyped Accounts

When some instructions use `Account<'info, T>` and others use
`UncheckedAccount<'info>` for the same logical account type.

```rust
// Instruction A: properly typed
pub vault: Account<'info, Vault>,

// Instruction B: unchecked — type confusion variant
pub vault: UncheckedAccount<'info>,  // ← Same account, no type check!
```

**Search Strategy**: For each account name used across multiple instruction
structs, verify the type is consistent (always `Account<'info, T>` or
always `UncheckedAccount<'info>` with manual validation).

---

## PDA Seed Consistency

### Pattern: Inconsistent PDA Seeds

When different instructions derive the same PDA with different seeds.

```rust
// Instruction A: seeds = [b"vault", mint.as_ref()]
#[account(
    seeds = [b"vault", mint.key().as_ref()],
    bump = vault.bump,
)]
pub vault: Account<'info, Vault>,

// Instruction B: seeds = [b"vault", authority.as_ref()] — DIFFERENT SEEDS!
#[account(
    seeds = [b"vault", authority.key().as_ref()],
    bump = vault.bump,
)]
pub vault: Account<'info, Vault>,
```

**Search Strategy**: Find all `seeds = [...]` constraints for the same
account name and verify seeds are identical across instructions.

---

## Bump Seed Handling

### Pattern: Stored vs Re-derived Bump

When some instructions verify bump against stored value and others
re-derive with `find_program_address`.

```rust
// Instruction A: uses stored bump (correct)
#[account(
    seeds = [b"vault"],
    bump = vault.bump,  // ← Verified against stored value
)]

// Instruction B: re-derives bump (potentially incorrect)
let (pda, bump) = Pubkey::find_program_address(&[b"vault"], &crate::ID);
// bump may differ from stored canonical bump
```

**Search Strategy**: Find all PDA derivations and check if bump
verification is consistent (stored vs re-derived).

---

## Remaining Accounts Patterns

### Pattern: Unvalidated Remaining Accounts

When some instructions validate `remaining_accounts` and others don't.

```rust
// Instruction A: validates remaining accounts
for account in ctx.remaining_accounts.iter() {
    require!(account.owner == &crate::ID, ErrorCode::InvalidOwner);
}

// Instruction B: uses remaining accounts without validation
for account in ctx.remaining_accounts.iter() {
    let data = account.try_borrow_data()?;  // ← No validation!
}
```

**Search Strategy**: Find all uses of `remaining_accounts` and check
if validation is consistent.

---

## CPI Authority Passing

### Pattern: Inconsistent CPI Authority

When some CPI calls verify the target program ID and others don't.

```rust
// Instruction A: hardcoded program ID (correct)
invoke_signed(&spl_token::id(), accounts, seeds)?;

// Instruction B: user-controlled program ID (vulnerable)
invoke_signed(&ctx.accounts.some_program.key(), accounts, seeds)?;
```

**Search Strategy**: Find all `invoke` and `invoke_signed` calls and
verify the program ID is always a known constant.

---

## Token Account Ownership Checks

### Pattern: Missing Token Account Owner Verification

When some instructions verify token account ownership and others don't.

```rust
// Instruction A: verifies token account owner
#[account(
    constraint = token_account.owner == &spl_token::id()
        @ ErrorCode::InvalidTokenAccount,
)]
pub token_account: Account<'info, TokenAccount>,

// Instruction B: no owner check
pub token_account: Account<'info, TokenAccount>,  // ← No owner constraint!
```

**Search Strategy**: Find all `TokenAccount` references and check if
owner constraints are consistent.

---

## Variant Search Checklist

For each finding, search for variants using this checklist:

1. **Same account type, different instruction**: Is the same vulnerability
   present in other instruction handlers that use the same account type?

2. **Same pattern, different account**: Is the same pattern (e.g., missing
   signer check) present for different accounts in the same instruction?

3. **Same logic, different function**: Is the same business logic (e.g.,
   balance update) present in other functions with different validation?

4. **Inverse operation**: If a vulnerability exists in `deposit`, check
   `withdraw`. If in `mint`, check `burn`.

5. **Error handling variant**: If a function lacks error handling for a
   specific case, check if related functions handle it correctly.

6. **State consistency variant**: If a state update in one function can
   cause inconsistency, check if other functions maintain the same invariant.
