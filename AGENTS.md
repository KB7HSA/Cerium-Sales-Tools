# AGENTS.md

## Cursor Cloud specific instructions

This repo is **Cerium Sales Tools**: an Angular 21 frontend (repo root) plus a
Node.js/Express + MSSQL backend (`backend/`). The two run as separate dev servers.

### Services & how to run them (dev)

| Service | Dir | Run command | Port |
|---|---|---|---|
| Angular frontend | repo root | `npm start` (`ng serve`) | 4200 |
| Express backend | `backend/` | `npm run dev` (`ts-node src/server.ts`) | 3000 |

The frontend dev config (`src/environments/environment.ts`) points the API at
`http://localhost:3000/api`, so run both for the full app.

### Backend `.env` is REQUIRED to boot (non-obvious)

`backend/src/middleware/auth.middleware.ts` calls `process.exit(1)` at import time
if `AZURE_AD_TENANT_ID` / `AZURE_AD_CLIENT_ID` are unset. `backend/.env` is
**gitignored**, so it must be created locally before `npm run dev` will start.
Copy `backend/.env.example` and add the two Azure AD vars (values mirror
`src/environments/environment.ts`):

```
AZURE_AD_TENANT_ID=aec55451-6c83-4a80-ae9f-72e78ac152c5
AZURE_AD_CLIENT_ID=712b4eda-bfde-4a28-90d2-aa645d4c6977
```

The backend boots **without** a DB connection — `getConnectionPool()` failures are
caught and the server logs a warning; DB-dependent routes then error/return 503.
So you do not need the database to start the server or hit `GET /api/health`.

### External blockers (cannot be resolved inside the VM)

- **Azure SQL DB**: `ceriumdemo.database.windows.net` is reachable but rejects the
  VM's egress IP via Azure firewall (`Client with IP ... is not allowed`), and the
  real `DB_PASSWORD` is not in the repo. Both are needed for any DB-backed flow
  (customers, quotes, labor items, admin, etc.). Resolving requires adding the IP
  to the Azure SQL firewall and supplying the real password.
- **Microsoft 365 SSO**: every app route except `/signin` is gated by MSAL
  (`msAuthGuard`). Reaching the dashboard requires a real Microsoft 365 account.
  The sign-in flow itself works: clicking "Sign in with Microsoft 365" redirects
  to `login.microsoftonline.com` correctly.

### Testing / lint / build

- Backend unit tests are a **custom ts-node runner**, not jest. Run with
  `cd backend && npx ts-node tests/usac470.service.test.ts`. `npm test` (jest) is
  not configured (no ts-jest preset) and fails — use the ts-node command instead.
- Backend build: `cd backend && npm run build` (`tsc`).
- Frontend build: `npm run build` (`ng build`); dev compile happens via `npm start`.
- There is **no lint script** (no angular-eslint installed); `npm run lint` / `ng lint` are unavailable.
