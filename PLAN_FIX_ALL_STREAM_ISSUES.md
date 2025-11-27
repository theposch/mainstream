# Implementation Plan: Fix All Stream Mention Issues

## Phase 1: Excluded Streams Tracking (Critical)

### Problem
Clicking X on pill removes it, but auto-sync re-adds it after 1.5s because hashtag is still in text.

### Solution
Add `excludedStreamNames` state to track streams user explicitly removed (mentions only, not assignments).

### Files to Modify

**1. components/layout/upload-dialog.tsx**

Add state:
```typescript
const [excludedStreamNames, setExcludedStreamNames] = useState<string[]>([]);
```

Reset in resetForm():
```typescript
setExcludedStreamNames([]);
```

Pass to useStreamMentions:
```typescript
useStreamMentions(
  description,
  allStreams,
  streamIds,
  setStreamIds,
  pendingStreamNames,
  setPendingStreamNames,
  excludedStreamNames  // NEW
);
```

Pass to StreamPicker:
```typescript
<StreamPicker
  selectedStreamIds={streamIds}
  onSelectStreams={setStreamIds}
  pendingStreamNames={pendingStreamNames}
  onPendingStreamsChange={setPendingStreamNames}
  excludedStreamNames={excludedStreamNames}  // NEW
  onExcludedStreamsChange={setExcludedStreamNames}  // NEW
  disabled={isLoading}
  variant="compact"
/>
```

**2. lib/hooks/use-stream-mentions.ts**

Update signature:
```typescript
export function useStreamMentions(
  text: string,
  streams: Stream[],
  selectedStreamIds: string[],
  onStreamsChange: (streamIds: string[]) => void,
  pendingStreamNames: string[],
  onPendingStreamsChange: (names: string[]) => void,
  excludedStreamNames: string[]  // NEW
) {
```

Update syncStreams to skip excluded:
```typescript
// Filter out excluded streams (user removed pill but kept text)
const hashtagsToProcess = hashtags.filter(tag => {
  // Skip if user explicitly excluded this
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

**3. components/streams/stream-picker.tsx**

Add props:
```typescript
interface StreamPickerProps {
  selectedStreamIds: string[];
  onSelectStreams: (streamIds: string[]) => void;
  pendingStreamNames?: string[];
  onPendingStreamsChange?: (names: string[]) => void;
  excludedStreamNames?: string[];  // NEW
  onExcludedStreamsChange?: (names: string[]) => void;  // NEW
  // ...
}
```

Update toggleStream for pending removal:
```typescript
if (isSelected) {
  // Remove from pending
  if (onPendingStreamsChange) {
    onPendingStreamsChange(pendingStreamNames.filter(name => name !== streamName));
  }
  // Add to excluded (so auto-sync doesn't re-add)
  if (onExcludedStreamsChange && !excludedStreamNames?.includes(streamName)) {
    onExcludedStreamsChange([...(excludedStreamNames || []), streamName]);
  }
}
```

Update toggleStream for real stream removal:
```typescript
if (isSelected) {
  onSelectStreams(selectedStreamIds.filter(id => id !== streamId));
  // Add to excluded
  const stream = streams.find(s => s.id === streamId);
  if (stream && onExcludedStreamsChange && !excludedStreamNames?.includes(stream.name)) {
    onExcludedStreamsChange([...(excludedStreamNames || []), stream.name]);
  }
}
```

---

## Phase 2: Uppercase Hashtag Support

### Problem
`#MyStream` or `#DESIGN-SYSTEM` completely ignored by regex.

### Solution
Accept uppercase in regex, convert to lowercase for storage.

### Files to Modify

**1. lib/hooks/use-stream-mentions.ts**

Update parseHashtags:
```typescript
const parseHashtags = React.useCallback((content: string): string[] => {
  // Match hashtags: any case, numbers, hyphens
  const hashtagRegex = /#([a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)/gi;
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

---

## Phase 3: Length Validation

### Problem
Can type 100-char hashtag, API rejects silently.

### Solution
Validate length in frontend before adding to pending.

### Files to Modify

**1. lib/hooks/use-stream-mentions.ts**

Update parseHashtags:
```typescript
for (const match of matches) {
  const tag = match[1].toLowerCase();
  // Validate length (2-50 chars per database constraint)
  if (tag.length >= 2 && tag.length <= 50) {
    hashtags.push(tag);
  } else if (tag.length > 50) {
    console.warn(`[useStreamMentions] Hashtag too long (${tag.length} chars): ${tag.substring(0, 20)}...`);
  }
}
```

---

## Phase 4: User Feedback for Creation Failures

### Problem
If 3/5 streams fail to create, user doesn't know.

### Solution
Show error message with count of failed streams.

### Files to Modify

**1. components/layout/upload-dialog.tsx**

Update handleSubmit after stream creation:
```typescript
// Create pending streams first
let createdStreamIds: string[] = [];
const failedStreamNames: string[] = [];

if (pendingStreamNames.length > 0) {
  console.log('[UploadDialog] Creating pending streams...');
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
        console.log(`  ✓ Created stream: ${stream.name} (${stream.id})`);
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

  const results = await Promise.all(createPromises);
  createdStreamIds = results.filter(r => r.success).map(r => r.id!);
  failedStreamNames = results.filter(r => !r.success).map(r => r.name);
  
  console.log(`[UploadDialog] Created ${createdStreamIds.length}/${pendingStreamNames.length} streams`);
  
  // Show error if any failed
  if (failedStreamNames.length > 0) {
    setError(`Warning: Could not create stream(s): ${failedStreamNames.map(n => '#' + n).join(', ')}`);
    // Don't return - still upload the post with successful streams
  }
}
```

---

## Phase 5: Text Deletion Should Clear Excluded

### Problem
If user removes pill (adds to excluded), then deletes hashtag from text, the hashtag remains in excluded. If they retype it, it won't auto-create pill.

### Solution
When hashtag is deleted from text, remove from excludedStreamNames.

### Files to Modify

**1. lib/hooks/use-stream-mentions.ts**

Add excluded cleanup in syncStreams:
```typescript
// Remove streams/pending that are no longer in text
const hashtagSet = new Set(hashtagsToProcess);

// Also remove from excluded if no longer in text
const excludedToKeep = excludedStreamNames.filter(name => hashtagSet.has(name));
if (excludedToKeep.length !== excludedStreamNames.length) {
  onExcludedStreamsChange(excludedToKeep);
}
```

Need to add callback parameter:
```typescript
export function useStreamMentions(
  text: string,
  streams: Stream[],
  selectedStreamIds: string[],
  onStreamsChange: (streamIds: string[]) => void,
  pendingStreamNames: string[],
  onPendingStreamsChange: (names: string[]) => void,
  excludedStreamNames: string[],
  onExcludedStreamsChange: (names: string[]) => void  // NEW
) {
```

---

## Testing Matrix

| Scenario | Expected | Priority |
|----------|----------|----------|
| Remove pill → wait 1.5s | Pill stays removed | 🔴 Critical |
| Remove pill → delete text → retype | New pill appears | 🔴 Critical |
| Type #MyStream (uppercase) | Pill appears for "mystream" | 🔴 Critical |
| Type 100-char hashtag | Skipped with console warning | 🟡 Important |
| Create 3 pending, 1 fails | Error shows which failed | 🟡 Important |
| Remove real stream pill | Added to excluded | 🔴 Critical |
| Type #test twice | One pill only | ✅ Works |
| Post with 0 streams | Uploads successfully | ✅ Works |

---

## Implementation Order

### Step 1: Add Excluded Streams State
- Upload dialog: Add state
- Pass to hook and picker

### Step 2: Update useStreamMentions Hook
- Add excluded parameter
- Skip excluded in syncStreams
- Clean up excluded when text deleted
- Accept onExcludedStreamsChange callback

### Step 3: Update StreamPicker
- Add excluded props
- Add to excluded when pill removed
- Handle both pending and real streams

### Step 4: Fix Uppercase Support
- Update regex to case-insensitive
- Convert to lowercase

### Step 5: Add Length Validation
- Check 2-50 char range
- Warn about too-long hashtags

### Step 6: Add Error Feedback
- Track failed stream creations
- Show warning message with failed names
- Don't block post (non-fatal error)

---

## Files Modified Summary

1. `components/layout/upload-dialog.tsx` - Excluded state + error feedback
2. `lib/hooks/use-stream-mentions.ts` - Excluded logic + uppercase + length
3. `components/streams/stream-picker.tsx` - Excluded handling

**Total Changes**: ~150 lines across 3 files

---

**Ready to implement?**

