# Mainstream

A design collaboration platform for internal teams to share work, organize into streams, and create AI-powered newsletters.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-Self--Hosted-green)
![License](https://img.shields.io/badge/License-Private-red)

## Features

- 📸 **Asset Sharing** - Upload images, GIFs, WebM videos, and Figma/Loom embeds
- 🏷️ **Streams** - Organize content with many-to-many relationships
- 🔒 **Private Streams** - Add members with role-based access (owner/admin/member)
- ✏️ **Stream Editing** - Edit name, description, and privacy settings
- 💬 **Comments & Likes** - Real-time engagement with notifications
- 👥 **Following** - Follow users and streams for a personalized feed
- 📰 **Drops** - AI-powered newsletters with block-based editor
- 🗑️ **Draft Management** - Delete drafts from cards or editor
- 🤖 **AI Descriptions** - Auto-generate descriptions using LiteLLM
- 🔐 **Authentication** - Secure signup/login with Supabase Auth
- 👁️ **View Tracking** - "Seen by X people" with viewer tooltips
- 🔔 **Notification Settings** - Toggle notifications by type

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### 1. Clone and Install

```bash
git clone <your-repo-url> mainstream
cd mainstream
npm install
```

### 2. Start Local Supabase

```bash
cd supabase-docker
docker-compose up -d
cd ..
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your local Supabase values:

```env
# Supabase (local)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# AI (optional - for description generation)
LITELLM_BASE_URL=https://your-litellm-instance
LITELLM_API_KEY=your-key
LITELLM_MODEL=gemini/gemini-2.5-flash-preview-05-20

# Email (optional - for Drops email delivery)
RESEND_API_KEY=your-resend-key
```

### 4. Run Migrations

```bash
# Run all migrations in order
for f in scripts/migrations/*.sql; do
  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f "$f"
done
```

Or run individually:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f scripts/migrations/001_initial_schema.sql \
  -f scripts/migrations/002_seed_data.sql
  # ... continue through 033
```

### 5. Start Development Server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Self-Hosting Guide

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Server (VPS)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │       Nginx / Caddy (Reverse Proxy + SSL)             │  │
│  └───────────────────────────────────────────────────────┘  │
│              │                           │                  │
│              ▼                           ▼                  │
│  ┌─────────────────────┐     ┌─────────────────────────┐   │
│  │    Next.js App      │     │   Supabase (Docker)     │   │
│  │   (Node/Docker)     │     │   ├── PostgreSQL        │   │
│  │                     │     │   ├── Auth (GoTrue)     │   │
│  │   Port 3000         │     │   ├── Storage           │   │
│  │                     │     │   ├── Realtime          │   │
│  │                     │     │   └── PostgREST         │   │
│  └─────────────────────┘     └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Minimum Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM      | 4 GB    | 8 GB        |
| CPU      | 2 vCPU  | 4 vCPU      |
| Storage  | 40 GB   | 100 GB SSD  |
| OS       | Ubuntu 22.04 / Debian 12 |

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 2: Self-Host Supabase

```bash
# Clone Supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy and configure environment
cp .env.example .env
```

Edit `.env` with secure values:

```env
############
# Secrets - GENERATE NEW VALUES FOR PRODUCTION
############
POSTGRES_PASSWORD=<generate-secure-password>
JWT_SECRET=<generate-32-char-secret>
ANON_KEY=<generate-with-supabase-cli>
SERVICE_ROLE_KEY=<generate-with-supabase-cli>

############
# General
############
SITE_URL=https://your-domain.com
API_EXTERNAL_URL=https://api.your-domain.com

############
# Auth
############
GOTRUE_SITE_URL=https://your-domain.com
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=false

############
# SMTP (for auth emails)
############
GOTRUE_SMTP_HOST=smtp.your-provider.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your-smtp-user
GOTRUE_SMTP_PASS=your-smtp-password
GOTRUE_SMTP_SENDER_NAME=Mainstream
```

Generate secure keys:

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate Supabase keys (requires supabase CLI)
npm install -g supabase
supabase gen keys --jwt-secret <your-jwt-secret>
```

Start Supabase:

```bash
docker compose up -d

# Check status
docker compose ps
```

### Step 3: Deploy Next.js App

```bash
# Clone your app
cd ~
git clone <your-repo-url> mainstream
cd mainstream

# Install dependencies
npm ci --production

# Build
npm run build
```

Create production environment file:

```bash
nano .env.production
```

```env
# Supabase (your self-hosted instance)
NEXT_PUBLIC_SUPABASE_URL=https://api.your-domain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# AI (optional)
LITELLM_BASE_URL=https://your-litellm-instance
LITELLM_API_KEY=your-key
LITELLM_MODEL=gemini/gemini-2.5-flash-preview-05-20

# Email (optional)
RESEND_API_KEY=your-resend-key
```

Start with PM2:

```bash
pm2 start npm --name "mainstream" -- start
pm2 save
pm2 startup  # Follow the instructions to enable on boot
```

### Step 4: Configure Nginx (Reverse Proxy + SSL)

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Create Nginx config:

```bash
sudo nano /etc/nginx/sites-available/mainstream
```

```nginx
# Main app
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Supabase API
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/mainstream /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificates
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

### Step 5: Run Database Migrations

```bash
# Connect to your production database
psql "postgresql://postgres:<password>@localhost:5432/postgres"

# Run migrations
\i scripts/migrations/001_create_users.sql
\i scripts/migrations/002_create_assets.sql
# ... continue through 033
```

Or run all at once:

```bash
for f in scripts/migrations/*.sql; do
  psql "postgresql://postgres:<password>@localhost:5432/postgres" -f "$f"
done
```

### Step 6: Configure Storage Bucket

Access Supabase Studio at `http://your-server-ip:3000` (default port) or through your proxy.

1. Go to **Storage**
2. Create a bucket named `assets`
3. Set the bucket policy to allow authenticated uploads

---

## Alternative: Docker Compose for Everything

Create a single `docker-compose.yml` for both Supabase and the app:

```yaml
version: '3.8'

services:
  mainstream:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=http://kong:8000
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
    depends_on:
      - kong

  # Include all Supabase services from their docker-compose.yml
  # See: https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `LITELLM_BASE_URL` | No | LiteLLM API endpoint |
| `LITELLM_API_KEY` | No | LiteLLM API key |
| `LITELLM_MODEL` | No | LLM model (default: gemini/gemini-2.5-flash) |
| `RESEND_API_KEY` | No | Resend API key for email delivery |
| `FIGMA_ACCESS_TOKEN` | No | Figma Personal Access Token (for frame thumbnails) |
| `ENCRYPTION_KEY` | No | AES-256 key for encrypting sensitive tokens |

### .env.example

Copy this to `.env.local` for development or `.env.production` for production:

```env
# ===========================================
# Mainstream Environment Variables
# ===========================================

# ===========================================
# Supabase (Required)
# ===========================================
# For local development with supabase-docker:
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# 
# For self-hosted production:
# NEXT_PUBLIC_SUPABASE_URL=https://api.your-domain.com

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ===========================================
# AI Integration (Optional)
# ===========================================
# Used for AI-generated descriptions and Drop summaries
# Requires a LiteLLM instance or compatible OpenAI API

LITELLM_BASE_URL=
LITELLM_API_KEY=
LITELLM_MODEL=gemini/gemini-2.5-flash-preview-05-20

# ===========================================
# Email (Optional)
# ===========================================
# Used for sending Drops as email newsletters
# Sign up at https://resend.com

RESEND_API_KEY=

# ===========================================
# Figma Integration (Optional)
# ===========================================
# Used for generating frame-specific thumbnails
# Get from: Figma > Settings > Personal Access Tokens

FIGMA_ACCESS_TOKEN=

# ===========================================
# Security (Optional)
# ===========================================
# Used for encrypting sensitive tokens in database
# Generate with: openssl rand -base64 32

ENCRYPTION_KEY=
```

---

## Database Migrations

Migrations are in `scripts/migrations/` and should be run in order:

| Migration | Description |
|-----------|-------------|
| 001-017 | Core tables (users, assets, streams, likes, comments, etc.) |
| 018 | Drops table (AI newsletters) |
| 019-020 | Drop post display modes |
| 021 | Drop blocks (Notion-like editor) |
| 022 | Image gallery blocks |
| 023 | Auth user trigger (auto-create public.users) |
| 024 | RLS policies for assets |
| 025 | Asset visibility (public/unlisted) |
| 026 | Video asset type (WebM support) |
| 027 | Loom embed support |
| 028 | User notification settings |
| 029-030 | View count RPC functions |
| 031 | Stream members table |
| 032 | Stream members RLS policies |
| 033 | Streams RLS for members visibility |

---

## Backups

### Database Backup

```bash
# Create backup
pg_dump "postgresql://postgres:<password>@localhost:5432/postgres" > backup_$(date +%Y%m%d).sql

# Restore from backup
psql "postgresql://postgres:<password>@localhost:5432/postgres" < backup_20240101.sql
```

### Automated Backups (Cron)

```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * pg_dump "postgresql://postgres:password@localhost:5432/postgres" > /backups/mainstream_$(date +\%Y\%m\%d).sql
```

---

## Monitoring

### PM2 Monitoring

```bash
pm2 status          # Check app status
pm2 logs mainstream # View logs
pm2 monit           # Real-time monitoring
```

### Docker Monitoring

```bash
docker compose ps   # Supabase services status
docker compose logs # View all logs
docker stats        # Resource usage
```

---

## Troubleshooting

### Common Issues

**App won't start:**
```bash
pm2 logs mainstream --lines 100  # Check logs
npm run build  # Ensure build succeeds
```

**Database connection failed:**
```bash
docker compose ps  # Ensure Supabase is running
psql "postgresql://postgres:password@localhost:5432/postgres" -c "\dt"  # Test connection
```

**Storage uploads fail:**
- Check bucket exists in Supabase Studio
- Verify RLS policies allow authenticated uploads
- Check `SUPABASE_SERVICE_ROLE_KEY` is set

**Auth emails not sending:**
- Verify SMTP settings in Supabase `.env`
- Check `GOTRUE_MAILER_AUTOCONFIRM` setting

---

## Documentation

See the `docs/` folder for detailed documentation:

- [Getting Started](./docs/ONBOARDING.md)
- [Supabase Setup](./docs/SUPABASE_SETUP.md)
- [Streams Feature](./docs/STREAMS_FEATURE.md)
- [Drops Feature](./docs/DROPS_FEATURE.md)
- [AI Agent Guide](./docs/AI_AGENT_GUIDE.md)

---

## License

Private - Internal use only.

