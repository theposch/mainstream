# Database Migrations

## Migration Numbering

Migrations are numbered sequentially (001, 002, 003, etc.) and applied in lexical sort order.

### ⚠️ Known Issue: Duplicate Migration Numbers

The following migrations have duplicate numbers:
- `003_storage_setup.sql` and `003_stream_follows.sql`
- `004_add_description_to_assets.sql` and `004_stream_bookmarks.sql`

**Current Behavior**: Migrations are applied in lexical sort order (alphabetically), so:
1. `003_storage_setup.sql` runs before `003_stream_follows.sql`
2. `004_add_description_to_assets.sql` runs before `004_stream_bookmarks.sql`

**Recommended Fix** (for future cleanup):
Renumber the second file in each pair to the next available slot (041, 042, etc.).

**Why Not Fixed Now**: Renumbering could break existing deployment references and git history tracking.

## Migration Execution

Migrations are executed by `migrate.sh` which:
1. Sorts migration files lexically
2. Applies each migration to the database
3. Sends `NOTIFY pgrst, 'reload schema'` to refresh PostgREST's cache

## Adding New Migrations

1. Use the next available sequential number (currently 041+)
2. Follow the naming pattern: `XXX_descriptive_name.sql`
3. Include proper transaction wrapping (`BEGIN;` / `COMMIT;`)
4. Add RLS policies for new tables
5. Test idempotency (safe to run multiple times)

## PostgREST Schema Reload

After migrations are applied, PostgREST's schema cache is automatically reloaded via the `NOTIFY pgrst, 'reload schema';` command. This ensures the API immediately recognizes new tables and columns.
