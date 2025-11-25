// TODO: Replace with database queries
import { teams } from "@/lib/mock-data/teams";
import { projects } from "@/lib/mock-data/projects";
import { assets } from "@/lib/mock-data/assets";
import { TeamsGrid } from "@/components/teams/teams-grid";
import { TeamCardData } from "@/components/teams/team-card";

// TODO: Convert to async server component with real API calls
// async function getTeamsData() {
//   // GET /api/teams - Fetch all public teams
//   const response = await fetch('/api/teams', {
//     headers: { Authorization: `Bearer ${session.token}` }
//   });
//   
//   const teams = await response.json();
//   
//   // For each team, fetch stats and recent posts
//   const enrichedTeams = await Promise.all(
//     teams.map(async (team) => {
//       // GET /api/teams/:id/stats
//       const stats = await fetch(`/api/teams/${team.id}/stats`).then(r => r.json());
//       
//       // GET /api/teams/:id/posts?limit=4
//       const posts = await fetch(`/api/teams/${team.id}/posts?limit=4`).then(r => r.json());
//       
//       return {
//         ...team,
//         projectsCount: stats.projectsCount,
//         membersCount: stats.membersCount,
//         postsCount: stats.postsCount,
//         recentPosts: posts,
//       };
//     })
//   );
//   
//   return enrichedTeams;
// }

export default function TeamsPage() {
  // TODO: Replace with: const teamsData = await getTeamsData();
  
  // Aggregate data for each team
  const teamsData: TeamCardData[] = teams.map((team) => {
    // Count projects for this team
    const teamProjects = projects.filter(
      (p) => p.ownerType === 'team' && p.ownerId === team.id
    );
    
    // Count members
    const membersCount = team.memberIds.length;
    
    // Get all assets from this team's projects
    const teamProjectIds = teamProjects.map(p => p.id);
    const teamAssets = assets.filter((asset) =>
      teamProjectIds.includes(asset.projectId)
    );
    
    // Get recent 4 posts (assets) for this team
    const recentPosts = teamAssets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .map((asset) => ({
        id: asset.id,
        url: asset.url,
        title: asset.title,
      }));
    
    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      avatarUrl: team.avatarUrl,
      description: team.description,
      projectsCount: teamProjects.length,
      membersCount: membersCount,
      postsCount: teamAssets.length,
      recentPosts: recentPosts,
    };
  });

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header */}
      <div className="pt-10 pb-12 space-y-3">
        <h1 className="text-4xl font-bold text-white">Teams</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Discover and follow teams to see their latest work and projects.
        </p>
      </div>

      {/* Teams Grid */}
      <TeamsGrid teams={teamsData} />
    </div>
  );
}

