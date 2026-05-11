# Project-local skills

## Directory Structure

```
public/skills/
├── audit/                    # Audit pipeline skills (used by SolGuard pipeline)
│   ├── entry-point-analyzer/ # Phase 1: Entry point discovery
│   ├── audit-context-building/ # Phase 2: Deep context building
│   ├── solana-security-audit/ # Phase 3+5: Solana vulnerability analysis + report
│   ├── solana-token-analyzer/ # Phase 3.5: SPL Token / Token-2022 analysis
│   ├── variant-analysis/     # Phase 4: Variant pattern search
│   ├── solidity-security-audit/ # EVM/Solidity audit (for non-Solana use)
│   └── token-integration-analyzer/ # EVM token integration (for non-Solana use)
├── _skill-commands/          # Command wrappers
├── planning-with-files/      # Planning workflow
└── README.md
```

## Audit Skills

### Solana Pipeline (primary)

| Skill | Phase | Description |
|-------|-------|-------------|
| `entry-point-analyzer` | Phase 1 | Detect Anchor/Native, enumerate instruction handlers, classify access levels |
| `audit-context-building` | Phase 2 | Ultra-granular function analysis, trust boundaries, invariants |
| `solana-security-audit` | Phase 3+5 | 13 Solana vulnerability patterns, severity tree, secure patterns, report template |
| `solana-token-analyzer` | Phase 3.5 | SPL Token / Token-2022 authority semantics, extension risks |
| `variant-analysis` | Phase 4 | Abstraction ladder variant search, Solana-specific patterns, Semgrep rules |

### EVM/Solidity Pipeline (secondary)

| Skill | Phase | Description |
|-------|-------|-------------|
| `solidity-security-audit` | Phase 3+5 | EVM vulnerability taxonomy, DeFi checklist, report template |
| `token-integration-analyzer` | Phase 3.5 | ERC-20/721 integration patterns |

## Recommended Audit Pipeline (Solana)

### Phase 0: Scope Freeze (manual)

Define and record:

- target commit hash
- in-scope program files (.rs, Cargo.toml, Anchor.toml)
- deployment cluster (mainnet, devnet)
- upgrade authority and trust assumptions
- SPL Token / Token-2022 usage

Output: `audit/scope.md`

### Phase 1: Entry Point Discovery

Use: `entry-point-analyzer` + `references/solana.md`

- detect Anchor vs Native framework
- enumerate all instruction handlers (state-changing entry points)
- classify access levels (Public, Role-Restricted, Contract-Only)
- identify PDA derivation patterns and CPI targets

### Phase 2: Context Building

Use: `audit-context-building` + `SOLANA_PROJECT_STRUCTURE.md` + `SOLANA_MICRO_ANALYSIS_EXAMPLE.md`

- ultra-granular function-by-function analysis
- map account structs, constraints, and authority relationships
- identify trust boundaries and key invariants

### Phase 3: Security Audit

Use: `solana-security-audit` + `solana-vulnerability-patterns.md` + `solana-severity-decision-tree.md` + `solana-secure-patterns.md`

- CRITICAL: Arbitrary CPI, PDA Validation, Signer Check, Account Substitution
- HIGH: Ownership Check, Constraint Bypass, Remaining Accounts, Close Resurrection, Token-2022
- MEDIUM: Rent-Exempt, Compute DoS, Instruction Introspection

### Phase 3.5: Token Integration Review (if SPL Token / Token-2022 used)

Use: `solana-token-analyzer`

- analyze authority semantics for all token operations
- check Token-2022 extension risks (CPI guard, transfer fee, confidential transfer)

### Phase 4: Variant Analysis

Use: `variant-analysis` + `solana-variant-patterns.md` + `semgrep/rust.yaml`

- search for vulnerability variants across all instruction handlers
- apply abstraction ladder (exact → variable → structural → semantic)

### Phase 5: Report Generation

Use: `solana-security-audit` + `solana-report-template.md`

- generate structured audit report with Solana terminology
- include Solana-specific PoC (transaction construction)
- provide Anchor/Rust remediation code

## Practical Rules

- Do not run all skills at once; follow phase order.
- Use `solana-security-audit` as the primary audit framework for Solana.
- Use `solidity-security-audit` for EVM/Solidity audits.
- Keep `references/` folders intact for consistent and repeatable audit quality.
- Audit conclusions are valid only for the frozen commit.
