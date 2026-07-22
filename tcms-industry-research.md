# TCMS Industry Research: Common Workflow & Feature Set

Reference material for UnitTCMS roadmap planning. Neutral, factual, non-prescriptive — this document
describes what exists in the industry and what UnitTCMS currently has; it does not recommend what to build.

---

## Step 0: Current UnitTCMS state (grounding for Section 4)

A skim of `frontend/src/app/[locale]/projects/[projectId]/` confirms the task's description is essentially
accurate, with one addition:

- **Confirmed present**: projects → folders → test cases hierarchy (`folders/`, `folders/[folderId]/cases/`);
  test runs with case selection (`runs/`, `RunDialog.tsx`, `TestCaseSelector.tsx`); a dedicated "execute mode"
  runner UI (`runs/[runId]/execute/`, incl. `EvidencePanel.tsx`, `ExecuteHistoryPanel.tsx`); project-level
  roles via `members/` (manager/developer/reporter, per `backend/config/enums.js`); tags
  (`CaseTagsEditor.tsx`, `ProjectTagsManager.tsx`); case-level attachments (`CaseAttachmentsEditor.tsx`); and
  case steps (`CaseStepsEditor.tsx`).
- **One correction to the given description**: UnitTCMS already has a basic reporting surface — the project
  `home/` route (`ProjectHome.tsx`) renders three charts (`TestPriorityDonutChart.tsx`,
  `TestProgressColumnChart.tsx`, `TestTypesDonutChart.tsx`). It's a lightweight home-page dashboard, not a
  dedicated reporting module, but more than "none."
- **Confirmed absent**: a repo-wide search for `requirement|traceab|milestone|release|environment|custom
  field|shared step|reusable step|defect|jira|external tracker` across the projects route tree and
  `backend/models` returned no matches — supporting the brief's claim of no requirements traceability, no
  external defect/issue-tracker linking, no shared-step library, no environments/configurations, no
  milestones/releases, and no custom fields.

---

## Section 1: Commercial/OSS TCMS tools — the common conceptual model

Every tool surveyed separates **case authoring** (a stable repository of "how to test X") from **case
execution** (a point-in-time record of "did X pass on this build/date/tester"). The repository entity is
reused across many execution entities; execution entities are the ones that accumulate pass/fail history.

| Layer | TestRail | Zephyr Scale | qTest | Xray | TestLink | Kiwi TCMS |
|---|---|---|---|---|---|---|
| Case repository | Test Cases in Sections/Suites | Test Cases | Test Cases (in Modules) | Test Repository (folder tree) | Test Cases in Test Suites | Test Cases |
| Plan/scope | Test Plan (groups runs, e.g. per config) | Test Plan | Release → Test Cycle | Test Plan | Test Plan (references a Requirement Spec) | Test Plan |
| Execution instance | Test Run | Test Cycle | Test Run (inside a Test Cycle) | Test Execution | Test Run (against a Build) | Test Run (against a Build) |

Sources, confidence **High** (vendor's own docs/support pages, current as of this research):
- **TestRail**: a Test Plan "group[s] multiple test runs together and automatically generate[s] test runs for
  various browser, OS, or other configurations"; closing a run locks its results. — TestRail Support, "Plans"
  (https://support.testrail.com/hc/en-us/articles/7077711537684-Plans)
- **Zephyr Scale**: "Zephyr Cloud is tightly integrated with Jira, so you can link test cases, test cycles,
  and test plans to any issue type in Jira." — SmartBear, "Test Plans (overview)"
  (https://support.smartbear.com/zephyr-scale-cloud/docs/test-plans/test-plans-overview.html)
- **qTest**: "Test Cycles are nested in Releases and show high-level summaries of the associated Test Suites
  and Test Runs, including the execution results ... and any Defects found." — Tricentis, "Introduction to
  qTest Objects" (https://documentation.tricentis.com/qtest/od/en/content/manager/introduction/introduction_to_qtest_objects.htm)
- **Xray**: "Xray supports the entire testing life cycle: test planning, test design, test execution and
  test reporting," via a Test Repository, with Test Plans defining scope and Test Executions recording
  TODO/EXECUTING/FAIL/ABORTED/PASS. — Xray docs, "Test Repository"
  (https://docs.getxray.app/display/XRAY/Test+Repository)
- **TestLink**: "Test plan holds ... the scope of Software testing, milestone, test suites and test cases,"
  and re-execution against a **Build** drives regression tracking. — TestLink project site (https://testlink.org/)
- **Kiwi TCMS**: "A Test Plan should identify which features of a product will be tested ... only CONFIRMED
  cases can be added to a test run"; a Test Run "contains the execution results of selected test cases
  against particular product builds." — Kiwi TCMS docs, "Test Plans"
  (https://kiwitcms.readthedocs.io/en/stable/guide/testplan.html) and "Test Runs"
  (https://kiwitcms.readthedocs.io/en/latest/guide/testrun.html)

### How the secondary capabilities attach to this model

- **Requirements/traceability** is near-universal but implemented differently: Xray and qTest build it as
  first-class linking with dedicated coverage/traceability reports (Xray's Requirement Traceability Report,
  https://docs.getxray.app/display/XRAY/Requirement+Traceability+Report; qTest's linking docs,
  https://documentation.tricentis.com/qtest/od/en/content/manager/requirements_and_test_design/link_test_cases_and_requirements.htm).
  Zephyr Scale links any Jira issue type directly (4 of its ~26 built-in reports are traceability/coverage
  reports) — SmartBear reports overview
  (https://support.smartbear.com/zephyr-scale-cloud/docs/en/reports-and-analysis/reports--overview-.html).
  TestLink treats it as a first-class "Requirement Specification" object with a coverage report (testlink.org).
  Kiwi TCMS's core docs pages checked here do not surface a dedicated requirements module — **Medium**
  confidence this is a genuine gap vs. an artifact of which pages were checked.
- **Defect/issue linking**: Xray, Zephyr Scale, and qTest are built *inside* or *tightly against* Jira, so
  linking is native. TestRail and Kiwi TCMS instead integrate with **external** trackers — Kiwi TCMS
  supports Azure Boards, Bugzilla, JIRA, GitHub, GitLab, and Redmine via a pluggable `tcms.issuetracker`
  interface with "1-click bug report" pre-filled from the failing execution — Kiwi TCMS docs
  (https://kiwitcms.readthedocs.io/en/latest/modules/tcms.issuetracker.html,
  https://kiwitcms.readthedocs.io/en/latest/admin.html). TestLink similarly integrates with JIRA, Bugzilla,
  Mantis, Redmine, FogBugz.
- **Custom fields**: TestRail supports up to 150, scoped to test cases and test results — TestRail Support,
  "Configuring custom fields" (https://support.testrail.com/hc/en-us/articles/7373850291220-Configuring-custom-fields).
  qTest has project-level "Field Settings" plus "Custom Test Steps" (up to two extra step columns) —
  Tricentis docs (https://documentation.tricentis.com/qtest/od/en/content/manager/settings/project_field_settings.htm,
  https://www.tricentis.com/blog/introducing-custom-test-steps-in-tricentis-qtest). Xray has its own
  custom-field mechanism for Tests/Test Runs, separate from native Jira fields — Xray docs
  (https://docs.getxray.app/display/XRAY/Using+custom+fields).
- **Reusable/shared steps**: Xray has "Pre-Conditions" as a distinct entity shared across Tests — Xray docs
  (above). TestRail, qTest, and Kiwi TCMS were not confirmed in this pass to have an equivalent library
  (**Medium** confidence gap — may exist but wasn't surfaced here).
- **Environments/configurations**: TestRail's Plans fan a case set out across multiple "configurations" (e.g.
  browser/OS), auto-generating one run per configuration. Kiwi TCMS's unit of environment is instead the
  **Build** a Test Run targets (both docs above).
- **Milestones/releases**: TestRail has a first-class Milestone object that Runs/Plans link to, plus a
  "Milestone (Summary) report" — TestRail Support
  (https://support.testrail.com/hc/en-us/articles/7077723976084-Milestones). qTest nests Test Cycles inside
  Releases as the top-level scheduling container (see object model above).
- **Reporting dashboards**: Zephyr Scale ships ~26 built-in reports, 4 of them traceability/coverage —
  SmartBear reports overview (https://support.smartbear.com/zephyr-scale-cloud/docs/en/reports-and-analysis/reports--overview-.html).
  qTest centralizes this in a separate "qTest Insights" module. TestLink and Kiwi TCMS describe
  requirement-coverage and execution-status reports as built in, but narrower in scope.

### Where tools diverge, not just overlap

- **Platform coupling**: Xray and Zephyr Scale are Jira add-ons — their data model rides on Jira's. TestRail,
  qTest, TestLink, and Kiwi TCMS are standalone systems that *integrate* with issue trackers rather than
  living inside one (**High** confidence — structural fact from each vendor's architecture docs).
  Traceability/defect-linking is closer to "free" in the Jira-hosted tools; a built integration layer in the
  standalone ones.
- **Case-organization vocabulary**: "Section/Suite" (TestRail), "Module" (qTest), folder tree (Xray Test
  Repository), "Test Suite" (TestLink, Kiwi TCMS) are the same idea — a hierarchical case container — under
  different names.
- **"Cycle" vs. "Run" vs. "Execution"**: the execution-instance layer is a Test Run in TestRail, TestLink,
  and Kiwi TCMS; a Test Cycle in Zephyr Scale and qTest; a Test Execution in Xray — same concept, different
  vendor vocabulary.

---

## Section 2: ISTQB and ISO/IEC/IEEE 29119

### ISTQB's own freely-published material (glossary + syllabus)

Confidence **High** — quoted/paraphrased directly from ISTQB's own Certified Tester Foundation Level (CTFL)
Syllabus v4.0.1, the current official syllabus, downloaded directly from istqb.org
(https://istqb.org/wp-content/uploads/2024/11/ISTQB_CTFL_Syllabus_v4.0.1.pdf).

The syllabus (section 1.4, "Test Process") describes seven main activity groups, not strictly sequential —
"often implemented iteratively or in parallel":

1. **Test planning** — "defining the test objectives and then selecting an approach that best achieves the
   objectives within the constraints imposed by the overall context." Work products: test plan, schedule,
   risk register, entry/exit criteria.
2. **Test monitoring and control** — monitoring is "ongoing checking of all test activities and the
   comparison of actual progress against the plan"; control is "taking the actions necessary to meet the
   test objectives." Work products: progress reports, control directives, risk info.
3. **Test analysis** — analyzing the test basis to identify testable features and define/prioritize test
   conditions; answers "what to test?" Work products: prioritized test conditions, defect reports on the
   test basis.
4. **Test design** — elaborating test conditions into test cases and testware, plus test data/environment
   design; answers "how to test?" Work products: test cases, test charters, coverage items.
5. **Test implementation** — creating/acquiring testware; organizing cases into test procedures, "often
   assembled into test suites"; building/verifying the test environment. Work products: procedures, scripts,
   test suites, execution schedule.
6. **Test execution** — "running the tests in accordance with the test execution schedule (test runs)";
   comparing actual vs. expected results; logging results; analyzing anomalies. Work products: **test logs**
   and defect reports.
7. **Test completion** — occurs at project milestones (release, iteration end, test-level completion);
   unresolved defects become change requests/backlog items; testware archived; lessons learned captured.
   Work product: **test completion report**.

Other ISTQB-defined terms relevant to a TCMS data model (syllabus section 1.4.3–1.4.4, same source):
- **Test suite** — test procedures "assembled into test suites" during implementation: an organized,
  executable grouping of cases/procedures.
- **Traceability** — the syllabus states that effective monitoring/control requires "traceability throughout
  the test process between the test basis elements, testware ... test results, and defects," citing two
  concrete uses: "traceability of test cases to requirements can verify that the requirements are covered by
  test cases" and "traceability of test results to risks can be used to evaluate the level of residual
  risk." It also ties traceability to impact analysis, audits, and IT governance.
- **Incident/defect**: anomaly reporting is routed through test execution ("anomalies are analyzed ... this
  analysis allows us to report the anomalies based on the failures observed") and test completion ("for any
  unresolved defects, change requests or product backlog items are created"). This is consistent with (but
  not a direct quote of) the ISTQB Glossary's general definition of *incident* — see caveat below.

**Caveat**: `glossary.istqb.org` is a JS single-page app that returned only an empty shell to automated
fetches in this pass, so individual glossary term definitions (test case, test suite, incident, traceability
matrix) could not be directly quoted from the glossary site itself. The syllabus PDF (quoted above) is an
equally official, freely-published ISTQB source and was used instead; anywhere this document paraphrases
"the ISTQB Glossary" without a direct quote, treat it as **Medium** confidence pending a direct glossary
re-check.

### ISO/IEC/IEEE 29119

Confidence **Medium** — the standard itself is paywalled (purchase-only through iso.org/standards.ieee.org);
everything below is from the publicly visible **scope/overview metadata** on ISO's own catalogue pages, plus
ISTQB's own syllabus explicitly pointing to it, not from reading the standard's normative text.

- ISO's own catalogue lists the series split into parts, including Part 2 "Test processes" and Part 3 "Test
  documentation" — ISO/IEC/IEEE 29119-2:2013 (https://www.iso.org/standard/56736.html) and
  ISO/IEC/IEEE 29119-3:2013 (https://www.iso.org/standard/56737.html). A newer edition,
  ISO/IEC/IEEE 29119-2:2021, is also catalogued (https://www.iso.org/obp/ui/en/#!iso:std:79428:en).
- ISTQB's CTFL v4.0.1 syllabus cites this standard as authoritative for test-process detail: "The
  ISO/IEC/IEEE 29119-2 standard provides further information about test processes" (syllabus section 1.4,
  quoted above — **High** confidence since it is ISTQB's own primary text).
- Part 3, "Test documentation," is understood (per its own catalogue title/scope on iso.org) to standardize
  the documents a test process produces — test plan, test design specification, test case specification,
  test procedure specification, test report — closely mirroring the syllabus's "work products" list above.
  **Medium** confidence: inferred from the part's published title/scope, not from reading its body.

### Implied workflow

Combining the syllabus's activity list with ISO 29119's part structure, the standards-level view of test
management is: **plan → design (analysis + design) → implement → execute → report/log → complete/close**,
with **monitoring/control** and **traceability** running throughout rather than as a discrete phase. This is
essentially the same plan→design→run→report shape every commercial tool in Section 1 implements, just named
and governed at a more abstract, process-standard level rather than a product-feature level.

---

## Section 3: How major tech organizations approach test management

This section is intentionally thinner — public documentation on internal test *management* (as opposed to
test *technique* or CI tooling) from large tech companies is sparse. Marked confidence per item; no claim
here should be read as comprehensive.

- **ThoughtWorks — shift-left and the test pyramid.** Confidence **High** for what's quoted (first-party
  ThoughtWorks blog). Shift-left means QE involvement "much earlier" in analysis/development, not just
  automating late-stage tests — ThoughtWorks Insights, "Transitioning from conventional to shift-left
  testing" (https://www.thoughtworks.com/insights/blog/transitioning-conventional-shift-left-testing). The
  same post recommends tagging flaky tests and running them in a separate pipeline rather than blocking the
  main one — analogous to Google's "quarantine" pattern below. ThoughtWorks' "Seven guiding principles in
  testing" post frames quality as measurable (defect rate, deployment frequency, change-failure rate) and
  prevention-oriented (Three Amigos, TDD, pairing) rather than purely detection-oriented — ThoughtWorks
  Insights (https://www.thoughtworks.com/insights/blog/testing/seven-guiding-principles-testing). Neither
  post discusses session-based exploratory-testing charters as a ThoughtWorks-specific practice — that
  concept is well documented in the wider testing literature but not confirmed here as a ThoughtWorks
  first-party artifact (**Low** confidence for that specific attribution).
- **Google — flaky-test tracking and release gating.** Confidence **High** (first-party Google Testing Blog;
  the cited post is from 2016 and may not reflect current internal practice). Google reported roughly 1.5%
  of test runs as flaky, with most pass→fail transitions in CI attributable to flakiness rather than real
  regressions; failing CI tests lock the branch, so flakiness directly threatens release velocity. Mitigation:
  reliability passes on new tests, and automatic quarantine of tests above a flakiness threshold — removed
  from the release-gating path, filed as bugs for owners, kept in a non-gating "reliability suite." — Google
  Testing Blog, "Flaky Tests at Google and How We Mitigate Them"
  (https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html).
- **Meta — probabilistic flakiness scoring.** Confidence **High** (first-party Meta Engineering blog, 2020).
  Premise: "all real-world tests are flaky to some extent," so binary flaky/not-flaky labeling is the wrong
  model. Their Probabilistic Flakiness Score (PFS) uses Bayesian modeling over existing CI execution history
  (no extra runs needed) to separate "fails due to real code/environment issues" from "fails under
  otherwise-good conditions." PFS is surfaced on dashboards, drives tickets to owners on regression, and
  severely flaky tests become ineligible for predictive test selection. — Meta Engineering,
  "Probabilistic flakiness: How do you test your tests?"
  (https://engineering.fb.com/2020/12/10/developer-tools/probabilistic-flakiness/).
- **Apple, X/Twitter.** No first-party engineering-blog material describing internal test *case management*
  was located in this pass. This is a gap in public documentation, not a finding about their practices —
  any characterization would be speculation and is deliberately omitted.
- **Pattern across confirmed sources**: none of Google, Meta, or ThoughtWorks describe test-case
  repositories in the TestRail/Xray sense — their public writing concentrates almost entirely on
  **flaky-test lifecycle management** (detect → score/quarantine → assign → gate) on top of automated CI,
  not manual case authoring or run tracking. That's a real asymmetry with Section 1 (commercial TCMS tools
  built around structured case authoring plus execution tracking) and Section 2 (ISTQB's process model
  assumes a documented test-case artifact) — flagged as an observation, not resolved.

---

## Section 4: Synthesis

### Common-denominator feature checklist

Capabilities that recur across most or all of the commercial/OSS tools (Section 1) and align with the
ISTQB/ISO process model (Section 2):

1. Hierarchical **case repository**, decoupled from any single execution (all six tools; ISTQB "testware").
2. A **scope/plan container** selecting which cases matter for a given effort (Test Plan / Release; all six
   tools; ISTQB "test planning" work products).
3. A **discrete execution instance** producing a pass/fail record per case, tied to a build/version (Run /
   Cycle / Execution; all six tools; ISTQB "test execution" → "test logs").
4. **Requirements ↔ test case traceability** in some form — five of six tools surveyed (all but the Kiwi
   TCMS pages checked), and explicit in the ISTQB syllabus as a named activity.
5. **Defect/issue linking** — native (Jira-hosted tools) or pluggable integration (standalone tools);
   universal across all six.
6. **Custom fields** on cases and/or results — confirmed in TestRail, qTest, Xray.
7. **Reusable/shared steps or preconditions** — confirmed distinctly in Xray; not confirmed elsewhere in
   this pass (**Medium** confidence gap — may simply not have been surfaced).
8. **Environments/configurations** — TestRail's configuration fan-out and Kiwi TCMS's Build concept are two
   implementations of the same need (run the same cases against multiple targets and compare).
9. **Milestones/releases** as a scheduling/progress container above Plan/Cycle — TestRail Milestones, qTest
   Releases.
10. **Reporting/dashboards**, especially traceability-coverage and execution-status reports — present in
    every tool, in varying depth (from Zephyr Scale/qTest's dedicated modules to Kiwi TCMS/TestLink's
    narrower built-ins).
11. (ISTQB-specific) **Test completion reporting** — a closing artifact distinct from a per-run report,
    summarizing lessons learned and disposition of open defects.

### Terminology mismatches worth flagging

- "Test Cycle" (Zephyr Scale, qTest) = "Test Run" (TestRail, TestLink, Kiwi TCMS) = "Test Execution" (Xray) —
  same layer, different vendor vocabulary.
- "Configuration" (TestRail) and "Build" (TestLink, Kiwi TCMS) are two different mental models for the same
  underlying need (what target is this run against), not the same feature under different names — worth not
  conflating.
- ISTQB's "test suite" (an organized, executable grouping assembled during test *implementation*) is a
  narrower, more specific concept than how "suite" is sometimes used informally in tool UIs (e.g., as a
  synonym for "case folder").

### Mapping against current UnitTCMS (observational, not a recommendation)

Per the Step 0 skim:

| Checklist item | UnitTCMS today |
|---|---|
| Case repository | Present — projects → folders → cases |
| Scope/plan container | Partial — runs select cases directly; no separate "Plan" layer above runs found |
| Execution instance | Present — runs, run-cases, execute-mode runner, status tracking, evidence attachments |
| Requirements traceability | Not found |
| Defect/issue linking (external tracker) | Not found |
| Custom fields | Not found |
| Reusable/shared steps | Not found (per-case steps exist via `CaseStepsEditor.tsx`; no shared library) |
| Environments/configurations | Not found |
| Milestones/releases | Not found |
| Reporting/dashboards | Partial — three charts on project home page; no dedicated reporting/coverage module |
| Roles/permissions | Present — project-level manager/developer/reporter roles |
| Tags | Present |
| Comments | Present (per task brief; not independently re-verified beyond Step 0) |
| Case/run attachments | Present |

This table is descriptive only — it says what exists versus what was searched for and not found in a
lightweight pass, not what should be built next or in what order.
