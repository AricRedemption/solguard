# Solana Severity Decision Tree

Use this decision tree to classify Solana vulnerability severity consistently
across audits. Based on Immunefi, Code4rena, and Sherlock severity standards
adapted for Solana's account model.

---

## CRITICAL

Direct loss of funds, permanent account data corruption, or complete bypass of
all access controls without requiring any privileged role.

### Indicators
- Attacker can steal funds from any user without special access
- Attacker can corrupt PDA account data permanently
- Attacker can execute arbitrary CPI to any program
- Attacker can bypass all authorization checks on any instruction

### Solana-Specific Critical Patterns
| Pattern | Why Critical |
|---------|-------------|
| Arbitrary CPI | Attacker redirects program call to malicious contract, can drain funds |
| Improper PDA Validation | Attacker substitutes PDA account, can access/modify unauthorized data |
| Missing Signer Check | Anyone can execute privileged operations (admin, authority) |
| Account Substitution | Wrong account type accepted, leading to type confusion and data corruption |

### Decision Questions
1. Can an arbitrary user steal funds? → **CRITICAL**
2. Can an arbitrary user execute admin/authority operations? → **CRITICAL**
3. Can an arbitrary user redirect a CPI to a malicious program? → **CRITICAL**
4. Can an arbitrary user substitute a critical account (vault, config, mint)? → **CRITICAL**

---

## HIGH

Conditional loss of funds, significant protocol disruption, or privilege escalation
that requires specific conditions or a privileged but non-admin role.

### Indicators
- Loss of funds requires specific conditions (e.g., specific token, timing)
- Non-admin privileged role can cause damage beyond intended scope
- Protocol disruption affecting multiple users
- Bypass of important but not all access controls

### Solana-Specific High Patterns
| Pattern | Why High |
|---------|----------|
| Missing Ownership Check | Attacker passes account owned by different program with crafted data |
| Anchor Constraint Bypass | Constraint logic can be circumvented under specific conditions |
| Remaining Accounts Abuse | Unvalidated accounts in remaining_accounts enable unauthorized actions |
| Close Account Resurrection | Closed account can be reactivated with stale data |
| Sysvar Account Spoofing | Fake sysvar account provides incorrect data (pre-1.8.1) |
| Token-2022 Extension Risks | CPI guard bypass, transfer fee miscalculation, confidential transfer issues |

### Decision Questions
1. Can a specific condition enable fund loss? → **HIGH**
2. Can a non-admin role escalate privileges? → **HIGH**
3. Can the protocol be disrupted for multiple users? → **HIGH**
4. Can account validation be bypassed under specific conditions? → **HIGH**

---

## MEDIUM

Indirect loss, limited impact requiring specific conditions, or griefing with cost
to the attacker. The vulnerability is real but constrained in impact.

### Indicators
- Loss is indirect (e.g., lost yield, not principal)
- Attack requires significant cost or specific timing
- Limited number of users affected
- Temporary disruption that can be recovered

### Solana-Specific Medium Patterns
| Pattern | Why Medium |
|---------|-----------|
| Rent-Exempt Violation | Account deletion causes temporary data loss, recoverable |
| Compute Budget DoS | Transaction fails but no funds lost, user can retry |
| Instruction Introspection | CPI detection bypass under specific conditions |
| Hardcoded Program IDs | May need updating but not exploitable in current deployment |

### Decision Questions
1. Is the loss indirect or limited to yield/opportunity? → **MEDIUM**
2. Does the attack cost the attacker significantly? → **MEDIUM**
3. Is the impact temporary or recoverable? → **MEDIUM**
4. Are only a limited number of users affected? → **MEDIUM**

---

## LOW

Minor issues, best practice violations, or theoretical edge cases with minimal
practical impact.

### Indicators
- Code quality issues that don't directly lead to exploits
- Theoretical edge cases with no realistic attack scenario
- Missing documentation or poor error messages
- Gas/compute optimization opportunities

### Solana-Specific Low Patterns
| Pattern | Why Low |
|---------|---------|
| Unused Accounts | Wasted compute, no security impact |
| Poor Error Messages | Harder debugging, no exploit risk |
| Code Organization | Maintainability concern, not security |
| Missing Events | Reduced observability, no direct exploit |

### Decision Questions
1. Is this a code quality issue with no direct exploit? → **LOW**
2. Is the attack purely theoretical with no realistic scenario? → **LOW**
3. Does this only affect developer experience? → **LOW**

---

## INFORMATIONAL

Suggestions for improvement, gas optimizations, or documentation gaps.

### Indicators
- Better coding patterns that don't affect security
- Documentation improvements
- Compute optimization suggestions
- Style consistency

---

## Edge Cases

### When to Upgrade Severity
- **Multiple LOW issues in the same code path** → Consider upgrading to MEDIUM
- **MEDIUM issue combined with a specific on-chain state** → Consider upgrading to HIGH
- **HIGH issue with simple exploit and high funds at risk** → Consider upgrading to CRITICAL

### When to Downgrade Severity
- **CRITICAL issue requires impractical conditions** → Consider downgrading to HIGH
  (e.g., requires governance vote that takes 48h + attacker needs 51% voting power)
- **HIGH issue requires attacker to already have privileged access** → Consider downgrading to MEDIUM
  (e.g., requires being a known authority address)

### Centralization Risks
Always flag centralization risks separately:
- Single admin key can pause/upgrade the program → **HIGH (centralization)**
- Upgrade authority can modify program logic → **HIGH (centralization)**
- Admin can freeze user accounts → **HIGH (centralization)**

These are not traditional vulnerabilities but should be disclosed as trust assumptions.
