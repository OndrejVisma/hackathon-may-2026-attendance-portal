# Mock Server — Attendance Portal API

Stateful in-memory mock implementing the Basic-tier surface of [`../api-reference.yaml`](../api-reference.yaml). Use it when you're building a **frontend-only assignment** and need a backend to integrate against without writing one yourself.

> **Not the real backend.** This mock skips persistence, hardens nothing, ignores most soft warnings, and stubs the XLSX export at `501`. Behaviour close enough for FE dev; not a reference implementation.

## Quick start

### Node (local)

```bash
cd dev-extras/integration/mock-server
npm install
npm start          # http://localhost:4010/api/v1
```

### Docker

```bash
cd dev-extras/integration/mock-server
docker compose up --build
```

### Make target (from repo root)

```bash
make mock          # see ../../../Makefile-style targets are out of scope; use npm start
```

## Authentication

The mock ships with **pre-seeded session tokens** so you can skip the login dance during early development:

| Token | User | Roles |
|-------|------|-------|
| `dev-employee` | Anna Mrkvička (`u-ic-anna`) | employee |
| `dev-manager` | Peter Kováč (`u-lead-platform`) | employee, manager |
| `dev-hr` | Lucia Tichá (`u-hr`) | employee, hr |
| `dev-admin` | Karol Veľký (`u-admin`) | employee, admin |

Send any of them as `Authorization: Bearer dev-employee`.

For the realistic mock-login path:

```bash
curl -X POST http://localhost:4010/api/v1/auth/mock-login \
  -H 'content-type: application/json' \
  -d '{"user_id": "u-ic-anna"}'
# → { access_token, token_type: "Bearer", expires_in }
```

Then use that token on every other route.

## Seeded data

- **12 users** in a 3-level org tree (CEO → 2 dept heads → 2 leads → 5 ICs) plus a dedicated HR user and Admin user.
- **3 teams**: `team-platform`, `team-apps`, `team-data`.
- **15 Slovak public holidays** for 2026.
- **6 sample absences** (vacation approved, sickday approved, PN in progress, paragraph pending half-day, vacation pending, OCR pending).
- **A couple of worktime entries** in May 2026 for every IC so the calendar isn't empty.

## What it implements

| Spec section | Mock fidelity |
|--------------|---------------|
| `POST /auth/mock-login` | Real — seeded users only. |
| `/me`, `/me/balances`, `/me/notifications`, `/me/data-export`, `/me/deletion-request` | Real. |
| Absence lifecycle (`Draft → Pending/Approved → Approved/Rejected/Withdrawn/Cancelled`) | Real state machine. Sickday/PN/paternity bypass Pending per §7. Withdraw / cancel rules per §7.3. |
| `GET /approvals` + approve/reject | Real, including skip-level (`scope=chain`) and HR (`scope=hr`). |
| Worktime CRUD + overtime auto-flag + soft warnings (S2/S3/S4) | Real. |
| Documents upload (multipart, MIME-checked, 10MB cap), HR validate | File **bytes discarded** — only metadata persists. HR rejection cascades to absence rejection per §8.2. |
| Calendar grid | Real, derived from absences + worktime + holidays. |
| Balances (computed view per §6.5) | Real for sum/reserved/used/remaining; carry-over is stubbed at 0. |
| Audit log | Real for every state change Submit/Approve/Reject/Withdraw/Cancel/HR-Override/Document-*. |
| Admin (users, teams, holidays, quota-config) | Real for read + update. Cycle detection on `direct_manager_id`. |
| Year rollover preview / apply | **Stub** — preview returns a believable shape; apply is a no-op. |
| Monthly XLSX export | **501 Not Implemented** — out of scope for FE testing. |
| Hard rules (H1–H10) | **Not enforced** — happy path only. FE should still display soft warnings the server returns. |

## What it does NOT implement

- Real OIDC / magic-link auth (the OpenAPI `oidcAuth` scheme is documented for Bonus only).
- Hard-rule enforcement (H1–H10). Treat the mock as optimistic; rely on your real backend or your own client-side validation.
- XLSX export.
- Email / Slack / Teams / ICS / calendar-sync dispatchers (Bonus tier).
- Persistence — **state is in memory and resets on restart**.
- Schema-level request validation. Send garbage, get inconsistent results.

## Prism escape hatch (purely stateless, no install)

If you want a zero-state OpenAPI mock straight from the spec — useful for type/shape smoke tests — run Prism on the contract:

```bash
npm run prism      # http://localhost:4011
```

This serves `../api-reference.yaml` with `--dynamic` example generation. No state, no fixtures, but always in sync with the contract.

## Common workflows

### 1. List my absences

```bash
curl http://localhost:4010/api/v1/absences \
  -H 'authorization: Bearer dev-employee'
```

### 2. Submit a vacation request

```bash
# 1) create the draft
curl -X POST http://localhost:4010/api/v1/absences \
  -H 'authorization: Bearer dev-employee' -H 'content-type: application/json' \
  -d '{"type":"vacation","date_from":"2026-08-10","date_to":"2026-08-14"}'

# → returns { id: "abc-…", state: "draft", … }

# 2) submit it
curl -X POST http://localhost:4010/api/v1/absences/<id>/submit \
  -H 'authorization: Bearer dev-employee'
```

### 3. Manager approves

```bash
curl http://localhost:4010/api/v1/approvals \
  -H 'authorization: Bearer dev-manager'

curl -X POST http://localhost:4010/api/v1/approvals/<absence_id>/approve \
  -H 'authorization: Bearer dev-manager'
```

### 4. HR sees the documents queue

```bash
curl 'http://localhost:4010/api/v1/approvals?scope=hr' \
  -H 'authorization: Bearer dev-hr'
```

### 5. Calendar grid for the platform team

```bash
curl 'http://localhost:4010/api/v1/calendar?team_id=team-platform&from=2026-05-01&to=2026-05-31' \
  -H 'authorization: Bearer dev-manager'
```

## Reset state

Restart the container / process — `seed()` runs again on boot.
