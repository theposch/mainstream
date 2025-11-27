# Scripts

Utility scripts for Cosmos development.

## Database Migrations

### Running Migrations

To run database migrations, use the following command:

```bash
cd scripts/migrations
docker-compose -f ../../supabase-docker/docker-compose.yml exec -T db psql -U postgres -d postgres < migration_file.sql
```

Or copy-paste the SQL into Supabase Studio SQL Editor (http://localhost:8000).

### Available Migrations

- `001_initial_schema.sql` - Initial database schema with all tables
- `002_seed_data.sql` - Seed data for development
- `003_storage_setup.sql` - Configure Supabase Storage buckets and RLS policies
- `004_add_description_to_assets.sql` - Add description column to assets table (fixed upload issue)
- `005_fix_uploader_id_constraint.sql` - Fix uploader_id NOT NULL constraint contradiction
- `006_fix_asset_streams_added_by.sql` - Fix asset_streams.added_by NOT NULL constraint contradiction
- `007_add_comment_likes.sql` - Add comment_likes table for liking comments
- `008_add_streams_rls_policies.sql` - Add RLS policies for stream creation/modification (fixes stream creation error)

## Color Extraction

### Extract Colors from Images
```bash
npx tsx scripts/extract-asset-colors.ts
```

Extracts real color palettes from all asset images using `get-image-colors`.

**Output**: `scripts/extracted-colors.json`

### Update Mock Data
```bash
npx tsx scripts/update-asset-colors.ts
```

Updates `lib/mock-data/assets.ts` with the extracted colors.

## Requirements

- `tsx` - TypeScript executor
- `get-image-colors` - Color extraction library

Both are already installed in the project.

## Full Workflow

```bash
# 1. Extract colors from all images
npx tsx scripts/extract-asset-colors.ts

# 2. Update mock data with extracted colors
npx tsx scripts/update-asset-colors.ts

# 3. Restart dev server to see changes
npm run dev
```

See `docs/COLOR_EXTRACTION.md` for more details.



