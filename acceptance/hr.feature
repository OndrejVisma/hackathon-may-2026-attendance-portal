# HR-facing scenarios. Actor = a user with the HR role.
# Tags: @basic / @bonus per DEC-004.

Feature: HR — documents queue, monthly export, audit log, quotas, exceptions replay (Bonus)

  Background:
    Given the seeded fixture users, teams, holidays and quotas for 2026 are loaded
    And I am logged in via mock login as HR user "HR1"

  # ---- Documents queue ----

  @basic @documents
  Scenario: Pending document appears in HR queue with file preview
    Given employee "Janka" has submitted a half-day Paragraph for "2026-05-12" with PDF "doctor.pdf"
    When I open the "Pending documents" queue
    Then I see Janka's entry with type "Paragraph", dates "2026-05-12 morning", and an inline PDF preview

  @basic @documents
  Scenario: Approving a document after manager approval finalises the absence
    Given Janka's Paragraph absence for "2026-05-12 morning" is "Pending HR document validation"
    And the manager has already Approved the absence
    When I Approve the document
    Then the absence status becomes "Approved"
    And Janka's Paragraph balance decrements by "0.5"
    And Janka receives a "Document validated" email

  @basic @documents
  Scenario: Rejecting a document after manager approval flips absence to Rejected and refunds quota
    Given Janka's Paragraph absence for "2026-05-12 morning" is in state "Approved (manager) / Pending document"
    And Janka's Paragraph balance has decremented by "0.5"
    When I Reject the document with reason "Illegible scan"
    Then the absence status becomes "Rejected"
    And Janka's Paragraph balance is refunded by "0.5"
    And Janka receives a "Document rejected" email containing the reason
    And an audit-log entry records the document rejection with actor "HR1" and the reason

  @basic @documents
  Scenario: Rejecting a document while absence is still Pending flips it directly to Rejected
    Given Janka's Paragraph absence is in status "Pending" with the manager approval not yet decided
    When I Reject the document
    Then the absence status becomes "Rejected" without waiting for the manager
    And no quota is decremented at any point

  # ---- Monthly export ----

  @basic @export
  Scenario: Monthly CSV export has the canonical column shape
    When I export the monthly report for "2026-04" as CSV
    Then the header row is exactly "date,full_name,team,flag,hours,project_code,comment,errors"
    And every employee has one row per calendar day in the period

  @basic @export
  Scenario: Monthly XLSX export has frozen header and sensible column widths
    When I export the monthly report for "2026-04" as XLSX
    Then the workbook has the header row frozen
    And every column width is set wide enough to render the longest sample value without clipping

  @basic @export
  Scenario: Flag codes match the canonical mapping in spec §11.1
    Given fixture entries exist for vacation, business trip, sickday, PN, paragraph, OCR, special leave
    When I export the monthly report for that month
    Then the rows use flags "D, PC, SKD, PN, NL, OČR, SD" respectively
    And worktime rows use flag "PD"

  # ---- Audit log ----

  @basic @audit
  Scenario: Audit log records every state change with before/after snapshots
    Given a vacation request transitions Pending -> Approved -> Cancelled in the seeded fixtures
    When I open the audit log filtered by that vacation
    Then I see three rows with actor, timestamp, and before/after snapshots for each transition

  @basic @audit
  Scenario: Audit log filters work
    When I filter the audit log by user "Anna" and date range "2026-07-01..2026-07-31"
    Then only rows where actor = "Anna" or target user = "Anna" within that range are shown

  # ---- Quotas ----

  @basic @quotas
  Scenario: HR overrides a per-user quota
    When I set Anna's "Statutory vacation 2026" allocation to "25"
    Then Anna's balance screen reflects "25 statutory" allocated
    And the change is recorded in the audit log

  @basic @quotas
  Scenario: HR can edit the default sickday allocation globally
    When I change the global sickday default from "3" to "4"
    Then employees newly onboarded inherit "4"
    And existing employees keep their per-user overrides

  # ---- HR override of approval state ----

  @basic @override
  Scenario: HR overrides an approval and the audit log captures it
    Given Anna has an Approved Vacation from "2026-07-13" to "2026-07-17"
    When I override the absence to status "Rejected" with reason "Booked over a freeze period"
    Then the absence status becomes "Rejected"
    And the audit log shows the override with my user id, reason, and before/after snapshots

  # ---- Bonus ----

  @bonus @exceptions-replay
  Scenario: Exceptions-replay surfaces past entries that now violate hard rules (DEC-006)
    Given the global sickday default has been reduced from "5" to "3" effective "2026-01-01"
    And employee "Peter" has 4 sickdays recorded in 2026 under the older rule
    When I open the Exceptions Replay screen
    Then I see Peter's 4th sickday flagged as "now violating H3 (sickday quota)"
    # Trigger mechanism (scheduled / on-config-change / on-demand button / real-time) is the team's call.

  @bonus @bulk-edit
  Scenario: HR bulk-edit quotas via uploaded CSV with diff preview
    Given I have a CSV with new statutory vacation allocations for 5 users
    When I upload the CSV to the HR quotas screen
    Then I see a per-user diff preview before any change is committed
    When I confirm
    Then the new allocations are applied and audit-logged
