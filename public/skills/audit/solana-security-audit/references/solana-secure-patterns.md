# Solana Secure Patterns

Secure coding patterns for Solana programs using Anchor and native Rust.
Use these patterns as reference when reviewing code for security issues.

---

## Account Validation

### Anchor Typed Accounts (Preferred)

```rust
// Anchor's Account<'info, T> automatically checks:
// 1. Account is not zeroed (has valid discriminator)
// 2. Account owner matches the program ID
// 3. Account data can be deserialized into type T
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
}
```

### Manual Account Validation (Native)

```rust
// For native programs without Anchor
fn validate_account(
    account: &AccountInfo,
    expected_owner: &Pubkey,
    expected_type: &[u8],  // discriminator
) -> Result<(), ProgramError> {
    // 1. Check owner
    if account.owner != expected_owner {
        return Err(ProgramError::InvalidAccountOwner);
    }
    // 2. Check discriminator
    let data = account.try_borrow_data()?;
    if &data[0..8] != expected_type {
        return Err(ProgramError::InvalidAccountData);
    }
    // 3. Check not zeroed
    if account.lamports() == 0 {
        return Err(ProgramError::UninitializedAccount);
    }
    Ok(())
}
```

---

## PDA Derivation and Verification

### Store Bump on Creation

```rust
#[account]
pub struct Vault {
    pub bump: u8,        // Store canonical bump
    pub authority: Pubkey,
    pub balance: u64,
}

// On initialization
let (vault_pda, bump) = Pubkey::find_program_address(
    &[b"vault", authority.key().as_ref()],
    &crate::ID,
);
vault.bump = bump;
```

### Verify Bump on Every Use

```rust
// Anchor: seeds + bump constraint (preferred)
#[account(
    seeds = [b"vault", authority.key().as_ref()],
    bump = vault.bump,  // Verifies against stored value
)]
pub vault: Account<'info, Vault>,

// Manual verification
let (expected_pda, _) = Pubkey::find_program_address(
    &[b"vault", ctx.accounts.vault.authority.as_ref()],
    &crate::ID,
);
require!(
    ctx.accounts.vault.key() == expected_pda,
    ErrorCode::InvalidVaultPda
);
```

### Never Trust Re-derived Bumps

```rust
// DANGEROUS: find_program_address may return non-canonical bump
let (pda, bump) = Pubkey::find_program_address(&[b"vault"], &crate::ID);
// bump might not match the stored/canonical bump

// SAFE: use stored bump for verification
let (expected_pda, _) = Pubkey::find_program_address(
    &[b"vault"],
    &crate::ID,
);
require!(account.key() == expected_pda, ErrorCode::InvalidPda);
```

---

## Signer Verification

### Anchor Signer Type

```rust
// Signer<'info> enforces is_signer = true
pub authority: Signer<'info>,

// Combined with has_one for authorization
#[account(
    has_one = authority,  // Verifies account.authority == authority.key()
)]
pub config: Account<'info, Config>,
```

### Access Control Patterns

```rust
// Admin-only operation
#[derive(Accounts)]
pub struct AdminAction<'info> {
    pub admin: Signer<'info>,
    #[account(
        has_one = admin,  // Only the stored admin can call
    )]
    pub config: Account<'info, Config>,
}

// Multi-authority operation
#[derive(Accounts)]
pub struct DualAuthAction<'info> {
    pub authority_a: Signer<'info>,
    pub authority_b: Signer<'info>,
    #[account(
        has_one = authority_a,
        constraint = config.authority_b == authority_b.key()
            @ ErrorCode::UnauthorizedB,
    )]
    pub config: Account<'info, Config>,
}
```

---

## CPI Safety

### Hardcoded Program IDs

```rust
// Always use known program IDs for CPI targets
invoke_signed(
    &spl_token::id(),  // ← Hardcoded, cannot be spoofed
    &[
        source.to_account_info(),
        destination.to_account_info(),
        authority.to_account_info(),
    ],
    &[seeds],
)?;

// For custom programs, import the program ID
use my_other_program::ID as OTHER_PROGRAM_ID;
invoke_signed(
    &OTHER_PROGRAM_ID,  // ← Compile-time constant
    &accounts,
    &[seeds],
)?;
```

### CPI with PDA Signer

```rust
// Use invoke_signed for PDA authority
invoke_signed(
    &spl_token::id(),
    &[
        ctx.accounts.vault.to_account_info(),
        ctx.accounts.destination.to_account_info(),
        ctx.accounts.vault.to_account_info(),  // PDA as signer
    ],
    &[
        &[b"vault", ctx.accounts.authority.key().as_ref(), &[vault.bump]]
    ],
)?;
```

### CPI Reentrancy Prevention

```rust
// Check if being called via CPI to prevent reentrancy
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked,
    load_instruction_count_checked,
};

let current_ix = load_current_index_checked(&ix_sysvar)?;
let total_ix = load_instruction_count_checked(&ix_sysvar)?;

// If current instruction is not the last, we're in a CPI
if current_ix < total_ix - 1 {
    return Err(ErrorCode::CPIReentrancyNotAllowed);
}
```

---

## Account Closing

### Anchor Close Constraint

```rust
// Anchor's close constraint handles:
// 1. Transfers lamports to receiver
// 2. Clears the discriminator (prevents resurrection)
// 3. Zeroes account data
#[account(
    mut,
    close = receiver,
)]
pub data_account: Account<'info, MyData>,
pub receiver: SystemAccount<'info>,
```

### Manual Close (If Needed)

```rust
fn close_account(account: &AccountInfo, receiver: &AccountInfo) -> ProgramResult {
    // 1. Clear discriminator to prevent resurrection
    let mut data = account.try_borrow_mut_data()?;
    data[0..8].fill(0);

    // 2. Transfer lamports
    let dest_starting_lamports = receiver.lamports();
    **receiver.lamports.borrow_mut() = dest_starting_lamports + account.lamports();
    **account.lamports.borrow_mut() = 0;

    // 3. Set data length to 0 (runtime handles this)
    Ok(())
}
```

---

## Rent-Exempt Safety

### Check Rent Before Operations

```rust
use anchor_lang::solana_program::rent::Rent;

// Ensure account stays rent-exempt after withdrawal
let rent = Rent::get()?;
let min_balance = rent.minimum_balance(vault.data_len());
let withdrawable = vault.lamports().saturating_sub(min_balance);
require!(
    amount <= withdrawable,
    ErrorCode::RentExemptViolation
);
```

### Realloc with Proper Funding

```rust
#[account(
    mut,
    realloc = new_size,
    realloc::zero = false,
    realloc::payer = payer,  // Pays additional rent for larger size
)]
pub data_account: Account<'info, MyData>,
pub payer: Signer<'info>,
```

---

## Remaining Accounts

### Validate Each Account

```rust
pub fn process_batch(ctx: Context<BatchProcess>) -> Result<()> {
    for account_info in ctx.remaining_accounts.iter() {
        // 1. Verify owner
        require!(
            account_info.owner == &crate::ID,
            ErrorCode::InvalidAccountOwner
        );

        // 2. Verify type (discriminator)
        let data = account_info.try_borrow_data()?;
        require!(
            &data[0..8] == MyData::DISCRIMINATOR,
            ErrorCode::InvalidAccountType
        );

        // 3. Deserialize and process
        let account_data = MyData::try_from(account_info)?;
        // Process...
    }
    Ok(())
}
```

### Bound Iteration

```rust
const MAX_REMAINING_ACCOUNTS: usize = 10;

let accounts_to_process = ctx.remaining_accounts
    .iter()
    .take(MAX_REMAINING_ACCOUNTS);
```

---

## Token-2022 Compatibility

### Detect Token Program

```rust
// Check which token program owns the mint
let token_program = if ctx.accounts.mint.owner == &spl_token_2022::id() {
    ctx.accounts.token_program_2022.to_account_info()
} else {
    ctx.accounts.token_program.to_account_info()
};
```

### Use transfer_checked

```rust
// transfer_checked works with both SPL Token and Token-2022
// It also handles transfer fees correctly for Token-2022
token::transfer_checked(
    CpiContext::new_with_signer(
        token_program,
        TransferChecked {
            source: ctx.accounts.source.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            destination: ctx.accounts.destination.to_account_info(),
            authority: ctx.accounts.vault.to_account_info(),
        },
        &[&[b"vault", &[vault.bump]]],
    ),
    amount,
    decimals,
)?;
```

---

## Space Calculation

### Anchor Account Size

```rust
// Anchor accounts need 8 bytes discriminator + data
// Use anchor_lang::AccountSpace for automatic calculation
#[account]
pub struct Vault {
    pub authority: Pubkey,      // 32 bytes
    pub mint: Pubkey,           // 32 bytes
    pub balance: u64,           // 8 bytes
    pub bump: u8,               // 1 byte
    pub is_frozen: bool,        // 1 byte
    // Total: 8 (discriminator) + 32 + 32 + 8 + 1 + 1 = 82
}

// Dynamic size with Vec/String
#[account]
pub struct Metadata {
    pub name: String,           // 4 (length) + max_len
    pub uri: String,            // 4 (length) + max_len
}
// Space = 8 + 4 + max_name_len + 4 + max_uri_len
```

### Init with Correct Space

```rust
#[account(
    init,
    payer = authority,
    space = 8 + 32 + 32 + 8 + 1 + 1,  // discriminator + fields
)]
pub vault: Account<'info, Vault>,
```
