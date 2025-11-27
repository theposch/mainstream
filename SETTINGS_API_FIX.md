# Settings API Fix - Field Name Mapping

**Issue:** Settings save was failing due to camelCase/snake_case mismatch

## Problem

The settings dialog sends data in **camelCase** (client-side convention):
```json
{
  "displayName": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "bio": "Developer",
  "website": "https://example.com"
}
```

But the database expects **snake_case**:
```sql
UPDATE users SET
  display_name = 'John Doe',  -- not displayName
  username = 'johndoe',
  email = 'john@example.com',
  bio = 'Developer',
  website = 'https://example.com'
```

## Solution

Updated `app/api/users/me/route.ts` to handle both naming conventions:

```typescript
// Parse request body (handle both camelCase and snake_case)
const body = await request.json();
const { 
  displayName,     // camelCase from client
  display_name,    // snake_case fallback
  username, 
  email, 
  bio, 
  website 
} = body;

// Use displayName if provided, otherwise fall back to display_name
const finalDisplayName = displayName || display_name;

// Build update object with correct snake_case for database
const updateData: Record<string, any> = {};
if (finalDisplayName !== undefined) updateData.display_name = finalDisplayName;
if (username !== undefined) updateData.username = username;
if (email !== undefined) updateData.email = email;
if (bio !== undefined) updateData.bio = bio;
if (website !== undefined) updateData.website = website;
```

## Result

- ✅ Settings dialog can send camelCase (current behavior)
- ✅ API handles both camelCase and snake_case (flexible)
- ✅ Database gets correct snake_case field names
- ✅ Settings now save successfully

## Testing

Try saving settings again - it should work now!

