# Story Template — Hackathon Attendance Portal

**Audience:** Business Analyst on a hackathon team.
**Purpose:** Cut the §13 Basic acceptance set into stories small enough that a dev + QA pair (with AI tooling) can finish one in ~2 hours.
**Companion:** [`slicing-guidance.md`](slicing-guidance.md) — the dependency map + the per-item slice breakdown.
**Date:** 2026-05-12

> **Principle.** Stories are a *coordination tool*, not a deliverable. The Gherkin scenarios in [`../acceptance/`](../acceptance/) are the contract; this template helps the team agree on slice size and ordering, not on documentation depth.

---

## What a hackathon story looks like

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

Owner:   <dev>
Pair:    <qa>
Demo cue: "<one sentence the demo presenter will say>"
```

**Keep it on one screen.** If your story page scrolls, you're writing a specification document. Stop. Link to the spec, link to the Gherkin, leave the rest.

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

Owner:   Marek
Pair:    Lenka
Demo cue: "Anna submits a 3-day vacation; it lands on Tomáš's queue within 30 seconds."
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

Owner:   Marek
Pair:    Lenka
Demo cue: "Anna tries sickday today after yesterday's sickday — block + 'use PN' hint."
```

## Worked example 3 — Bonus, off-by-default

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

Owner:   <only assigned if Basic gate ≥ 90% — check first>
```

---

## Slicing rules

1. **2-hour target.** If you can't see how a senior + AI finishes the slice in 2h, split it. Carve along rule boundaries (one hard rule per story), state-machine transitions (Submit → Approve as two stories), or persona surface (Employee submit vs Manager approve).
2. **One Gherkin scenario minimum per story.** Zero means there is nothing to demo; that's a refactor task, not a story.
3. **Vertical slices beat horizontal layers.** "Submit vacation end-to-end" beats "build absence DB schema". A demo-able slice every 2h keeps the team honest.
4. **Hard rule + happy path can be one story.** "Submit vacation with H5 quota check" is fine. Two slices only if the happy path itself is heavy.
5. **No story without a `Demo cue`.** If you can't name what the presenter will say, the story isn't shaped for hackathon delivery.
6. **Notification + audit are part of the story, not separate.** A story that "submits a vacation" without also writing audit + notification is incomplete per spec §10 + §11.5.
7. **Withdraw / cancel paths are their own stories.** They share the form but trigger different state transitions and notification fan-outs.
8. **Bonus stories carry a Basic-gate check in the Owner line.** Nobody is assigned to Bonus until the team's Basic count hits 90%.

## Definition of Done — per story

A story is done when **all** of these are true:

- [ ] Linked Gherkin scenario(s) pass (manual run + automated where the harness exists).
- [ ] Hard rule(s) named in the story actually trip with the spec §9.1 message.
- [ ] Notification record(s) and audit entry written (or "none" was declared upfront).
- [ ] Demo cue rehearsed once against a real running portal.
- [ ] No `TODO` / `FIXME` left without a follow-up story.
- [ ] Code merged into the branch the eval-runner will clone at demo time.

## What this template is NOT

- A user-research artefact. Hackathon stories assume the personas are settled (spec §3); no discovery loop.
- A backlog-grooming tool. The full backlog is §13's 14 items; you slice those into stories, not generate new requirements.
- A signing-off mechanism. The BA does not gate developer flow — the Gherkin scenario is the gate.
- A test-case repository. Acceptance criteria point at Gherkin; do not duplicate the Given/When/Then in the story body.

## Tool tips

- **Index in a spreadsheet** (Google Sheets, Notion, even a CSV in the repo). Columns: ID, Title, Tier, Size, Depends-on, Owner, Status. One row per story. Status: `todo / in-progress / blocked / done`.
- **Sticky-note wall** if the team is in one room. Each sticky = one story. Move physically as status changes. Beats any tool.
- **AI-assist for drafting.** Paste the spec §13 item into Claude with this template; ask "split into 2h hackathon stories". Review + adjust. The dev / QA pair owns the final shape, not the AI.
- **Cluster by acceptance feature file.** Stories that touch `employee.feature` mostly co-evolve; same with `manager.feature`, `hr.feature`. Useful when assigning ownership.
