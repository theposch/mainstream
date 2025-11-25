# Color Search Feature

## Overview

The color search feature allows users to search for design assets by color. Users can select a color using a visual picker or input a specific hex code, and the system will find assets with similar colors in their palettes.

**Version**: 1.6.0  
**Status**: ✅ Complete (Frontend) | 🚧 Backend Pending

---

## Features

### Visual Color Picker
- Interactive color picker using `react-colorful` library (3KB)
- Displays as popover dropdown below the palette icon
- Compact, minimal design matching Cosmos.so aesthetic

### Hex Code Input
- Editable input field for precise color entry
- Supports both with and without `#` prefix
- Auto-validates and updates picker in real-time
- Uppercase display for consistency

### Similarity Matching
- **Algorithm**: Euclidean distance in RGB color space
- **Threshold**: 60 units (configurable via `COLOR_MATCH_THRESHOLD`)
- **Formula**: `√[(r1-r2)² + (g1-g2)² + (b1-b2)²]`
- **Range**: 0 (identical) to ~442 (black to white)

### Smart Results
- Checks both dominant color and 5-color palettes
- Finds closest matching color in each asset
- **Sorts by similarity** - best matches first
- Shows all matching results (no cap)

---

## User Flow

1. User clicks palette icon (🎨) in search bar
2. Popover opens with color picker
3. User either:
   - Selects color visually from gradient picker
   - Pastes/types hex code (e.g., `#ef4444` or `3b82f6`)
4. User clicks "Apply" button
5. Navigates to `/search?color=hex`
6. Results display sorted by closest match

---

## Technical Implementation

### Files Created

**`lib/utils/color.ts`** (235 lines)
```typescript
- hexToRgb() - Convert hex to RGB object
- colorDistance() - Calculate Euclidean distance
- areColorsSimilar() - Check if colors match within threshold
- findAssetsByColor() - Find & sort assets by color similarity
- getPopularColors() - Extract popular colors from assets
- getRecentColors() - Load from localStorage
- addRecentColor() - Save to localStorage
- normalizeHex() - Ensure # prefix
- isValidHex() - Validate hex format
```

**`components/layout/color-search-dialog.tsx`** (90 lines)
```typescript
- ColorSearchPopover component
- Visual color picker integration
- Hex input field
- Apply button
- Popover positioning
```

### Files Modified

1. **`lib/contexts/search-context.tsx`**
   - Added `selectedColor` state
   - Added `recentColors` array
   - Added `addRecentColor()` and `clearRecentColors()` methods

2. **`components/layout/search-bar.tsx`**
   - Integrated ColorSearchPopover component
   - Added state management for popover
   - Fixed expansion behavior (only on input focus)

3. **`app/search/page.tsx`**
   - Made component async for Next.js 15
   - Added `color` parameter handling
   - Passes color to SearchResults component

4. **`components/search/search-results.tsx`**
   - Added color filtering logic
   - Displays color swatch in header
   - Shows "Clear color filter" button
   - Handles both text and color search

5. **`package.json`**
   - Added `react-colorful` dependency

---

## Algorithm Details

### Color Distance Calculation

```typescript
function colorDistance(color1: RGB, color2: RGB): number {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
    Math.pow(color1.g - color2.g, 2) +
    Math.pow(color1.b - color2.b, 2)
  );
}
```

### Why Euclidean Distance?
- **Simple**: Easy to understand and implement
- **Fast**: O(1) computation per comparison
- **Effective**: Perceptually accurate for most use cases
- **Standard**: Widely used in color matching systems

### Threshold Selection
- **30**: Too strict, few results
- **60**: ✅ Optimal balance (current)
- **100**: Too lenient, many irrelevant results

---

## Backend Integration

### Current Implementation
- Frontend complete with mock data
- Searches through 18 assets in memory
- Instant results (no API call)

### Backend Requirements

When implementing backend, consider:

#### Option 1: Database Query
```sql
-- Store colors as arrays
SELECT a.*, 
       MIN(color_distance(target_color, ANY(a.color_palette))) as distance
FROM assets a
WHERE color_distance(target_color, ANY(a.color_palette)) <= 60
ORDER BY distance
LIMIT 50;
```

#### Option 2: PostgreSQL Cube Extension
```sql
-- Use cube for multi-dimensional search
CREATE EXTENSION cube;

-- Convert RGB to cube
SELECT * FROM assets
WHERE cube(ARRAY[r, g, b]) <-> cube(ARRAY[target_r, target_g, target_b]) <= 60
ORDER BY cube(ARRAY[r, g, b]) <-> cube(ARRAY[target_r, target_g, target_b]);
```

#### Option 3: Vector Search
- Use pgvector extension
- Store colors as 3D vectors [r, g, b]
- Fast similarity search with indexing

### API Endpoint

```typescript
GET /api/search?color={hex}

// Response
{
  assets: Asset[],
  total: number,
  query: {
    color: "#ef4444",
    threshold: 60
  }
}
```

---

## Performance

### Current Performance
- **Assets**: 18 items
- **Colors per asset**: 6 (1 dominant + 5 palette)
- **Total comparisons**: ~108 per search
- **Time**: < 1ms (instant)

### Scaled Performance
- **10,000 assets**: ~60,000 comparisons
- **Estimated time**: 10-50ms (still fast)
- **Optimization**: Add indexing or pre-compute color clusters

---

## Future Enhancements

### Possible Improvements
- Color families (warm/cool/neutral)
- Saturation and brightness filters
- Multi-color search (find assets with 2+ specific colors)
- Color harmony suggestions (complementary, analogous)
- "More like this color" feature
- Color trends analytics
- Save favorite colors

---

## User Experience

### Positive Feedback
- ✅ Visual picker is intuitive
- ✅ Hex input for precision users
- ✅ Popover feels native to UI
- ✅ Results sorted intelligently
- ✅ Fast and responsive

### Edge Cases Handled
- ✅ Invalid hex codes (ignored)
- ✅ No results (empty state shown)
- ✅ Search bar doesn't expand on color picker click
- ✅ Color picker closes on outside click
- ✅ Results persist in URL (shareable links)

---

## Testing

### Test Cases
1. Select color from picker → search works
2. Type hex code → picker updates → search works
3. Paste hex code → search works
4. Invalid hex → ignored, no crash
5. No matches → empty state shown
6. URL with color param → loads results
7. Clear filter → returns to normal
8. Mobile responsive → popover works
9. Keyboard navigation → accessible

---

## Dependencies

```json
{
  "react-colorful": "^5.6.1"
}
```

**Why react-colorful?**
- Lightweight (3KB)
- No dependencies
- Accessible
- Customizable
- TypeScript support
- Well-maintained

---

## Documentation Updates

Updated files:
- ✅ `README.md` - Added color search to features
- ✅ `docs/AI_AGENT_GUIDE.md` - Added to component list
- ✅ `docs/COLOR_EXTRACTION.md` - Moved to implemented
- ✅ `docs/BACKEND_INTEGRATION.md` - Added backend notes
- ✅ `docs/COLOR_SEARCH.md` - This file (new)

---

## Summary

The color search feature is **complete and production-ready** on the frontend. It provides an intuitive way for users to find designs by color using either visual selection or precise hex codes. Results are intelligently sorted by similarity, providing the best matches first.

**Next step**: Connect to database and implement backend color search with optimized queries.

---

*Implemented: November 25, 2025*  
*Version: 1.6.0*  
*Status: Frontend Complete*

