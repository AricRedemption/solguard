---
name: solana-security-audit
description: >
  Use when auditing Solana programs and users mention: "audit Solana program",
  "review Anchor code", "find Solana vulns", "check signer validation", "PDA validation",
  "CPI security", "account substitution", "Anchor constraint bypass", "remaining accounts",
  "Token-2022 risks", "rent-exempt", "close account resurrection", "Solana audit",
  "Anchor security", "program audit", "Rust audit", "Solana exploit", "CPI reentrancy",
  "bump seed", "account validation", "Solana vulnerability", "program security",
  "Solana severity", "Solana report", "Solana PoC", "instruction introspection",
  "sysvar check", "ownership check", "Arbitrary CPI", "PDA collision",
  "Anchor has_one", "constraint bypass", "Solana secure patterns", "not-so-smart-contracts".
---

# Solana Security Audit Skill

## Purpose

Perform professional-grade Solana program security audits using vulnerability
patterns specific to the Solana runtime and Anchor framework. Produce actionable,
severity-classified findings with remediation guidance tailored to Solana's
account model, CPI mechanics, and PDA architecture.

## Audit Mode Selection

| Mode | When to Use | Entry Point |
|------|-------------|-------------|
| **Full Audit** | First-time review of a Solana program | Phases 1–5 below |
| **Re-audit / Diff** | Previous audit exists; team applied fixes | Compare changes against prior findings |
| **Token Integration Review** | Program uses SPL Token / Token-2022 | `solana-token-analyzer` skill + Phase 3 |
| **Quick Scan** | Rapid assessment, limited time | Phase 1 + Phase 3 (CRITICAL/HIGH only) |

For severity classification, consult `references/solana-severity-decision-tree.md`.

---

## Full Audit Workflow

### Phase 1 — Reconnaissance

1. Identify the Solana program framework: Anchor (check `Cargo.toml` for `anchor-lang`) vs Native
2. Map the program architecture: instruction handlers, account structs, state models
3. Identify the program type: DeFi lending, DEX, NFT marketplace, governance, staking, bridge
4. Determine the trust model: upgrade authority, admin keys, PDA authorities, multisig
5. List all CPI targets (Token program, Associated Token, Metaplex, other custom programs)
6. Check for Token-2022 usage (confidential transfers, transfer fees, CPI guard)

### Phase 2 — Automated Detection

If tools are available:

```bash
# Trail of Bits lints
cargo install solana-security-txt
cargo audit

# Anchor-specific checks
anchor test --skip-build -- --features test-sbf

# Custom lint patterns from Trail of Bits solana-vulnerability-scanner
# See references/solana-vulnerability-patterns.md for detection regexes
```

If tools are NOT available, perform manual static analysis following the
detection patterns in `references/solana-vulnerability-patterns.md`.

### Phase 3 — Manual Review (Core)

Follow the Solana vulnerability taxonomy systematically. This is the highest-value phase.

**CRITICAL — Check these first:**

1. **Arbitrary CPI** — Program invokes another program with user-controlled program ID
2. **Improper PDA Validation** — PDA seeds not verified or bump seed not checked against stored value
3. **Missing Signer Check** — Sensitive operations lack `is_signer` / `Signer<'info>` verification
4. **Account Substitution / Type Confusion** — Account discriminator not checked; wrong account type accepted

**HIGH — Check next:**

5. **Missing Ownership Check** — Account owner not verified as expected program
6. **Anchor Constraint Bypass** — `has_one`, `constraint`, `mut` constraints can be circumvented
7. **Remaining Accounts Abuse** — `ctx.remaining_accounts` used without validation
8. **Close Account Resurrection** — Closed accounts can be re-opened if lamports are sent back
9. **Sysvar Account Check** (pre-1.8.1) — Sysvar accounts not verified via `load_current_index_checked`
10. **Token-2022 Extension Risks** — CPI guard, confidential transfers, transfer fee bypass

**MEDIUM — Then check:**

11. **Rent-Exempt Violation** — Accounts not kept above rent-exempt minimum after operations
12. **Compute Budget Exhaustion / DoS** — Unbounded loops or expensive operations in instruction handlers
13. **Improper Instruction Introspection** — Instruction sysvar not properly validated

**LOW / INFORMATIONAL:**

14. Hardcoded program IDs that may need updating
15. Missing error codes or poor error messages
16. Unused accounts in instruction handlers
17. Code organization and readability

### Phase 4 — Variant Analysis

For each finding from Phase 3, search for the same vulnerability pattern
in other instruction handlers. Use the abstraction ladder:

- **Level 0**: Exact same code pattern (copy-paste detection)
- **Level 1**: Same pattern with different variable names
- **Level 2**: Same structural pattern (e.g., missing signer check in different account struct)
- **Level 3**: Same semantic pattern (e.g., any unchecked account that should be validated)

Consult `references/solana-vulnerability-patterns.md` for known variant patterns.

### Phase 5 — Report Generation

Structure every finding using the Solana-specific format in
`references/solana-report-template.md`:

```
## [SEVERITY-ID] Title

**Severity**: Critical | High | Medium | Low | Informational
**Category**: (from Solana vulnerability taxonomy)
**Location**: `program/src/instructions/handler.rs#L42-L58`

### Description
Clear explanation of the vulnerability specific to Solana's account model.

### Impact
Concrete description: funds at risk, account data corruption, unauthorized CPI.

### Proof of Concept
Solana transaction construction demonstrating the exploit.

### Recommendation
Specific Rust/Anchor code changes to fix the vulnerability.
```

## Key Solana Security Patterns to Enforce

### Validate Accounts → Update State → CPI
Every instruction handler that modifies state and makes CPI calls must validate
all accounts first, then update state, then perform CPI. This is the Solana
equivalent of Checks-Effects-Interactions.

### PDA Bump Seed Verification
Always store the bump seed from `find_program_address()` and verify it on
subsequent uses. Never re-derive with `find_program_address()` alone as a
security check — the returned bump may differ from the canonical one.

### Account Discriminator Checks
Anchor automatically checks account discriminators via `Account<'info, T>`.
For `AccountInfo` or `UncheckedAccount`, manually verify the discriminator
or account type to prevent type confusion attacks.

### Least Authority
Every instruction handler should require the minimum necessary signer authority.
Prefer Anchor constraints (`has_one`, `constraint`) over manual checks.
Never trust `UncheckedAccount` — always add explicit validation.

### Defense in Depth
Layer signer checks, ownership checks, PDA validation, and discriminator
checks. No single check should be the only protection for critical operations.

## Reference Materials

### Core References
- `references/solana-vulnerability-patterns.md` — 13 vulnerability patterns with detection code, checklists, and mitigations
- `references/solana-severity-decision-tree.md` — Solana-specific severity classification
- `references/solana-secure-patterns.md` — Secure Anchor/Rust patterns to compare against
- `references/solana-report-template.md` — Solana-specific audit report format

### External Resources
- Trail of Bits `solana-vulnerability-scanner` — Lint rules for the 6 critical patterns
- Neodyme `not-so-smart-contracts` — Real Solana exploit case studies
- Helius Solana Security — Common vulnerability patterns and mitigations
- Slowmist Solana Best Practices — Secure coding guidelines

Load these files as needed based on the specific audit context.
