# Business Analyst — 5-Minute Quickstart

**Audience:** BA joining a hackathon team on the day, with no prior context.
**Read time:** 5 minutes.
**Then:** open [`../ba/slicing-guidance.md`](../ba/slicing-guidance.md), open the spreadsheet, slice the backlog.

---

## What you own

1. **The backlog.** Slice spec §13 into ~30 stories of ~2h each. Use [`../ba/story-template.md`](../ba/story-template.md).
2. **The clock.** Stand-up every ~90 min. Mid-day cut decision. Demo prep at hour 9.
3. **The Basic-before-Bonus gate.** No Bonus work until the team is on track for ≥ 90% Basic.
4. **The demo script.** One sentence per slice, 7-10 sentences total, rehearsed once with the team before demos start.

## What you do NOT own

- The spec. [`../product-spec.md`](../product-spec.md) is the contract. You slice it, you do not edit it.
- The Gherkin. [`../acceptance/`](../acceptance/) is the judging rubric. Reference it, do not rewrite it.
- Code, commits, branches, eval-runner. That's the dev's responsibility.
- Architecture decisions. [`../dev-extras/backend/be-technical-refinement.md`](../dev-extras/backend/be-technical-refinement.md) and [`../dev-extras/frontend/fe-technical-refinement.md`](../dev-extras/frontend/fe-technical-refinement.md) are owned by the dev leads on each lane.

## First 30 minutes

1. Read this file. (you are here)
2. Read [`../README.md`](../README.md) (TL;DR + judging + ground rules).
3. Skim [`../product-spec.md`](../product-spec.md) §13 (the 14 Basic items) + §14 (Bonus axes).
4. Open [`../ba/slicing-guidance.md`](../ba/slicing-guidance.md). Note the build-window arithmetic for your team size.
5. Open a spreadsheet (or sticky wall). Columns: `ID | Title | Tier | Size | Depends-on | Owner | Status`.

## Hours 0.5–1.5 — slice the backlog

Per [`../ba/slicing-guidance.md`](../ba/slicing-guidance.md), draft the starting story list. Assign foundation stories (S-01..S-03) to the strongest team members.

**Do not aim for slicing perfection.** A 70%-correct backlog ready at hour 1 beats a 100%-correct one ready at hour 2.

## Throughout the day — cadence

- **Stand-up every ~90 min.** 5 minutes max. "What did you finish, what are you on, anything blocked?" That's it.
- **Walk the floor.** Sit next to dev/QA pairs. Listen. Re-slice in real time when something is overrunning.
- **Update the spreadsheet** as stories move. The team should see status without asking.
- **Hour-5 mid-day cut.** Honest assessment: are we on track for ≥ 90% Basic? If no, cut whole items (not story halves). See `slicing-guidance.md` "Cutting under time pressure".

## Demo prep — hour 9

The demo is **8-10 minutes** end-to-end. The script is:

1. One-sentence intro. *"We built the attendance portal — vacation, sickday, paragraph with documents, manager calendar, year-rollover, audit log."*
2. **Live demo path** — vertical: log in as employee → submit vacation → log in as manager → approve → log in as employee → see decision → balance updated → calendar reflects. 4-5 minutes.
3. **Rule moment** — try a hard rule (H4 consecutive sickday or H5 quota), show the inline error with the spec message. 1 minute.
4. **HR moment** — run the monthly XLSX export, open the file, show two sheets. 1-2 minutes.
5. **Optional Bonus moment** — only if a Bonus axis is shipped. 1 minute.
6. **Close** — *"Eval-meta.yaml declares our stack, make eval, and high-risk paths."*

**Rehearse once with the team before demos start.** Discover the broken click-through now, not on stage.

## AI tooling — your specific use

The BA's high-leverage AI use is **drafting stories from spec text**.

Prompt template:

```
You are helping me slice a hackathon backlog. Each story should be ~2h
for a senior + AI dev. Use this template: [paste story-template.md]

Spec item:
[paste product-spec.md §13 item #N + any referenced rules from §9]

Linked Gherkin scenarios from acceptance/<file>.feature:
[paste the relevant scenarios]

Draft 2-3 stories that cover this item. For each, fill the template fields
and propose a Demo cue line.
```

Then **edit ruthlessly**. The AI will over-produce. Cut anything that isn't testable, demo-able, or sliced to 2h.

## Common BA failure modes (avoid)

- **Writing too much.** A 2-page story is a document, not a story. Keep stories on one screen.
- **Defending Bonus before Basic is 90%.** When the team gets excited about email delivery at hour 4, your job is to say no.
- **Over-grooming the backlog.** The first version of the spreadsheet ships at hour 1. Refining it after hour 3 is procrastination — by then, the team is producing, not reading.
- **Disappearing into a corner with the spec.** Walk the floor. If you can't see the dev/QA pairs, you can't re-slice.
- **Not cutting at hour 5.** This is the single highest-cost BA mistake. If the math doesn't work, cut. The team will not cut for you — they are heads-down shipping.

## What "good" looks like

- At hour 1: backlog is sliced and assigned.
- At hour 5: 40-50% of Basic stories are done; cut decisions are made and communicated.
- At hour 9: 90%+ of Basic stories done; demo script is rehearsed.
- At hour 10: portal is committed, pushed, `eval-meta.yaml` exists, demo is delivered.

Everyone on the team should be able to say which story is next, which is in flight, which is blocked. If they can't, that's on you.

## Links you will use today

- [`../ba/story-template.md`](../ba/story-template.md) — the per-story template.
- [`../ba/slicing-guidance.md`](../ba/slicing-guidance.md) — the playbook (build-window arithmetic, dependency map, slice patterns, cuts under pressure).
- [`../product-spec.md`](../product-spec.md) — the contract. §13 Basic, §14 Bonus, §9 rule catalogue.
- [`../acceptance/`](../acceptance/) — the Gherkin scenarios; each story references one.
- [`../README.md`](../README.md) — judging rubric (160 pts: 100 Basic / 30 Bonus / 10 Security / 10 Quality / 10 Polish).
