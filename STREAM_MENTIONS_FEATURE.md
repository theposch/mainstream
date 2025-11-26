# Stream Mentions Feature

## Overview
Implemented rich-text hashtag mentions in the upload dialog description field with autocomplete, auto-creation, and automatic syncing with stream pills.

## Features Implemented

### 1. Rich Text Description Field
- **Component**: `RichTextArea` (`components/ui/rich-text-area.tsx`)
- Replaced standard `<Textarea>` with `contenteditable` div
- Maintains cursor position during updates
- Detects `#` character in real-time
- Tracks cursor screen position for dropdown placement

### 2. Stream Mention Autocomplete
- **Component**: `StreamMentionDropdown` (`components/streams/stream-mention-dropdown.tsx`)
- Appears when user types `#` in description
- Filters streams as user types after `#`
- Shows "Create new stream" option for non-matching queries
- Keyboard navigation (↑↓ arrows, Enter to select, Esc to close)
- Click outside to dismiss
- Visual indicators for already-selected streams (checkmark)

### 3. Auto-Stream Creation
- **Hook**: `useStreamMentions` (`lib/hooks/use-stream-mentions.ts`)
- Parses all `#streamname` patterns from description text
- Debounced sync (500ms) to avoid excessive API calls
- Automatically creates streams via API if they don't exist
- Syncs hashtags with stream pills in real-time

### 4. Multiple Hashtags Support
- Parse and track multiple `#tags` in description: `"Working on #iOS and #Android"`
- Each hashtag auto-creates/links to a stream
- Maintains sync between text hashtags and selected stream pills

## User Flow

1. **User types `#` in description**
   - Dropdown appears at cursor position
   - Shows filtered list of existing streams

2. **User types after `#` (e.g., `#ios`)**
   - Dropdown filters to matching streams
   - If no exact match, shows "Create new stream #ios"

3. **User selects from dropdown** (Enter/Click)
   - Stream is added to pills
   - Hashtag stays in description text
   - Dropdown closes

4. **User types space or continues**
   - After 500ms, system parses all hashtags
   - Auto-creates any new streams
   - Syncs all hashtags with stream pills

5. **Multiple hashtags**
   - `"Check out #Carousel and #iOS"`
   - Both streams automatically added to pills
   - Both stay highlighted in text

## Technical Implementation

### Cursor Position Detection
```typescript
const selection = window.getSelection();
const range = selection.getRangeAt(0);
const rect = range.getBoundingClientRect();
// Position dropdown at cursor
```

### Hashtag Parsing
```typescript
const hashtagRegex = /#(\w+)/g;
const matches = content.matchAll(hashtagRegex);
// Extract all hashtags, deduplicate, validate
```

### Stream Creation
```typescript
// POST /api/streams
{
  name: "#streamname",
  ownerType: "user",
  isPrivate: false
}
```

### Debounced Sync
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    syncStreams(); // Parse hashtags, create streams, update pills
  }, 500);
  return () => clearTimeout(timeoutId);
}, [text]);
```

## Components Created

1. **`RichTextArea`** - Contenteditable text input with hashtag detection
2. **`StreamMentionDropdown`** - Autocomplete dropdown for stream selection
3. **`useStreamMentions`** - Hook for parsing and syncing hashtags

## Components Modified

1. **`upload-dialog.tsx`** - Integrated rich-text area and mention system

## Files Changed

- `components/ui/rich-text-area.tsx` (NEW)
- `components/streams/stream-mention-dropdown.tsx` (NEW)
- `lib/hooks/use-stream-mentions.ts` (NEW)
- `components/layout/upload-dialog.tsx` (MODIFIED)

## Future Enhancements

- [ ] Syntax highlighting for hashtags (color them differently)
- [ ] Click on hashtag in text to edit/remove
- [ ] Support for removing streams by deleting hashtag from text
- [ ] Cache created streams to avoid re-fetching
- [ ] Show stream color/icon in dropdown
- [ ] Support `@mentions` for users
- [ ] Rich text formatting (bold, italic, etc.)

