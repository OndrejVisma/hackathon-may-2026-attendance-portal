# Attendance Portal — Functional Refinement

**Status:** Hackathon brief — 12-hour build window, team sizes 2–7, **senior engineers with strong AI tooling** (Claude Code / Cursor / equivalents). Scope is ambitious by design; teams are expected to ship a polished demoable application, not a sketch.
**Audience:** Hackathon teams. Read this as the source of truth for *what* the portal does. Each team picks their own implementation stack.
**Date:** 2026-05-06 (source); revised 2026-05-09 to apply DEC-003..006 from `../decisions.md`.

> **Tier model (DEC-004).** This brief uses two scope tiers: **Basic** and **Bonus**. Basic must complete first; Bonus features are off-limits until *every* Basic acceptance scenario passes. Judges enforce the gate — Bonus axes count only when Basic ≥ 90% (DEC-007).

---

## 1. Problem statement

Today the company tracks attendance by emailing monthly Tempo XLSX exports to a back-office robot that flags rule violations after the fact. Employees, managers and HR have no real-time view, no approval flow, no document handling and no quota enforcement at the moment of submission.

Build a self-contained web application that owns the whole attendance lifecycle: daily worktime, planned and unplanned absences, document confirmations, manager approvals, quotas and reports. The portal **replaces Tempo** as the capture tool — there is no Tempo integration to maintain.

**Important — downstream accounting export.** The portal's monthly export still feeds an **external accounting system** that processes payroll, payouts, and other compliance-relevant outputs. The export format (CSV column shape and `flag` codes in §11.1) is fixed by the accounting system's contract — teams must treat it as an external interface, not as something they can redesign. Tempo's replacement is for *capture and lifecycle*; the *export contract to accounting* survives unchanged. Historical Tempo data ingest (different concern) is a separate Bonus axis in §14.

## 2. Glossary

- **Worktime entry** — A block of time on a given day during which the employee is working. Has a start time and an end time.
- **Absence entry** — A day or range of days where the employee is not working: vacation, sickday, sick leave (PN), doctor visit (Paragraph), family-member care (OCR), special leave, paternity leave.
- **Half-day absence** — An absence that covers only the morning or only the afternoon of a single day.
- **Business trip (BT)** — Worktime spent away from the regular workplace.
- **Overtime** — Worktime exceeding the standard 8-hour day, requiring approval.
- **Quota** — The yearly allocated amount of a particular leave type for an employee.
- **Carry-over** — Unused vacation days from the previous year that are added to this year's balance.
- **Approval** — A pending decision a manager (or HR) must make on a submitted request.
- **Hard rule** — A rule that blocks submission. The user cannot save the entry until the violation is resolved.
- **Soft rule** — A rule that warns the user but still saves the entry. Visible to manager and HR.
- **Direct manager** — The single user listed on the employee's profile who is the default approver. Per DEC-003, any *ancestor* in the org tree may also approve (skip-level allowed).
- **HR group** — The HR-role users collectively. Receive document validation requests and act as fallback approvers.

## 3. Personas, roles and permissions

| Capability | Employee | Manager | HR | Admin |
|---|---|---|---|---|
| Log own worktime | yes | yes | yes | yes |
| Log own absences | yes | yes | yes | yes |
| Submit vacation/paragraph/OCR/special/overtime requests | yes | yes | yes | yes |
| Upload own documents | yes | yes | yes | yes |
| See own balance & history | yes | yes | yes | yes |
| Approve/reject team requests | no | yes (own team **and** any descendant in the org tree per DEC-003) | yes (any) | no |
| See team calendar | own row only | yes (own team) | yes (any team) | yes |
| Validate uploaded documents | no | no | yes | no |
| Configure per-user quota overrides | no | no | yes | no |
| Configure global quota rules | no | no | yes | yes |
| Generate monthly HR reports | no | no | yes | yes |
| Manage users, teams, manager links, roles | no | no | no | yes |
| Import / edit public-holiday calendar | no | no | no | yes |

A user can hold multiple roles. A manager is also an employee for their own absences. **Self-approval guard (DEC-003):** if the routed direct manager is the requester themselves, walk up the org tree to the first non-self ancestor; if exhausted (no ancestor) → HR group.

## 4. Absence types — rules and examples

Each absence type is its own product feature with its own rules. The portal must clearly label which type the employee is logging.

### 4.1 Vacation

**Purpose:** planned paid time off.
**Approval:** required, by direct manager (or any ancestor per DEC-003).
**Quota:** statutory + company-bonus (see §6).
**Granularity:** full day or half day (morning OR afternoon).
**Document:** none.

**Example.** Anna has 23 vacation days for 2026 (20 statutory + 3 bonus) and has used 4. She submits 2026-07-13 → 2026-07-17 (5 working days). The portal:
1. Counts the working days (5; the range is Mon-Fri so no weekend deduction).
2. Confirms 5 ≤ 19 remaining.
3. Records the request as Pending.
4. Notifies her manager.
5. The 5 days are *reserved* but not yet decremented from the balance — they decrement only when the manager approves.

If the manager rejects, the reserved days return to the balance and Anna is notified by email.

### 4.2 Sickday (company benefit)

**Purpose:** short, self-declared sick day without a doctor's note.
**Approval:** none — auto-approved on submission, but every hard rule must pass.
**Quota:** 3 per calendar year, no carry-over.
**Granularity:** full day only — the portal must not offer the half-day option for sickdays.
**Document:** none.

**Hard limits enforced at submission time:**
- The employee has at least 1 sickday remaining for the current year.
- The day immediately before the requested date is *not* already a sickday — sickdays cannot be back-to-back across calendar days.
- The requested date is a working day (not weekend, not Slovak public holiday).

**Notification:** manager + everyone on the same team + HR group are emailed.

**Example A — allowed.** Peter used 1 sickday in March 2026. On 2026-05-06 (Wednesday) he submits a sickday for the same day. The portal accepts: 2 remaining, no consecutive sickday, working day → auto-approved → emails fire.

**Example B — blocked.** Peter took a sickday yesterday (2026-05-05). Today he tries to log another for 2026-05-06. The portal blocks with the message *"Consecutive sickdays are not allowed."* The user must pick a non-adjacent day or use sick leave (PN) instead.

### 4.3 Sick leave / PN (incapacity for work) and paternity leave

**Purpose:** doctor-certified illness or 2-week paternity leave following the birth of a child.
**Approval:** self-declared (no manager approval needed to log), but documented later by HR with the doctor's papers.
**Quota:** none — uncapped.
**Granularity:** full days, can span multiple calendar days including weekends and holidays.
**Document:** doctor's papers required eventually; HR can attach them on the employee's behalf. An accident report is required for accident-caused PN.

**Notification:** direct manager, HR group, and the same-team members are emailed.

**Example.** Mária is on PN from 2026-04-20 to 2026-04-30. She logs PN on the portal that morning. Manager + team + HR get email. HR receives the paper certificate from the doctor on 2026-05-02 and attaches it to the existing PN entry. No quota is touched.

> **DEC-010 (deferred):** Whether PN and paternity leave should split into separate CSV codes (`PN` vs `OTC`) at export boundary while remaining unified in the workflow is open. Until decided, both export as `PN`.

### 4.4 Paragraph — doctor visit

**Purpose:** legally entitled time off for the employee's own doctor visit / treatment.
**Approval:** required, by direct manager.
**Quota:** 7 days per calendar year.
**Granularity:** full day or half day (morning or afternoon).
**Document:** required — doctor's confirmation must be uploaded by the employee. HR validates.

**Special rule (half-day).** A half-day Paragraph and the worktime on the same day must be separated by at least 30 minutes of gap. This is a *soft warning*: the user can still save, but the entry is flagged for HR's attention.

**Example.** Janka has a 09:00 doctor's appointment on 2026-05-12. She submits a half-day Paragraph for the morning of 2026-05-12. She also wants to work in the afternoon. The portal recommends she log her worktime as starting no earlier than 12:30 (i.e. 30 minutes after the morning slot ends at 12:00). If she logs worktime starting at 12:15, she sees a yellow warning *"Half-day absence must be separated from working time by at least 30 minutes."* She can still save. Manager and HR see the warning on the entry.

She uploads a photo of the confirmation. Manager approves the absence. HR opens the document, validates it as legible, marks it Approved → quota decrements by 0.5. If HR rejects the document (illegible, wrong period, etc.), the absence flips to Rejected, the quota returns, and Janka is emailed with the reason.

### 4.5 OCR — accompanying a family member

**Purpose:** care / accompanying a family member for a medical visit, illness or treatment.
**Approval:** required, by direct manager.
**Quota:** 7 days per calendar year.
**Granularity:** full day or half day.
**Document:** required.

Identical workflow to Paragraph. The 30-minute gap soft rule applies the same way to half-day OCR.

**Eligible family member**, per the rule text the team should display in the portal's help: own child, adopted child of the employee or spouse, child entrusted by court order; sick spouse or sick parent of either spouse.

### 4.6 Special leave

**Purpose:** life events such as wedding, funeral, blood donation.
**Approval:** required, by direct manager.
**Quota:** legal entitlement; portal treats it as a soft cap (HR can configure).
**Granularity:** full day or half day.
**Document:** required.

The 30-minute gap soft rule applies to half-day special leave the same way.

## 5. Worktime, project codes and business trip

### 5.1 Worktime entry

A worktime entry has:
- a date (always one calendar day),
- a start time and an end time within that day,
- an optional project code (the portal must offer a default value of `GENERAL` so an employee can submit worktime without picking a project),
- an optional free-text note,
- an optional Business-Trip flag,
- an Overtime flag the system sets automatically when the entry exceeds 8 hours.

Multiple worktime entries on the same day are allowed (split work blocks) as long as they do not overlap each other and do not overlap any approved absence on that day.

**Example — split day.** Tomáš logs 08:00-12:00 on project `ADM-1`, then 13:00-17:00 on `ADM-2`. Total 8h, two entries, no overlap → both saved.

**Example — soft warning.** Tomáš logs a single block 06:00-15:00. The portal saves the entry but warns:
- 06:00 is outside the working window 07:00-17:00 → "Outside working window".
- The block is 9h continuous → "Single 8h+ worktime entry; consider splitting."

HR and the manager see both warnings on the report.

### 5.2 Project codes

Project codes are *not mandatory* per team policy. A free-text comment is enough on a `GENERAL` entry. Teams pick how granular they want to be. The HR monthly report shows whatever was logged.

### 5.3 Business trip

Business-trip worktime is logged as a regular worktime entry with the Business-Trip flag turned on. The portal pre-fills the time window 07:00-17:00 for travel-only days (early-morning or late-evening travel logs as one full standard day to keep payroll consistent). No approval is required — the trip is visible to the manager on the team calendar.

## 6. Quotas and balances

### 6.1 Vacation quota — two stacked allocations

Vacation comes in two parts that the portal must surface separately on the balance screen:

- **Statutory** — Slovak legal entitlement, default 20 days. Configurable per employee (some employees are entitled to more by law, e.g. age- or care-based).
- **Company bonus** — extra company benefit, default 3 days. Configurable globally and per employee.

Both buckets are spent together: the portal shows a combined "remaining" number in the UI but tracks them as two separate allocations internally for the carry-over rule below.

### 6.2 Other quotas

| Quota | Default | Carry-over | Granularity |
|---|---|---|---|
| Sickday | 3 days | none, expires 31 December | full day |
| Paragraph | 7 days | none | half-day allowed |
| OCR | 7 days | none | half-day allowed |
| Special leave | per legal entitlement | configurable | half-day allowed |

All defaults are configurable globally by HR and can be overridden per employee.

### 6.3 Year rollover (annual job, runs at 00:05 on 1 January)

For each active employee:

1. Compute the leftover vacation = unused statutory + unused company bonus from the previous year.
2. Compute the carried-over amount and the bonus penalty:
   - **Slovak labour law forbids forfeiting statutory vacation.** No matter how many statutory days the employee carries over, they keep them all.
   - If leftover ≤ carry-over limit (default 5, configurable) → carry the full leftover. The employee keeps their full company-bonus allocation in the new year.
   - If leftover > carry-over limit → still carry the **full** leftover (statutory cannot be lost). **However**, the *company* bonus is the company's discretionary benefit, and the company policy is to withhold it from employees who over-accumulate: the company-bonus quota for the new year is set to 0.
3. Allocate the new year's quotas: fresh statutory (per employee setting), fresh company bonus (0 if the bonus was withheld, otherwise default), fresh sickday/paragraph/OCR.
4. Email the employee + HR a rollover summary: "Carried over: X days. Company bonus this year: Y days (withheld: yes/no)."

**Worked examples**

- *Anna ends 2026 with 4 vacation days unused.* Leftover 4, ≤ limit. Carry-over 4. Bonus retained for 2027 → starts 2027 with 27 days (20 statutory + 4 carry-over + 3 bonus).
- *Peter ends 2026 with 8 vacation days unused, limit is 5.* Leftover 8, > limit. Carry-over **8** (statutory days are not lost). Bonus withheld → starts 2027 with **28** days (20 statutory + 8 carry-over + 0 bonus).
- *Mária ends 2026 with 0 unused.* Carry-over 0. Bonus retained. She starts 2027 with 23 days.

The "bonus withheld" flag is shown on the employee's balance screen with a tooltip explaining the policy, so people understand what happened and why.

**Why Peter starts 2027 with more days than Anna — and why this is correct.** The visible 2027 balance (Peter 28 vs Anna 27) is *misleading at first glance*. The carry-over portion is just unused 2026 entitlement deferred into 2027 — not a fresh allocation. In *fresh lifetime entitlement*, Peter is **3 days down** because his 2027 bonus was zeroed (Anna: 23 + 23 = 46 fresh days across two years; Peter: 23 + 20 = 43; Mária: 23 + 23 = 46). The policy intent is to nudge employees to use vacation in-year — losing the bonus is the only available stick because Slovak labour law forbids forfeiting statutory days. The tooltip on the balance screen should explain this so employees understand the 28-vs-27 visual is not a reward for hoarding.

### 6.4 Approaching-limit warnings

The portal raises a soft warning the moment a submission would leave the employee at or below 2 vacation days remaining, or at exactly 1 sickday remaining. This is informational — submission still proceeds.

## 7. Approval workflow

Every planned absence and every overtime request goes through the same state machine:

```
Draft -> Pending -> Approved
                 -> Rejected
                 -> Withdrawn (by employee while still Pending)
```

Approved and Rejected are final. **Withdrawn is also terminal** — the request can no longer be approved or rejected, and any reserved quota is released back to the employee's balance. HR may override Approved or Rejected (e.g., correcting a mistaken approval) but every override must be visible in the audit log; HR does not override Withdrawn (the employee re-submits a new request instead).

### 7.1 Routing (DEC-003 — replaces source §7.1)

- **Default approver:** the employee's `direct_manager_id`.
- **Skip-level allowed:** any ancestor in the org tree (manager's manager, etc.) MAY also approve a routed request. The approvals queue exposes two filters: *routed-to-me* (default) and *I-can-approve-via-chain*.
- **No direct manager set:** routes to the HR group.
- **Self-approval guard:** if the routed approver is the requester themselves, walk up to the first non-self ancestor; if exhausted → HR group.

Each user has exactly one `direct_manager_id` (nullable at top of tree). Fixtures must seed a small tree (e.g. CEO → 2 dept heads → leads → ICs).

### 7.2 Manager actions

A manager opens the approvals queue and sees, for each pending request:
- requester name + team,
- absence type and dates,
- remaining quota for the requester (so they can judge fairness),
- any soft warnings on the entry,
- any uploaded document (linked, if applicable; the actual validation is HR's responsibility, but the manager sees that something was attached).

The manager picks Approve or Reject; reject requires a free-text reason. The decision triggers an email to the employee. On approve, the quota is decremented immediately.

### 7.3 Withdrawal and cancellation

While the request is Pending, the employee can withdraw it from their own dashboard with one click. After approval, the employee can still *cancel* the absence (e.g. they no longer need the day off). Cancellation refunds the quota and writes an audit entry. Cancellation is allowed up to and including the day before the absence; cancelling on or after the absence date requires HR.

## 8. Documents

### 8.1 Upload

Paragraph, OCR and Special-leave requests require a document. Sickday, Vacation, PN do not (PN papers can be attached optionally by HR).

The employee uploads the document while filling out the absence form — drag-and-drop or file picker, common image and PDF types accepted. The document is linked to the absence entry the moment the request is submitted.

### 8.2 HR validation

HR has a dedicated "Pending documents" queue. Each entry shows the requester, absence type, dates, the file (preview), and a free-text reason field. HR approves or rejects.

- **Approve.** No further action needed; the absence proceeds through the normal manager-approval path.
- **Reject** *after* the absence is already manager-approved. The portal:
  1. Moves the absence to Rejected.
  2. Refunds the quota.
  3. Emails the employee with HR's reason.
  4. Writes an audit entry.

If the absence is still Pending when HR rejects the document, the portal flips it directly to Rejected without waiting for the manager.

## 9. Validation rules — full catalogue

The portal validates *every* worktime and absence submission with a consistent rule set. Hard rules block submission with an inline error; soft rules show a yellow warning but allow saving.

### 9.1 Hard rules

| ID | Rule | Plain-English explanation |
|---|---|---|
| H1 | No overlapping entries on the same day. | A new worktime block must not overlap an existing one. An absence must not overlap another absence in the same morning/afternoon slot. Worktime and an existing approved absence on the same day cannot coexist. |
| H2 | Sickday is full-day only. | The half-day option must be hidden / disabled for sickday. |
| H3 | Sickday quota cannot be exceeded. | If the employee already used 3 sickdays this year, a 4th is blocked. |
| H4 | Sickdays cannot be on consecutive calendar days. | If yesterday was a sickday, today cannot be — even if there are sickdays remaining. The user is told to take PN instead. |
| H5 | The relevant quota cannot be exceeded. | Vacation/Paragraph/OCR/Special are blocked when remaining < requested. |
| H6 | Worktime is forbidden on a day with an approved absence. | If the day already has an approved vacation/sickday/PN/etc., new worktime is blocked. To work that day, the employee must withdraw/cancel the absence first. |
| H7 | Overtime is forbidden during any absence. | Logical extension of H6. |
| H8 | Documents are required to *finalise* Paragraph/OCR/Special. | The submission can be saved without a doc, but the absence cannot reach Approved until HR has validated a document. |
| H9 | A full-day absence and worktime on the same day cannot coexist. | Stronger restatement of H6 in the case where the absence is already in the system. |
| H10 | Two absences cannot occupy the same morning/afternoon slot. | If the morning is already paragraph, a vacation half-day for the same morning is blocked. The afternoon slot is independent. |

### 9.2 Soft rules

| ID | Rule | Plain-English explanation |
|---|---|---|
| S1 | 30-minute gap between half-day absence and same-day worktime. | If a morning Paragraph ends at 12:00, worktime should not start before 12:30. Vice versa for afternoon absences. |
| S2 | Worktime is outside the working window 07:00-17:00. | Late or very-early hours are unusual; the portal flags but does not block. |
| S3 | Night-time work (between 22:00 and 06:00). | Same as S2 but escalated wording. |
| S4 | A single worktime entry exceeding 8 hours. | The system suggests splitting into morning + afternoon blocks. |
| S5 | Quota approaching limit. | Informational warning when a submission leaves only 0-2 days remaining for vacation, or exactly 1 sickday. |

### 9.3 Validation timing

Validation runs:
- when the user clicks Save on the form,
- when the user edits an existing entry,
- as a dry-run inside the year-rollover preview (so HR can see what would happen before pressing the button).

Soft warnings persist on the saved entry and are visible to the manager and to HR on every report and in the team calendar.

## 10. Notifications

Email is the only delivery channel for the MVP. Each event has a single template; the portal must not double-send (e.g. one email per recipient per event).

| Trigger | Recipients | What the email says |
|---|---|---|
| Vacation / Paragraph / OCR / Special / Overtime submitted | direct manager (or HR group if escalated) | "Approval needed: {employee} requests {type} for {dates}." + portal link |
| Approval decision | the employee who submitted | "Your {type} request was {approved/rejected}." + reason if rejected |
| Sickday logged | direct manager + same-team members + HR group | "{employee} on sickday {date}." |
| PN logged | direct manager + same-team members + HR group | "PN from {date_from}{ until {date_to}}." |
| Document uploaded | HR group | "New document for {employee} {type} {dates}." |
| Document validated | the document owner | "Document for {type} {dates} {approved/rejected}." + reason if rejected |
| Quota approaching | the employee + HR | "Vacation balance: {n} days left." |
| Year rollover summary (1 January) | every employee + HR | "Carried over: {n} days. Bonus lost: yes/no." |

The "same-team members" list is everyone whose `team` field equals the requester's team, excluding the requester. The HR group is the email distribution `hr-kosice@visma.com` plus every user holding the HR role.

## 11. Reports

### 11.1 Monthly HR export (CSV / XLSX)

One row per person per day. Columns:

`date | full_name | team | flag | hours | project_code | comment | errors`

`flag` uses the short codes mandated by the **external accounting system** that consumes this export for payroll and compliance purposes (see §1). The codes are fixed by that contract — teams must not invent or rename them:

- `PD` — worktime (Pracovný deň)
- `PC` — business trip (Pracovná cesta)
- `D` — vacation (Dovolenka)
- `SKD` — sickday
- `PN` — sick leave / paternity leave (DEC-010 deferred — may split to `PN` vs `OTC` later)
- `NL` — Paragraph (Návšteva lekára)
- `OČR` — OCR
- `SD` — special leave (Špeciálne dni)

`errors` is a comma-separated list of any soft warnings still present on the day's entries (or a leftover hard error if HR is replaying historical data with newer rules). DEC-011 deferred — escaping convention for inner commas open (RFC 4180 quoting recommended placeholder).

### 11.2 Team calendar (in-portal view)

Rows are team members, columns are days of the picked month. Each cell shows:
- absence type (colour-coded), or
- worktime hours total, or
- "BT" badge if any business-trip entry, or
- "Pending" badge if there is a pending approval routed to the manager.

The manager can click a cell to drill in.

### 11.3 Balances report (per-user)

For the picked year and user: every quota (statutory vacation, bonus vacation, sickday, paragraph, OCR) with allocated, used, carried-over, remaining, and a "bonus lost?" flag.

### 11.4 Pending approvals queue

Manager dashboard: every Pending request routed to them, sorted oldest first. HR dashboard: every Pending document.

### 11.5 Audit log

HR/Admin only. Filter by user, date, action. Every state change of an absence, approval, document, or quota is recorded with actor, timestamp, before / after snapshot.

### 11.6 Exceptions replay (Bonus tier — DEC-006)

**Behaviour, not mechanism.** The portal must surface submissions that *now* violate hard rules under current configuration; HR can review and act. Trigger mechanism is left to each team — scheduled job, on-config-change hook, on-demand button, or real-time recompute are all acceptable. Judges score on the resulting screen + correctness of flagged entries, not on how the recompute is wired.

## 12. Calendar handling

### 12.1 Public holidays

Slovak public holidays are imported once at setup time and cached in the portal. The Admin can edit the list to handle ad-hoc changes (e.g. moved holidays).

A worktime entry on a public holiday is allowed but produces a soft warning so HR can verify it was a deliberate choice.

### 12.2 Half-day time ranges

The portal uses fixed time ranges for half-day absences:
- Morning: 07:00 - 12:00
- Afternoon: 12:30 - 17:00

The 30-minute gap between the two windows is what makes the gap soft rule (S1) trivially satisfiable when the worktime is logged correctly. The user does not configure these ranges; the Admin can override globally if the company changes its working pattern.

### 12.3 Working window

Default working window is 07:00 - 17:00. Worktime outside this window does not block, only warns (S2).

## 13. Basic acceptance — what must work end-to-end on demo day

The senior + AI-assisted baseline. **All of the following are required and must pass the Gherkin acceptance scenarios in `acceptance/` before any Bonus axis is counted (DEC-004 + DEC-007).**

1. Admin creates teams, assigns managers (sets `direct_manager_id` on each user, building the org tree), invites users with roles. UI is polished, validates input, shows feedback.
2. **Mock login** — pick a user from the seeded list, no password. (Real auth — OIDC / magic-link / password+bcrypt — is **Bonus**, see §14, per DEC-005.)
3. Employee logs daily worktime: project optional, BT toggle, overtime auto-detect on entries > 8 h. Inline live validation as the user types, not just on submit.
4. Employee submits a vacation request → manager email → manager approves in portal → employee email → team calendar reflects the change → vacation balance decrements. The whole loop renders without page reloads.
5. Employee logs a sickday: every hard rule is enforced (full-day only, ≤ 3/year, no consecutive sickdays, working day only) → manager + team + HR are emailed. The block message is human-friendly and suggests the right alternative (e.g. "use PN").
6. Employee submits a Paragraph absence with a PDF → manager approves → HR validates the document. Reject path also works end-to-end: HR rejects, absence flips to Rejected, quota refunded, employee emailed, audit log updated.
7. Manager team calendar is a real grid: rows = team members, columns = days of current month, colour-coded cells, click-through to entry detail, pending-approval badges, BT badges. Switching months works.
8. Manager approvals queue is live: appears immediately on submission, supports approve / reject with a reason, decision propagates to the employee instantly. **Skip-level approve via chain** (DEC-003) works — an ancestor in the org tree can approve a request routed to a subordinate manager.
9. HR exports a monthly CSV and XLSX matching the column shape in §11.1. The XLSX has frozen header and column widths set sensibly.
10. HR documents queue is real: list of pending docs with file preview (image inline, PDF in iframe), approve / reject + reason, instant feedback to the employee.
11. Year-rollover dry-run on a fixture set produces correct outcomes for: leftover within limit (no bonus loss), leftover exceeding limit (bonus zeroed and excess lost), zero leftover. A button on the HR screen runs the rollover for real, with a confirmation modal and a side-by-side before/after preview.
12. Audit log screen for HR / Admin: filterable by user, action, date. Each row shows actor, before-snapshot, after-snapshot.
13. Notifications screen per user: every email the portal sent to me, in chronological order, with the rendered subject + body.
14. Quota & balances screen per user: every quota type with allocated / used / carried-over / remaining / lost-bonus flag, plus an annual usage chart by month.

## 14. Bonus tier — only counted if Basic ≥ 90% (DEC-004 + DEC-007)

Off-limits until every Basic scenario passes. Judges enforce the gate.

- **Real auth** — Google / Microsoft OIDC, magic-link email, or password + bcrypt (DEC-005).
- **§11.6 Exceptions replay** — surface submissions now violating hard rules under current config; trigger mechanism is the team's call (DEC-006).
- **Skip-level *policy* enforcement** — beyond DEC-003's permission, allow a configurable rule per team (e.g. vacation > 5 consecutive days requires both direct manager and skip-level).
- **Slack and/or Teams notification channels** alongside email. The dispatcher should be pluggable.
- **Calendar synchronisation.** Push approved absences to a shared Google or Outlook team calendar. Read-only is fine.
- **Public ICS feed** per team and per user, so people can subscribe in their own calendar app.
- **Mobile-friendly responsive UI.** The team calendar can degrade gracefully on phones; the absence form should work fully on mobile.
- **PWA or installable shell**, so employees can launch the portal as an app on their phone home screen.
- **Multi-language UI.** Slovak + English at minimum. The rule messages are user-visible and benefit most.
- **Tempo XLSX import.** Drop a historical Tempo export onto the HR screen, the portal ingests it, classifies entries with the new rule engine, shows the diff before committing.
- **HR bulk-edit of quotas** via uploaded CSV; preview diff before applying.
- **Manager analytics:** team-level absence patterns (heat map of absences by week), average approval latency, soft-warning hot spots.
- **Live websocket updates** so the manager's approvals queue updates without refresh when an employee submits.
- **Two-factor auth** for HR and Admin roles.
- **Rate limiting and basic audit-log tampering protection** (append-only table, hash chain).

## 15. Out of scope (do not attempt in 12 h, even with AI)

- Migration of *production* historical Tempo data with full data integrity.
- Multi-tenant SaaS architecture.
- Multi-country support beyond Slovak rules.
- Real Visma corporate SSO integration end-to-end including provisioning. (A generic OIDC flow against Google or Microsoft personal account is fair game and counts as Bonus per DEC-005.)
- Native iOS / Android apps.
- Offline mode with conflict resolution.

## 16. Open questions and chosen defaults

Tier placement (Basic vs Bonus) is now settled by DEC-004..006. Remaining defaults:

| # | Question | Default applied if a team does not address it |
|---|---|---|
| O1 | What auth mechanism for the demo? | **Mock login (Basic per DEC-005).** Real auth is Bonus. |
| O2 | "Same-team members" for sickday/PN notifications — same `team` only, or also project teammates? | Same `team` only. |
| O3 | What happens when an Approved absence is later cancelled by the employee? | Withdrawal allowed up to one day before; quota refunded; audit entry written. After that day, HR-only. |
| O4 | Half-day morning vs afternoon time ranges? | Morning 07:00 - 12:00, afternoon 12:30 - 17:00. |
| O5 | Should public holidays block worktime entries? | Soft warn only. |
| O6 | First-year prorated entitlement for new hires? | Out of MVP — full year entitlement on join. |
| O7 | Self-approving manager — escalate where? | Walk up org tree to first non-self ancestor; HR group if exhausted (DEC-003). |
| O8 | PN doctor's papers — uploaded by employee or HR? | Either is fine; the document attaches to the same PN entry. |

## 17. UX guidance — what "polished" means for senior + AI teams

- A landing page / dashboard for each role: Employee sees their balances, today's entry, pending requests; Manager sees the approvals queue and the team calendar; HR sees the documents queue, monthly export button, and configuration screens.
- An absence-submission form that picks the type first (because the rules differ per type), then surfaces the right fields (full vs half day, document upload if required).
- An always-visible "remaining balance" badge on the absence form, recomputed live as the user changes dates.
- Hard-rule errors render inline at the top of the form, in red, with the rule's plain-English message; soft warnings render in yellow and have a "Save anyway" button.
- The team calendar is a grid, one row per team member, one column per day, scroll-free for the current month on a normal laptop. Click-through opens the day's detail in a side panel without leaving the page.
- All emails sent by the portal also produce an in-portal record visible on a "My notifications" screen so the user can review history if their inbox lost an email.
- A keyboard shortcut to log today's worktime in two keystrokes.
- Empty states are designed (not blank panels) and tell the user what to do next.
- Loading states are skeleton screens, not spinners.
- Date fields default sensibly: today for "from", same as "from" for "to" until the user changes it.
- Forms preserve in-progress data across accidental navigation.

## 18. Suggested team split for the hackathon

Senior teams with AI tooling can run wider in parallel than the conservative split below. Adjust based on individual familiarity with the chosen stack.

If a team has 4-7 people:
- 1 — Identity, teams, mock auth (Basic) and/or real auth (Bonus), RBAC, admin console.
- 1 — Validation rules + quota math + year-rollover engine. (§9 + §6 are the spec.)
- 1-2 — Absence + approvals + documents flows, end-to-end including the email loop.
- 1 — Worktime + overtime + business trip + live form validation UX.
- 1 — Reports + team calendar grid + balances charts + audit log screen.
- 1 — Notifications dispatcher + in-portal notifications inbox + email-capture test harness, plus Bonus axes (Slack/ICS/calendar-sync) once Basic is green.

If a team has 2-3 people: build vertical slices in the order Identity + mock auth → Worktime → Vacation flow → Sickday flow → Paragraph + documents → Reports. Aim to finish one slice every ~2 hours so the demo has at least four end-to-end flows.

---

This document is the specification of the *product behaviour*. Implementation choices (programming language, database, UI framework, deployment, auth mechanism) are entirely up to each team.
