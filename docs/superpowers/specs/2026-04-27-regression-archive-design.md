# SolGuard Regression Archive Design

## Goal

Create a dedicated, read-only `Regression Archive` page that shows how SolGuard learns from failure.

This page should answer a different question than the existing `Evolution Log`:
- the Evolution Log shows what the system tried to improve
- the Regression Archive shows which attempted improvements actually helped, which failed, and what the system learned from the failures

The user should be able to open the page and immediately see:
- what went wrong
- what failed to improve anything
- what had to be rolled back
- what the system learned from the failure
- how that lesson changed future behavior

## Product Principle

This surface is not a control panel.

Users should not approve, apply, revert, or curate anything manually. The system should derive failure lessons automatically in the background and expose them as a read-only archive.

The page should feel like a failure-first lab notebook:
- failures at the top
- evidence beside every failure
- success only as a contrast signal
- accumulated lessons shown as the main output

## Why This Matters

The current architecture already has:
- immutable audit reports
- ranked awareness memory
- evolution candidates
- a read-only evolution diary page

What it still lacks is a visible story of failure-driven improvement.

Without this archive, the system can say it "learned something", but it cannot show:
- whether the attempted change actually improved later runs
- whether a candidate was noise
- whether a rollback was justified
- what pattern repeated after failure

The Regression Archive makes those outcomes legible.

## Route Ownership

- Existing route: `/dashboard/evolution`
  - owns the current Evolution Log
- New sibling route: `/dashboard/evolution/regressions`
  - owns the Regression Archive

The Regression Archive must not replace the Evolution Log.
It should be a sibling surface that focuses on failure clusters rather than raw evolution events.

## Relationship to Evolution Log

- Evolution Log = one record per evolution candidate, shown as a diary of attempted improvements
- Regression Archive = grouped failure patterns, shown as a notebook of what broke, what was rejected, and what remains unproven

The same underlying records may appear in both places, but the presentation and default ordering must differ:
- Evolution Log is record-first
- Regression Archive is failure-cluster-first

## Scope

In scope:
- a new read-only sibling page under `/dashboard/evolution/regressions`
- failure-first summary cards
- cluster-based regression summaries, not just one-row-per-candidate records
- evidence and linked source context for each regression cluster
- derived lessons that explain what the system learned from repeated failure patterns

Out of scope:
- manual approval controls
- edit forms
- search/filter UI
- backend persistence beyond the current local-first stores
- model weight updates
- human-review queues

## Information Model

The page should consume existing evolution records, report records, awareness memory, and run snapshots.

Each regression cluster should surface:
- `id`
- `createdAt`
- `sourceReportId`
- `sourceMemoryId`
- `kind`
- `status`
- `riskLevel`
- `target`
- `reason`
- `lesson`
- `evidence`
- `before`
- `after`
- `appliedAt`
- `revertedAt`

The page should also derive display-only regression metadata:
- failure class, derived deterministically from stored status and timing
- whether the candidate was rolled back
- whether the candidate was explicitly rejected
- whether the candidate remains unproven
- the failure lesson the system extracted from the cluster

## Failure Classification

The archive should be centered around failure classes.

Recommended classes:
- `rollback`
- `no_lift`
- `false_positive`
- `overfit`
- `stale_memory`
- `low_signal`
- `confirmed_failure`

These do not need to be manually assigned. The UI should derive them from stored state and linked records when possible.

If a precise class cannot be inferred, fall back to a generic:
- `under review`

## Failure Derivation

Because the current stores expose status transitions, linked source records, and timestamps, the page should use deterministic rules instead of speculative scoring.

Recommended failure classes:
- `rollback` when `status === "reverted"`
- `discarded` when `status === "rejected"`
- `unproven` when `status === "candidate"` or `status === "approved"`
- `applied` when `status === "applied"` but the cluster is shown only as contrast, not as the primary story

Recommended cluster key:
- `kind + target`

Cluster summary rules:
- combine records that share the same `kind` and `target`
- count how many records in the cluster were reverted, rejected, unproven, or applied
- prefer the most recent record as the visible headline
- promote the cluster to the top if it contains any rollback or rejection
- treat the cluster as "strong evidence" when either:
  - it contains at least two records with the same `kind + target`, or
  - it has one record with both `sourceReportId` and `sourceMemoryId`

This keeps the archive failure-first without inventing metrics the current stores cannot support.

## Page Structure

### 1. Failure-First Summary

Show compact cards that answer:
- how many regressions exist
- how many candidates were rolled back
- how many changes were rejected or remain unproven
- how many clusters have strong evidence
- what the dominant failure class is

### 2. Failure Clusters

Show regression clusters in reverse chronological order, but with rollback and rejection clusters visually prioritized.

Each cluster item should display:
- failure class
- status badge
- risk level badge
- source report or memory
- cluster size
- dominant lesson
- the most recent outcome in the cluster

### 3. Evidence Blocks

Each cluster should expand to reveal:
- before / after text
- linked report
- linked memory entry
- supporting evidence snippets
- record-by-record outcomes inside the cluster
- why the system now treats this pattern differently

### 4. Lesson Strip

At the bottom or side, show the accumulated lessons extracted from failures.

This section should answer:
- what the system now avoids
- what the system now prefers
- what memory got strengthened or weakened
- what heuristics changed because of repeated failure

## Data Flow

1. Audit run completes.
2. Report, awareness, and evolution records are saved.
3. The system later updates candidate status transitions through the normal evolution flow.
4. A regression view is derived from:
   - candidate status changes
   - rollback state
   - explicit rejection state
   - linked report and memory provenance
5. The Regression Archive renders the derived clusters.

The page should not mutate stored data.

## Automation Rules

The page itself is read-only.

Automation lives in the background:
- a candidate can be reclassified into a failure cluster after its status changes
- rollback history must remain visible
- repeated failures should strengthen the cluster lesson summary

The UI should not expose approval or edit controls.

## Visual Tone

The page should feel like a failure notebook, not an admin console.

Use:
- a calm timeline layout
- failure-first ordering
- compact summary metrics
- clear evidence labels
- strong contrast between "helpful", "no lift", and "rolled back"

Avoid:
- dense tables
- form controls
- action-heavy controls
- celebratory language that hides failure

## Accessibility and Reliability

- Timeline items must be keyboard accessible.
- Failure state should not rely on color alone.
- Empty states should explain that there are no observed regression lessons yet.
- If a linked report or memory entry is missing, the entry should still render with a fallback label.

## Acceptance Criteria

- The page exists at `/dashboard/evolution/regressions`.
- It renders regression clusters from local stores or derived snapshots.
- It clearly surfaces failure-first learning without requiring manual action.
- It shows source, evidence, outcome, and learned lesson for each cluster.
- It remains read-only.
- It does not duplicate the responsibilities of the Evolution Log page.
