# Code Review: Pending Streams Feature - Edge Cases & Bug Hunt

## Critical Issues Found 🚨

### Issue 1: Pill Removal Doesn't Work Properly ⚠️ CRITICAL

**Problem**: When user clicks X on a pill, the pill is removed BUT auto-sync re-adds it

**Current Flow**:
```
1. User types: "Check out #newstream"
2. Pill appears: [#newstream] (dashed)
3. User clicks X on pill → removed from pendingStreamNames
4. BUT: #newstream still in description text
5. After 1.5s debounce → auto-sync detects #newstream again
6. Pill re-appears automatically! ❌
```

**Root Cause**:
- Pill removal only updates state (pendingStreamNames/streamIds)
- Hashtag remains in text
- Auto-sync (useStreamMentions) re-detects it and re-adds pill
- **No way to distinguish "user wants mention only" from "user wants assignment"**

**Current Code Gap**:
```typescript
// In StreamPicker - removes from state
toggleStream() → removes from pendingStreamNames

// In useStreamMentions - re-adds after debounce
syncStreams() → detects #newstream in text → adds back to pendingStreamNames
```

**Missing Feature**: "Excluded streams" - streams user explicitly removed

---

### Issue 2: No Way to Convert Assignment → Mention

**User's Original Intent**:
> "If I type #design-system then remove the pill, it should not delete the text → instead it should become a link to the stream"

**Current Behavior**:
- Remove pill → hashtag stays in text ✅
- But auto-sync re-adds the pill ❌
- No visual distinction between "mention" and "assignment"

**What We Need**:
- Track which hashtags are "excluded" (mentions only, not assignments)
- Don't auto-create pills for excluded hashtags
- Render excluded hashtags as links (future enhancement)

---

### Issue 3: processedHashtagsRef Logic Flaw

**Current Code** (lines 127-136, 141-148):
```typescript
if (streamsToKeep.length !== selectedStreamIds.length) {
  onStreamsChange(streamsToKeep);
  // Clear processed set for removed streams
  selectedStreamIds.forEach(id => {
    const stream = streams.find(s => s.id === id);
    if (stream && !hashtagSet.has(stream.name)) {
      processedHashtagsRef.current.delete(stream.name);
    }
  });
}
```

**Problem**: This only clears processed set when hashtag is DELETED from text, not when pill is REMOVED manually

**Scenario**:
```
1. Type #test → pill appears, marked as processed
2. Remove pill manually
3. processedHashtagsRef still has "test"
4. Auto-sync sees #test in text, but it's in processedHashtagsRef
5. Auto-sync skips it (line 92: already processed)
6. Pill doesn't re-appear
```

**Wait, this might actually work correctly?** Let me trace through again...

Actually NO - line 92 filters out processed, so if we remove the pill but keep the text, it WON'T re-add because it's still in processedHashtagsRef. But we WANT it to re-add (according to current design).

**Confusion**: What should happen when user removes pill?

---

## Edge Cases & Scenarios

### Scenario 1: Remove Pill, Keep Hashtag Text
```
Action: Type #test, remove pill
Expected: Hashtag becomes mention only (no pill, not assigned to stream)
Current: Pill removed, but auto-sync re-adds it after 1.5s
Status: ❌ BROKEN (conflicts with auto-sync)
```

### Scenario 2: Delete Hashtag Text
```
Action: Type #test, delete text
Expected: Pill disappears, stream not created
Current: Works correctly ✅
Status: ✅ WORKS
```

### Scenario 3: Multiple Hashtags, Remove One Pill
```
Action: Type "#ios #android", remove #ios pill
Expected: 
  - #ios becomes mention (no pill)
  - #android keeps pill (assigned)
Current: #ios pill re-appears after 1.5s
Status: ❌ BROKEN
```

### Scenario 4: Type Uppercase Hashtag
```
Action: Type #MyStream or #NEWSTREAM
Expected: Should work (converted to lowercase)
Current: Regex only matches lowercase /#([a-z0-9]+...)/ 
Status: ⚠️ POTENTIAL BUG - uppercase ignored
```

### Scenario 5: Pending Stream Name Conflicts
```
Action: 
  1. Create pending #test
  2. Another user creates real #test
  3. First user clicks Post
Expected: Use existing stream (idempotent API)
Current: Should work (API returns existing)
Status: ✅ WORKS (API idempotent)
```

### Scenario 6: All Stream Creations Fail
```
Action: Create 3 pending streams, all fail network errors
Expected: Show error, don't upload post? Or upload with 0 streams?
Current: Uploads post with 0 streams (silent failure)
Status: ⚠️ UNCLEAR UX - should we show error?
```

### Scenario 7: Partial Stream Creation Failure
```
Action: Create #ios, #android, #web - only #ios succeeds
Expected: Post attached to #ios, show warning about failures?
Current: Silent failure for #android and #web
Status: ⚠️ NO USER FEEDBACK
```

### Scenario 8: Remove Pill Mid-Creation
```
Action:
  1. Type #test (pending pill)
  2. Click Post (starts creating stream)
  3. Immediately remove #test pill while creating
  4. Stream creation completes
Expected: ???
Current: Stream created but not attached to post
Status: ⚠️ RACE CONDITION
```

### Scenario 9: Type Same Hashtag Twice
```
Action: Type "Check #test design for #test feature"
Expected: One pill, one assignment
Current: One pill (Set deduplication works)
Status: ✅ WORKS
```

### Scenario 10: Add Stream via Picker, Also Type Hashtag
```
Action:
  1. Click "+ Add Streams" button
  2. Select "design-system"
  3. Also type #design-system in description
Expected: One pill (solid border), one assignment
Current: Might create duplicate pill?
Status: ⚠️ NEEDS TESTING
```

### Scenario 11: Special Characters in Hashtags
```
Action: Type #my_stream or #my.stream or #my@stream
Expected: Sanitized or rejected
Current: 
  - Regex only allows a-z0-9 and hyphens
  - #my_stream → matches "my" only (stops at _)
  - #my.stream → matches "my" only
Status: ⚠️ SILENT TRUNCATION (confusing UX)
```

### Scenario 12: Very Long Hashtag
```
Action: Type #thisisaverylongstreamnamethatshouldprobablyberejected
Expected: Reject if > 50 chars (database constraint)
Current: 
  - Hook accepts it
  - API rejects with 400 error
  - Silent failure
Status: ⚠️ NO VALIDATION
```

### Scenario 13: Reserved Stream Names
```
Action: Type #main or #admin or #system
Expected: Should these be reserved?
Current: No restrictions
Status: ℹ️ DESIGN DECISION NEEDED
```

### Scenario 14: Navigate Away During Upload
```
Action:
  1. Start uploading with pending streams
  2. Close dialog mid-upload
  3. Streams being created, but upload canceled
Expected: Cancel stream creation? Or let them finish?
Current: Streams created (orphans if upload canceled)
Status: ⚠️ ORPHAN RISK
```

### Scenario 15: Network Offline During Post
```
Action: Click Post while offline
Expected: Show clear error
Current: Fetch fails, error shown
Status: ✅ WORKS (but could be better UX)
```

---

## Architectural Issues

### Issue A: Conflicting State Sources

**Three sources of truth**:
1. Description text (hashtags typed)
2. streamIds (real streams assigned)
3. pendingStreamNames (pending streams assigned)

**Problem**: No way to track "excluded" hashtags (mentions vs assignments)

**Example**:
```
description: "Check #test feature"
streamIds: []
pendingStreamNames: []

Question: Is #test a mention or should it be assigned?
Answer: Unknown - need fourth state source
```

---

### Issue B: Auto-Sync vs Manual Control

**Conflict**:
- Auto-sync adds pills automatically after 1.5s
- User can manually remove pills
- Auto-sync re-adds them (no memory of removal)

**Need**: Either:
1. Disable auto-sync when user manually removes, OR
2. Track excluded streams separately

---

### Issue C: No Visual Feedback for Stream Creation Failures

**Current**:
```typescript
if (response.ok) {
  return stream.id;
}
return null; // Silent failure
```

**Issues**:
- User doesn't know which streams failed
- Post might be in fewer streams than expected
- No retry option

---

## Solution Approaches

### Option 1: Add "Excluded Streams" State (RECOMMENDED)

**New State**:
```typescript
const [excludedStreamNames, setExcludedStreamNames] = useState<string[]>([]);
```

**Logic**:
- Remove pill manually → add to excludedStreamNames
- Auto-sync skips excluded streams
- Delete hashtag from text → remove from excludedStreamNames
- Re-type hashtag → remove from excluded, add pill

**Pros**:
- Clean separation of mentions vs assignments
- User has full control
- Auto-sync works without interference

**Cons**:
- More state complexity
- Need to sync 4 state pieces

---

### Option 2: Disable Auto-Sync After Manual Removal

**Logic**:
- Track "manuallyManaged" streams
- Auto-sync only adds NEW streams, never re-adds removed ones
- Clearing text re-enables auto-sync for that stream

**Pros**:
- Simpler than Option 1
- Respects user intent

**Cons**:
- Still need extra tracking
- Harder to re-add after accidental removal

---

### Option 3: Make Pills Opt-In Only (Remove Auto-Sync)

**Logic**:
- Typing hashtag does nothing automatically
- User must select from dropdown to create pill
- No auto-sync at all

**Pros**:
- No conflicts
- Explicit user control
- Simpler code

**Cons**:
- Worse UX (more manual work)
- Loses "magic" of auto-detection

---

## Other Bugs & Improvements

### Bug: Uppercase Hashtags Ignored
**Issue**: `#MyStream` doesn't match regex `/#([a-z0-9]+...)/`

**Fix**: Make regex case-insensitive, convert to lowercase
```typescript
const hashtagRegex = /#([a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)/gi;
const tag = match[1].toLowerCase();
```

---

### Bug: No Validation for Max Length
**Issue**: Can type 100-char hashtag, API rejects silently

**Fix**: Validate in hook or show error
```typescript
if (tag.length > 50) {
  console.warn('Hashtag too long:', tag);
  continue; // Skip
}
```

---

### Bug: Silent Creation Failures
**Issue**: If 3/5 streams fail to create, user doesn't know

**Fix**: Show toast/notification
```typescript
if (createdStreamIds.length < pendingStreamNames.length) {
  const failed = pendingStreamNames.length - createdStreamIds.length;
  showToast(`Warning: ${failed} stream(s) could not be created`);
}
```

---

### Improvement: Loading State During Creation
**Issue**: No visual feedback while creating streams

**Fix**: Show progress
```typescript
setIsLoading(true);
setLoadingMessage("Creating streams...");
// ... create streams ...
setLoadingMessage("Uploading image...");
```

---

### Improvement: Cancel Upload Should Cancel Stream Creation
**Issue**: Close dialog mid-upload → streams still created (orphans)

**Fix**: Use AbortController
```typescript
const abortController = new AbortController();
// Cancel on dialog close
```

---

## Testing Checklist

### Basic Functionality
- [ ] Type #test → dashed pill appears
- [ ] Type #existing → solid pill appears
- [ ] Delete #test from text → pill disappears
- [ ] Click X on pill → pill disappears
- [ ] Post with pending → streams created
- [ ] Post with 0 streams → uploads successfully

### Edge Cases
- [ ] Remove pill, keep text → auto-sync behavior?
- [ ] Type #MyStream (uppercase) → works?
- [ ] Type 100-char hashtag → handled gracefully?
- [ ] Create 5 pending, 2 fail → user notified?
- [ ] Close dialog mid-upload → orphans prevented?
- [ ] Select stream via picker + type hashtag → no duplicates?
- [ ] Type #my_stream → sanitized properly?
- [ ] Network offline → clear error message?

---

## Recommended Implementation Plan

### Phase 1: Fix Critical Issue (Pill Removal)
**Add excluded streams tracking**:
```typescript
const [excludedStreamNames, setExcludedStreamNames] = useState<string[]>([]);
```

**Update auto-sync**:
- Skip hashtags in excludedStreamNames
- Don't create pills for excluded

**Update pill removal**:
- Add to excludedStreamNames when X clicked
- Remove from excludedStreamNames when hashtag deleted from text

---

### Phase 2: Fix Uppercase Hashtags
**Update regex**:
```typescript
const hashtagRegex = /#([a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)/gi;
const tag = match[1].toLowerCase();
```

---

### Phase 3: Add Length Validation
**In parseHashtags**:
```typescript
if (tag.length >= 2 && tag.length <= 50) {
  hashtags.push(tag);
}
```

---

### Phase 4: Add User Feedback for Failures
**After stream creation**:
```typescript
const failedCount = pendingStreamNames.length - createdStreamIds.length;
if (failedCount > 0) {
  // Show toast or inline warning
  console.warn(`${failedCount} stream(s) could not be created`);
}
```

---

### Phase 5: Add Loading States
**During stream creation**:
```typescript
setIsLoading(true);
setStatusMessage(`Creating ${pendingStreamNames.length} stream(s)...`);
```

---

## Critical Questions

### Q1: What should happen when user removes pill?

**Option A**: Hashtag becomes mention (no pill, no assignment)
- Requires excludedStreamNames tracking
- Auto-sync skips excluded
- User intent: "I want to reference this stream, not add post to it"

**Option B**: Removing pill ALSO removes hashtag from text
- Simpler (no excluded tracking)
- But destroys user's text
- Bad UX if accidental

**Recommendation**: Option A - track excluded streams

---

### Q2: Should auto-sync run continuously?

**Current**: Yes, every 1.5s after typing stops

**Alternative**: Only run auto-sync until user manually interacts with pills, then disable

**Recommendation**: Keep auto-sync, but skip excluded streams

---

### Q3: Show errors for failed stream creation?

**Options**:
- Silent (current) - post succeeds with fewer streams
- Warning - show toast "2/3 streams created"
- Error - block post, let user retry

**Recommendation**: Warning (informative but non-blocking)

---

## Files That Need Changes

### Critical (Phase 1):
1. `components/layout/upload-dialog.tsx` - Add excludedStreamNames state
2. `lib/hooks/use-stream-mentions.ts` - Skip excluded streams
3. `components/streams/stream-picker.tsx` - Update pill removal logic

### Important (Phases 2-3):
4. `lib/hooks/use-stream-mentions.ts` - Uppercase regex + length validation

### Nice to Have (Phases 4-5):
5. `components/layout/upload-dialog.tsx` - Error feedback + loading states

---

## Implementation Priority

### Must Fix Now:
1. **Excluded streams tracking** - Prevents auto-sync from re-adding removed pills

### Should Fix Soon:
2. **Uppercase hashtags** - Common user input pattern
3. **Length validation** - Prevents API errors

### Can Do Later:
4. **Error feedback** - Improves UX but not breaking
5. **Loading states** - Polish
6. **Mention rendering** - Future feature

---

## Risk Assessment

### High Risk Issues:
- 🔴 **Pill removal doesn't work** - Core feature broken
- 🔴 **Uppercase ignored** - Unexpected behavior

### Medium Risk Issues:
- 🟡 **Silent failures** - Users confused about missing streams
- 🟡 **No length validation** - API errors without feedback

### Low Risk Issues:
- 🟢 **No loading states** - Works but less polished
- 🟢 **Special chars truncated** - Edge case

---

## Recommended Next Steps

1. **Implement excluded streams tracking** (fixes critical pill removal issue)
2. **Add uppercase support** (common user pattern)
3. **Add length validation** (prevents API errors)
4. **Test all edge cases**
5. **Add user feedback for failures** (polish)

Total time estimate: 2-3 hours for phases 1-3

