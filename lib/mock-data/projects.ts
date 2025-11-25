// ⚠️ DEPRECATED: This file is kept for backward compatibility only
// USE lib/mock-data/streams.ts INSTEAD
// Projects have been replaced with Streams (many-to-many relationships)
// This file will be removed in a future version

// TODO: DATABASE SCHEMA - Projects Table
// When implementing database, create projects table with:
// - id (uuid, primary key)
// - name (text, not null)
// - description (text, nullable)
// - ownerType (enum: 'user' | 'team', not null)
// - ownerId (uuid, not null) - references users.id or teams.id
// - isPrivate (boolean, default false)
// - coverImageUrl (text, nullable) - main project thumbnail
// - createdAt (timestamp, not null)
// - updatedAt (timestamp, not null)
//
// Related tables:
// - project_members (project_id, user_id, role, access_level)
//   - For managing who can view/edit specific projects
// - project_tags (project_id, tag_name)
//   - For categorization and filtering

export interface Project {
  id: string;
  name: string;
  description?: string;
  coverImageUrl?: string;
  ownerType: 'user' | 'team';
  ownerId: string; // TODO: Replace with proper foreign key to users or teams
  isPrivate: boolean;
  createdAt: string;
}

// TODO: Remove mock projects - fetch from database
// GET /api/projects?workspace={workspaceId}
// GET /api/projects/:projectId (with authorization check)
// NOTE: This is a mutable array for local development (in-memory storage)
// In production, this will be replaced with database operations
export let projects: Project[] = [
  // Personal Projects
  {
    id: "proj-1",
    name: "Personal Inspiration",
    description: "My personal collection of inspiring designs",
    coverImageUrl: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&q=80",
    ownerType: 'user',
    ownerId: 'user-1',
    isPrivate: true,
    createdAt: "2024-01-10T00:00:00.000Z",
  },
  {
    id: "proj-2",
    name: "UI Experiments",
    description: "Experimental UI concepts and prototypes",
    coverImageUrl: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=800&q=80",
    ownerType: 'user',
    ownerId: 'user-1',
    isPrivate: false,
    createdAt: "2024-02-15T00:00:00.000Z",
  },
  
  // Team Projects
  {
    id: "proj-3",
    name: "Component Library",
    description: "Design system components and patterns",
    coverImageUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80",
    ownerType: 'team',
    ownerId: 'team-1',
    isPrivate: false,
    createdAt: "2024-01-20T00:00:00.000Z",
  },
  {
    id: "proj-4",
    name: "iOS App Redesign",
    description: "New design direction for our mobile app",
    coverImageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
    ownerType: 'team',
    ownerId: 'team-2',
    isPrivate: false,
    createdAt: "2024-02-25T00:00:00.000Z",
  },
  {
    id: "proj-5",
    name: "Brand Guidelines 2024",
    description: "Updated brand identity and visual language",
    coverImageUrl: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80",
    ownerType: 'team',
    ownerId: 'team-3',
    isPrivate: false,
    createdAt: "2024-03-10T00:00:00.000Z",
  },
];
