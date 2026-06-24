# Ubuntu 24.04 VM Deployment Guide

Deploy Cerium Sales Tools as a self-hosted application on an Ubuntu 24.04 virtual machine.

## Architecture

```
Internet / LAN
     │
     ▼
  Nginx (:80 / :443)
     ├── /          → Angular static files (dist/ng-tailadmin/browser)
     └── /api/*     → Node.js backend (:3000)
                           │
                           ▼
                    SQL Server (:1433)
                    (Docker container or Azure SQL)
```

## Prerequisites

- Ubuntu 24.04 LTS VM (2+ vCPU, 4+ GB RAM recommended)
- A domain name or static IP (optional; use VM IP for LAN-only deployments)
- Azure AD app registration (for Microsoft 365 sign-in)
- Outbound internet for npm packages and (optionally) Azure SQL

## Quick deploy (recommended)

Run as a user with `sudo` access:

```bash
git clone <your-repo-url> /opt/cerium-sales-tools
cd /opt/cerium-sales-tools
sudo bash deploy/ubuntu/install.sh
```

The installer will:

1. Install Node.js 22, nginx, Docker (for SQL Server), and sqlcmd tools
2. Start SQL Server in Docker and apply `db/mssql-schema.sql` + triggers
3. Build the frontend and backend
4. Configure systemd + nginx
5. Prompt for secrets (DB password, Azure AD IDs, public URL)

## Step-by-step

### 1. Install system packages

```bash
sudo bash deploy/ubuntu/install-prerequisites.sh
```

### 2. Database options

#### Option A — Local SQL Server in Docker (recommended for VM)

```bash
sudo bash deploy/ubuntu/setup-database-docker.sh
```

This creates a `cerium-mssql` container on port 1433 and loads the schema.

#### Option B — Azure SQL Server

Skip Docker setup. In `backend/.env` set:

```env
DB_HOST=your-server.database.windows.net
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_CERT=false
```

Add the VM's public IP to the Azure SQL firewall rules.

### 3. Configure environment

```bash
cp deploy/ubuntu/env.production.example backend/.env
nano backend/.env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DB_HOST` | `localhost` (Docker) or Azure SQL hostname |
| `DB_PASSWORD` | SQL Server SA / app user password |
| `DB_NAME` | `CeriumSalesTools` |
| `SERVER_HOST` | `127.0.0.1` (nginx proxies externally) |
| `CORS_ORIGIN` | Public app URL, e.g. `http://203.0.113.10` |
| `AZURE_AD_TENANT_ID` | Azure AD tenant |
| `AZURE_AD_CLIENT_ID` | Azure AD app client ID |

Update production frontend config before building:

```bash
nano src/environments/environment.prod.ts
# Set apiUrl to your public URL + /api
# Set azureAd.redirectUri to your public URL
```

### 4. Build and install services

```bash
sudo bash deploy/ubuntu/build-and-deploy.sh
```

### 5. Verify

```bash
curl http://localhost/api/health
curl -I http://localhost/
sudo systemctl status cerium-backend nginx
```

## Service management

```bash
# Backend API
sudo systemctl restart cerium-backend
sudo journalctl -u cerium-backend -f

# Web server
sudo systemctl reload nginx

# SQL Server (Docker)
docker logs -f cerium-mssql
```

## TLS / HTTPS

For production, terminate TLS with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example.com
```

Then update `CORS_ORIGIN`, `environment.prod.ts`, and the Azure AD redirect URI to use `https://`.

## Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `401` on API routes | Sign in via Microsoft 365; health check is public |
| DB connection errors | Check `backend/.env`, SQL container (`docker ps`), firewall |
| CORS errors | Match `CORS_ORIGIN` to the browser URL exactly |
| Blank page after deploy | Confirm `dist/ng-tailadmin/browser` exists; check nginx error log |
| Auth middleware FATAL on start | Set `AZURE_AD_TENANT_ID` and `AZURE_AD_CLIENT_ID` in `.env` |

## Files in this directory

| File | Purpose |
|------|---------|
| `install.sh` | Full automated installer |
| `install-prerequisites.sh` | Node.js, nginx, Docker, sqlcmd |
| `setup-database-docker.sh` | SQL Server container + schema |
| `build-and-deploy.sh` | Build app, install systemd + nginx |
| `cerium-backend.service` | systemd unit for the API |
| `nginx-cerium.conf` | Reverse proxy + static file serving |
| `env.production.example` | Production `.env` template |
