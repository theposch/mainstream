# Post-Publish Drop Management Plan

## Decisions
1. **Unpublish** → Clear `published_at` entirely (cleaner approach)
2. **Edit published drops** → Require explicit "Update" button click (no auto-save)
3. **Delete published** → Standard confirmation dialog with different warning text

---

## Task A: Edit Published Drops (with explicit Update)

**Problem**: Published drops use auto-save like drafts, which could cause unintended live changes.

**Solution**: 
- Detect when editing a published drop
- Disable auto-save, show "Update" button instead
- Show "PUBLISHED" badge and warning banner
- Track local changes and require explicit save

**Files to modify**:

| File | Changes |
|------|---------|
| `app/drops/[id]/edit/drop-blocks-editor-client.tsx` | - Show "PUBLISHED" badge when `drop.status === 'published'`<br>- Add warning banner: "You're editing a published drop"<br>- Disable auto-save for published drops<br>- Add "Update" button that saves all changes at once<br>- Track dirty state for title, description, blocks |

**UI Changes**:
- Header shows "PUBLISHED" badge (green) instead of "DRAFT" (amber)
- Yellow warning banner below header: "Editing a live drop. Changes won't be visible until you click Update."
- "Publish" button becomes "Update" button for published drops
- Undo/redo still works locally until Update is clicked

---

## Task B: Unpublish Action

**Problem**: No way to revert a published drop back to draft.

**Solution**: 
- Add "Unpublish" action in the editor dropdown menu
- PATCH API to set status='draft' and clear `published_at`
- Confirmation dialog before unpublishing

**Files to modify**:

| File | Changes |
|------|---------|
| `app/api/drops/[id]/route.ts` | Handle status change to 'draft': clear `published_at` |
| `app/drops/[id]/edit/drop-blocks-editor-client.tsx` | Add "Unpublish" menu item for published drops |

**Files to create**:

| File | Purpose |
|------|---------|
| `components/drops/unpublish-drop-dialog.tsx` | Confirmation dialog with warning about email already sent |

**Confirmation dialog text**:
> **Unpublish this drop?**
> 
> It will be moved back to drafts. Note: Team members who already received the email notification can still access this page until you publish again or delete.
>
> [Cancel] [Unpublish]

---

## Task C: Delete Published Drops

**Problem**: Currently only drafts can be deleted.

**Solution**:
- Remove `status === 'draft'` restriction in UI
- Show stronger warning for published drops
- Allow owner to delete regardless of status

**Files to modify**:

| File | Changes |
|------|---------|
| `components/drops/drop-card.tsx` | Remove `status === 'draft'` condition from delete menu item |
| `components/drops/delete-drop-dialog.tsx` | Accept `status` prop, show different warning text |
| `app/drops/[id]/edit/drop-blocks-editor-client.tsx` | Already allows delete, just update dialog usage |

**Warning text by status**:

- **Draft**: "Delete this draft? This action cannot be undone."
- **Published**: "Delete this published drop? This will permanently remove it and break any shared links. This action cannot be undone."

---

## Implementation Order

1. **Task C: Delete Published** - Simplest, just UI changes
2. **Task B: Unpublish** - New dialog + API change
3. **Task A: Edit Published** - Most complex, requires save mode switching

---

## To-dos

- [ ] Allow deleting published drops with different warning text
- [ ] Create UnpublishDropDialog component
- [ ] Add unpublish API logic (clear published_at)
- [ ] Add unpublish action to editor dropdown
- [ ] Detect published status and switch to explicit save mode
- [ ] Add "PUBLISHED" badge and warning banner
- [ ] Add "Update" button for published drops
- [ ] Track dirty state for published drop editing

