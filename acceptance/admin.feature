# Admin-facing scenarios. Actor = a user with the Admin role.
# Tags: @basic / @bonus per DEC-004.

Feature: Admin — users, teams, org tree, public holidays

  Background:
    Given an empty database with the seeded Slovak public holidays for 2026
    And I am logged in via mock login as Admin "Admin1"

  # ---- Users + roles ----

  @basic @users
  Scenario: Admin invites a user with multiple roles
    When I invite "newuser@visma.com" with roles "Employee, Manager"
    Then the user appears in the user list with both roles
    And the user can log in via mock login

  @basic @users
  Scenario: Roles can be revoked without deleting the user
    Given user "Peter" has roles "Employee, Manager"
    When I revoke Peter's "Manager" role
    Then Peter's roles are reduced to "Employee"
    And Peter no longer sees the approvals queue

  # ---- Teams + org tree (DEC-003) ----

  @basic @teams
  Scenario: Admin creates teams and assigns members
    When I create team "Platform" and assign users "LeadA1, Anna, Peter"
    Then the team list shows "Platform" with 3 members
    And the team calendar for "Platform" lists the same 3 members

  @basic @org-tree
  Scenario: Admin sets direct_manager_id to build the org tree
    When I set Anna's direct_manager to "LeadA1"
    And I set LeadA1's direct_manager to "DeptHeadA"
    And I set DeptHeadA's direct_manager to "CEO"
    Then Anna's approval chain (in order) is "LeadA1, DeptHeadA, CEO"

  @basic @org-tree @hard
  Scenario: Cycles in the org tree are blocked
    Given DeptHeadA's direct_manager is "CEO"
    When I attempt to set CEO's direct_manager to "DeptHeadA"
    Then the change is blocked with a hard error stating a cycle is not permitted

  @basic @org-tree
  Scenario: Removing a manager link routes affected employees to HR group as fallback
    Given Anna's direct_manager is "LeadA1"
    When I clear Anna's direct_manager
    Then any new approval Anna submits routes to the HR group (per DEC-003 §7.1)

  # ---- Public holidays ----

  @basic @holidays
  Scenario: Admin edits the public-holiday list
    Given the seeded calendar lists "2026-01-01" as a public holiday
    When I add "2026-09-01" as a public holiday and remove "2026-12-26"
    Then sickday submissions on "2026-09-01" are blocked as non-working day
    And worktime entries on "2026-12-26" no longer trigger the public-holiday soft warning

  @basic @holidays
  Scenario: Admin imports a CSV of public holidays
    Given a CSV listing 12 Slovak public holidays for 2026
    When I import the CSV
    Then all 12 dates appear in the public-holiday list

  # ---- Bonus ----

  @bonus @2fa
  Scenario: Admin must use 2FA on next login
    Given my account has 2FA enrolled
    When I attempt to log in
    Then the system requires a TOTP code in addition to credentials
