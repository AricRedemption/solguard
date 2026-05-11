# SPL Token Integration Patterns

Detailed reference for SPL Token and Token-2022 integration patterns,
authority semantics, and security considerations.

---

## Authority Semantics

### Token Account Owner vs Delegate

| Authority | Capabilities | How Set |
|-----------|-------------|---------|
| **Owner** | Transfer, burn, approve, close, set close authority | Set at creation, can be changed via `set_authority` |
| **Delegate** | Transfer, burn (up to `delegated_amount`) | Set via `approve` instruction |
| **Close Authority** | Close account and reclaim rent | Set at creation or via `set_authority` |
| **Freeze Authority** | Freeze/thaw token account | Set on mint at creation |

### Mint Authority

```rust
// Mint authority can mint unlimited tokens
// CRITICAL: if mint authority is a single key, it's a centralization risk
pub struct Mint {
    pub mint_authority: COption<Pubkey>,  // None = no more minting
    pub supply: u64,
    pub decimals: u8,
    pub is_initialized: bool,
    pub freeze_authority: COption<Pubkey>,
}

// SECURE: PDA as mint authority (program-controlled)
let (mint_authority, bump) = Pubkey::find_program_address(
    &[b"mint-authority"],
    &crate::ID,
);

// SECURE: Disable minting after initial distribution
// Set mint_authority to None after initial supply is minted
```

### Delegate Patterns

```rust
// User approves delegate for specific amount
token::approve(
    CpiContext::new(
        token_program.to_account_info(),
        Approve {
            to: token_account.to_account_info(),
            delegate: delegate_account.to_account_info(),
            authority: owner.to_account_info(),
        },
    ),
    amount,
)?;

// VULNERABILITY: approving max amount creates unlimited delegate
token::approve(ctx, u64::MAX)?;  // ← Delegate can drain entire account

// SECURE: approve only needed amount
token::approve(ctx, exact_needed_amount)?;
```

---

## Associated Token Account (ATA) Patterns

### ATA Derivation

```rust
use spl_associated_token_account::get_associated_token_address;

// ATA is derived deterministically from owner + mint
let ata = get_associated_token_address(&owner, &mint);

// Seeds: [owner, TOKEN_PROGRAM_ID, mint]
// This means:
// - Same owner + mint always produces same ATA
// - Different token programs produce different ATAs
// - Token-2022 ATAs are different from SPL Token ATAs
```

### ATA Creation

```rust
// Create ATA if it doesn't exist
let ata = get_associated_token_address(&owner, &mint);

if ata.data_len() == 0 {
    associated_token::create(
        CpiContext::new(
            associated_token_program.to_account_info(),
            Create {
                payer: payer.to_account_info(),
                associated_token: ata.to_account_info(),
                authority: owner.to_account_info(),
                mint: mint.to_account_info(),
                system_program: system_program.to_account_info(),
                token_program: token_program.to_account_info(),
            },
        ),
    )?;
}
```

### ATA Validation

```rust
// Verify ATA belongs to expected owner and mint
#[derive(Accounts)]
pub struct TokenTransfer<'info> {
    #[account(
        associated_token::mint = mint,
        associated_token::authority = owner,
    )]
    pub token_account: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    pub owner: Signer<'info>,
}
```

---

## Wrapped SOL (wSOL) Patterns

### wSOL Behavior

```rust
// wSOL (wrapped SOL) is a special SPL Token account:
// 1. It holds SOL balance as token balance
// 2. Must call sync_native after SOL transfer to update token balance
// 3. Closing a wSOL account returns SOL to the owner
// 4. wSOL mint is native_mint::id()

// Creating wSOL account
let wsol_account = get_associated_token_address(&owner, &native_mint::id());

// Funding wSOL account
system_instruction::transfer(&owner, &wsol_account, amount);
// MUST call sync_native after transfer
token::sync_native(CpiContext::new(
    token_program.to_account_info(),
    SyncNative {
        account: wsol_account.to_account_info(),
    },
))?;
```

### wSOL Security Considerations

- `sync_native` can be called by anyone (not just the owner)
- If program creates a wSOL ATA, it must fund it and sync before use
- Closing wSOL account returns lamports to owner — ensure close authority is correct
- wSOL balance can change via SOL transfer without token instruction

---

## Token Account Close and Resurrection

### Close Token Account

```rust
// Closing a token account:
// 1. Balance must be 0
// 2. Close authority or owner must sign
// 3. Lamports are transferred to destination

token::close_account(CpiContext::new(
    token_program.to_account_info(),
    CloseAccount {
        account: token_account.to_account_info(),
        destination: destination.to_account_info(),
        authority: authority.to_account_info(),
    },
))?;
```

### Resurrection Risk

```rust
// After closing a token account:
// 1. Account data is zeroed
// 2. Lamports are transferred out
// 3. BUT: if someone sends lamports back, the account can be recreated

// VULNERABLE: program assumes closed account stays closed
// If the closed account's ATA is recreated with a different owner,
// funds could be sent to the wrong recipient

// MITIGATION: check that token account is initialized before use
require!(
    token_account.owner == token_program_id,
    ErrorCode::UninitializedTokenAccount
);
```

---

## Token-2022 Extensions

### CPI Guard

```rust
// CPI Guard prevents CPI-initiated transfers from the account
// When enabled, only the account owner can transfer via direct instruction
// Programs must use transfer_checked instead of transfer

// Detection: check if CPI guard is enabled
let extension = get_extension::<CpiGuard>(&token_account)?;
let cpi_guard_enabled = extension.lock_cpi == PodBool::true_;

// If CPI guard is enabled, program MUST use transfer_checked
// transfer() will fail with CPI guard enabled
```

### Transfer Fee

```rust
// Token-2022 can have a transfer fee configured on the mint
// When transferring, the received amount is less than the sent amount
// The fee is collected by the fee authority

// CRITICAL: balance checks must account for fees
let fee = calculate_transfer_fee(&mint_config, transfer_amount);
let received = transfer_amount - fee;

// VULNERABLE: assuming received == sent
require!(
    destination_balance >= expected_amount,  // ← Will fail with transfer fee
);

// SECURE: use transfer_checked and verify actual received amount
let pre_balance = destination.amount;
token_2022::transfer_checked(...)?;
let post_balance = destination.amount;
let actual_received = post_balance - pre_balance;
```

### Confidential Transfer

```rust
// Confidential transfers encrypt balances using ElGamal
// On-chain balance is encrypted, cannot be read directly
// Auditors cannot verify exact amounts on-chain

// Security considerations:
// 1. Cannot verify balance invariants with encrypted balances
// 2. Must rely on the cryptographic proofs for correctness
// 3. Program must use confidential transfer instructions
// 4. Available balance ≠ pending balance (needs ElGamal decryption)
```

### Immutable Ownership

```rust
// Once set, the account owner cannot be changed
// This prevents authority transfer attacks
// But also means the owner is permanently set

// SECURE: use immutable ownership for program-controlled accounts
// Prevents accidental or malicious ownership transfer
```

### Permanent Delegate

```rust
// Permanent delegate can transfer or burn any token from any account
// This is EXTREMELY powerful — effectively a backdoor

// CRITICAL: if permanent delegate is set, the delegate authority
// can seize tokens from any holder at any time
// This is a major centralization risk

// Detection:
let extension = get_extension::<PermanentDelegate>(&mint)?;
let delegate = Option::<Pubkey>::from(extension.delegate);
if let Some(delegate_key) = delegate {
    // Flag as centralization risk
}
```

### Non-Transferable Tokens

```rust
// Tokens that cannot be transferred after minting
// Useful for soul-bound tokens or credentials

// Security: check that program doesn't attempt to transfer these
// Any transfer instruction will fail
```

### Interest-Bearing Tokens

```rust
// Token balance accrues interest over time
// The displayed balance changes based on current time and interest rate

// VULNERABLE: using cached balance without time adjustment
let balance = token_account.amount;  // ← May be stale

// SECURE: use the interest-bearing extension to get current balance
let extension = get_extension::<InterestBearingConfig>(&mint)?;
let current_time = Clock::get()?.unix_timestamp;
let adjusted_balance = extension.amount_as_ui_amount(token_account.amount, current_time)?;
```

### Default Account State

```rust
// New token accounts can be created in frozen state by default
// Users must unfreeze before transferring

// Security: program should handle frozen accounts gracefully
// Check if accounts are frozen before attempting operations
```

---

## Metaplex Token Metadata

### Metadata Integration

```rust
// Metaplex token metadata is stored in a PDA derived from:
// seeds = ["metadata", METAPLEX_PROGRAM_ID, mint_id]

// When creating NFTs, program must:
// 1. Create the mint
// 2. Create metadata account via CPI to Metaplex
// 3. Set mint authority to None (for NFTs with supply 1)

// Security: verify metadata CPI uses correct program ID
require!(
    ctx.accounts.metadata_program.key() == metaplex_token_metadata::id(),
    ErrorCode::InvalidMetadataProgram
);
```

### Compressed NFTs / Merkle Trees

```rust
// Compressed NFTs use Merkle trees instead of individual token accounts
// State is stored in account compression program

// Security considerations:
// 1. Tree authority must be properly validated
// 2. Leaf verification must use correct Merkle proof
// 3. Concurrent merkle tree canopy depth affects verification
// 4. Program must handle tree full scenarios
```

---

## PDA-Based Token Authority

### Program-Controlled Token Accounts

```rust
// PDA as token account authority — program controls the tokens
let (vault_pda, bump) = Pubkey::find_program_address(
    &[b"vault", mint.key().as_ref()],
    &crate::ID,
);

// PDA signs via invoke_signed
invoke_signed(
    &spl_token::id(),
    &[
        vault.to_account_info(),
        destination.to_account_info(),
        vault.to_account_info(),  // PDA as both account and signer
    ],
    &[&[b"vault", mint.key().as_ref(), &[bump]]],
)?;

// CRITICAL: ensure PDA authority is unique per user/mint
// Shared PDA vaults allow one user to drain another's funds
```

### ERC20 Allowance vs Solana Delegate

```
| Aspect | ERC20 Allowance | Solana Delegate |
|--------|----------------|-----------------|
| Scope | Per spender | Single delegate per account |
| Amount | Per approval call | Single delegated_amount |
| Revocation | Set to 0 | Revoke instruction |
| Multiple | Yes (per spender) | No (one delegate at a time) |
| Expiry | No (unless using permit2) | No |
```
