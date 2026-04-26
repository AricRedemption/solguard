# SolGuard Run, Report, Memory, and Evolution Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split SolGuard into dedicated run, report, memory, and evolution surfaces, while making awareness memory useful and adding an automated, visible self-improvement loop.

**Architecture:** Keep the current audit pipeline and SSE stream, but separate the product into four layers: a live Run Center for execution, an immutable Report Vault for final findings, a ranked Awareness Memory layer for durable recall, and an Evolution Engine that turns traces and feedback into safe, visible improvement candidates. Start local-first with browser storage, but define data contracts so the storage backend can later move to server persistence without changing the UI shape.

**Tech Stack:** Next.js App Router, React client components, TypeScript, SSE, localStorage, Zod, framer-motion, existing SolGuard audit pipeline.

---

## Chunk 1: Run Center and report handoff

Goal: move live execution out of the dashboard and into a dedicated run page, while keeping the current dashboard as the launch surface.

### Task 1.1: Define run data contract

**Files:**
- Modify: `src/types/audit.ts`
- Modify: `src/hooks/useAudit.ts`
- Modify: `src/app/api/audit/route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a small type-level or runtime test that asserts a run snapshot includes
// id, createdAt, progress, currentPhase, currentAgent, currentWorkflow, timeline,
// inputSummary, and resultId.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- --runInBand` or the repo's available type/test command for the new snapshot contract
Expected: fail because the run snapshot type/data is not defined yet.

- [ ] **Step 3: Write minimal implementation**

Add a dedicated run snapshot type and make the SSE state carry enough data to reconstruct the current run.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/audit.ts src/hooks/useAudit.ts src/app/api/audit/route.ts
git commit -m "feat: define audit run snapshot contract"
```

### Task 1.2: Add dedicated run page

**Files:**
- Create: `src/app/dashboard/runs/[runId]/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/components/dashboard/AuditExecutionPanel.tsx`
- Modify: `src/lib/audit/report-store.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a page-level test or integration check that the run page route exists
// and can render a stored run snapshot.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm build`
Expected: fail until the new route and snapshot loader exist.

- [ ] **Step 3: Write minimal implementation**

Create the run page, move the live workflow panel there, and make the dashboard redirect to the run page when an audit starts.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/runs/[runId]/page.tsx src/app/dashboard/page.tsx src/components/dashboard/AuditExecutionPanel.tsx src/lib/audit/report-store.ts
git commit -m "feat: add dedicated audit run page"
```

### Task 1.3: Keep report page immutable and independent

**Files:**
- Modify: `src/app/dashboard/reports/[reportId]/page.tsx`
- Modify: `src/lib/audit/report-store.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a report-store test that ensures saved reports can be loaded later
// and that reopening a report does not mutate the stored snapshot.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm build`
Expected: fail if report snapshot persistence is not stable.

- [ ] **Step 3: Write minimal implementation**

Ensure report data is stored as an immutable snapshot and the report page only reads it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/reports/[reportId]/page.tsx src/lib/audit/report-store.ts
git commit -m "feat: make audit reports immutable snapshots"
```

## Chunk 2: Awareness memory layer

Goal: turn awareness into a ranked, queryable memory store that helps future runs instead of acting like a static summary list.

### Task 2.1: Expand memory model

**Files:**
- Modify: `src/types/audit.ts`
- Modify: `src/lib/audit/awareness-store.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add tests for memory fields like utility, recency, risk, recallCount, and sourceType.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm lint`
Expected: fail because the new fields and ranking logic are incomplete.

- [ ] **Step 3: Write minimal implementation**

Add the extra memory fields and derive them from report structure and feedback.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/audit.ts src/lib/audit/awareness-store.ts
git commit -m "feat: expand awareness memory model"
```

### Task 2.2: Add memory page and retrieval helpers

**Files:**
- Create: `src/app/dashboard/memory/page.tsx`
- Modify: `src/lib/audit/awareness-store.ts`
- Modify: `src/lib/i18n/translations.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a retrieval test that ranks recent, useful memories above stale ones.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm build`
Expected: fail until retrieval/ranking is implemented.

- [ ] **Step 3: Write minimal implementation**

Add list, rank, and render helpers; create a memory page that shows recent memories, their source reports, and why they were recalled.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/memory/page.tsx src/lib/audit/awareness-store.ts src/lib/i18n/translations.ts
git commit -m "feat: add awareness memory page"
```

### Task 2.3: Feed memory into next run context

**Files:**
- Modify: `src/lib/audit/pipeline.ts`
- Modify: `src/lib/audit/context-builder.ts`
- Modify: `src/lib/audit/prompts/loader.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a test that confirms relevant awareness entries are included in the
// analysis context or prompt preamble for the next run.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm build`
Expected: fail until awareness retrieval is wired into the next-run context.

- [ ] **Step 3: Write minimal implementation**

Retrieve a small set of ranked memory entries and inject only the high-signal ones into the next run.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audit/pipeline.ts src/lib/audit/context-builder.ts src/lib/audit/prompts/loader.ts
git commit -m "feat: use awareness memory in audit context"
```

## Chunk 3: Evolution engine and visualization

Goal: create an automated self-improvement loop that generates candidates from traces and feedback, then surfaces those candidates in the UI.

### Task 3.1: Define evolution candidate model and store

**Files:**
- Modify: `src/types/audit.ts`
- Create: `src/lib/audit/evolution-store.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add tests for candidate creation, storage, and status transitions
// (candidate -> approved -> applied / rejected / reverted).
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm lint`
Expected: fail because the evolution store does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add the candidate type and a local storage-backed store for candidates.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/audit.ts src/lib/audit/evolution-store.ts
git commit -m "feat: add evolution candidate store"
```

### Task 3.2: Generate candidates from run traces and feedback

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/reports/[reportId]/page.tsx`
- Modify: `src/lib/audit/evolution-store.ts`
- Modify: `src/lib/audit/awareness-store.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a test that a completed report plus feedback can generate one or more
// evolution candidates.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm build`
Expected: fail until the candidate generation path exists.

- [ ] **Step 3: Write minimal implementation**

Derive candidate suggestions from traces, repeated memory patterns, and user feedback.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx src/app/dashboard/reports/[reportId]/page.tsx src/lib/audit/evolution-store.ts src/lib/audit/awareness-store.ts
git commit -m "feat: generate evolution candidates from audit feedback"
```

### Task 3.3: Add evolution page UI

**Files:**
- Create: `src/app/dashboard/evolution/page.tsx`
- Modify: `src/lib/i18n/translations.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a route test that the evolution page can render candidate records.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm build`
Expected: fail until the route exists.

- [ ] **Step 3: Write minimal implementation**

Render candidate status, source trace, evidence, risk level, and whether a change was auto-applied.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/evolution/page.tsx src/lib/i18n/translations.ts
git commit -m "feat: add evolution dashboard"
```

### Task 3.4: Auto-promote safe changes and keep audit trail

**Files:**
- Modify: `src/lib/audit/evolution-store.ts`
- Modify: `src/lib/audit/awareness-store.ts`
- Modify: `src/lib/audit/report-store.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a test that only low-risk candidate types are auto-applied,
// while higher-risk ones stay visible as candidates.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm build`
Expected: fail until promotion logic exists.

- [ ] **Step 3: Write minimal implementation**

Implement low-risk promotion gates, rollback metadata, and traceability between report, memory, and evolution records.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm lint && pnpm build`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audit/evolution-store.ts src/lib/audit/awareness-store.ts src/lib/audit/report-store.ts
git commit -m "feat: add guarded evolution promotion"
```

## Final Verification

- [ ] Run `pnpm lint`
- [ ] Run `pnpm build`
- [ ] Open `/dashboard`, start a run, confirm the live run page opens independently.
- [ ] Open a completed report and confirm the report is immutable.
- [ ] Open the memory page and confirm recent memory entries appear.
- [ ] Open the evolution page and confirm candidates are visible.

## Notes for Implementers

- Keep the report snapshot immutable; do not write back into an existing report record.
- Keep memory updates non-blocking so audit completion is never lost if memory sync fails.
- Keep evolution candidate creation visible and auditable, even when a candidate is auto-applied.
- Prefer small utilities over large, shared helpers unless multiple layers truly need the same logic.
