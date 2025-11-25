# Settings Modal - User Guide

## How to Access

1. **Click your avatar** in the top-right corner of the navbar
2. **Click "Settings"** from the dropdown menu
3. The Settings modal will open

## Features Overview

### 🎨 Visual Design

The Settings modal features:
- Clean, modern interface matching Cosmos design system
- Responsive layout that works on all screen sizes
- Smooth animations and transitions
- Clear visual hierarchy
- Intuitive tab navigation

### 📑 Available Tabs

#### 1️⃣ Account Tab (Default)

**Profile Photo Section:**
- View current avatar
- Hover to see upload icon
- "Upload New Photo" button

**Form Fields:**
- **Display Name**: Your public name
- **Username**: Unique identifier (shown as @username)
  - Auto-formats: removes special characters
  - Shows profile URL preview
- **Email**: Your email address
- **Bio**: 160-character description
  - Real-time character counter
  - Multi-line input
- **Location**: Optional city/country
- **Website**: Optional personal website URL

#### 2️⃣ Notifications Tab

**Email Notifications:**
- Email notifications toggle
- Push notifications toggle

**Activity Notifications:**
- Comments on your work
- Likes on your work
- New followers

*Each option has a descriptive subtitle explaining when you'll be notified.*

#### 3️⃣ Privacy Tab

**Profile Visibility:**
- 🌐 **Public**: Anyone can view your profile and work
- 🔒 **Private**: Only you can view your profile

**Additional Privacy Options:**
- Show email address on profile
- Show liked shots publicly
- Allow search engines to index your profile

#### 4️⃣ Connected Accounts Tab

**Available Integrations:**
- **GitHub**: Connect for code integration
- **Twitter**: Share work on Twitter
- **Google**: Already connected (shows your email)
- **Figma**: Connect for design integration

*Each platform shows connection status and a Connect/Disconnect button.*

## Keyboard Shortcuts

- **Tab**: Navigate between fields and buttons
- **Enter**: Submit form (when focused on input)
- **Escape**: Close modal
- **Arrow Keys**: Navigate between tabs (when focused)

## Saving Changes

1. **Make your changes** in any tab
2. **Click "Save Changes"** button in the footer
3. **Loading state** appears with spinner
4. **Success message** shows for 3 seconds
5. Changes are saved!

## Canceling

- Click **"Cancel"** button in footer
- Click **X** button in top-right
- Click **outside the modal**
- Press **Escape** key

*Note: All methods will close the modal without saving.*

## Current Status

✅ **Fully Functional UI** - All interface elements work perfectly
⚠️ **Backend Pending** - Settings don't persist yet (requires database integration)

When the backend is connected, your settings will be saved to the database and persist across sessions.

## Tips

### Username Guidelines
- Only letters, numbers, and underscores allowed
- Must be unique (will be validated when backend is connected)
- Shown in your profile URL: `cosmos.so/u/your-username`

### Bio Best Practices
- Keep it concise (160 characters max)
- Mention your role, skills, or interests
- Add personality!

### Privacy Recommendations
- Set profile to Public to maximize discoverability
- Consider hiding email to reduce spam
- Search engine indexing helps people find your work

### Connected Accounts Benefits
- **GitHub**: Import repositories, show code projects
- **Twitter**: One-click sharing of shots
- **Google**: Single sign-on convenience
- **Figma**: Import designs directly

## Troubleshooting

**Modal won't open?**
- Check that you're clicking the Settings menu item (not just hovering)
- Refresh the page

**Can't click Save?**
- Modal is in loading state - wait for current save to complete

**Changes not saving?**
- Backend integration is pending
- Currently a demonstration of the UI

## For Developers

### Component Location
```
components/layout/settings-dialog.tsx
components/layout/user-menu.tsx
```

### Integration Points
```typescript
// TODO: Connect to API
// Endpoint: PUT /api/user/settings
// Auth: Session token required
// Returns: Updated user object
```

### State Management
The modal uses React state for:
- Dialog open/close control
- Active tab selection
- Form field values
- Loading states
- Success/error messages

All state is local to the component until backend is connected.

---

**Version**: 1.0.0  
**Last Updated**: November 25, 2025  
**Status**: ✅ UI Complete | 🔄 Backend Pending

