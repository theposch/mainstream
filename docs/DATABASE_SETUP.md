# Database Setup Guide

This guide covers database setup, migrations, and troubleshooting for the Mainstream project.

## Quick Start

1. **Run Setup Script** (recommended for new installations):
   ```bash
   ./setup.sh
   ```
   This will:
   - Generate secure JWT secrets
   - Create `.env` with proper configuration
   - Generate JWT tokens that match your secret
   - Start Docker services

2. **Copy Environment Variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   
   **IMPORTANT**: If you ran `setup.sh`, update `.env.local` with the tokens from `.env`:
   ```bash
   # Copy these from .env to .env.local:
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<value from .env ANON_KEY>
   SUPABASE_SERVICE_ROLE_KEY=<value from .env SERVICE_ROLE_KEY>
   ```

3. **Run Migrations**:
   ```bash
   ./migrate.sh
   ```

## Important: JWT Token Matching

The JWT tokens in `.env.local` **MUST** be signed with the same `JWT_SECRET` as in `.env`. If they don't match, you'll get authentication errors like:

- `PGRST301: JWSError JWSInvalidSignature`
- `permission denied for table`
- `401 Unauthorized`

### How to Fix JWT Mismatch

If you changed `JWT_SECRET` or are getting JWT errors:

1. **Regenerate tokens using setup.sh**:
   ```bash
   ./setup.sh
   ```
   Then update `.env.local` with the new tokens.

2. **Or manually generate tokens**:
   ```bash
   node -e "
   const crypto = require('crypto');
   function base64url(buffer) {
     return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
   }
   function generateJWT(payload, secret) {
     const header = { alg: 'HS256', typ: 'JWT' };
     const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
     const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
     const signature = crypto.createHmac('sha256', secret).update(\`\${headerB64}.\${payloadB64}\`).digest();
     const signatureB64 = base64url(signature);
     return \`\${headerB64}.\${payloadB64}.\${signatureB64}\`;
   }
   const secret = 'YOUR_JWT_SECRET_FROM_ENV';
   const anonPayload = { iss: 'supabase', role: 'anon', exp: 1983812996 };
   const servicePayload = { iss: 'supabase', role: 'service_role', exp: 1983812996 };
   console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=' + generateJWT(anonPayload, secret));
   console.log('SUPABASE_SERVICE_ROLE_KEY=' + generateJWT(servicePayload, secret));
   "
   ```

3. **Recreate Docker containers** after changing tokens:
   ```bash
   docker compose up -d --force-recreate auth rest kong storage
   ```

## Database Permissions

The migrations automatically set up proper permissions. If you're restoring from a backup, make sure these permissions are in place:

```sql
-- Table permissions for drop_schedules (example)
GRANT ALL ON drop_schedules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON drop_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON drop_schedules TO anon;
```

### Checking Permissions

```sql
-- Check table permissions
\dp drop_schedules

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'drop_schedules';
```

## Common Issues

### Issue: "permission denied for table"

**Cause**: Database roles don't have table-level permissions.

**Fix**: Re-run migrations or manually grant permissions:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON your_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON your_table TO anon;
GRANT ALL ON your_table TO service_role;
```

### Issue: "JWSError JWSInvalidSignature"

**Cause**: JWT tokens don't match JWT_SECRET.

**Fix**: See "JWT Token Matching" section above.

### Issue: Services restart continuously

**Cause**: Usually environment variable issues or database connection problems.

**Fix**:
1. Check logs: `docker compose logs auth rest kong`
2. Verify `.env` has correct `POSTGRES_PASSWORD` and `JWT_SECRET`
3. Ensure database is healthy: `docker compose ps db`
4. Recreate containers: `docker compose up -d --force-recreate`

## Database Backup and Restore

### Create Backup
```bash
docker compose exec -T db pg_dump -U postgres -d postgres > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Backup
```bash
docker compose exec -T db psql -U postgres -d postgres < backup_file.sql
```

**IMPORTANT**: After restoring a backup, you may need to:
1. Re-run recent migrations
2. Verify RLS policies are in place
3. Check table permissions for `anon`, `authenticated`, and `service_role` roles

## Migration Best Practices

1. **Always include table permissions** in migration files:
   ```sql
   -- After creating a table, grant permissions
   GRANT ALL ON your_table TO service_role;
   GRANT SELECT, INSERT, UPDATE, DELETE ON your_table TO authenticated;
   GRANT SELECT, INSERT, UPDATE, DELETE ON your_table TO anon;
   ```

2. **RLS Policies**: Always enable RLS and create appropriate policies:
   ```sql
   ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can view own records"
     ON your_table FOR SELECT
     USING (auth.uid() = user_id);
   ```

3. **Test migrations** on a fresh database before applying to production.

## Useful Commands

```bash
# Check service health
docker compose ps

# View service logs
docker compose logs -f [service-name]

# Access database
docker compose exec db psql -U postgres -d postgres

# Restart specific services
docker compose restart auth rest kong

# Force recreate containers (picks up new env vars)
docker compose up -d --force-recreate [service-name]

# Check database roles
docker compose exec db psql -U postgres -d postgres -c "\du"

# List all tables with permissions
docker compose exec db psql -U postgres -d postgres -c "\dp"
```

## Development Workflow

1. Make schema changes in a new migration file
2. Test locally: `./migrate.sh`
3. Verify permissions: Check table grants and RLS policies
4. Commit migration file
5. Deploy: Run migrations on production

## Getting Help

If you encounter issues:

1. Check service logs: `docker compose logs -f`
2. Verify environment variables are correct
3. Ensure JWT tokens match JWT_SECRET
4. Check database permissions
5. Review this guide for common issues

For more help, see the main README.md or open an issue on GitHub.
