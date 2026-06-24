# Local Development Setup

Cerium Sales Tools is an Angular 21 frontend with a Node.js/Express backend and Microsoft SQL Server database.

## Requirements

| Component | Version |
|-----------|---------|
| Node.js | 20+ (22 recommended) |
| npm | 10+ |
| SQL Server | Azure SQL or local (Docker on Linux) |

## Automated setup

```bash
bash scripts/setup-dev.sh
```

## Manual setup

### 1. Install dependencies

```bash
npm install
cd backend && npm install && cd ..
```

### 2. Configure backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

- **Database**: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- **Azure AD** (required — backend exits without these):
  - `AZURE_AD_TENANT_ID`
  - `AZURE_AD_CLIENT_ID`
  - Must match `src/environments/environment.ts` → `azureAd`

For Azure SQL, add your client IP to the server firewall in the Azure Portal.

For local SQL Server on Linux:

```bash
sudo bash deploy/ubuntu/setup-database-docker.sh
# Then set DB_HOST=localhost, DB_USER=sa, DB_TRUST_CERT=true
```

### 3. Build backend

```bash
cd backend && npm run build
```

### 4. Start servers

**Terminal 1 — API (port 3000):**

```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend (port 4200):**

```bash
npm start
```

### 5. Verify

```bash
curl http://localhost:3000/api/health
# {"success":true,"message":"Health check passed",...}

open http://localhost:4200
```

Test database connectivity:

```bash
cd backend && npx ts-node test-db-connection.ts
```

> Most API routes require Microsoft 365 authentication. `/api/health` is public.

## npm scripts

| Script | Description |
|--------|-------------|
| `npm start` | Angular dev server |
| `npm run build` | Production frontend build |
| `npm run backend:dev` | Backend with ts-node |
| `npm run backend:build` | Compile backend TypeScript |
| `npm run backend:start` | Run compiled backend |

## VM deployment (Ubuntu 24.04)

See [deploy/ubuntu/README.md](deploy/ubuntu/README.md) for full production deployment with nginx, systemd, and optional Docker SQL Server.

Quick path on a fresh Ubuntu 24.04 VM:

```bash
sudo bash deploy/ubuntu/install.sh
```

## Common issues

| Issue | Solution |
|-------|----------|
| `FATAL: AZURE_AD_TENANT_ID...` | Set Azure AD vars in `backend/.env` |
| Azure SQL firewall error | Add your IP in Azure Portal → SQL Server → Networking |
| CORS errors | Set `CORS_ORIGIN=http://localhost:4200` in `backend/.env` |
| `401` on data APIs | Expected without Microsoft sign-in |
