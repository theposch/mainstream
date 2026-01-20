# Mainstream Documentation

**Version:** 2.0  
**Last Updated:** January 2026

Design collaboration platform for internal teams to share work, organize into streams, and create AI-powered newsletters.

---

## 📚 Documentation Index

### Getting Started
- **[Quick Start Guide](./QUICK_START.md)** - Get up and running in 10 minutes
- **[Setup Guide](./SETUP.md)** - Complete installation and configuration
- **[Database Setup](./DATABASE_SETUP.md)** - Database configuration, migrations, and troubleshooting

### Core Features
- **[Streams Feature](./STREAMS_FEATURE.md)** - Organizational system and stream management
- **[Drops Feature](./DROPS_FEATURE.md)** - AI-powered newsletters
- **[Scheduled Drops](./SCHEDULED_DROPS.md)** - Recurring newsletter automation

### Technical Documentation
- **[Architecture Overview](./ARCHITECTURE.md)** - System design and patterns
- **[API Reference](./API_REFERENCE.md)** - Complete API endpoint documentation
- **[Database Schema](./DATABASE_SCHEMA.md)** - Tables, relationships, and RLS policies

### Development
- **[Development Guide](./DEVELOPMENT.md)** - Best practices and workflows
- **[Migration Guide](./MIGRATIONS.md)** - Database migration procedures
- **[AI Agent Guide](./AI_AGENT_GUIDE.md)** - For AI assistants working on this codebase

---

## 🚀 Quick Links

| What You Want | Where to Go |
|---------------|-------------|
| Set up project for first time | [Quick Start Guide](./QUICK_START.md) |
| Database connection issues | [Database Setup](./DATABASE_SETUP.md#troubleshooting) |
| Create API endpoint | [API Reference](./API_REFERENCE.md) |
| Understand streams | [Streams Feature](./STREAMS_FEATURE.md) |
| Add new migration | [Migration Guide](./MIGRATIONS.md) |
| Deploy to production | [Setup Guide](./SETUP.md#production-deployment) |

---

## 🎯 Project Overview

### What is Mainstream?

Mainstream is a Pinterest-style design collaboration platform that helps internal teams:
- **Share Work** - Upload designs, GIFs, videos, and embed Figma/Loom
- **Organize** - Use streams (flexible tags + collections)
- **Collaborate** - Comment, like, follow users and streams
- **Summarize** - Generate AI-powered newsletters from weekly work
- **Automate** - Schedule recurring newsletter generation

### Key Features

✅ **Complete Feature Set:**
- Multi-format asset upload (images, GIFs, videos, Figma, Loom)
- Flexible stream organization (many-to-many relationships)
- Real-time likes, comments, and notifications
- AI-powered newsletter generation with block editor
- Scheduled recurring drops (weekly, biweekly, monthly, custom)
- User and stream following with personalized feeds
- Private streams with role-based access
- Search across assets, users, and streams
- View tracking and analytics
- Notification preferences

---

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router and Turbopack
- **TypeScript** - Type safety
- **Tailwind CSS** + **shadcn/ui** - Styling and components
- **React Query** - Data fetching and caching
- **Framer Motion** - Animations
- **canvas-confetti** - Celebration effects

### Backend
- **Supabase** (Self-hosted via Docker)
  - PostgreSQL database with RLS
  - GoTrue authentication
  - Storage (S3-compatible)
  - Realtime (WebSocket subscriptions)
- **FFmpeg** - Video thumbnail generation
- **LiteLLM** - AI integration (Gemini 2.5 Flash)
- **React Email** + **Resend** - Email delivery

### Infrastructure
- **Docker Compose** - Local development environment
- **pg_cron** - Schedule processing
- **Node.js** cron service - Alternative scheduler

---

## 📂 Project Structure

```
mainstream/
├── app/                      # Next.js App Router
│   ├── home/                # Main feed (Recent/Following)
│   ├── e/[id]/              # Asset detail pages
│   ├── stream/[slug]/       # Stream pages
│   ├── streams/             # All streams (All/Following tabs)
│   ├── people/              # People listing (All/Following tabs)
│   ├── drops/               # Drops listing with dynamic tabs
│   │   └── [id]/edit/       # Block-based drop editor
│   ├── mainframe/           # Alias for /drops
│   ├── u/[username]/        # User profiles
│   ├── auth/                # Signup/Login pages
│   └── api/                 # API routes
│       ├── assets/          # Asset CRUD
│       ├── streams/         # Stream CRUD
│       ├── schedules/       # Schedule CRUD
│       ├── drops/           # Drop CRUD
│       └── cron/            # Schedule processing
│
├── components/              # React components
│   ├── assets/             # Asset cards and detail views
│   ├── streams/            # Stream components
│   ├── drops/              # Drop components and block editor
│   ├── users/              # User profile components
│   ├── layout/             # Navigation, search, notifications
│   └── ui/                 # Base UI components (shadcn)
│
├── lib/                     # Core utilities
│   ├── supabase/           # Database clients (client, server, admin)
│   ├── auth/               # Authentication utilities
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React contexts
│   ├── constants/          # Centralized constants
│   ├── queries/            # React Query factories
│   ├── utils/              # Utility functions
│   └── types/              # TypeScript interfaces
│
├── docs/                    # Documentation (you are here)
├── scripts/                 # Utility scripts
│   └── migrations/         # Database migrations
├── supabase-docker/        # Supabase Docker setup
└── public/                 # Static assets
```

---

## 🔐 Environment Setup

### Required Environment Variables

**`.env` (Docker/Supabase):**
```env
POSTGRES_PASSWORD=<generated>
JWT_SECRET=<generated>
ANON_KEY=<generated-jwt>
SERVICE_ROLE_KEY=<generated-jwt>
```

**`.env.local` (Next.js):**
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<must-match-anon-key-from-env>
SUPABASE_SERVICE_ROLE_KEY=<must-match-service-role-key-from-env>
```

**⚠️ Critical:** JWT tokens in `.env.local` **MUST** be signed with the same `JWT_SECRET` from `.env`. See [Database Setup](./DATABASE_SETUP.md#jwt-token-matching) for details.

**Quick Setup:**
```bash
# Use setup script to generate matching tokens automatically
./setup.sh

# Or copy example file and update manually
cp .env.local.example .env.local
```

---

## 🚦 Service Status

All features are production-ready:

| Feature | Status | Documentation |
|---------|--------|---------------|
| Authentication | ✅ Complete | [Setup Guide](./SETUP.md#authentication) |
| Asset Upload/Management | ✅ Complete | [API Reference](./API_REFERENCE.md#assets) |
| Streams (Organization) | ✅ Complete | [Streams Feature](./STREAMS_FEATURE.md) |
| Real-time Updates | ✅ Complete | [Architecture](./ARCHITECTURE.md#realtime) |
| Search | ✅ Complete | [API Reference](./API_REFERENCE.md#search) |
| Drops (Newsletters) | ✅ Complete | [Drops Feature](./DROPS_FEATURE.md) |
| Scheduled Drops | ✅ Complete | [Scheduled Drops](./SCHEDULED_DROPS.md) |
| Notifications | ✅ Complete | [API Reference](./API_REFERENCE.md#notifications) |
| Private Streams | ✅ Complete | [Streams Feature](./STREAMS_FEATURE.md#private-streams) |

---

## 📖 Common Tasks

### For Developers
- [Create a new API endpoint](./API_REFERENCE.md#creating-new-endpoints)
- [Add a database migration](./MIGRATIONS.md#creating-migrations)
- [Work with React Query cache](./DEVELOPMENT.md#data-fetching)
- [Debug authentication issues](./DATABASE_SETUP.md#troubleshooting)

### For Users
- [Upload your first design](./QUICK_START.md#uploading-assets)
- [Create and manage streams](./STREAMS_FEATURE.md#creating-streams)
- [Generate a newsletter](./DROPS_FEATURE.md#creating-drops)
- [Set up recurring drops](./SCHEDULED_DROPS.md#creating-schedules)

---

## 🐛 Troubleshooting

Common issues and solutions:

| Problem | Solution |
|---------|----------|
| JWT signature errors | [Fix JWT token mismatch](./DATABASE_SETUP.md#jwt-token-matching) |
| Database connection failed | [Check Docker services](./SETUP.md#troubleshooting) |
| Permission denied errors | [Verify RLS policies](./DATABASE_SCHEMA.md#row-level-security) |
| Services won't start | [Docker troubleshooting](./SETUP.md#docker-issues) |

---

## 🤝 Contributing

1. Read [Development Guide](./DEVELOPMENT.md)
2. Check [Architecture Overview](./ARCHITECTURE.md)
3. Follow [Git workflow](./DEVELOPMENT.md#git-workflow)
4. Run tests before committing
5. Update documentation for new features

---

## 📝 Documentation Standards

When updating docs:
- Keep code examples up to date
- Include migration file references
- Add troubleshooting sections
- Update the "Last Updated" date
- Cross-reference related docs

---

## 🔗 External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Need help?** Check the specific feature documentation or see [Troubleshooting](./DATABASE_SETUP.md#troubleshooting).
