# 🐛 Bug Hunt Report

**Date**: January 27, 2025  
**Status**: 🔴 **8 BUGS FOUND** (3 Critical, 3 High, 2 Medium)

---

## 🔴 **CRITICAL BUGS** - Will Cause Runtime Errors

### Bug #1: StreamPicker Props Interface Mismatch
**Severity**: 🔴 **CRITICAL** - Runtime Error  
**Location**: `components/streams/stream-picker.tsx` ↔ `components/layout/upload-dialog.tsx`

**The Problem**:
```typescript
// StreamPicker expects (stream-picker.tsx line 19-26)
interface StreamPickerProps {
  streams: Stream[];                              // ❌ Required but not passed
  selectedStreamIds: string[];
  onSelectionChange: (streamIds: string[]) => void;  // ❌ Wrong name
  maxStreams?: number;
  disabled?: boolean;
  className?: string;
}

// But upload-dialog.tsx uses it like this (line 307-311)
<StreamPicker
  selectedStreamIds={streamIds}
  onSelectStreams={setStreamIds}  // ❌ Wrong prop name!
  disabled={isLoading}
  // ❌ Missing 'streams' prop entirely!
/>
```

**Impact**: 
- Component will crash with `Cannot read property 'filter' of undefined` on line 41
- Upload dialog won't work at all

**Fix Required**:
```typescript
// Option 1: Update interface to match usage
interface StreamPickerProps {
  selectedStreamIds: string[];
  onSelectStreams: (streamIds: string[]) => void;
  disabled?: boolean;
}

// Then import streams internally
import { streams } from '@/lib/mock-data/streams';
const activeStreams = streams.filter(s => s.status === 'active');

// Option 2: Update usage to match interface
<StreamPicker
  streams={streams}  // Add this
  selectedStreamIds={streamIds}
  onSelectionChange={setStreamIds}  // Fix prop name
  disabled={isLoading}
/>
```

---

### Bug #2: Empty assetStreams Junction Table Breaks All Stream Queries
**Severity**: 🔴 **CRITICAL** - Data Loss  
**Location**: `lib/mock-data/streams.ts` line 266, affects all stream pages

**The Problem**:
```typescript
// streams.ts line 266
export let assetStreams: AssetStream[] = [];  // ❌ EMPTY!

// But app/streams/page.tsx line 39-41 tries to use it
const streamAssetIds = assetStreams
  .filter((as) => as.streamId === stream.id)  // ❌ Always returns []
  .map((as) => as.assetId);

// Result: streamAssetIds is ALWAYS empty array
const streamAssets = assets.filter((asset) => streamAssetIds.includes(asset.id));
// Result: streamAssets is ALWAYS empty array

// So assetsCount will ALWAYS be 0
assetsCount: streamAssets.length,  // ❌ Always 0!
```

**Impact**:
- All streams show 0 assets (even though assets have streamIds)
- Stream pages are empty
- Users think streams are broken

**Proof**:
```bash
# Testing showed streams API works because it uses getAssetsForStream()
# which reads from asset.streamIds directly
curl http://localhost:3000/api/streams/stream-4/assets
# Returns 2 assets ✅

# But the pages don't work because they use assetStreams junction table
# app/streams/page.tsx line 39 uses assetStreams directly
# Result: 0 assets shown in UI ❌
```

**Fix Required**:
```typescript
// Initialize assetStreams from assets at module load
export let assetStreams: AssetStream[] = [];

// Populate it immediately
import { assets } from './assets';

assets.forEach(asset => {
  if (asset.streamIds) {
    asset.streamIds.forEach(streamId => {
      assetStreams.push({
        assetId: asset.id,
        streamId: streamId,
        addedAt: asset.createdAt,
        addedBy: asset.uploaderId,
      });
    });
  }
});

// Now assetStreams is populated with 30+ relationships!
```

---

### Bug #3: Data Source Inconsistency - Two Sources of Truth
**Severity**: 🔴 **CRITICAL** - Architecture Bug  
**Location**: Multiple files

**The Problem**:
There are **TWO conflicting functions** with the same name doing different things:

```typescript
// Version 1: lib/mock-data/streams.ts line 269
export function getStreamsForAsset(assetId: string): string[] {
  return assetStreams  // ❌ Uses EMPTY assetStreams junction table
    .filter(as => as.assetId === assetId)
    .map(as => as.streamId);
}

// Version 2: lib/mock-data/migration-helpers.ts line 56
export function getStreamsForAsset(asset: Asset): string[] {
  if (asset.streamIds && asset.streamIds.length > 0) {
    return asset.streamIds;  // ✅ Uses asset.streamIds directly
  }
  // ... migration fallbacks
}
```

**The Conflict**:
- API routes import from `migration-helpers` (line 4 in `api/streams/[id]/assets/route.ts`)
- Some components might import from `streams.ts`
- Different behavior depending on which import is used!

**Impact**:
- Inconsistent data across the app
- Some places see assets, some don't
- Very confusing to debug

**Fix Required**:
Pick ONE source of truth:
- **Option A**: Remove `getStreamsForAsset` from `streams.ts`, only use migration-helpers version
- **Option B**: Keep junction table synced with asset.streamIds at all times
- **Recommended**: Use Option A and deprecate junction table until database

---

## 🟠 **HIGH PRIORITY BUGS** - Logic Errors

### Bug #4: Variable Shadowing in Migration Helpers
**Severity**: 🟠 **HIGH** - Logic Error  
**Location**: `lib/mock-data/migration-helpers.ts` line 86

**The Problem**:
```typescript
import { Stream, streams, assetStreams, AssetStream } from "./streams";
//                           ^^^^^^^^^^^^ Imported here

export function getAssetsForStream(streamId: string, assets: Asset[]): Asset[] {
  return assets.filter(asset => {
    const assetStreams = getStreamsForAsset(asset);  // ❌ Shadows import!
    //    ^^^^^^^^^^^^ Same name as imported variable
    return assetStreams.includes(streamId);
  });
}
```

**Impact**:
- The imported `assetStreams` array is inaccessible within this function
- Could cause confusion if someone tries to use the imported version
- Violates best practices (ESLint would flag this)

**Fix Required**:
```typescript
export function getAssetsForStream(streamId: string, assets: Asset[]): Asset[] {
  return assets.filter(asset => {
    const assetStreamIds = getStreamsForAsset(asset);  // ✅ Different name
    return assetStreamIds.includes(streamId);
  });
}
```

---

### Bug #5: StreamBadge Type Mismatch
**Severity**: 🟠 **HIGH** - Type Error  
**Location**: `components/streams/stream-badge.tsx`

**The Problem**:
```typescript
// StreamBadge expects full Stream object (line 9-14)
interface StreamBadgeProps {
  stream: Stream;  // ❌ Full object required
  clickable?: boolean;
  isLocked?: boolean;
  className?: string;
}

// But element-card.tsx has to do extra work (line 42-43)
const assetStreams = React.useMemo(() => getAssetStreamObjects(asset), [asset]);
// Then map over them
{visibleStreams.map((stream) => (
  <StreamBadge key={stream.id} stream={stream} />
))}
```

**Why This Is A Bug**:
- Assets have `streamIds` as simple string array
- But to render badges, must fetch full Stream objects
- This causes unnecessary data fetching and mapping
- Creates performance overhead

**Better Design**:
```typescript
// Create two versions:

// For when you only have ID and name
<StreamBadge id="stream-1" name="iOS App" />

// For when you have full object  
<StreamBadge stream={stream} />

// Or accept both:
interface StreamBadgeProps {
  stream?: Stream;
  id?: string;
  name?: string;
  // ... rest
}
```

---

### Bug #6: Unimplemented Stream Creation in Picker
**Severity**: 🟠 **HIGH** - Feature Incomplete  
**Location**: `components/streams/stream-picker.tsx` line 74-80

**The Problem**:
```typescript
const handleCreateStream = React.useCallback(() => {
  // TODO: Implement actual stream creation via API
  console.log("Creating stream:", newStreamName);  // ❌ Does nothing!
  setNewStreamName("");
  setIsCreateDialogOpen(false);
}, [newStreamName]);
```

**Impact**:
- User clicks "Create New Stream" button
- Dialog closes
- Nothing happens!
- No stream is created
- Bad UX - looks broken

**Fix Required**:
Either implement it or remove the UI:
```typescript
const handleCreateStream = React.useCallback(async () => {
  if (!newStreamName.trim()) return;
  
  try {
    const response = await fetch('/api/streams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newStreamName,
        ownerType: 'user',
      }),
    });
    
    if (!response.ok) throw new Error('Failed');
    
    const { stream } = await response.json();
    onSelectionChange([...selectedStreamIds, stream.id]);
    setNewStreamName("");
    setIsCreateDialogOpen(false);
  } catch (error) {
    console.error('Failed to create stream:', error);
    // Show error
  }
}, [newStreamName, selectedStreamIds, onSelectionChange]);
```

---

## 🟡 **MEDIUM PRIORITY BUGS** - Edge Cases

### Bug #7: No Validation for Empty Stream Name
**Severity**: 🟡 **MEDIUM** - Validation Gap  
**Location**: `app/api/streams/route.ts` line 54-59

**The Problem**:
```typescript
const trimmedName = name.trim();

if (trimmedName.length === 0) {  // ✅ This check exists
  return NextResponse.json(
    { error: 'Stream name cannot be empty' },
    { status: 400 }
  );
}

// But what about this case?
name = "     "  // All spaces
trimmedName = ""  // After trim
// Check catches it ✅

// But what about?
name = "#"  // Just the # symbol
trimmedName = "#"  // Still passes!
// Next check: length < 3
// Error: "must be at least 3 characters" ✅

// Actually this is fine - good validation!
```

**Wait, this is NOT a bug!** The validation is correct. False alarm.

---

### Bug #8: Race Condition in activeStreams Memoization
**Severity**: 🟡 **MEDIUM** - Performance Issue  
**Location**: `components/streams/stream-picker.tsx` line 41

**The Problem**:
```typescript
// Line 41 - Not memoized!
const activeStreams = streams.filter(s => s.status === 'active');

// Then line 44-52 - Uses activeStreams
const filteredStreams = React.useMemo(() => {
  if (!searchQuery.trim()) return activeStreams;  // ❌ Not in deps!
  // ...
}, [activeStreams, searchQuery]);  // ❌ activeStreams recreated every render
```

**Impact**:
- `activeStreams` is recomputed on every render
- `filteredStreams` memo breaks because `activeStreams` is always new reference
- Unnecessary re-filtering
- Performance hit

**Fix Required**:
```typescript
// Memoize activeStreams
const activeStreams = React.useMemo(() => 
  streams.filter(s => s.status === 'active'),
  [streams]  // Only recompute when streams change
);

// Now filteredStreams memo works correctly
const filteredStreams = React.useMemo(() => {
  if (!searchQuery.trim()) return activeStreams;
  // ...
}, [activeStreams, searchQuery]);
```

---

## 📊 **Bug Summary**

| Bug # | Severity | Type | Will Crash? | Impact |
|-------|----------|------|-------------|---------|
| #1 | 🔴 Critical | Props Mismatch | ✅ YES | Upload broken |
| #2 | 🔴 Critical | Empty Data | ❌ No | Shows 0 assets |
| #3 | 🔴 Critical | Architecture | ❌ No | Data inconsistency |
| #4 | 🟠 High | Shadowing | ❌ No | Code smell |
| #5 | 🟠 High | Type Design | ❌ No | Extra work |
| #6 | 🟠 High | Unimplemented | ❌ No | Feature broken |
| #7 | ~~🟡 Medium~~ | ~~Validation~~ | ❌ No | FALSE ALARM ✅ |
| #8 | 🟡 Medium | Performance | ❌ No | Unnecessary renders |

**Total**: **7 Real Bugs** (1 false alarm)

---

## 🎯 **Fix Priority**

### Must Fix Immediately (Before ANY Testing):
1. **Bug #1** - Props mismatch (10 min)
2. **Bug #2** - Initialize assetStreams (20 min)
3. **Bug #3** - Pick one source of truth (30 min)

### Should Fix Before Production:
4. **Bug #4** - Fix variable shadowing (5 min)
5. **Bug #6** - Implement stream creation (1 hour)

### Can Fix As Polish:
6. **Bug #5** - Improve StreamBadge API (30 min)
7. **Bug #8** - Memoize activeStreams (5 min)

**Total Fix Time**: ~2.5 hours

---

## 🧪 **How These Bugs Slipped Through**

1. **No Type Checking at Component Boundaries**
   - StreamPicker props weren't validated
   - Should have TypeScript error but didn't fail

2. **No Data Initialization Tests**
   - assetStreams being empty wasn't caught
   - Should test data integrity at startup

3. **No Integration Tests**
   - Upload flow wasn't tested end-to-end
   - Would have caught props mismatch immediately

4. **API Testing But Not UI Testing**
   - API works (uses asset.streamIds)
   - But UI broken (uses assetStreams junction table)
   - This inconsistency went unnoticed

---

## ✅ **Recommended Next Steps**

1. Fix Bug #1-#3 immediately (1 hour)
2. Run the app and test:
   - Upload an image with streams
   - View streams page
   - Click into a stream
   - Verify assets appear
3. Fix Bug #4-#6 (2 hours)
4. Add integration tests
5. Deploy to staging

---

**Bug Hunt Complete** 🎯  
**Found**: 7 real bugs, 1 false alarm  
**Severity**: 3 Critical, 3 High, 1 Medium  
**Fix Time**: ~2.5 hours total

