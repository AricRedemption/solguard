# Solana Audit Report Template

Use this template for structuring Solana program audit reports.

---

## Report Header

```
# Security Audit Report: [Program Name]

**Program Address**: [Address or "Local Review"]
**Repository**: [GitHub URL or "Provided Source"]
**Commit Hash**: [Git commit hash]
**Audit Date**: [YYYY-MM-DD]
**Auditor**: [Name/Firm]
**Framework**: Anchor vX.Y.Z / Native Solana
**Solana Version**: v1.X.X
**Scope**: [Number of files, lines of code]
```

---

## Executive Summary

```
## Executive Summary

A security audit was performed on [Program Name], a [description of protocol]
built on Solana using [Anchor/Native Rust]. The audit covered [X] instruction
handlers across [Y] source files totaling [Z] lines of code.

### Key Findings

| Severity | Count |
|----------|-------|
| Critical | X |
| High | Y |
| Medium | Z |
| Low | A |
| Informational | B |

### Overall Assessment

[One paragraph summarizing the security posture. Include:
- Whether the program can be safely deployed
- Any critical issues that must be fixed before launch
- Notable design decisions and their security implications]
```

---

## Finding Format

Each finding must follow this structure:

```
## [C/H/M/L/I-001] Finding Title

**Severity**: Critical | High | Medium | Low | Informational
**Category**: [From Solana vulnerability taxonomy]
**Location**: `path/to/file.rs#L42-L58`
**Confidence**: High | Medium | Low

### Description

Clear explanation of the vulnerability specific to Solana's account model.
Include:
- What the code does incorrectly
- Why this is a security issue in the Solana context
- Which accounts or instructions are affected

### Impact

Concrete description of potential damage:
- Funds at risk (amount or percentage of TVL)
- Which users are affected
- Whether the attack is permissionless or requires specific conditions
- Whether the issue is exploitable on-chain or only in specific scenarios

### Proof of Concept

Step-by-step exploit scenario using Solana transaction construction:

```typescript
// Using @solana/web3.js
const transaction = new Transaction()
  .add(
    new TransactionInstruction({
      keys: [
        { pubkey: attackerVault, isSigner: false, isWritable: true },
        { pubkey: victimAccount, isSigner: false, isWritable: true },
        // ... exploit account setup
      ],
      programId: PROGRAM_ID,
      data: instructionData,
    })
  );

// Or using Anchor test
await program.methods
  .exploitableInstruction(args)
  .accounts({
    // ... exploit account configuration
  })
  .signers([attackerKeypair])
  .rpc();
```

### Recommendation

Specific Rust/Anchor code changes to fix the vulnerability:

```rust
// Before (vulnerable)
#[derive(Accounts)]
pub struct VulnerableInstruction<'info> {
    pub some_account: UncheckedAccount<'info>,
}

// After (fixed)
#[derive(Accounts)]
pub struct FixedInstruction<'info> {
    pub some_account: Account<'info, ExpectedType>,
}
```

### References

- [Link to relevant Solana documentation]
- [Link to similar real-world exploit if applicable]
- [Link to Trail of Bits lint or Neodyme case study]
```

---

## Architecture Overview

```
## Architecture Overview

### Program Structure
- [List of instruction handlers and their purposes]
- [Account types and their relationships]
- [PDA derivation paths used]
- [CPI targets and purposes]

### Trust Model
- [Upgrade authority and its implications]
- [Admin/authority roles and their capabilities]
- [PDA authorities and what they control]
- [External program dependencies]

### Entry Points
| Instruction | Access Level | State Changes | CPI Calls |
|-------------|-------------|---------------|-----------|
| initialize | Admin | Creates config | None |
| deposit | Public | Updates vault balance | SPL Token transfer |
| withdraw | Authority | Updates vault balance | SPL Token transfer |
```

---

## Findings Summary Table

```
### Findings Summary

| ID | Title | Severity | Category | Status |
|----|-------|----------|----------|--------|
| C-001 | Arbitrary CPI in withdraw | Critical | arbitrary-cpi | Open |
| H-001 | Missing ownership check on config | High | missing-ownership | Open |
| M-001 | Rent-exempt not checked after withdrawal | Medium | rent-exempt | Open |
| L-001 | Unused account in Initialize | Low | unused-account | Open |
```

---

## Appendix

```
## Appendix A: Solana-Specific Terminology

| Term | Description |
|------|-------------|
| PDA | Program Derived Address — deterministically derived from seeds and program ID |
| CPI | Cross-Program Invocation — Solana's mechanism for program-to-program calls |
| Signer | Account that has authorized the transaction with a valid signature |
| Authority | Account designated as the owner/controller of a resource |
| Discriminator | First 8 bytes of Anchor account data, used for type identification |
| Rent-exempt | Account with sufficient lamports to persist without periodic fees |
| Bump | Non-byte used in PDA derivation to ensure the address falls off the ed25519 curve |

## Appendix B: Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| Manual Review | N/A | Primary analysis method |
| [Tool Name] | [Version] | [Purpose] |

## Appendix C: Files Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| src/instructions/deposit.rs | 1-85 | Deposit handler |
| src/instructions/withdraw.rs | 1-120 | Withdraw handler |
| src/state/vault.rs | 1-45 | Vault account definition |
```
