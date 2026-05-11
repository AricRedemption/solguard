# SolGuard Landing Page Design Specification

## Executive Summary

**SolGuard** is an open-source security auditor for **Solana programs**, developed by **Alt Research (AltLayer)**. It aims to **systematically detect** known vulnerability patterns in Solana programs through static rules and multi-agent AI auditing pipelines. The project integrates multiple security analysis tools and covers **104 vulnerability patterns** (SOL-001 to SOL-104), optimized for the Solana ecosystem. SolGuard provides three interfaces: Web, CLI, and cross-platform Desktop (Tauri), supporting local or Docker deployment. This document outlines the landing page design for maximum conversion and trust-building.

## Vision Statement

> **"Detecting vulnerabilities before they become headlines."**

SolGuard positions itself as an "open-source security audit platform" that helps developers instantly scan program vulnerabilities by integrating extensive vulnerability patterns with AI analysis. The website describes it as an "advanced Solana program security auditor" with "100% CTF + Solana-Bench vulnerability coverage (120/120)". The goal is to lower the barrier to program security auditing.

## Key Messaging Pillars

### 1. Core Value Proposition
- **Source Available & Commercial**: BUSL-1.1 public license, commercial use requires a separate license
- **104 Vulnerability Patterns**: Comprehensive coverage of Solana-specific vulnerabilities
- **9 Specialized AI Agents**: Multi-agent pipeline for deep analysis
- **7.4s Average Scan**: Lightning-fast security scanning
- **100% CTF Coverage**: Validated against capture-the-flag challenges

### 2. Differentiators
| Feature | SolGuard | Competitors |
|---------|----------|-------------|
| Pricing | Free & Open Source | Paid services |
| AI Agents | 9 specialized agents | Single AI or none |
| Scan Speed | 7.4 seconds | Minutes to hours |
| Coverage | 104 patterns | Varies |
| Deployment | Web/CLI/Desktop/Docker | Web only or CLI |

### 3. Target Audience
- **Primary**: Solana developers and DeFi teams
- **Secondary**: Security auditors and auditors
- **Tertiary**: DAO treasuries and protocol governance

## Landing Page Sections

### Hero Section
**Purpose**: Immediate value communication and primary CTA

**Headline Options**:
- "Secure Your Solana Programs Before Launch"
- "The Most Advanced Solana Security Auditor"
- "Open-Source Security for the Solana Ecosystem"

**Sub-headline**: "Powered by 9 AI agents and 104 vulnerability patterns"

**CTA Buttons**:
- Primary: "Start Free Audit" → /dashboard
- Secondary: "View on GitHub" → GitHub repo

**Trust Indicators**:
- 10K+ Programs Audited
- 104 Vulnerability Patterns
- $2.5B+ TVL Protected
- 7.4s Average Scan Time

### Features Section (Use Cases)
**Purpose**: Showcase applicability across Solana ecosystem

**Tabs**:
1. **DeFi Protocols**
   - AMMs, lending protocols, yield aggregators
   - Liquidity pool security
   - Oracle manipulation detection
   - Flash loan protection

2. **NFT Platforms**
   - Marketplaces, minting contracts, NFTfi
   - Minting exploits prevention
   - Royalty enforcement
   - Marketplace vulnerabilities

3. **Infrastructure**
   - Validators, RPC providers, bridges
   - Bridge security
   - Validator protections
   - Cross-chain validation

4. **Gaming & Metaverse**
   - Play-to-earn mechanics, in-game economies
   - Tokenomics security
   - Reward distribution
   - Virtual asset protection

### Security Architecture Section
**Purpose**: Technical credibility through architecture transparency

**Four-Layer Architecture**:

1. **Orchestration Layer**
   - Intelligent task routing
   - Pipeline coordination

2. **Agent Layer**
   - 9 specialized AI agents:
     - Program Analyzer
     - Vulnerability Scanner
     - Access Control Auditor
     - DeFi Specialist
     - NFT Security Auditor
     - Tokenomics Analyzer
     - Bridge Security Agent
     - Formal Verification Agent
     - Report Generator

3. **Knowledge Base**
   - 104 vulnerability patterns (SOL-001 to SOL-104)
   - Case studies
   - Remediation templates
   - Solana-specific attack patterns

4. **Tool Layer**
   Integrated security tools:
   - **Static Analysis**: Slither, Aderyn, Semgrep
   - **Symbolic Execution**: Mythril, Manticore
   - **Fuzzing**: Echidna, Medusa, Foundry
   - **Formal Verification**: Halmos, Certora
   - **Solana Benchmarks**: Solana-Bench

### Stats & Social Proof
**Metrics**:
- 10,000+ Programs Audited
- 104 Vulnerability Patterns
- $2.5B+ TVL Protected
- 7.4s Average Scan Time
- 100% CTF Coverage

**Trust Logos** (optional):
- Marinade, Jupiter, Raydium, Solend, Phantom, Backpack

### Pricing / Features Section
**Purpose**: Clear product offering tiers

**Three Deployment Options**:

1. **Web UI** (Free)
   - Online scanning at solguard.org
   - No installation required
   - Quick start in seconds

2. **CLI** (Free)
   - Python Click-based command tool
   - Easy CI/CD integration
   - Commands: `solguard audit`, `solguard scan`, `solguard patterns`

3. **Desktop (Tauri)** (Free)
   - Cross-platform desktop app
   - Local scanning without backend
   - Auto Docker fallback

### Enterprise CTA
**Purpose**: Conversion for enterprise customers

**Custom Solutions**:
- Comprehensive audits by security experts
- Custom rule development
- Ongoing security partnerships

**Trust Badges**:
- Source Available (BUSL-1.1)
- Built by AltLayer/Alt Research
- 24/7 Community Support

### Footer
**Navigation**:
- Product: Features, Security, Pricing, Dashboard
- Resources: Documentation, GitHub, Security Advisories
- Community: Discord, Twitter, GitHub
- Company: About AltLayer, Contact

**Legal**:
- BUSL-1.1
- No data collection
- Open source transparency

## Design System

### Color Palette
```css
--color-solana-purple: #9945FF;
--color-solana-blue: #14F195;
--color-solana-green: #14F195;
--color-dark-900: #0a0a0f;
--color-dark-800: #12121a;
--color-dark-700: #1a1a2e;
--color-critical: #ef4444;
--color-high: #f97316;
--color-medium: #eab308;
--color-low: #22c55e;
```

### Typography
- **Headings**: Inter Bold
- **Body**: Inter Regular
- **Code**: JetBrains Mono

### Spacing & Layout
- Max width: 1280px (7xl)
- Section padding: py-24 (96px)
- Container padding: px-6 (24px)
- Card radius: rounded-2xl (16px)

### Animation Guidelines
- Scroll-triggered fade-in animations
- Hover scale: 1.05
- Transition duration: 300ms
- Gradient text effects for emphasis

## Call-to-Action Strategy

### Primary CTA
**Text**: "Start Free Audit"
**Destination**: /dashboard
**Style**: Gradient button (purple to blue)
**Placement**: Hero, Final CTA

### Secondary CTA
**Text**: "View on GitHub"
**Destination**: GitHub repo
**Style**: Outline button
**Placement**: Hero, Footer

### Tertiary CTA
**Text**: "Contact Sales"
**Destination**: mailto:contact@altlayer.io
**Style**: Ghost button
**Placement**: Enterprise section

## SEO & Metadata

### Title
`SolGuard | Advanced Solana Program Security Auditor`

### Meta Description
`The most advanced open-source security auditor for Solana programs. Powered by multi-agent AI, 104 vulnerability patterns, and lightning-fast static analysis.`

### Keywords
- Solana security
- Program audit
- Smart contract security (Solana context)
- DeFi security
- Vulnerability detection
- Rust security
- Anchor framework

## Responsive Breakpoints

| Breakpoint | Width | Layout Adjustments |
|------------|-------|-------------------|
| Mobile | < 640px | Single column, stacked CTAs |
| Tablet | 640px - 1024px | 2-column grids |
| Desktop | > 1024px | Full layout, 3-4 column grids |

## Performance Targets

- **Largest Contentful Paint**: < 2.5s
- **First Input Delay**: < 100ms
- **Cumulative Layout Shift**: < 0.1
- **Total Bundle Size**: < 500KB (excluding fonts)

## Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader friendly
- Color contrast ratios > 4.5:1
- Focus visible indicators

## Content Guidelines

### Tone
- Technical but accessible
- Confident but not arrogant
- Security-focused
- Developer-friendly

### Messaging Hierarchy
1. **Problem**: Solana programs need security
2. **Solution**: SolGuard provides comprehensive scanning
3. **Proof**: 104 patterns, 7.4s scan, open source
4. **CTA**: Start free audit now

### Avoid
- Exaggerated claims
- Fear-mongering
- Technical jargon without explanation
- Comparison to specific competitors by name

## Future Enhancements

### Phase 2
- Interactive CLI demo
- Live code editor preview
- Custom pattern submission form
- Team collaboration features

### Phase 3
- Integration marketplace
- Automated fix suggestions
- Security monitoring dashboard
- Compliance reporting (MiCA)

---

**Document Version**: 1.0
**Last Updated**: 2026-04-19
**Maintainers**: SolGuard Team (Alt Research)
