# Slicing Guidance — Breaking Basic into 2-Hour Stories

**Audience:** Business Analyst on a hackathon team, preparing the backlog before kickoff or during the first hour.
**Purpose:** Turn the 14 Basic items from product-spec §13 into ~30-40 stories of ~2h each, sequenced so the team always has demo-able output.
**Companion:** [`story-template.md`](story-template.md) — the per-story shape.
**Date:** 2026-05-12

> **The 2-hour rule.** A senior engineer with strong AI tooling can deliver a vertical slice in ~2h. Smaller than that and ceremony eats the budget. Larger than that and the team flies blind between commits. Aim for 2h; flag anything > 3h for re-slicing on the spot.

---

## The build-window arithmetic

A single-day build window in this hackathon is **~10 effective hours** after subtracting kickoff (~30 min), demo prep (~45 min), demo + eval (~60 min), lunch + breaks (~60 min). Net build = ~10h.

- A **2-person** team has **~20 person-hours** → can ship ~10 stories. Pick **vertical slices only**; cut every non-Basic surface.
- A **4-person** team has **~40 person-hours** → ~20 stories. Cover all 14 Basic items; expect tight finish.
- A **6-person** team has **~60 person-hours** → ~30 stories. Comfortable on Basic; ~30% Bonus possible.
- A **7-person** team has **~70 person-hours** → ~35 stories. Bonus axes realistic.

These numbers assume AI tooling. Without it, halve them.

## The Basic 14 — first-pass slice count

Spec §13 lists 14 items. The table below is the **starting point**; the BA refines per team size + skill mix in the first 30 minutes.

| # | Spec §13 item | Suggested stories | Notes |
|---|---|---|---|
| 1 | Admin creates teams, assigns managers, invites users | 2–3 | Org tree (with cycle check) + user CRUD + role assignment can split. |
| 2 | Mock login | 1 | Single story unless OIDC Bonus is planned same-day. |
| 3 | Worktime entry (project, BT, overtime auto-detect, live validation) | 3 | Submit happy path / overtime auto-flag / BT toggle. |
| 4 | Vacation full loop (submit → approve → notify → balance refresh → calendar update) | 3–4 | Submit / approve / withdraw / quota-rule story. |
| 5 | Sickday with all hard rules (H2 full-day, H3 ≤3/yr, H4 consecutive, working-day) | 3 | Happy + rule cluster + notification fan-out. |
| 6 | Paragraph + document upload, HR validate, reject path | 3 | Submit+upload / HR approve / HR reject (with reason). |
| 7 | Manager team calendar (grid, colour, click-through, badges, month switch) | 2 | Render + interactions. |
| 8 | Manager approvals queue (live, approve/reject, skip-level approve) | 2–3 | Queue + decision + skip-level filter. |
| 9 | HR monthly XLSX export (two-sheet, SK + EN, frozen header, catalogue) | 2 | Generator + locale switch. |
| 10 | HR documents queue (preview, approve/reject + reason) | 2 | Queue + decision flow (overlaps #6). |
| 11 | Year-rollover dry-run + apply (3 worked examples) | 2 | Engine + UI. |
| 12 | Audit log screen (filterable, before/after snapshot) | 1–2 | Writer is part of every story above; screen is its own slice. |
| 13 | My notifications inbox | 1 | Reader; writer is part of every state-change story. |
| 14 | Balances screen (allocated/used/reserved/carried/lost + chart) | 2 | Computed view + chart. |

**Total starting point: 29–34 stories.** Adjust for team capability.

## Dependency map

A handful of stories block many others. Sequence those first.

```
┌──────────────────────────────────────────────────────────────────┐
│  Foundation (cannot demo anything without these — first 2h)      │
├──────────────────────────────────────────────────────────────────┤
│  S-01  Mock login                                                │
│  S-02  User + team + direct_manager_id (seed fixture wired up)   │
│  S-03  App shell + role-aware routing                            │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│  Vertical slice #1 — Vacation end-to-end (hours 3-5)             │
├──────────────────────────────────────────────────────────────────┤
│  S-04  Submit vacation (form + H5 quota rule)                    │
│  S-05  Manager approves vacation (queue + transition + audit)    │
│  S-06  Employee sees decision (notification record + balance)    │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│  Parallel tracks open up (hours 5-9)                             │
├──────────────────────────────────────────────────────────────────┤
│  Track A  Sickday + PN (S-07..S-09)                              │
│  Track B  Paragraph + document upload + HR validate (S-10..S-12) │
│  Track C  Manager calendar + queue (S-13..S-15)                  │
│  Track D  Worktime entry + overtime (S-16..S-18)                 │
└──────────────────────────────────────────────────────────────────┘
                                ↓
┌──────────────────────────────────────────────────────────────────┐
│  Aggregating screens + jobs (hour 9-10)                          │
├──────────────────────────────────────────────────────────────────┤
│  S-19  HR monthly XLSX export                                    │
│  S-20  Year-rollover dry-run + apply                             │
│  S-21  Balances screen                                           │
│  S-22  My notifications inbox                                    │
│  S-23  Audit log screen                                          │
└──────────────────────────────────────────────────────────────────┘
                                ↓
                          Demo + Eval
```

Anything starting in hour 9+ should already have a "skip" line in the demo script — late breakage is normal.

## Per-item slice patterns

Five recurring shapes show up. Once a BA sees them, the rest of the slicing is mechanical.

### Pattern A — "Submit X" (happy path)

One story per absence type's happy path. ~2h.

- Form renders with the right fields.
- Validator runs, no rules trip on the happy fixture.
- Entity persists.
- Notification fan-out per spec §10.
- Audit entry written.
- Gherkin: `acceptance/employee.feature:"Submit a <X> request"` passes.

### Pattern B — "Rule cluster"

One story per group of related rules. ~1-2h. Hard + soft rules of the same kind cluster.

- Example: H2 + H3 + H4 (all sickday rules) in one story.
- Example: S1 + S2 + S6 (worktime soft rules) in one story.
- Each rule has a Gherkin scenario in `acceptance/<actor>.feature`.
- Inline error renders with the spec message and the rule ID discriminator.

### Pattern C — "Transition X → Y"

One story per state-machine transition. ~2h.

- Approve, Reject, Withdraw, Cancel each get their own story.
- Manager-side: queue updates, decision lands.
- Employee-side: notification record appears, balance recomputes.
- Re-validation runs per spec §9.3 on the Approve transition.
- Audit entry written.

### Pattern D — "Aggregating screen"

One story per screen that *reads* from the data the other stories wrote. ~2-3h.

- Team calendar grid.
- Approvals queue.
- Documents queue.
- Audit log.
- My notifications.
- Balances.
- These can mostly be parallelised once the underlying writers are in place — they don't depend on each other.

### Pattern E — "Cross-cutting job"

One story per scheduled or one-off job. ~2-3h.

- Year-rollover dry-run.
- Year-rollover apply.
- XLSX export pipeline.
- These have heavy logic and benefit from a single owner.

## Parallelisation tips

- **Open vertical slice #1 first** (vacation end-to-end). It exercises every layer; once green, parallel tracks can run with confidence the wiring works.
- **Don't open all tracks simultaneously.** A 6-person team can run 3 tracks; assigning 6 stories at once means 6 half-built stories at the next stand-up.
- **Pair on the first instance of each pattern.** The second sickday rule (after the first lands) is mechanical; the first is where the team agrees on shape. Pair on the shape-setting story.
- **QA pairs with dev, not after dev.** A QA waiting for "done" finds bugs at hour 9; a QA pairing in real time prevents them. The Gherkin scenario passes when the pair says it does.
- **The BA does not block.** If you're not sure about a story shape, write your best guess, hand it to the dev, and resolve in real time. Slicing perfection is the enemy of shipping.

## Hour-by-hour cadence

Time is the BA's responsibility. The dev does not watch the clock — you do.

| Hour | What the BA does |
|---|---|
| 0–0.5 | Kickoff with the team. Confirm 14 Basic items + 2h slice rule. Open the spreadsheet / sticky wall. |
| 0.5–1.5 | First-pass slicing of S-01..S-23 (or however many for the team size). Assign foundation stories. |
| 1.5–3 | Vertical slice #1 in flight. BA pairs with QA on Gherkin assertions. Refine downstream stories as the team learns velocity. |
| 3–5 | Parallel tracks open. BA visible on the floor — stand-ups every ~90 min, 5 min max. |
| 5–7 | Mid-day status check. Re-slice anything that's overrunning. Bonus-gate check: are we on track for ≥ 90% Basic? If no, cut. If yes, BA drafts top-3 Bonus stories. |
| 7–9 | Aggregating screens + jobs. BA validates each Gherkin against the live portal — this is the demo rehearsal in disguise. |
| 9–9.5 | Demo prep. BA writes the demo script (1 sentence per slice, 7-10 sentences total). |
| 9.5–10 | Final commit + push. `eval-meta.yaml` validated. |

## Re-slicing signals

Re-slice **immediately** when any of these fire:

- A story crosses 3h without merging.
- A dev says "this needs another story" — believe them; cut the current one at the work-done line and create the new one.
- Two stories are racing for the same file → merge or re-sequence.
- A Gherkin scenario in the linked feature file no longer matches the story's acceptance — the spec has drifted under the story. Update the story, re-confirm with dev.
- A story has no clear Gherkin assertion → not demo-able → not Basic.

## What the BA does NOT do

- Refine spec §13. The spec is the contract; the BA slices it, does not edit it.
- Block on perfect slicing. A 3h story that ships beats a 2h story that's still being discussed.
- Manage Git / branches / commits. That's the dev's job.
- Write Gherkin themselves (unless the team has agreed). Gherkin lives in `acceptance/*.feature` and is authored upfront; the BA references it.
- Defend the Bonus tier before Basic is 90%. The BA is the team's discipline on the gate.

## Cutting under time pressure

When the clock says you will not finish all 14 Basic items, **cut whole items, not story halves**. A half-built screen is a demo liability. The hierarchy of what to keep:

1. **Always:** items #1-#8 (admin / login / worktime / vacation / sickday / paragraph / manager surfaces). Without these the demo has no shape.
2. **Strong keep:** #11 (year-rollover), #12 (audit log), #13 (notifications). These prove the spec was read.
3. **First cuts:** #14 (balances chart), #10 (HR documents queue can be merged into #6 if needed), #9 (drop the EN export, keep SK only).

Communicate cuts to the team in one sentence: *"We are cutting balances chart + EN export to ship the rest cleanly."* No debate. Move on.

## Bonus tier — when and how

Don't draft Bonus stories until hour 5 status check shows Basic ≥ 60% with the right trajectory.

When eligible, pick **one** Bonus axis from spec §14 and slice it like Basic — same template, same 2h target.

Bonus priority order (highest ROI first):

1. **Mobile-friendly responsive UI** — quick wins across already-built screens.
2. **Multi-language UI (EN)** — only if the SK export is already shipped and the catalogue infrastructure is in place.
3. **Email delivery channel** — high judge visibility; reuses existing notification records.
4. **Skip-level *policy* enforcement** — small surface, big rule-engine signal.
5. **Audit-log tampering protection (hash chain)** — a 90-min slice with strong code-quality + security signal.

**Forbidden until Basic ≥ 90%:** real auth, Tempo import, websocket push, two-factor, PWA. These are time pits.

---

This document is the BA's playbook for **single-day delivery under a Basic-before-Bonus tier gate**. The exact slice counts and orderings shift per team; the **2-hour discipline, the dependency map, and the hierarchy of cuts do not**.
