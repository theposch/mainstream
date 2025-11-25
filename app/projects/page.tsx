// TODO: Replace with database queries
import { projects } from "@/lib/mock-data/projects";
import { assets } from "@/lib/mock-data/assets";
import { ProjectsGrid, ProjectGridData } from "@/components/projects/projects-grid";

// TODO: Convert to async server component with real API calls
// async function getProjectsData() {
//   // GET /api/projects - Fetch all public projects
//   const response = await fetch('/api/projects', {
//     headers: { Authorization: `Bearer ${session.token}` }
//   });
//   
//   const projects = await response.json();
//   
//   // For each project, fetch stats and recent posts
//   const enrichedProjects = await Promise.all(
//     projects.map(async (project) => {
//       // GET /api/projects/:id/assets?limit=4
//       const posts = await fetch(`/api/projects/${project.id}/assets?limit=4`).then(r => r.json());
//       
//       return {
//         ...project,
//         assetsCount: posts.total,
//         recentPosts: posts.data,
//       };
//     })
//   );
//   
//   return enrichedProjects;
// }

export default function ProjectsPage() {
  // TODO: Replace with: const projectsData = await getProjectsData();
  
  // Aggregate data for each project
  const projectsData: ProjectGridData[] = projects.map((project) => {
    // Get all assets for this project
    const projectAssets = assets.filter((asset) => asset.projectId === project.id);
    
    // Get recent 4 posts (assets) for this project
    const recentPosts = projectAssets
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .map((asset) => ({
        id: asset.id,
        url: asset.url,
        title: asset.title,
      }));
    
    return {
      ...project,
      assetsCount: projectAssets.length,
      recentPosts: recentPosts,
    };
  });

  return (
    <div className="w-full min-h-screen pb-20">
      {/* Page Header */}
      <div className="pt-10 pb-12 space-y-3">
        <h1 className="text-4xl font-bold text-white">Projects</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Browse all projects and discover creative work across teams and individuals.
        </p>
      </div>

      {/* Projects Grid */}
      <ProjectsGrid projects={projectsData} />
    </div>
  );
}

