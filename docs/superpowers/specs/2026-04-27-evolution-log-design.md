# SolGuard Evolution Log Design

## Goal

Create a dedicated, read-only `Evolution Log` page that shows how SolGuard improves over time without asking the user to manage the process.

The page should make self-improvement visible and understandable:
- what the system learned
- why it learned it
- what changed automatically
- what was reverted or remains under observation

## Product Principle

This surface is not a control panel.

Users should not need to approve, apply, or curate evolution candidates manually. The system should do that work automatically. The page exists to explain the system's growth in plain language and to expose the evidence trail behind each change.

## Why This Matters

The current architecture already has:
- immutable reports
- ranked awareness memory
- evolution candidates with status transitions
- run snapshots and execution traces

What it lacks is a visible story of improvement.

Without that story, self-evolution feels like hidden magic. The Evolution Log makes the system's learning legible:
- users can see the system getting better
- users can inspect what changed
- users can verify that risky changes were not silently applied

## Scope

In scope:
- a new `/dashboard/evolution` page
- a timeline of evolution records
- summary cards for growth, auto-applied changes, rollback count, and current state
- expandable record details with evidence and provenance
- links to the originating report, memory entry, and candidate record

Out of scope:
- manual approval controls
- edit forms
- search/filter UI
- backend persistence beyond the current local-first stores
- model weight updates

## Information Model

The page should consume records from the existing evolution store and, where available, reference report and memory records.

Each evolution record should surface:
- `kind`
- `status`
- `riskLevel`
- `createdAt`
- `sourceReportId`
- `sourceMemoryId`
- `target`
- `before`
- `after`
- `reason`
- `lesson`
- `evidence`
- `appliedAt`
- `revertedAt`

The page should also derive a small amount of display-only metadata:
- whether the change was auto-applied
- whether the change is still being observed by the system
- whether the change was rolled back
- what concrete lesson the system extracted from the change

## Page Structure

### 1. Header Summary

Show a concise header that answers:
- how many evolution events exist
- how many were auto-applied
- how many were reverted
- whether the system is currently in a stable or learning-heavy phase

### 2. Growth Timeline

Show evolution records in reverse chronological order.

Each timeline item should display:
- title of the change
- status badge
- risk level badge
- source report or memory
- a short reason for the change
- the visible outcome
- the learned lesson

### 3. Evidence Cards

Each evolution item should expand to reveal:
- before / after text
- source trace or report link
- linked memory entry
- evidence snippets
- relevant notes about why the change was chosen
- the lesson captured for future runs

### 4. Auto-Apply State

Show whether the change:
- was applied automatically
- is being observed only
- was rolled back after a later check

This section should make the automation behavior obvious without requiring user input.

## Automation Rules

The page itself is read-only.

Automation lives in the background:
- low-risk changes may be auto-applied
- medium/high-risk changes remain visible as candidates or observation entries
- any rollback must remain visible in the timeline

The UI should not present manual buttons for these actions.

## Visual Tone

The page should feel like a system diary, not an admin console.

Use:
- a calm timeline layout
- compact summary metrics
- expandable details
- strong evidence labels
- clear status colors for candidate / observed / applied / reverted

Avoid:
- dense tables
- form controls
- action-heavy controls
- overly technical debug logging

## Data Flow

1. Audit run completes.
2. Report and memory records are saved.
3. Evolution candidates are created or updated.
4. Safe candidates may be auto-applied.
5. The Evolution Log reads the stored records and renders the timeline.

The page should not mutate the stored data.

## Accessibility and Reliability

- Timeline items must be keyboard accessible.
- Status should not rely on color alone.
- Empty states should explain that the system has not learned enough yet.
- If a linked report or memory entry is missing, the record should still render with a fallback label.

## Acceptance Criteria

- The page exists at `/dashboard/evolution`.
- It renders evolution records from the local store.
- It clearly shows learning over time without requiring any manual action.
- It shows source, evidence, status, outcome, and learned lesson for each record.
- It remains read-only.
- It does not duplicate report or memory page responsibilities.
