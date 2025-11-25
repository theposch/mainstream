// TODO: DATABASE SCHEMA - Teams Table
// When implementing database, create teams table with:
// - id (uuid, primary key)
// - name (text, not null)
// - slug (text, unique, not null) - for URLs
// - description (text, nullable)
// - avatarUrl (text, nullable)
// - createdAt (timestamp, not null)
// - updatedAt (timestamp, not null)
//
// Related tables:
// - team_members (team_id, user_id, role, joined_at)
//   - roles: 'owner', 'admin', 'member', 'viewer'
// - team_invites (id, team_id, email, role, invited_by, expires_at)

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatarUrl: string;
  coverImageUrl?: string; // Featured/cover image for team page
  memberIds: string[]; // TODO: Replace with proper team_members join table
  createdAt: string;
}

// TODO: Remove mock teams - fetch from database
// GET /api/teams (for user's teams)
// GET /api/teams/:teamId (for specific team with members)
export const teams: Team[] = [
  {
    id: "team-1",
    name: "Design System",
    slug: "design-system",
    description: "Our company's design system and component library",
    avatarUrl: "https://avatar.vercel.sh/design-system.png",
    coverImageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1200&q=80",
    memberIds: ["user-1", "user-2", "user-3"], // TODO: Replace with team_members table
    createdAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "team-2",
    name: "Mobile App",
    slug: "mobile-app",
    description: "Mobile application design and assets",
    avatarUrl: "https://avatar.vercel.sh/mobile-app.png",
    coverImageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
    memberIds: ["user-1", "user-2"],
    createdAt: "2024-02-01T00:00:00.000Z",
  },
  {
    id: "team-3",
    name: "Marketing",
    slug: "marketing",
    description: "Brand assets and marketing materials",
    avatarUrl: "https://avatar.vercel.sh/marketing.png",
    coverImageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&q=80",
    memberIds: ["user-1", "user-3", "user-4"],
    createdAt: "2024-03-01T00:00:00.000Z",
  },
];
