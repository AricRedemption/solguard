# Run To Report Separation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move completed audit results out of the run page and into the dedicated report page so the run view stays focused on live execution.

**Architecture:** Keep `src/app/dashboard/runs/[runId]/page.tsx` as the execution/timeline surface and make it redirect to `/dashboard/reports/[reportId]` once a saved report exists. Preserve `src/app/dashboard/reports/[reportId]/page.tsx` as the single place where the final audit result is rendered. Avoid changing audit persistence or the SSE pipeline.

**Tech Stack:** Next.js App Router, React client components, localStorage-backed audit stores, existing dashboard UI components.

---

### Task 1: Remove result rendering from the run page

**Files:**
- Modify: `src/app/dashboard/runs/[runId]/page.tsx`

- [ ] **Step 1: Remove the inline result summary from the run page**
- [ ] **Step 2: Add an automatic redirect to the report page once `resultId` is available**
- [ ] **Step 3: Keep a small completed-state CTA so the user still has an obvious manual path if redirect is delayed**

### Task 2: Verify the report page remains the final result surface

**Files:**
- Inspect: `src/app/dashboard/reports/[reportId]/page.tsx`
- Inspect: `src/components/dashboard/AnalysisSummaryPanel.tsx`

- [ ] **Step 1: Confirm the report page already renders the final analysis details**
- [ ] **Step 2: Run the dashboard route tests or page contract checks**
- [ ] **Step 3: Fix any regressions introduced by the redirect change**

