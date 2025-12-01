# Simplified Plan: Stream Mention Fixes

## Key Simplification ✨

**Old Complex Approach**: Pills sync with text (delete text → remove pill)
**New Simple Approach**: Pills independent from text (only X button removes pills)

### Mental Model:
- **Description field** = Your written content (hashtags are just text/links)
- **Pills** = Stream assignments (what streams this post belongs to)
- **Separation of concerns**: Writing ≠ Organizing

---

## What We're Implementing

### Auto-Sync Behavior (Option A):
```
Type: "#test blah blah #another thing"
→ Auto-adds [#test] pill (dashed)
→ Auto-adds [#another] pill (dashed)
→ User can click X to remove any pill
→ Hashtags stay in text (as mentions/links)
→ No re-adding after removal via X
```

### Core Rules:
1. ✅ Auto-sync ADDS pills for new hashtags (after 1.5s debounce)
2. ✅ X button REMOVES pills permanently (adds to excluded list)
3. ✅ Text edits DON'T affect pills
4. ✅ Pills only change via auto-sync or manual actions

---

## Implementation Plan

### Phase 1: Add Excluded Streams (Simplified)

**Purpose**: Track which pills user removed, so auto-sync doesn't re-add them

**Files**:
1. `components/layout/upload-dialog.tsx`
2. `lib/hooks/use-stream-mentions.ts`
3. `components/streams/stream-picker.tsx`

**Changes**:

**In upload-dialog.tsx**:
```typescript
// Add state
const [excludedStreamNames, setExcludedStreamNames] = useState<string[]>([]);

// Reset
setExcludedStreamNames([]);

// Pass to hook
useStreamMentions(
  description,
  allStreams,
  streamIds,
  setStreamIds,
  pendingStreamNames,
  setPendingStreamNames,
  excludedStreamNames
);

// Pass to picker
<StreamPicker
  excludedStreamNames={excludedStreamNames}
  onExcludedStreamsChange={setExcludedStreamNames}
  // ... other props
/>
```

**In use-stream-mentions.ts**:
```typescript
// Update signature
export function useStreamMentions(
  text: string,
  streams: Stream[],
  selectedStreamIds: string[],
  onStreamsChange: (streamIds: string[]) => void,
  pendingStreamNames: string[],
  onPendingStreamsChange: (names: string[]) => void,
  excludedStreamNames: string[]
) {

// In syncStreams - skip excluded
const hashtagsToProcess = hashtags.filter(tag => {
  // Skip if user explicitly removed this pill
  if (excludedStreamNames.includes(tag)) {
    return false;
  }
  
  // Skip if at end and still typing
  const hashtagPattern = `#${tag}`;
  const isAtEnd = text.endsWith(hashtagPattern);
  if (isAtEnd && hashtags.length === 1) {
    return false;
  }
  return true;
});
```

**REMOVE THIS ENTIRE SECTION** (lines 118-149):
```typescript
// DELETE ALL OF THIS - we don't sync text deletion anymore
// Remove streams/pending that are no longer in text
const hashtagSet = new Set(hashtagsToProcess);
// ... all the deletion sync logic ...
```

**In stream-picker.tsx**:
```typescript
// Add props
excludedStreamNames?: string[];
onExcludedStreamsChange?: (names: string[]) => void;

// When removing pending pill
if (onExcludedStreamsChange && !excludedStreamNames?.includes(streamName)) {
  onExcludedStreamsChange([...(excludedStreamNames || []), streamName]);
}

// When removing real stream pill
const stream = streams.find(s => s.id === streamId);
if (stream && onExcludedStreamsChange && !excludedStreamNames?.includes(stream.name)) {
  onExcludedStreamsChange([...(excludedStreamNames || []), stream.name]);
}
```

---

### Phase 2: Fix Uppercase Support

**File**: `lib/hooks/use-stream-mentions.ts`

**Change parseHashtags**:
```typescript
const parseHashtags = React.useCallback((content: string): string[] => {
  // Match hashtags: any case, convert to lowercase
  const hashtagRegex = /#([a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)/gi;  // Added A-Z and i flag
  const matches = content.matchAll(hashtagRegex);
  const hashtags: string[] = [];
  
  for (const match of matches) {
    const tag = match[1].toLowerCase(); // Convert to lowercase
    if (tag.length >= 2) {
      hashtags.push(tag);
    }
  }
  
  return [...new Set(hashtags)];
}, []);
```

**Examples**:
- `#MyStream` → pill shows `mystream`
- `#DESIGN-SYSTEM` → pill shows `design-system`
- `#iOS` → pill shows `ios`

---

### Phase 3: Add Length Validation

**File**: `lib/hooks/use-stream-mentions.ts`

**Update parseHashtags**:
```typescript
for (const match of matches) {
  const tag = match[1].toLowerCase();
  // Validate length (2-50 chars per database constraint)
  if (tag.length >= 2 && tag.length <= 50) {
    hashtags.push(tag);
  } else if (tag.length > 50) {
    console.warn(`[useStreamMentions] Hashtag too long (${tag.length} chars), ignoring: #${tag.substring(0, 20)}...`);
  }
  // Tags < 2 chars silently skipped (like #a or #x)
}
```

---

### Phase 4: Add Error Feedback for Failed Creations

**File**: `components/layout/upload-dialog.tsx`

**Update handleSubmit** (around line 254):
```typescript
// Track results
const results = await Promise.all(createPromises);
createdStreamIds = results.filter(r => r.success).map(r => r.id);
const failedStreamNames = results.filter(r => !r.success).map(r => r.name);

console.log(`[UploadDialog] Created ${createdStreamIds.length}/${pendingStreamNames.length} streams`);

// Show warning if any failed (non-blocking)
if (failedStreamNames.length > 0) {
  setError(`Warning: Could not create stream(s): ${failedStreamNames.map(n => '#' + n).join(', ')}`);
  // Continue with upload using successfully created streams
}
```

Update promise handling:
```typescript
const createPromises = pendingStreamNames.map(async (name) => {
  try {
    const response = await fetch('/api/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        owner_type: 'user',
        is_private: false,
      }),
    });

    if (response.ok) {
      const { stream } = await response.json();
      console.log(`  ✓ Created stream: ${stream.name}`);
      return { success: true, id: stream.id, name };
    } else {
      console.error(`  ✗ Failed to create stream: ${name}`);
      return { success: false, name };
    }
  } catch (error) {
    console.error(`  ✗ Error creating stream ${name}:`, error);
    return { success: false, name };
  }
});
```

---

## Summary of Changes

### What Gets Simpler:
- ❌ **REMOVED**: Text-deletion sync (30 lines deleted)
- ❌ **NOT NEEDED**: Complex tracking of text vs pills
- ✅ **ADDED**: Simple excluded list (prevents re-adding)
- ✅ **ADDED**: Uppercase support (2 lines)
- ✅ **ADDED**: Length validation (5 lines)
- ✅ **ADDED**: Error feedback (15 lines)

### Net Result:
- **Lines removed**: ~30
- **Lines added**: ~50
- **Net change**: +20 lines for 4x more features
- **Code clarity**: Much better

---

## User Flows After Implementation

### Flow 1: Create New Stream
```
1. Type: "Check out #newstream"
2. Wait 1.5s
3. Pill appears: [#newstream] (dashed)
4. Click Post
5. Stream created, post added ✅
```

### Flow 2: Remove Pill (Mention Only)
```
1. Type: "Check out #newstream for ideas"
2. Pill appears: [#newstream]
3. Click X on pill
4. Pill removed permanently
5. "#newstream" stays in text as mention
6. Auto-sync WON'T re-add (in excluded list)
7. Click Post
8. Stream NOT created, #newstream just text ✅
```

### Flow 3: Edit Text Freely
```
1. Type: "Check out #test feature"
2. Pill appears: [#test]
3. Edit text to: "Check out #test new feature today"
4. Pill STAYS (text edits don't affect pills) ✅
5. Delete "#test" from text entirely
6. Pill STAYS (still assigned to stream) ✅
7. Post will include #test stream even though text doesn't mention it
```

**Is this last part what you want?** Or should deleting ALL instances of a hashtag remove the pill?

---

## Clarification Needed:

**Scenario**: User has pill `[#test]`, then deletes `#test` from description entirely.

**Option A**: Pill stays (post assigned to #test but description doesn't mention it)
**Option B**: Pill removed (if not in text anywhere, auto-remove)

**Which do you prefer?** I'm leaning toward **Option A** (full independence), but want to confirm!
