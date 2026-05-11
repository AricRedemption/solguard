# SolGuard

<div align="center">

[![BUSL-1.1](https://img.shields.io/badge/license-BUSL--1.1-orange.svg)](#license)
[![Solana Security](https://img.shields.io/badge/Solana-security-purple.svg)](https://solana.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)

**An AI-assisted, evidence-first pre-audit assistant and scanner for Solana programs**

[English](#english) / [中文](#中文)

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

Contributions are welcome. If you add features, please keep the README aligned with the real behavior of the app and avoid advertising unsupported metrics.

---

# 中文

## 简介

SolGuard 是一个面向 Solana 程序的证据优先预审助手和扫描器。它可以分析本地源码或 GitHub 仓库地址，实时流式输出进度，并在独立的运行页面里展示证据、上下文和结果。它帮助人工安全审计做准备，但不能替代人工审计。

当前代码重点包括：
- 证据优先的预审流程，覆盖入口点发现、上下文构建、漏洞分析、变体分析和报告生成。
- 本地优先的工作流，设置和运行快照保存在浏览器中。
- 支持 Anthropic、OpenAI 和自定义 LLM 接口。
- 中英双语界面，包含 dashboard、evolution、memory 和 regression 页面。

## 功能

- 上传本地源码文件，或直接粘贴 GitHub 仓库链接。
- 通过 SSE 实时推送预审进度，并为每次运行生成独立页面。
- 查看证据、时间线事件和本地保存的快照。
- 在英文和中文界面之间切换。
- 使用 evolution 和 regression 页面继续跟踪问题。

## 支持的输入

当前 API 支持以下文件后缀：

- `.rs`
- `.toml`
- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.sol`
- `.py`

接口限制：
- 单次最多 50 个文件
- 单文件最多 10 MB
- 总大小最多 50 MB

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion
- tree-sitter 解析器

## 快速开始

```bash
pnpm install
pnpm dev
```

然后打开：

```text
http://localhost:3000/dashboard
```

再在界面里的设置面板中配置你的 LLM API Key。

## 目录说明

- `src/app/` - App Router 页面和 API 路由
- `src/components/` - 通用 UI 和 dashboard 组件
- `src/lib/` - 审计管道、LLM 适配器、存储和工具函数
- `public/skills/` - 审计流程使用的提示词与技能包

## 开发

常用脚本：

```bash
pnpm lint
pnpm build
```

## 许可证

这个仓库使用 **Business Source License 1.1（BUSL-1.1）**。

商业用途或生产环境使用需要另行获得商业授权。

商业授权说明：[/docs/commercial-license.md](/docs/commercial-license.md)

需要注意：
- BUSL-1.1 是 source-available，不是 OSI 意义上的开源协议。
- 公共协议允许非生产用途。
- 如果你想让项目保持真正的开源属性，公共协议就不能限制商业使用。

## 贡献

欢迎贡献。只要你继续扩展功能，就请同步更新 README，避免写入项目里还不存在的能力或夸大的数据。
