"use client";

import * as React from "react";
import { notFound } from "next/navigation";
// TODO: Replace with database queries
import { teams } from "@/lib/mock-data/teams";
import { users } from "@/lib/mock-data/users";
import { streams } from "@/lib/mock-data/streams";
import { assets } from "@/lib/mock-data/assets";
import { TeamHeader } from "@/components/teams/team-header";
import { TeamTabs, TeamTab } from "@/components/teams/team-tabs";
import { ManageMembersDialog } from "@/components/teams/manage-members-dialog";
import { StreamGrid } from "@/components/streams/stream-grid";
import { MasonryGrid } from "@/components/assets/masonry-grid";

interface TeamPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// TODO: Convert to async server component with real API calls
// async function getTeamData(slug: string) {
//   const team = await db.query.teams.findFirst({
//     where: eq(teams.slug, slug),
//     with: {
//       members: { with: { user: true } },
//       streams: { orderBy: desc(streams.createdAt) }
//     }
//   });
//   
//   if (!team) return null;
//   
//   // Get team stats
//   const stats = await db.query.teamStats.findFirst({
//     where: eq(teamStats.teamId, team.id)
//   });
//   
//   // Get recent posts for cover fallback
//   const recentPosts = await db.query.assets.findMany({
//     where: eq(assets.teamId, team.id),
//     orderBy: desc(assets.createdAt),
//     limit: 12
//   });
//   
//   // Check user permissions
//   const session = await getServerSession();
//   const member = team.members.find(m => m.userId === session?.user?.id);
//   const isAdmin = member?.role === 'admin' || member?.role === 'owner';
//   const canManageMembers = isAdmin;
//   
//   return { team, stats, recentPosts, isAdmin, canManageMembers };
// }

export default function TeamPage({ params }: TeamPageProps) {
  const [activeTab, setActiveTab] = React.useState<TeamTab>("posts");
  const [membersDialogOpen, setMembersDialogOpen] = React.useState(false);
  const [slug, setSlug] = React.useState<string>("");

  React.useEffect(() => {
    params.then((p) => setSlug(p.slug));
  }, [params]);

  if (!slug) {
    return null;
  }

  // TODO: Replace with: const data = await getTeamData(slug);
  const team = teams.find((t) => t.slug === slug);

  if (!team) {
    notFound();
  }

  // TODO: Replace with database query with proper join
  // GET /api/teams/:teamId/members - Get members with roles
  const teamMembers = users.filter((u) => team.memberIds.includes(u.id));
  
  // Add mock roles (first member is admin, rest are members)
  const teamMembersWithRoles = teamMembers.map((member, index) => ({
    ...member,
    role: index === 0 ? "admin" : "member",
  }));

  // TODO: Replace with database query
  // GET /api/teams/:teamId/streams
  const teamStreams = streams.filter(
    (p) => p.ownerId === team.id && p.ownerType === "team"
  );

  // TODO: Replace with database query
  // GET /api/teams/:teamId/posts - Get all team assets
  const teamStreamIds = teamStreams.map((s) => s.id);
  const teamAssets = assets.filter((asset) =>
    teamProjectIds.includes(asset.projectId)
  );

  // Get recent posts for cover fallback (if no cover image)
  const recentPostsForCover = teamAssets
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 12)
    .map((asset) => ({
      id: asset.id,
      url: asset.url,
      title: asset.title,
    }));

  // TODO: Get from session/auth
  // Check if current user is admin
  // const session = await getServerSession();
  // const currentUserMembership = teamMembersWithRoles.find(m => m.id === session?.user?.id);
  // const isAdmin = currentUserMembership?.role === 'admin' || currentUserMembership?.role === 'owner';
  const isAdmin = true; // Mock: assume current user is admin for demo

  // TODO: Check permissions from database
  // const canManageMembers = isAdmin || currentUserMembership?.role === 'admin';
  const canManageMembers = true; // Mock: assume can manage for demo

  // Calculate stats
  // TODO: Get from database with proper aggregation
  // GET /api/teams/:teamId/stats
  const stats = {
    streamsCount: teamStreams.length,
    membersCount: teamMembers.length,
    postsCount: teamAssets.length,
    followersCount: 0, // TODO: Implement followers feature
    likesCount: 0, // TODO: Implement likes aggregation
  };

  const handleRemoveMember = (memberId: string) => {
    // TODO: Implement remove member
    // DELETE /api/teams/:teamId/members/:userId
    console.log("Remove member:", memberId);
  };

  const handleAddMember = (userId: string) => {
    // TODO: Implement add member
    // POST /api/teams/:teamId/members
    // Body: { userId, role: 'member' }
    console.log("Add member:", userId);
  };

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Team Header */}
      <TeamHeader
        team={{
          ...team,
          coverImageUrl: team.coverImageUrl || undefined,
        }}
        members={teamMembers}
        stats={stats}
        recentPosts={recentPostsForCover}
        isAdmin={isAdmin}
        canManageMembers={canManageMembers}
        onMembersClick={() => setMembersDialogOpen(true)}
      />

      {/* Tabs */}
      <div className="mt-12 mb-10">
        <TeamTabs 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          postsCount={teamAssets.length}
          streamsCount={teamStreams.length}
        />
      </div>

      {/* Content */}
      <div>
        {activeTab === "posts" ? (
          <MasonryGrid assets={teamAssets} />
        ) : (
          teamStreams.length > 0 ? (
            <StreamGrid streams={teamStreams} />
          ) : (
            <div className="text-center py-24">
              <p className="text-lg font-medium text-muted-foreground">No streams yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first project to get started.
              </p>
            </div>
          )
        )}
      </div>

      {/* Manage Members Dialog */}
      <ManageMembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        team={{
          id: team.id,
          name: team.name,
        }}
        members={teamMembersWithRoles}
        canManageMembers={canManageMembers}
        onRemoveMember={handleRemoveMember}
        onAddMember={handleAddMember}
      />
    </div>
  );
}
