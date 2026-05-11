# Solana Entry Point Detection

## Entry Point Identification (State-Changing Only)

In Solana, most program instructions modify state. **Exclude** view-only patterns:
- Instructions that only read account data without `mut` references
- Pure computation functions that don't write to accounts

### Native Solana Programs
```rust
// Single entrypoint macro
entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Dispatch to handlers based on instruction_data
}
```

### Anchor Framework
```rust
#[program]
mod my_program {
    use super::*;

    // Each pub fn is an entry point
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> { }
    pub fn transfer(ctx: Context<Transfer>, amount: u64) -> Result<()> { }
}
```

### Entry Point Detection Rules
| Pattern | Include? | Notes |
|---------|----------|-------|
| `entrypoint!(fn_name)` | **Yes** | Native program entry |
| `pub fn` inside `#[program]` mod with `mut` accounts | **Yes** | Anchor state-changing |
| `pub fn` inside `#[program]` mod (view-only) | No | Exclude if no `mut` accounts |
| Functions in `processor.rs` matching instruction enum | **Yes** | Native pattern |
| Internal helper functions | No | Not externally callable |

## Access Control Patterns

### Anchor Constraints
```rust
#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        constraint = config.admin == admin.key() @ ErrorCode::Unauthorized
    )]
    pub config: Account<'info, Config>,
}
```

### Common Access Control Patterns
| Pattern | Classification |
|---------|----------------|
| `constraint = X.admin == signer.key()` | Admin |
| `constraint = X.owner == signer.key()` | Owner |
| `constraint = X.authority == signer.key()` | Authority (Admin-level) |
| `constraint = X.governance == signer.key()` | Governance |
| `constraint = X.guardian == signer.key()` | Guardian |
| `has_one = admin` | Admin |
| `has_one = owner` | Owner |
| `has_one = authority` | Authority |
| `Signer` account with no constraints | Review Required |

### Native Access Control
```rust
// Check signer
if !accounts[0].is_signer {
    return Err(ProgramError::MissingRequiredSignature);
}

// Check specific authority
if accounts[0].key != &expected_authority {
    return Err(ProgramError::InvalidAccountData);
}
```

### Access Control Macros (Anchor)
```rust
#[access_control(is_admin(&ctx))]
pub fn admin_function(ctx: Context<AdminAction>) -> Result<()> { }

fn is_admin(ctx: &Context<AdminAction>) -> Result<()> {
    require!(ctx.accounts.admin.key() == ADMIN_PUBKEY, Unauthorized);
    Ok(())
}
```

## Contract-Only Detection (CPI Patterns)

### Cross-Program Invocation Sources
```rust
// Functions expected to be called via CPI
pub fn on_token_transfer(ctx: Context<TokenCallback>, amount: u64) -> Result<()> {
    // Should verify calling program
    require!(
        ctx.accounts.calling_program.key() == expected_program::ID,
        ErrorCode::InvalidCaller
    );
}
```

### CPI Verification Patterns
```rust
// Verify CPI caller
let calling_program = ctx.accounts.calling_program.key();
require!(calling_program == &spl_token::ID, InvalidCaller);

// Check instruction sysvar for CPI
let ix = load_current_index_checked(&ctx.accounts.instruction_sysvar)?;
```

## Extraction Strategy

1. **Detect Framework**:
   - Check `Cargo.toml` for `anchor-lang` → Anchor
   - Check for `entrypoint!` macro → Native

2. **For Anchor**:
   - Find `#[program]` module
   - Extract all `pub fn` within it
   - Parse `#[derive(Accounts)]` structs for constraints

3. **For Native**:
   - Find instruction enum (usually in `instruction.rs`)
   - Map variants to handler functions in `processor.rs`
   - Check each handler for signer/authority checks

4. **Classify**:
   - No authority constraints → Public (Unrestricted)
   - `has_one`, `constraint` with authority → Role-based
   - CPI-only patterns → Contract-Only

## Solana-Specific Considerations

1. **Account Validation**: Access control often via account constraints, not function-level
2. **PDA Authority**: Program Derived Addresses can act as authorities
3. **Signer vs Authority**: `Signer` alone doesn't mean admin—check what the signer controls
4. **Instruction Data**: Native programs dispatch based on instruction discriminator

## Advanced Anchor Patterns

### Constraint Macros for Account Validation

```rust
// init — creates and initializes a new account
#[account(
    init,
    payer = authority,
    space = 8 + 32 + 8 + 1,  // discriminator + fields
)]
pub new_account: Account<'info, MyData>,

// has_one — verifies account field matches another account's key
#[account(has_one = authority)]
pub config: Account<'info, Config>,

// constraint — custom validation logic
#[account(
    constraint = vault.balance >= min_balance @ ErrorCode::InsufficientBalance
)]
pub vault: Account<'info, Vault>,

// mut — marks account as writable
#[account(mut)]
pub data_account: Account<'info, MyData>,

// realloc — dynamically resize account data
#[account(
    mut,
    realloc = new_size,
    realloc::zero = false,  // Whether to zero new space
    realloc::payer = payer,  // Who pays for additional rent
)]
pub data_account: Account<'info, MyData>,
```

### Remaining Accounts Handling

```rust
// ctx.remaining_accounts provides dynamic account list
// DANGEROUS if not validated — any account can be injected
pub fn process_batch(ctx: Context<BatchProcess>) -> Result<()> {
    // MUST validate each account before use
    for account_info in ctx.remaining_accounts.iter() {
        require!(
            account_info.owner == &crate::ID,
            ErrorCode::InvalidAccountOwner
        );
        // Verify discriminator
        let data = account_info.try_borrow_data()?;
        require!(
            &data[0..8] == MyData::DISCRIMINATOR,
            ErrorCode::InvalidAccountType
        );
    }
    Ok(())
}
```

### Account Discriminator and Type Confusion

```rust
// Anchor adds 8-byte discriminator to all accounts
// Account<'info, T> auto-checks discriminator
// UncheckedAccount does NOT — type confusion risk!

// VULNERABLE: accepts any account type
pub some_account: UncheckedAccount<'info>,

// SECURE: typed account with discriminator check
pub some_account: Account<'info, ExpectedType>,

// Manual discriminator check (if UncheckedAccount is necessary)
let data = account.try_borrow_data()?;
let disc = &data[0..8];
require!(disc == ExpectedType::DISCRIMINATOR, ErrorCode::InvalidType);
```

### Compute Budget as DoS Vector

```rust
// Solana has compute unit limit (default 200k, max 1.4M)
// Attackers can set compute budget to exhaust units

// VULNERABLE: unbounded iteration
for i in 0..user_controlled_length {
    // Each iteration consumes compute units
    // Attacker can set length to exhaust budget
}

// SECURE: bound iteration
const MAX_ITERATIONS: usize = 50;
let iterations = user_controlled_length.min(MAX_ITERATIONS);

// Consider: Set required compute budget in transaction
// ComputeBudgetInstruction::set_compute_unit_limit(400_000)
```

### Token-2022 Extension Risks

```rust
// CPI Guard — blocks CPI-initiated transfers
// If token account has CPI guard enabled, transfer() fails
// Must use transfer_checked() for Token-2022 compatibility

// Confidential Transfers — balances are encrypted
// Cannot verify amounts on-chain with confidential transfers

// Transfer Fee — received < sent
// Balance checks must account for fees:
// actual_received = amount - calculate_fee(amount, fee_rate)

// Permanent Delegate — can transfer any token without owner consent
// Major centralization risk if enabled on mint

// Immutable Ownership — prevents owner change
// Good for security, but permanent
```

## Common Gotchas

1. **Initialize Patterns**: `is_initialized` checks—first caller may set authority
2. **Upgrade Authority**: Programs can be upgraded—check upgrade authority
3. **Multisig**: Some operations require multiple signers
4. **CPI Safety**: Functions callable via CPI should verify calling program
5. **Freeze Authority**: Token accounts may have freeze authority
6. **Balance Drift**: Direct token transfers bypass program balance tracking
7. **PDA Uniqueness**: Same seeds + different program = different PDA (safe), same seeds + same program = same PDA (collision risk)
8. **Bump Seed Storage**: Must store canonical bump on init and verify on every use
9. **Account Reallocation**: `realloc` requires correct rent funding for larger sizes
10. **Close vs Zero**: Closing an account clears discriminator; zeroing data does not close it
