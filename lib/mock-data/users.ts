// TODO: AUTHENTICATION & AUTHORIZATION
// When implementing auth, replace these with real data:
// - Use NextAuth.js, Clerk, Auth0, or Supabase Auth
// - Implement proper session management
// - Secure API routes with middleware
// - Add role-based access control (RBAC)

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio?: string;
  jobTitle?: string;
  teamId?: string;
  createdAt: string;
}

// TODO: Replace with authenticated user from session
// import { getServerSession } from 'next-auth';
// const session = await getServerSession();
// export const currentUser = session.user;
export const currentUser: User = {
  id: "user-1",
  username: "you",
  displayName: "You",
  email: "you@example.com",
  avatarUrl: "https://avatar.vercel.sh/you.png",
  bio: "Designer & Creative",
  jobTitle: "Senior Product Designer",
  teamId: "team-1",
  createdAt: new Date().toISOString(),
};

// TODO: Remove mock users - fetch from database as needed
// GET /api/users/:userId or GET /api/users?ids[]=id1&ids[]=id2
export const users: User[] = [
  currentUser,
  {
    id: "user-2",
    username: "alex",
    displayName: "Alex Chen",
    email: "alex@example.com",
    avatarUrl: "https://avatar.vercel.sh/alex.png",
    bio: "Product Designer",
    jobTitle: "Lead Product Designer",
    teamId: "team-1",
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "user-3",
    username: "sarah",
    displayName: "Sarah Johnson",
    email: "sarah@example.com",
    avatarUrl: "https://avatar.vercel.sh/sarah.png",
    bio: "UX Designer & Illustrator",
    jobTitle: "UX Designer",
    teamId: "team-3",
    createdAt: "2024-02-10T00:00:00.000Z",
  },
  {
    id: "user-4",
    username: "mike",
    displayName: "Mike Rodriguez",
    email: "mike@example.com",
    avatarUrl: "https://avatar.vercel.sh/mike.png",
    jobTitle: "UI Designer",
    teamId: "team-2",
    createdAt: "2024-03-05T00:00:00.000Z",
  },
];
