# SolGuard

<div align="center">

[![BUSL-1.1](https://img.shields.io/badge/license-BUSL--1.1-orange.svg)](#license)
[![Solana Security](https://img.shields.io/badge/Solana-security-purple.svg)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)

**An AI-assisted, evidence-first pre-audit assistant and scanner for Solana programs**

[English](#english)

</div>

---

# English

## Overview

SolGuard is a web-based pre-audit assistant for Solana programs. It analyzes local source files or GitHub repository URLs, streams progress live, and presents evidence, context, and findings in a dedicated run view. It helps prepare for manual security review; it does not replace a manual audit.

The current codebase focuses on:
- Evidence-first review phases for entry-point discovery, context building, vulnerability analysis, variant analysis, and report generation.
- Local-first workflows with browser-stored settings and run snapshots.
- Support for Anthropic, OpenAI, and custom LLM endpoints.
- A bilingual UI with dashboard, evolution, memory, and regression views.

## Who it is for

- Solana protocol and dApp developers who want an early security pass before review
- Security engineers who need a fast way to triage source code and gather evidence
- Audit teams that want to organize findings, context, and regression history in one workflow

## Features

- Upload local source files or paste GitHub URLs.
- Stream pre-audit progress over SSE and open a dedicated run page for each execution.
- Inspect evidence, timeline events, and stored snapshots.
- Switch between English and Chinese in the UI.
- Review evolution and regression views for follow-up analysis.

## Supported Inputs

The audit API currently accepts files with these extensions:

- `.rs`
- `.toml`
- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.sol`
- `.py`

Practical limits enforced by the API:
- Up to 50 files per request
- Up to 10 MB per file
- Up to 50 MB total payload size

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- tree-sitter parsers

## Getting Started

```bash
pnpm install
pnpm dev
```

Open the app at:

```text
http://localhost:3000/dashboard
```

Then configure your LLM API key from the settings panel in the UI.

## Project Structure

- `src/app/` - App Router pages and API routes
- `src/components/` - Shared UI and dashboard components
- `src/lib/` - Audit pipeline, LLM adapters, storage, and helpers
- `public/skills/` - Prompt and audit skill packs used by the pipeline

## Development

Common scripts:

```bash
pnpm lint
pnpm build
```

## Commercial Use

SolGuard is published under Business Source License 1.1 (BUSL-1.1). The public repository is available for evaluation, internal testing, and other non-production uses allowed by the license text.

If you want to use SolGuard in production, embed it in a paid service, or otherwise need commercial rights, you need a separate commercial license.

Commercial licensing overview: [/docs/commercial-license.md](/docs/commercial-license.md)
Commercial agreement template: [/docs/commercial-license-template.md](/docs/commercial-license-template.md)

## License

This repository is licensed under **Business Source License 1.1 (BUSL-1.1)**.

Important:
- BUSL-1.1 is source-available, not OSI open source.
- Non-production use is allowed under the public license.
- If you want the project to be open source, the public license cannot forbid commercial use.

## Contributing

Contributions are welcome. If you add features, keep the README aligned with the real behavior of the app and avoid advertising unsupported metrics.
