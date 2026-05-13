---
team: ondrej-solo
members:
  - name: Ondrej Šimon
    email: ondrej.simon@visma.com
    github: OndrejVisma
    role: FE
stack:
  frontend: angular
  backend: .NET
  database: PostgreSQL
---

# ondrej-solo

Solo Frontend delivery for the Visma Košice hackathon, May 13 2026.

## Build / run

```bash
# 1. Mock backend (Docker)
cd ../hackathon-may-2026-attendance-portal/dev-extras/integration/mock-server
docker compose up -d
# → http://localhost:4010/api/v1

# 2. Frontend (Angular 19)
cd attendance-portal-fe
npm ci
npm start
# → http://localhost:4200  (or 4300 if 4200 is busy)
```

## Stack

- Angular 19 (standalone components, signals, control-flow blocks, deferrable views)
- TanStack Query for server state (no NgRx)
- Luxon for Europe/Bratislava-aware date math
- Zod (at API boundary, future) + openapi-typescript for generated types
- ReactiveForms with FormBuilder
- Playwright + axe-core for E2E + a11y gate
- Custom HTTP interceptor stack (auth Bearer, error envelope, retry with exp backoff)

## Scope cuts (intentional)

- **Backend not implemented** — talks to the hackathon mock server.
- **Calendar uses a custom CSS-Grid table**, not angular-calendar/FullCalendar (smaller bundle).
- **i18n catalogue infra not wired** — strings are inline; SK + EN are stub-mapped in `ABSENCE_LABEL`. `@angular/localize` deferred.
- **Real OIDC, PWA, websockets, email channel, ETag round-trip** — bonus axes, deferred for Basic ≥ 90%.

## Architecture

Feature-folder layering per FE refinement §21:

```
src/
├── app/                          # shell, routing, providers
├── features/{auth, worktime, absences, approvals, documents, reports, notifications, admin}/
│   └── { presentation | domain | infrastructure }/
└── shared/{ ui, http, result, logging, tokens }/
```

`domain/` is framework-agnostic — no `@angular/*` imports (enforced by ESLint `no-restricted-imports`).

## Eval entrypoint

`make eval` chains: install → lint → type-check → test → build → e2e.
Declared in `eval-meta.yaml`.
