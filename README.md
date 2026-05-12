# Hackathon Brief — Attendance Portal (Košice, 2026-05-13)

Welcome. This folder is the **single source of truth** for what you are building. Read it. There is nothing useful elsewhere.

## TL;DR

- **Build:** a self-contained web app that owns the company's attendance lifecycle (worktime, absences, approvals, quotas, reports). See [`product-spec.md`](product-spec.md).
- **Time:** in-person, single day.
- **Team size:** 2–7. Senior engineers with AI tooling expected.
- **Stack:** your choice. No starter code. Fixtures are stack-agnostic data only.
- **LLM access:** bring your own Premium Claude seat (Pro or Max). No organiser budget.
- **Demo:** every team demos working software at the end of the day. Eval-runner runs after demos.

## Two-bundle structure

This brief is split by audience at the file level so a BA-only cut is cheap to extract:

- **Core bundle (this folder, excluding `dev-extras/`)** — requirements + judging contract + BA materials. Anyone — BA, manager, judge, organiser — can read this end-to-end and understand *what* is being built and *how it is judged*.
- **Dev-extras bundle (`dev-extras/`)** — implementation scaffolding for build teams: entity sketch, integration baselines (auth, email, fixtures), NFRs, frontend UX baseline, dev/QA role quickstarts. Layered on top of the core bundle.

Branch model: `main` carries both bundles during prep. A `requirements-only` cut can be produced at any time by `git rm -rf hackathon-brief/dev-extras/` on a fork or branch. Cross-references from core into `dev-extras/` are tolerant — they degrade to "not in this bundle" rather than break.

## Tier model — Basic vs Bonus

Two tiers. **Basic must complete first.** Bonus features are **off-limits** until every Basic acceptance scenario passes.

- **Basic** — the §13 must-have set in `product-spec.md`. The Gherkin scenarios in [`acceptance/`](acceptance/) are the rubric — they double as your TDD spec and the judge's checklist.
- **Bonus** — §14 features. Real auth, exceptions replay, Slack/ICS, analytics, etc. Counted only when Basic ≥ 90%.

If the eval-runner sees you started a Bonus axis with Basic incomplete, you forfeit Bonus points. Don't.

## Navigation

### Core bundle (everyone reads)

| Where | Audience | What |
|---|---|---|
| [`product-spec.md`](product-spec.md) | all | Behaviour spec. Read first. |
| [`acceptance/`](acceptance/) | all | Gherkin features = judging rubric. **Treat as TDD spec.** |
| [`demo-format.md`](demo-format.md) *(TBD)* | all | Run order, time per team, required artifacts (`eval-meta.yaml`). |
| [`ba/story-template.md`](ba/story-template.md) *(TBD)* | BA | Story slicing template. |
| [`ba/slicing-guidance.md`](ba/slicing-guidance.md) *(TBD)* | BA | How to break Basic into 2h slices. |
| [`role-quickstarts/business-analyst.md`](role-quickstarts/business-analyst.md) *(TBD)* | BA | 5-min entry for BAs. |
| [`role-quickstarts/solo-or-multi.md`](role-quickstarts/solo-or-multi.md) *(TBD)* | all | Vertical slice plan for 2–3 person teams. |

### Dev-extras bundle (`dev-extras/` — build teams read)

| Where | Audience | What |
|---|---|---|
| [`dev-extras/domain/entities.md`](dev-extras/domain/entities.md) *(TBD)* | dev | Entity sketch derived from the spec. Reference, not prescription. |
| [`dev-extras/integration/auth-options.md`](dev-extras/integration/auth-options.md) *(TBD)* | dev | Mock login (Basic) vs real auth options (Bonus). |
| [`dev-extras/integration/email-stub.md`](dev-extras/integration/email-stub.md) *(TBD)* | dev | Recommended local SMTP capture (MailHog / Mailpit). |
| [`dev-extras/integration/fixtures/`](dev-extras/integration/fixtures/) *(TBD)* | dev + QA | Users, teams, holidays, quotas, in-flight absences, sample docs. |
| [`dev-extras/nfr/performance.yaml`](dev-extras/nfr/performance.yaml) *(TBD)* | dev | Latency + calendar grid render targets. |
| [`dev-extras/nfr/time-budget.yaml`](dev-extras/nfr/time-budget.yaml) *(TBD)* | dev | Build-window cap + per-phase guidance. |
| [`dev-extras/frontend/fe-technical-refinement.md`](dev-extras/frontend/fe-technical-refinement.md) | frontend dev | FE technical refinement — 38 sections framework-agnostic (responsive, PWA, a11y WCAG 2.2 AA, theming, i18n, real-time, auth, file upload, perf budgets, design system, state, forms, security, testing, build/eval-runner, code architecture, DI, TZ handling, API contract, etc.) with Basic / Bonus tier mapping. |
| [`dev-extras/role-quickstarts/`](dev-extras/role-quickstarts/) *(TBD)* | dev / QA | Per-role 5-min entry: backend dev/QA, frontend dev/QA. |

## Role start map

Don't read everything. Pick your role, follow the quickstart.

| You are | Bundle | Start here | Then |
|---|---|---|---|
| **Backend dev** | core + dev-extras | [`dev-extras/role-quickstarts/backend-dev.md`](dev-extras/role-quickstarts/backend-dev.md) | `dev-extras/domain/entities.md` → `acceptance/*.feature` → spec §6, §7, §9 |
| **Backend QA / SDET** | core + dev-extras | [`dev-extras/role-quickstarts/backend-qa.md`](dev-extras/role-quickstarts/backend-qa.md) | `acceptance/*.feature` → `dev-extras/integration/fixtures/` |
| **Frontend dev** | core + dev-extras | [`dev-extras/role-quickstarts/frontend-dev.md`](dev-extras/role-quickstarts/frontend-dev.md) *(TBD)* | `dev-extras/frontend/fe-technical-refinement.md` → spec §17 |
| **Frontend QA** | core + dev-extras | [`dev-extras/role-quickstarts/frontend-qa.md`](dev-extras/role-quickstarts/frontend-qa.md) | `acceptance/employee.feature` + `manager.feature` |
| **Business Analyst** | core only | [`role-quickstarts/business-analyst.md`](role-quickstarts/business-analyst.md) | `ba/story-template.md` + `ba/slicing-guidance.md` |
| **Solo or 2-person team** | core + dev-extras | [`role-quickstarts/solo-or-multi.md`](role-quickstarts/solo-or-multi.md) | vertical slice plan |

## Ground rules

1. **Pick one stack.** Don't argue stack choice past minute 30. Ship beats perfect.
2. **Acceptance Gherkin is the contract.** If a scenario passes, the feature is done. If not, it isn't.
3. **Fixtures are canonical.** Use the data in `dev-extras/integration/fixtures/`. Don't invent your own users, holidays, or year-rollover scenarios — judges replay against the same fixtures.
4. **Mock auth is fine for Basic.** Don't burn 60 minutes on OIDC before the rule engine works.
5. **Premium Claude seat per person.** Pro caps reset every 5h. Reserve Opus for hard problems; Sonnet 4.6 covers most workload.
6. **In-product AI features need your own API key.** Pro/Max seats cover Claude Code dev-time. They do **not** authenticate runtime API calls from the portal.
7. **Commit often, push often.** Eval-runner pulls your repo at demo time.
8. **At demo time, ship `eval-meta.yaml`.** Declares stack ids, `make eval` entrypoint, high-risk paths. Without it your submission can't be eval'd → you forfeit deterministic + AI eval points.

## Judging rubric

Total **160 points**.

| Axis | Max | Notes |
|---|---|---|
| Basic Gherkin pass | 100 | % scenarios in `acceptance/*.feature` Basic tier passing |
| Bonus features delivered | 30 | **Gated** — counted only if Basic ≥ 90 (≥ 90 pts above) |
| Security | 10 | `gitleaks`, `trivy fs`, `semgrep` + AI security pass on declared high-risk paths |
| Code quality | 10 | Structure / DRY (`jscpd`) / complexity. AI fallback where stack tooling fragments. |
| Polish | 10 | Judge-subjective — UX, demo flow, agent workflow shown |

Tiebreaker: head-to-head judge vote.

## Eval-runner — what runs after demos

Per team, ~10 minutes:

- **Stack-agnostic deterministic:** `gitleaks`, `trivy fs`, `jscpd`, `semgrep --config=auto` + hackathon ruleset.
- **Your own tests + lint** via `make eval` (the entrypoint you declare in `eval-meta.yaml`).
- **AI passes:** architecture review, deep DRY, security review of declared high-risk paths, test-quality verdict, spec-conformance against Bonus Gherkin.

Reproducibility: fixed model + temperature 0, prompts versioned in this repo, per-team logs preserved. Disputes are resolvable by re-run.

## Out of scope

See `product-spec.md` §15. Don't build native apps, multi-tenant SaaS, real Visma corporate SSO, or production Tempo migration. Generic OIDC against Google / Microsoft personal accounts is fair game (Bonus).

## Source document

This brief derives from the internal Drive doc *Attendance Portal — Functional Refinement*, 2026-05-06. The spec in this repository supersedes that doc for hackathon purposes.
