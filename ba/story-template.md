# Story Template — Hackathon Attendance Portal

**Audience:** Business Analyst at the hackathon, producing the analysis bundle.
**Purpose:** Per-story shape; use as a fill-in template for every story in the bundle.
**Companion:** [`slicing-guidance.md`](slicing-guidance.md) for the playbook; [`scoring-rubric.md`](scoring-rubric.md) for how the bundle is judged.
**Date:** 2026-05-12

> **The spec is the contract.** Each story slices [`../product-spec.md`](../product-spec.md) — never invents new requirements. Anything the spec leaves undefined is the build team's discretion and is not judged.

---

## The template

```
ID:     S-NN  (S-01, S-02, …; assigned in slicing order)
Title:  <verb-first, 6-10 words>  e.g. "Submit vacation request from employee dashboard"
Tier:   Basic | Bonus
Spec:   product-spec §<n>  +  acceptance/<file>.feature:<scenario-name>
Size:   ~2h  (target; flag anything > 3h for re-slicing)

User story:
  As a <role>
  I want <capability>
  so that <outcome>

Acceptance:
  - Gherkin scenario(s) covered: <names from .feature files>
  - Hard rules hit: <H1 / H2 / ... or "none">
  - Soft rules hit: <S1 / S2 / ... or "none">
  - Notifications produced: <event names per spec §10 or "none">
  - Audit entries produced: <event names per spec §11.5 or "none">

Depends on:  <S-XX, S-YY>     # previous stories that must merge first
Blocks:       <S-XX>          # downstream stories waiting on this one

Demo cue: "<one sentence the demo presenter could say>"
Notes:    <optional, ≤ 2 lines — judges read these; brevity scores>
```

**Keep it on one screen.** A scrolling story is a specification document. Stop. Link to the spec, link to the Gherkin, leave the rest.

---

## Worked example 1 — Basic, vertical

```
ID:    S-04
Title: Submit vacation request — happy path
Tier:  Basic
Spec:  product-spec §4.1 + §13 #4
       acceptance/employee.feature:"Submit a vacation request for next week"
Size:  ~2h

As an employee
I want to submit a vacation request with a date range
so that my manager can approve it and my balance updates

Acceptance:
  - Gherkin: employee.feature scenarios:
      "Submit a vacation request for next week" (@basic)
      "Vacation submission appears on manager's queue" (@basic)
  - Hard rules hit: H5 (quota exceeded)
  - Soft rules hit: S5 (approaching limit)
  - Notifications: AbsenceSubmitted → direct manager
  - Audit: absence.submitted with before/after snapshot

Depends on:  S-01 (mock login), S-02 (user has team + direct_manager_id)
Blocks:      S-05 (manager approve), S-09 (calendar reflects)

Demo cue: "Anna submits a 3-day vacation; it lands on Tomáš's queue within 30 seconds."
Notes: Live balance badge per FE refinement §13 surfaces here.
```

## Worked example 2 — Basic, rule-only slice

```
ID:    S-04b
Title: H4 — block consecutive sickdays
Tier:  Basic
Spec:  product-spec §9.1 H4
       acceptance/employee.feature:"Cannot log a sickday on a consecutive day"
Size:  ~1h

As an employee
I want a clear inline error when I try to log a sickday adjacent to yesterday's
so that I know to use PN instead

Acceptance:
  - Gherkin: employee.feature:"Cannot log a sickday on a consecutive day" (@basic)
  - Hard rules hit: H4
  - Soft rules hit: none
  - Notifications: none
  - Audit: none (submission rejected → no entity persisted)

Depends on:  S-04a (sickday submit happy path)
Blocks:      none

Demo cue: "Anna tries sickday today after yesterday's sickday — block + 'use PN' hint."
Notes: Error must contain rule ID 'H4' as discriminator (per FE testing §5).
```

## Worked example 3 — Bonus, gated

```
ID:    S-B-03
Title: Email delivery channel for submission events
Tier:  Bonus
Spec:  product-spec §14 "Email delivery channel (foundational)"
       acceptance/employee.feature:"@bonus @email-channel" block
Size:  ~2h

As an employee
I want the same notifications I see in the portal delivered to my inbox
so that I don't have to refresh the portal to know my request was approved

Acceptance:
  - Gherkin: employee.feature @bonus @email-channel scenarios
  - Notifications: AbsenceSubmitted, AbsenceApproved, AbsenceRejected
  - Dedup: one email per (event_id, recipient_id)
  - Template registry pluggable for Slack/Teams (next Bonus axis)

Depends on:  S-13 (in-portal notification feed working — Basic gate)
Blocks:      S-B-04 (Slack channel reuses dispatcher)

Demo cue: "Approve → MailHog shows the email within 5 seconds."
Notes: Gated — recommend only when team is on track for Basic ≥ 90%.
```

---

## Slicing rules

1. **2-hour target.** If you cannot see how a senior + AI pair finishes the slice in ~2h, split it. Carve along rule boundaries (one hard rule per story), state-machine transitions (Submit → Approve as two stories), or persona surface (Employee submit vs Manager approve).
2. **One Gherkin scenario minimum.** Zero means there is nothing to demo; that is not a story, it is a refactor task.
3. **Vertical slices beat horizontal layers.** "Submit vacation end-to-end" beats "build absence DB schema". Stay demo-able.
4. **Hard rule + happy path can be one story.** "Submit vacation with H5 check" is fine. Split only if the happy path itself is heavy.
5. **No story without a Demo cue.** If you cannot name what a presenter would say, the story is not shaped for hackathon delivery.
6. **Notification + audit are part of the story.** A "submit vacation" story that omits audit + notification fan-out is incomplete per spec §10 + §11.5.
7. **Withdraw / cancel are their own stories.** They share the form but trigger different transitions and notification fan-outs.
8. **Bonus stories carry a gate note.** Annotate every Bonus story with "Recommend only after Basic ≥ 90%" — your bundle is honest about sequencing.
9. **Do not invent requirements.** If the spec is silent, leave the story silent. Document the gap in your bundle's "open questions" list (if you keep one); do not pre-resolve it.

## Definition of Done — per story

A story is considered "done" when a team that uses it could say all of these are true. You do not enforce this — you describe it.

- [ ] Linked Gherkin scenario(s) pass.
- [ ] Hard rule(s) named in the story trip with the spec §9.1 message.
- [ ] Notification record(s) and audit entry written (or "none" was declared upfront).
- [ ] Demo cue rehearsed once against a real running portal.
- [ ] Code merged into the branch the eval-runner will clone at demo time.

## What this template is NOT

- A user-research artefact. Personas are settled (spec §3); no discovery loop.
- A backlog-grooming ritual. You produce, you do not facilitate.
- A signing-off mechanism. The Gherkin scenario is the gate, not the BA.
- A test-case repository. Acceptance references Gherkin; do not duplicate Given/When/Then in the story body.
- A coordination tool. Owner / Pair fields removed by design — teams own their own assignment.

## Tool tips

- **Index in a spreadsheet or table.** Columns: `ID | Title | Tier | Size | Depends-on | Blocks | Demo cue`. The bundle ships this index as a CSV / Markdown table alongside the per-story files.
- **One file per story** under `stories/S-NN.md` is reviewer-friendly; one big file is also acceptable if the bundle is small.
- **AI-assist for drafting.** Paste the spec §13 item into Claude with this template; ask "split into 2h hackathon stories". Review + adjust. Show the prompt in the bundle — visible AI direction earns Polish points (per [`scoring-rubric.md`](scoring-rubric.md)).
- **Cluster by acceptance feature file.** Stories touching `employee.feature` co-evolve; same for `manager.feature`, `hr.feature`. Useful when judges scan for coverage.
