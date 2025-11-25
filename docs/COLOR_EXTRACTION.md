# Color Extraction System

## Overview

Cosmos uses the **get-image-colors** library to automatically extract accurate color palettes from images. This provides real, contextual colors instead of generic placeholders.

## How It Works

### Library: `get-image-colors`
- **What it does**: Analyzes image pixels to identify the most prominent colors
- **Algorithm**: Uses quantization to find dominant color clusters
- **Output**: Array of colors ordered by prominence
- **Accuracy**: Captures real colors from the image, including subtle tones

### Example: "Dark Mode Interface" (Yellow Chair Image)

**Before (Manual)**: `["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8"]`  
❌ Generic slate grays - missed the prominent yellow chair

**After (Extracted)**: `["#c5c0ba", "#26251f", "#a27f45", "#664c38", "#776f6a"]`  
✅ Real colors:
- `#c5c0ba` - Beige/cream wall
- `#26251f` - Dark accents
- `#a27f45` - **Yellow chair** 🎯
- `#664c38` - Wooden floor
- `#776f6a` - Gray elements

---

## Usage

### 1. API Route (For Real-time Extraction)

**Endpoint**: `POST /api/extract-colors`

```typescript
// Request
const response = await fetch('/api/extract-colors', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: 'https://example.com/image.jpg',
    colorCount: 5
  })
});

// Response
{
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "dominantColor": "#hex1"
}
```

**Use Cases**:
- Extract colors when users upload new assets
- Update colors for existing assets
- Generate color palettes on-demand

---

### 2. Batch Processing Scripts

#### Extract Colors from All Assets
```bash
npx tsx scripts/extract-asset-colors.ts
```

**What it does**:
1. Reads all assets from `lib/mock-data/assets.ts`
2. Extracts 5-color palette from each image URL
3. Saves results to `scripts/extracted-colors.json`
4. Shows progress and success/fail count

**Output**: `scripts/extracted-colors.json`
```json
{
  "asset-1": {
    "dominantColor": "#a6bcdd",
    "colorPalette": ["#a6bcdd", "#d8d1ad", "#7b27b5", "#8974df", "#c8a57c"]
  },
  ...
}
```

#### Update Mock Data with Extracted Colors
```bash
npx tsx scripts/update-asset-colors.ts
```

**What it does**:
1. Reads `scripts/extracted-colors.json`
2. Updates `lib/mock-data/assets.ts` with real colors
3. Preserves file structure and formatting

---

## Database Integration (Future)

When implementing the real backend, colors should be extracted and stored automatically:

### On Asset Upload
```typescript
// 1. User uploads image → S3/R2/Storage
const imageUrl = await uploadToStorage(file);

// 2. Extract colors
const { colors, dominantColor } = await extractColors(imageUrl);

// 3. Save to database
await db.assets.create({
  url: imageUrl,
  dominantColor,
  colorPalette: colors,
  // ... other fields
});
```

### Database Schema
```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL,
  dominant_color TEXT,           -- Primary color for UI
  color_palette TEXT[],          -- Array of 5 hex colors
  -- ... other fields
);

-- Index for color search (future feature)
CREATE INDEX idx_assets_colors ON assets USING GIN (color_palette);
```

---

## Features

### Current Features ✅
- ✅ Automatic color extraction from images
- ✅ 5-color palettes per asset
- ✅ Real dominant color detection
- ✅ Click-to-copy color swatches in UI
- ✅ Hover to preview hex codes
- ✅ Batch processing scripts
- ✅ API route for real-time extraction

### New Features ✨
- ✅ **Search by color** (v1.6.0): Interactive color picker to filter assets by similar colors
  - Popover dropdown with visual color picker
  - Manual hex code input for precise searches
  - Euclidean distance algorithm for similarity matching
  - Results sorted by closest match first
  - Threshold: 60 units for optimal balance

### Future Enhancements 🚀
- 🔜 **Color trends**: Analytics on popular colors
- 🔜 **Color recommendations**: Suggest complementary palettes
- 🔜 **Color tagging**: Auto-tag assets by color mood (vibrant, muted, etc.)
- 🔜 **Extract on upload**: Automatic extraction for user uploads
- 🔜 **Advanced color filters**: Combine with other search criteria

---

## Troubleshooting

### Issue: Colors seem off or muted
**Cause**: `get-image-colors` uses k-means clustering which can average colors  
**Solution**: Increase `colorCount` parameter to get more granular results

### Issue: Extraction fails for certain images
**Cause**: CORS issues or invalid image formats  
**Solution**: Ensure images are publicly accessible and in supported formats (JPEG, PNG, GIF)

### Issue: Want more vibrant/saturated colors
**Alternative**: Consider switching to `node-vibrant` (requires more setup)

---

## Technical Details

### Library: get-image-colors
- **Package**: `get-image-colors@4.0.1`
- **Algorithm**: K-means clustering for color quantization
- **Supported formats**: JPEG, PNG, GIF, WebP
- **Performance**: ~500ms per image (network dependent)
- **Accuracy**: Very good for dominant colors, excellent for overall palette

### Color Format
- **Output**: Hex color strings (e.g., `#a27f45`)
- **Color space**: RGB (standard web colors)
- **Precision**: 24-bit color (16.7 million colors)

---

## Files

```
📁 Cosmos
├── 📁 app/api/extract-colors/
│   └── route.ts                         # API endpoint for color extraction
├── 📁 scripts/
│   ├── extract-asset-colors.ts          # Batch extract colors from all assets
│   ├── update-asset-colors.ts           # Update mock data with extracted colors
│   └── extracted-colors.json            # Cached extracted colors
├── 📁 lib/
│   ├── utils/color.ts                   # Color matching & search utilities (NEW)
│   └── mock-data/assets.ts              # Asset data with colorPalette field
├── 📁 components/layout/
│   ├── color-search-dialog.tsx          # Color picker popover (NEW)
│   └── search-bar.tsx                   # Integrated with color search
└── 📁 docs/
    └── COLOR_EXTRACTION.md              # This file
```

---

## Examples

### Accurate Color Detection

| Asset | Prominent Element | Extracted Color | Result |
|-------|-------------------|-----------------|--------|
| Dark Mode Interface | Yellow chair | `#a27f45` | ✅ Captured |
| Colorful Gradient | Pink/purple gradient | `#df3aa2` | ✅ Captured |
| Data Dashboard | Cyan charts | `#20b7c9` | ✅ Captured |
| Vintage Poster | Cyan blue | `#4697b2` | ✅ Captured |

---

## Credits

- **Library**: [get-image-colors](https://github.com/colorjs/get-image-colors)
- **Algorithm**: K-means color quantization
- **Inspiration**: Dribbble, Behance color extraction features



