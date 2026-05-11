# Evolution Log Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only Evolution Log page that shows how SolGuard improves over time, and make the system automatically accumulate and surface those lessons without any user approvals or manual controls.

**Architecture:** Keep evolution data local-first and append-only. Add one small derivation layer that turns completed audit runs into readable evolution records, then render those records in a dedicated `/dashboard/evolution` timeline page with summary cards, evidence, and linked source context. The page should stay read-only; all learning happens automatically in the background.

**Tech Stack:** Next.js App Router, React client components, TypeScript, localStorage-backed stores, SSE audit pipeline, existing SolGuard dashboard components, test-driven contract checks.

---

## Chunk 1: Automatic evolution accumulation

Goal: turn completed audit runs into readable evolution records automatically, so the log page has real learning history to show.

### Task 1.1: Define evolution record display fields

**Files:**
- Modify: `src/types/audit.ts`
- Modify: `src/lib/audit/evolution-store.ts`
- Create: `src/lib/audit/evolution-log.ts`
- Create: `src/lib/audit/evolution-log.contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a contract test that asserts an evolution record can surface:
// id, createdAt, kind, status, riskLevel, target, reason, lesson,
// evidence, appliedAt, revertedAt, and a read-only display snapshot.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsc --noEmit --pretty false`
Expected: fail until the lesson/display helpers and record shape are in place.

- [ ] **Step 3: Write minimal implementation**

Add a small evolution-log helper layer that can derive a readable lesson/outcome for each record, plus a display snapshot that the page can render without mutating store data.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsc --noEmit --pretty false && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/types/audit.ts src/lib/audit/evolution-store.ts src/lib/audit/evolution-log.ts src/lib/audit/evolution-log.contract.test.ts
git commit -m "feat: define evolution log record view"
```

### Task 1.2: Auto-create evolution records from completed runs

**Files:**
- Modify: `src/components/dashboard/AuditSessionProvider.tsx`
- Modify: `src/lib/audit/evolution-log.ts`
- Modify: `src/lib/audit/evolution-store.ts`
- Modify: `src/lib/audit/awareness-store.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a contract-style test that a completed report can produce an
// evolution record with a lesson and that the record is stored automatically.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec tsc --noEmit --pretty false`
Expected: fail until report completion can derive and store an evolution record.

- [ ] **Step 3: Write minimal implementation**

Derive a low-friction evolution record from the completed report and awareness snapshot, then append it automatically during report persistence. Keep the record read-only and visible in the log with a concrete lesson string.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsc --noEmit --pretty false && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/AuditSessionProvider.tsx src/lib/audit/evolution-log.ts src/lib/audit/evolution-store.ts src/lib/audit/awareness-store.ts
git commit -m "feat: auto-accumulate evolution records"
```

## Chunk 2: Evolution Log page and dashboard entry

Goal: expose the accumulated learning history in a dedicated, read-only page that feels like a system diary, not a control panel.

### Task 2.1: Build the Evolution Log page

**Files:**
- Create: `src/app/dashboard/evolution/page.tsx`
- Modify: `src/lib/i18n/translations.ts`
- Create: `src/app/dashboard/evolution/page.contract.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a route/page contract test that the evolution page can render
// evolution records, summary cards, and empty states without controls.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm build`
Expected: fail until the new route and page exist.

- [ ] **Step 3: Write minimal implementation**

Render a read-only timeline with summary cards, evidence details, linked reports/memories, and clear automatic outcome labels. Do not add approve/apply/revert controls.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsc --noEmit --pretty false && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/evolution/page.tsx src/lib/i18n/translations.ts src/app/dashboard/evolution/page.contract.test.ts
git commit -m "feat: add evolution log dashboard"
```

### Task 2.2: Add a dashboard entry point

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/lib/i18n/translations.ts`

- [ ] **Step 1: Write the failing test**

```ts
// Add a dashboard-level contract check that the Evolution Log entry is
// visible from the main dashboard navigation/summary surface.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm build`
Expected: fail until the dashboard exposes a path to the new page.

- [ ] **Step 3: Write minimal implementation**

Add a lightweight link or summary card from the dashboard to `/dashboard/evolution`, keeping the current dashboard layout intact.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec tsc --noEmit --pretty false && pnpm lint && pnpm build`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx src/lib/i18n/translations.ts
git commit -m "feat: link dashboard to evolution log"
```

## Final Verification

- [ ] Run `pnpm exec tsc --noEmit --pretty false`
- [ ] Run `pnpm lint`
- [ ] Run `pnpm build`
- [ ] Open `/dashboard/evolution` and confirm it renders as a read-only growth diary.
- [ ] Confirm the page shows lessons, evidence, and automatic outcomes without any manual controls.

## Notes for Implementers

- Keep the Evolution Log read-only. No approve, apply, reject, or revert buttons.
- Make automation visible, but do not expose it as a user workflow.
- If a report or memory link is missing, keep the evolution entry visible with a fallback label.
- Prefer a small helper layer for display shaping instead of bloating the page component.
- Use `@superpowers:subagent-driven-development` for implementation and keep per-task scope narrow.

