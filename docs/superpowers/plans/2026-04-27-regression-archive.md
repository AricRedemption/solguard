# Regression Archive Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only Regression Archive page that surfaces failure-first learning from SolGuard’s evolution history.

**Architecture:** Keep the archive local-first and derived. Add a small regression-archive helper layer that groups evolution candidates into failure clusters, classifies them deterministically from stored status transitions, and exposes a read-only display model. Render that model in a dedicated `/dashboard/evolution/regressions` page that sits beside the existing Evolution Log instead of replacing it.

**Tech Stack:** Next.js App Router, React client components, TypeScript, existing localStorage-backed stores, existing dashboard UI primitives, contract-style type checks, and the current SolGuard i18n layer.

---

## Chunk 1: Derived regression model

Goal: turn evolution candidates into deterministic failure clusters so the archive can show failure-first history without inventing new backend state.

### Task 1.1: Define regression cluster display fields

**Files:**
- Modify: `src/types/audit.ts`
- Create: `src/lib/audit/regression-archive.ts`
- Create: `src/lib/audit/regression-archive.contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a contract test that asserts a regression cluster can surface:
// id, createdAt, kind, status, riskLevel, target, reason, lesson,
// evidence, before, after, appliedAt, revertedAt, failureClass,
// clusterSize, dominantFailureClass, strongEvidence, and a read-only display snapshot.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsc --noEmit --pretty false`
Expected: fail until the regression cluster helper and display model exist.

- [ ] **Step 3: Write minimal implementation**

Add a small helper layer that groups evolution candidates by `kind + target`, derives deterministic failure classes from current status values, and produces a read-only display snapshot for the archive page.

Keep the helper narrow:
- no store mutations
- no approval workflow
- no speculative scoring
- no backend persistence changes

Include summary helpers in the same module so later pages can read:
- total cluster count
- rollback count
- rejected count
- unproven count
- strong-evidence count
- dominant failure class

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsc --noEmit --pretty false && pnpm lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/audit.ts src/lib/audit/regression-archive.ts src/lib/audit/regression-archive.contract.test.ts
git commit -m "feat: define regression archive clusters"
```

## Chunk 2: Regression Archive page and dashboard entry

Goal: expose failure clusters in a dedicated read-only page that feels like a failure notebook, not a control panel.

### Task 2.1: Build the Regression Archive page

**Files:**
- Create: `src/app/dashboard/evolution/regressions/page.tsx`
- Create: `src/app/dashboard/evolution/regressions/page.contract.test.ts`
- Modify: `src/lib/i18n/translations.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a route/page contract test that the regression archive page can render
// failure-first summary cards, cluster cards, a lesson strip, evidence blocks,
// and empty states without any approve/apply/revert controls.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsc --noEmit --pretty false`
Expected: fail until the new route and page exist.

- [ ] **Step 3: Write minimal implementation**

Render a read-only failure-first archive with:
- summary cards
- failure clusters grouped by `kind + target`
- a dedicated lesson strip for repeated failure patterns
- evidence blocks
- linked report and memory context
- empty states for no regression history

Do not add any manual control surface.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsc --noEmit --pretty false && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/evolution/regressions/page.tsx src/app/dashboard/evolution/regressions/page.contract.test.ts src/lib/i18n/translations.ts
git commit -m "feat: add regression archive page"
```

### Task 2.2: Add a dashboard entry point

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Write the failing test**

```ts
// Add a dashboard-level contract check that the Regression Archive entry is
// visible from the main dashboard navigation/summary surface.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsc --noEmit --pretty false`
Expected: fail until the dashboard exposes a path to the new archive page.

- [ ] **Step 3: Write minimal implementation**

Add a lightweight link or summary card from the dashboard to `/dashboard/evolution/regressions`, keeping the current dashboard layout intact. Reuse existing dashboard copy if possible so this task does not need to touch the translations file.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsc --noEmit --pretty false && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: link dashboard to regression archive"
```

## Final Verification

- [ ] Run `pnpm exec tsc --noEmit --pretty false`
- [ ] Run `pnpm lint`
- [ ] Run `pnpm build`
- [ ] Open `/dashboard/evolution/regressions` and confirm it renders as a failure-first archive.
- [ ] Confirm the page shows cluster-level lessons, evidence, and failure classes without any manual controls.
- [ ] Confirm the page stays distinct from `/dashboard/evolution`.

## Notes for Implementers

- Keep the Regression Archive read-only. No approve, apply, reject, or revert buttons.
- Make failure visible, but do not expose it as a user workflow.
- Prefer deterministic derivation from current stores over speculative scoring.
- If a linked report or memory entry is missing, keep the archive item visible with a fallback label.
- Use `@superpowers:subagent-driven-development` for implementation and keep per-task scope narrow.
