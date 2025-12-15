# Mainstream

A design collaboration platform for internal teams to share work, organize into streams, and create AI-powered newsletters.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Supabase](https://img.shields.io/badge/Supabase-Self--Hosted-green)
![React](https://img.shields.io/badge/React-19-61DAFB)

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
- 👑 **Admin Panel** - Platform administration with role management

---

## Table of Contents

1. [Quick Start (Local Development)](#quick-start-local-development)
2. [Self-Hosting Guide](#self-hosting-guide)
3. [Environment Variables](#environment-variables-reference)
4. [Database Migrations](#database-migrations)
5. [File Storage](#file-storage)
6. [Backups](#backups)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git
- PostgreSQL client (`psql`)

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

Wait ~30 seconds for services to start, then verify:

```bash
docker-compose -f supabase-docker/docker-compose.yml ps
```

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase (local) - Get these from supabase-docker/.env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Optional: AI features
LITELLM_BASE_URL=https://your-litellm-instance
LITELLM_API_KEY=your-key
LITELLM_MODEL=gemini/gemini-2.5-flash

# Optional: Encryption for sensitive tokens
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
```

### 4. Run Database Migrations

```bash
# Run all migrations in order
for f in scripts/migrations/*.sql; do
  echo "Running $f..."
  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f "$f"
done
```

### 5. Create Upload Directory

```bash
mkdir -p public/uploads/{full,medium,thumbnails}
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Self-Hosting Guide

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Server (VPS)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │       Nginx / Caddy (Reverse Proxy + SSL)             │  │
│  │       - your-domain.com → Next.js (3000)              │  │
│  │       - api.your-domain.com → Supabase (8000)         │  │
│  └───────────────────────────────────────────────────────┘  │
│              │                           │                  │
│              ▼                           ▼                  │
│  ┌─────────────────────┐     ┌─────────────────────────┐   │
│  │    Next.js App      │     │   Supabase (Docker)     │   │
│  │   (PM2 / Docker)    │     │   ├── PostgreSQL :5432  │   │
│  │                     │     │   ├── Kong API :8000    │   │
│  │   Port 3000         │     │   ├── Auth (GoTrue)     │   │
│  │                     │     │   ├── Realtime          │   │
│  │   File Storage:     │     │   └── PostgREST         │   │
│  │   /public/uploads/  │     │                         │   │
│  └─────────────────────┘     └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Minimum Server Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM      | 4 GB    | 8 GB        |
| CPU      | 2 vCPU  | 4 vCPU      |
| Storage  | 50 GB SSD | 100+ GB SSD |
| OS       | Ubuntu 22.04 LTS / Debian 12 |

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl git wget htop

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version  # Should be v20.x
docker --version
docker compose version

# Install PM2 (Node.js process manager)
sudo npm install -g pm2
```

### Step 2: Set Up Supabase

#### Option A: Using Official Supabase Docker

```bash
# Clone Supabase
cd /opt
sudo git clone --depth 1 https://github.com/supabase/supabase
sudo chown -R $USER:$USER supabase
cd supabase/docker

# Configure environment
cp .env.example .env
```

Edit `.env` with secure values:

```env
############
# SECRETS - GENERATE NEW VALUES!
############
POSTGRES_PASSWORD=<generate: openssl rand -base64 24>
JWT_SECRET=<generate: openssl rand -base64 32>
ANON_KEY=<generate with supabase CLI - see below>
SERVICE_ROLE_KEY=<generate with supabase CLI - see below>
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=<strong-password>

############
# URLs
############
SITE_URL=https://your-domain.com
API_EXTERNAL_URL=https://api.your-domain.com
SUPABASE_PUBLIC_URL=https://api.your-domain.com

############
# Auth
############
GOTRUE_SITE_URL=https://your-domain.com
GOTRUE_EXTERNAL_EMAIL_ENABLED=true
GOTRUE_MAILER_AUTOCONFIRM=false  # Set to true to skip email verification

############
# SMTP (for auth emails - optional but recommended)
############
GOTRUE_SMTP_HOST=smtp.your-provider.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your-smtp-user
GOTRUE_SMTP_PASS=your-smtp-password
GOTRUE_SMTP_SENDER_NAME=Mainstream
```

Generate Supabase keys:

```bash
# Install Supabase CLI
npm install -g supabase

# Generate keys using your JWT secret
supabase gen keys --jwt-secret "<your-jwt-secret-from-above>"
# Copy the anon and service_role keys to your .env
```

Start Supabase:

```bash
docker compose up -d

# Verify all services are running
docker compose ps

# Check logs if issues
docker compose logs -f
```

#### Option B: Using the Included supabase-docker

```bash
cd /path/to/mainstream/supabase-docker
cp .env.example .env
# Edit .env with production values
docker-compose up -d
```

### Step 3: Deploy the Next.js Application

```bash
# Clone the application
cd /opt
git clone <your-repo-url> mainstream
cd mainstream

# Install dependencies
npm ci

# Create production environment file
nano .env.production
```

Add to `.env.production`:

```env
# ===========================================
# REQUIRED - Supabase Connection
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://api.your-domain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# ===========================================
# OPTIONAL - AI Features (for Drops AI generation)
# ===========================================
LITELLM_BASE_URL=https://your-litellm-instance
LITELLM_API_KEY=your-api-key
LITELLM_MODEL=gemini/gemini-2.5-flash

# ===========================================
# OPTIONAL - Security (for encrypting Figma tokens)
# ===========================================
# Generate: openssl rand -hex 32
ENCRYPTION_KEY=<64-character-hex-string>

# ===========================================
# OPTIONAL - Figma Integration
# ===========================================
FIGMA_ACCESS_TOKEN=<your-figma-pat>
```

Build and start:

```bash
# Build the application
npm run build

# Create upload directories with proper permissions
mkdir -p public/uploads/{full,medium,thumbnails}
chmod -R 755 public/uploads

# Start with PM2
pm2 start npm --name "mainstream" -- start

# Save PM2 configuration
pm2 save

# Enable PM2 startup on boot
pm2 startup
# Follow the command it outputs
```

### Step 4: Run Database Migrations

```bash
cd /opt/mainstream

# Set your database connection
export PGPASSWORD="<your-postgres-password>"
DB_URL="postgresql://postgres:${PGPASSWORD}@localhost:5432/postgres"

# Run all migrations
for f in scripts/migrations/*.sql; do
  echo "Running $f..."
  psql "$DB_URL" -f "$f"
done
```

### Step 5: Configure Nginx (Reverse Proxy + SSL)

```bash
# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/mainstream
```

```nginx
# Mainstream App
server {
    listen 80;
    server_name your-domain.com;

    # Increase max body size for file uploads
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings for large uploads
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
}

# Supabase API
server {
    listen 80;
    server_name api.your-domain.com;

    client_max_body_size 50M;

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

Enable the site and get SSL:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mainstream /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificates (ensure DNS is pointed to your server first)
sudo certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal is configured automatically, but you can test it:
sudo certbot renew --dry-run
```

### Step 6: Create First Admin User

1. Navigate to `https://your-domain.com/auth/signup`
2. Create your account
3. Connect to the database and promote yourself to owner:

```bash
psql "$DB_URL" -c "UPDATE users SET platform_role = 'owner' WHERE email = 'your-email@example.com';"
```

### Step 7: Verify Installation

1. **App**: Visit `https://your-domain.com` - should show login page
2. **Auth**: Create an account and verify login works
3. **Uploads**: Try uploading an image
4. **Admin**: Visit `https://your-domain.com/admin` (as owner)

---

## Environment Variables Reference

### Required Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, never expose!) |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LITELLM_BASE_URL` | LiteLLM API endpoint | - |
| `LITELLM_API_KEY` | LiteLLM API key | - |
| `LITELLM_MODEL` | LLM model identifier | `gemini/gemini-2.5-flash` |
| `ENCRYPTION_KEY` | 64-char hex key for AES-256 encryption | - |
| `FIGMA_ACCESS_TOKEN` | Figma Personal Access Token | - |
| `RESEND_API_KEY` | Resend API key for email delivery | - |

### Generating Secrets

```bash
# Generate ENCRYPTION_KEY (64 hex characters = 32 bytes)
openssl rand -hex 32

# Generate JWT_SECRET for Supabase
openssl rand -base64 32

# Generate strong passwords
openssl rand -base64 24
```

---

## Database Migrations

Migrations are located in `scripts/migrations/` and must be run in order.

### Migration Overview

| Migration | Description |
|-----------|-------------|
| 001-002 | Initial schema and seed data |
| 003-004 | Storage, stream follows, bookmarks |
| 005-006 | Foreign key fixes |
| 007-015 | Comments, likes, views, notifications |
| 016-017 | Embed support, Figma integration |
| 018-022 | Drops feature (newsletters) |
| 023-026 | Auth triggers, RLS policies, visibility |
| 027-030 | User fields, notification settings, view RPCs |
| 032-033 | Stream members and visibility |
| 034-036 | Platform roles and admin features |

### Running Migrations

```bash
# All at once
for f in scripts/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done

# Or individually
psql "$DATABASE_URL" -f scripts/migrations/001_initial_schema.sql
```

---

## File Storage

Mainstream uses **local filesystem storage** for uploaded assets. Files are stored in `public/uploads/` with three size variants:

```
public/uploads/
├── full/        # Original optimized images
├── medium/      # 800px max dimension
└── thumbnails/  # 300px max dimension
```

### Important Notes

1. **Persistent Storage**: Ensure `/public/uploads/` is on persistent storage
2. **Permissions**: The Node.js process needs write access: `chmod -R 755 public/uploads`
3. **Backups**: Include `public/uploads/` in your backup strategy
4. **Disk Space**: Monitor disk usage, especially with video uploads (up to 50MB each)

### Nginx Configuration for Uploads

For better performance, serve uploads directly through Nginx:

```nginx
location /uploads/ {
    alias /opt/mainstream/public/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

## Backups

### Database Backup

```bash
# Create backup
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql "$DATABASE_URL" < backup_20240101_120000.sql
```

### File Backup

```bash
# Backup uploads directory
tar -czf uploads_$(date +%Y%m%d).tar.gz -C /opt/mainstream/public uploads/
```

### Automated Backups (Cron)

```bash
# Edit crontab
crontab -e

# Add these lines:
# Daily database backup at 2 AM
0 2 * * * pg_dump "postgresql://postgres:password@localhost:5432/postgres" > /backups/db_$(date +\%Y\%m\%d).sql

# Weekly file backup on Sunday at 3 AM
0 3 * * 0 tar -czf /backups/uploads_$(date +\%Y\%m\%d).tar.gz -C /opt/mainstream/public uploads/

# Clean backups older than 30 days
0 4 * * * find /backups -name "*.sql" -mtime +30 -delete
0 4 * * * find /backups -name "*.tar.gz" -mtime +30 -delete
```

---

## Monitoring

### PM2 Commands

```bash
pm2 status              # Check app status
pm2 logs mainstream     # View app logs
pm2 logs mainstream --lines 100  # Last 100 lines
pm2 monit               # Real-time monitoring dashboard
pm2 restart mainstream  # Restart the app
pm2 reload mainstream   # Zero-downtime reload
```

### Docker/Supabase Commands

```bash
docker compose ps                    # Service status
docker compose logs -f               # Follow all logs
docker compose logs -f db            # Follow PostgreSQL logs
docker compose restart               # Restart all services
docker stats                         # Resource usage
```

### Health Checks

```bash
# Check Next.js app
curl -I https://your-domain.com

# Check Supabase API
curl https://api.your-domain.com/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY"

# Check database connection
psql "$DATABASE_URL" -c "SELECT 1;"
```

---

## Troubleshooting

### App Won't Start

```bash
# Check PM2 logs
pm2 logs mainstream --lines 200

# Verify environment variables
cat .env.production

# Test build
npm run build

# Check Node.js version
node --version  # Should be 20+
```

### Database Connection Issues

```bash
# Verify Supabase is running
docker compose ps

# Test direct connection
psql "postgresql://postgres:password@localhost:5432/postgres" -c "\dt"

# Check Supabase logs
docker compose logs db
docker compose logs rest
```

### Upload Failures

```bash
# Check directory permissions
ls -la public/uploads/

# Fix permissions
chmod -R 755 public/uploads/
chown -R $USER:$USER public/uploads/

# Check disk space
df -h
```

### Auth/Login Issues

```bash
# Check Supabase Auth logs
docker compose logs auth

# Verify SMTP settings (if using email verification)
docker compose logs auth | grep -i smtp

# Check JWT configuration
# Ensure ANON_KEY and SERVICE_ROLE_KEY match your JWT_SECRET
```

### SSL Certificate Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx SSL configuration
sudo nginx -t
```

### Performance Issues

```bash
# Check system resources
htop
free -h
df -h

# Check PM2 memory usage
pm2 monit

# Check Docker resource usage
docker stats

# Restart services
pm2 restart mainstream
docker compose restart
```

---

## Updating the Application

```bash
cd /opt/mainstream

# Pull latest changes
git pull origin main

# Install any new dependencies
npm ci

# Run new migrations (if any)
for f in scripts/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f" 2>/dev/null || true
done

# Rebuild
npm run build

# Restart with zero downtime
pm2 reload mainstream
```

---

## Documentation

See the `docs/` folder for detailed documentation:

- [Getting Started](./docs/ONBOARDING.md)
- [Supabase Setup](./docs/SUPABASE_SETUP.md)
- [Streams Feature](./docs/STREAMS_FEATURE.md)
- [Drops Feature](./docs/DROPS_FEATURE.md)
- [AI Agent Guide](./docs/AI_AGENT_GUIDE.md)

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth (GoTrue)
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui + Radix UI
- **State**: React Query (TanStack Query)
- **Image Processing**: Sharp
- **Video Processing**: FFmpeg (optional)

---

## License

Private - Internal use only.
