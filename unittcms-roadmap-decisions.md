# UnitTCMS Roadmap Decisions

Output of a grilling session (2026-07-13) auditing the codebase against `tcms-industry-research.md`
(TestRail/Zephyr/qTest/Xray/TestLink/Kiwi TCMS conceptual model, ISTQB CTFL v4.0.1, ISO/IEC/IEEE 29119, and
public ThoughtWorks/Google/Meta engineering material). Supersedes Phase 4 of `unittcms-ux-plan.md` (see
below). Nothing here is implemented yet — this is a decision record only.

## Context that shaped every decision below

Self-hosted, Docker-deployed, used by **just the owner (+1-2 people), for now**. This ruled out most
"connective tissue" features that commercial TCMS tools have but that solve team/enterprise coordination
problems this deployment doesn't have yet (see "Explicitly deferred" below).

---

## Resolved: Evidence review UX

This was the open, interrupted decision referenced in `HANDOFF.md` and
`CLAUDE_HANDOFF_EXECUTE_EVIDENCE.md` (the rejected modal spike — "What is the point to just have thumbnail
here??? Stop that. Discuss first.").

- **Granularity**: evidence attaches to an individual step when the case has steps; falls back to case-level
  for text-template cases or a single overall screenshot. Requires adding an optional step reference to
  `RunCaseEvidence` (currently only has `runCaseId`, no step FK) and accepting a step identifier in
  `backend/routes/runcaseevidence/{new,video}.js` (currently accept only `runCaseId`).
- **Live execute-mode interaction**: clicking a thumbnail during execution opens a lightweight zoom/lightbox
  only — confirms the capture looks right, no comparison UI, no permanence. Quick sanity-check, not review.
- **Post-execution review**: a new **dedicated read-only Run Report page** (does not exist today — confirmed
  no `report`/`results` route exists anywhere in `backend/routes` or `frontend/src/app`, and the existing
  `(manage)/.../DetailPane.tsx` case-detail pane has no evidence tab and doesn't fetch `RunCaseEvidence` at
  all). Shows per-case/per-step results and evidence after a run is done or mid-progress.

## Resolved: Plan layer above Runs — deferred, not built

Every commercial/OSS TCMS surveyed has a Plan/scope container above the execution-instance layer (Test Plan,
Release, etc.) that groups multiple runs. UnitTCMS's `Run` currently conflates plan+execution.

**Decision: skip for now.** At 1-3 people, a Run already functions as the plan — no multi-run coordination
problem exists yet to justify the schema + UI cost (new `Plan` model, CRUD, injecting a "which plan" step
into run creation, migrating the "Start Testing" flow, i18n across 5 locales). Not a one-way door: adding a
Plan layer above existing Runs later is additive (nullable `planId` FK + backfill), not a rewrite, so the
usual "expensive to retrofit" argument doesn't hold at this data volume. Revisit only if a real multi-run
grouping need shows up.

---

## Roadmap order (next work, in sequence)

### 1. Run setup rework
**Pain, stated directly**: re-picking cases from scratch every time (no run cloning exists —
`backend/routes/runs` has no `clone.js`, unlike cases/folders which do), and the case-selection UI itself
(`TestCaseSelector.tsx`, flat picker + client-side filters only) is clunky.
- Add run cloning / reuse of a prior run's case selection.
- Rework the case-selection UI (better use of space, easier bulk selection).

### 2. Defect/issue linking
Link a failed run-case to an external issue tracker (likely GitHub Issues) instead of the free-text-comment
approach `unittcms-ux-plan.md` Phase 4 originally proposed ("Log defect ... Saves as a comment on the
RunCase"). **This supersedes that Phase 4 as originally scoped** — real linking, not a comment convention.
Chosen to ship before shared steps because it directly extends the evidence/execute-mode work just shipped
("mark failed → attach evidence → link the bug" is one continuous flow).

### 3. Reusable/shared step library
Steps currently duplicate per-case (`Step`/`caseSteps` join exists structurally but every route — `import.js`,
`clone.js` — creates a fresh `Step` row per case; no UI to attach an existing step to multiple cases). Author
a step once, reuse across cases. Lowest architectural risk of the three, compounding value with case count.

### 4. Environments/configurations
Structured field on `Run` (browser/OS/build) replacing the current free-text `configurations` string —
**only once there's an actual multi-config testing need**, not speculatively.

---

## Explicitly deferred / skipped

Given solo/small-scale self-hosted use, these are not on the roadmap:
- Custom fields on cases/results
- Requirements traceability
- Full case/run-case version history or audit log (the "History" tab stays as synthetic timestamps for now)
- Full-text search / saved filters
- Notifications (email/webhook)
- CI/CD, Jira, or Slack integrations
- Milestones/releases (tied to the deferred Plan layer)

## Known loose end (fix opportunistically, not a roadmap slot)

`verifyEditable.js`'s `verifyProjectReporterFromCommentableId` only implements the permission check for
`RunCase` — the `Case` and `Comment`-on-`Run` branches are stubbed as "not implemented yet." Fix whenever
touching that code; doesn't warrant its own priority slot at current usage.
