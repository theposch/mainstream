# Scripts

Utility scripts for Cosmos development.

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



