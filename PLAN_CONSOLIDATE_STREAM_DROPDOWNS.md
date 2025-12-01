# Plan: Consolidate Stream Dropdowns

## 🎯 Goal
Reuse `StreamMentionDropdown` component for both hashtag auto-suggest AND "Add streams" button. DRY principle + consistent UX.

---

## 📊 Current Situation

### Two Similar Dropdowns:

#### 1. StreamMentionDropdown (Hashtag Auto-Suggest)
**Location**: `components/streams/stream-mention-dropdown.tsx`
**Usage**: When user types `#` in description field
**Features**:
- ✅ Position-based portal (appears at cursor)
- ✅ Filters streams by query
- ✅ Shows "+ Create #name" option
- ✅ Keyboard navigation (↑↓, Enter, Tab, Esc)
- ✅ Auto-scrolls selected item
- ✅ Clean, minimal UI
- ✅ Blue color for create option
- ✅ Plus icon vs Hash icon
- ✅ "Create new stream" label

**Props**:
```typescript
{
  query: string;
  streams: Stream[];
  position: { top: number; left: number };
  onSelect: (streamName: string, isNew: boolean) => void;
  onClose: () => void;
  selectedStreamIds: string[];
}
```

#### 2. StreamPicker Dropdown (Add Streams Button)
**Location**: `components/streams/stream-picker.tsx` (renderSelectionContent)
**Usage**: When user clicks "+ Add streams" button
**Features**:
- ✅ Popover-based (attached to button)
- ✅ Search input field
- ✅ Filters streams by query
- ✅ Shows "+ Create #name" option
- ✅ Keyboard navigation (↑↓, Enter, Esc)
- ✅ Shows checkboxes for selected items
- ✅ Blue color for create option
- ✅ Plus icon vs Hash icon
- ✅ "Create new stream" label

**Code**: Inline in component (not separate)

---

## 🤔 The Problem

**Duplicate code:**
- Similar filtering logic
- Similar "create option" logic
- Similar rendering (Plus icon, blue color, labels)
- Similar keyboard navigation
- **~150 lines of duplicated/similar code**

**Inconsistencies:**
- Different visual styling (slight variations)
- Different keyboard shortcuts (Tab vs no Tab)
- Different positioning systems

---

## ✨ The Solution

### Option A: Use StreamMentionDropdown for Both (Recommended)

**Make StreamMentionDropdown more flexible:**

```typescript
interface StreamMentionDropdownProps {
  query: string;
  streams: Stream[];
  position?: { top: number; left: number }; // Optional
  anchorElement?: HTMLElement; // NEW: For popover mode
  mode?: 'portal' | 'popover'; // NEW: Position strategy
  onSelect: (streamName: string, isNew: boolean) => void;
  onClose: () => void;
  selectedStreamIds: string[];
  showSearch?: boolean; // NEW: Show search input
  autoFocus?: boolean; // NEW: Auto-focus search
}
```

**Two Modes:**

1. **Portal Mode** (Hashtag auto-suggest):
   - Positioned at cursor via `position` prop
   - No search input (query comes from typed text)
   - Minimal UI

2. **Popover Mode** (Add streams button):
   - Positioned relative to `anchorElement`
   - Shows search input (`showSearch={true}`)
   - Full-featured UI

---

### Implementation Steps

#### Step 1: Update StreamMentionDropdown Props

```typescript
// components/streams/stream-mention-dropdown.tsx

interface StreamMentionDropdownProps {
  // Core
  query: string;
  streams: Stream[];
  onSelect: (streamName: string, isNew: boolean) => void;
  onClose: () => void;
  selectedStreamIds: string[];
  
  // Positioning (one required)
  position?: { top: number; left: number }; // Portal mode
  anchorElement?: HTMLElement; // Popover mode
  
  // UI options
  showSearch?: boolean; // Show search input at top
  placeholder?: string; // Search placeholder
  maxHeight?: number; // Max dropdown height
  width?: number; // Dropdown width
}
```

#### Step 2: Add Search Input (Optional)

```typescript
// Inside StreamMentionDropdown component

const [internalQuery, setInternalQuery] = React.useState(query);

// Use internal query if showSearch=true
const effectiveQuery = showSearch ? internalQuery : query;

// Render search if enabled
{showSearch && (
  <div className="p-2 border-b border-zinc-800">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder || "Search or create new stream"}
        value={internalQuery}
        onChange={(e) => {
          setInternalQuery(e.target.value);
          onQueryChange?.(e.target.value); // Optional callback
        }}
        className="pl-9 h-9"
        autoFocus
      />
    </div>
  </div>
)}
```

#### Step 3: Update Positioning Logic

```typescript
// Position calculation
const positionStyle = React.useMemo(() => {
  if (position) {
    // Portal mode: absolute positioning
    return {
      position: 'fixed' as const,
      top: `${position.top + 4}px`,
      left: `${position.left}px`,
    };
  } else if (anchorElement) {
    // Popover mode: use Radix Popover
    return null; // Let Radix handle positioning
  }
  return {};
}, [position, anchorElement]);

// Render
if (anchorElement) {
  // Use Popover for button-triggered dropdown
  return (
    <PopoverContent align="start" className="p-0">
      {dropdownContent}
    </PopoverContent>
  );
} else {
  // Use Portal for cursor-positioned dropdown
  return createPortal(
    <div style={positionStyle}>
      {dropdownContent}
    </div>,
    document.body
  );
}
```

#### Step 4: Replace StreamPicker Dropdown

**In StreamPicker:**

```typescript
// Remove inline renderSelectionContent
// Replace with StreamMentionDropdown

<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm" className="...">
      <Plus className="mr-1.5 h-3.5 w-3.5" />
      Add Streams
    </Button>
  </PopoverTrigger>
  
  <StreamMentionDropdown
    query={searchQuery}
    streams={allStreams}
    onSelect={handleSelectStream}
    onClose={() => setOpen(false)}
    selectedStreamIds={selectedStreamIds}
    showSearch={true}
    placeholder="Search or create new stream"
  />
</Popover>
```

---

## 📦 Simpler Alternative (Option B)

**Extract shared logic into a hook:**

```typescript
// lib/hooks/use-stream-dropdown-options.ts

export function useStreamDropdownOptions(
  query: string,
  streams: Stream[],
  selectedStreamIds: string[],
  pendingStreamNames: string[]
) {
  // Filter streams
  const filteredStreams = React.useMemo(() => {
    if (!query.trim()) return streams.slice(0, 10);
    const lowerQuery = query.toLowerCase();
    return streams.filter(s =>
      s.status === 'active' &&
      s.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
  }, [streams, query]);

  // Validate stream name
  const isValidStreamName = React.useCallback((name: string): boolean => {
    const slug = name.toLowerCase().trim();
    if (slug.length < 2 || slug.length > 50) return false;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }, []);

  // Check for exact match
  const normalizedQuery = query.toLowerCase().trim();
  const exactMatch = filteredStreams.some(s => s.name === normalizedQuery);

  // Show create option
  const showCreateOption = 
    normalizedQuery.length >= 2 && 
    !exactMatch && 
    isValidStreamName(normalizedQuery);

  // Combined options
  const allOptions = React.useMemo(() => [
    ...filteredStreams,
    ...(showCreateOption ? [{
      id: '__create__',
      name: normalizedQuery,
      isNew: true,
    }] : [])
  ], [filteredStreams, showCreateOption, normalizedQuery]);

  return {
    filteredStreams,
    allOptions,
    showCreateOption,
    normalizedQuery,
  };
}
```

**Then use in both components:**
```typescript
// In StreamMentionDropdown
const { allOptions } = useStreamDropdownOptions(query, streams, selectedStreamIds, []);

// In StreamPicker
const { allOptions } = useStreamDropdownOptions(searchQuery, allStreams, selectedStreamIds, pendingStreamNames);
```

---

## 🎯 Recommendation

**Go with Option B (Extract Hook) first:**

### Why?
- ✅ **Less risky**: Doesn't change UI/positioning
- ✅ **Faster**: ~1 hour vs ~3 hours
- ✅ **DRY**: Eliminates duplicate logic
- ✅ **Flexible**: Keep separate UI customization
- ✅ **Testable**: Logic extracted and reusable

### Later (if needed):
- Consider Option A for full consolidation
- Would require more testing/adjustment
- Might over-complicate simple use case

---

## 📋 Implementation Plan (Option B)

### Phase 1: Extract Shared Logic Hook
**Time**: ~30 min
- Create `use-stream-dropdown-options.ts`
- Extract filtering, validation, create option logic
- Add tests

### Phase 2: Update StreamMentionDropdown
**Time**: ~15 min
- Replace inline logic with hook
- Test hashtag auto-suggest still works

### Phase 3: Update StreamPicker
**Time**: ~15 min
- Replace inline logic with hook
- Test "Add streams" still works

### Phase 4: Testing
**Time**: ~30 min
- Test both dropdowns
- Verify keyboard navigation
- Check edge cases

**Total**: ~1.5 hours

---

## ✅ Benefits

### Code Quality:
- ✅ DRY: Single source of truth for logic
- ✅ Maintainable: One place to update
- ✅ Testable: Hook can be unit tested
- ✅ Consistent: Same validation/filtering everywhere

### User Experience:
- ✅ Consistent: Both dropdowns behave identically
- ✅ Predictable: Same rules, same visuals
- ✅ Reliable: Shared logic = fewer bugs

### Developer Experience:
- ✅ Reusable: Easy to add more dropdowns later
- ✅ Clear: Hook documents the logic
- ✅ Simple: No complex refactoring needed

---

## 🤔 Your Thoughts?

**Options:**
1. **Option A**: Full consolidation (use StreamMentionDropdown for both)
   - Pro: Maximum code reuse
   - Con: More complex, needs careful positioning
   - Time: ~3 hours

2. **Option B**: Extract hook (keep separate components)
   - Pro: Simpler, less risky
   - Con: Still have two components
   - Time: ~1.5 hours

3. **Status quo**: Keep as-is
   - Pro: Works today
   - Con: Duplicate code, maintenance burden

**Which do you prefer?**

I personally recommend **Option B** as a first step - it gives us most of the benefits with minimal risk. We can always do Option A later if we want to consolidate further.

Want me to implement Option B?
