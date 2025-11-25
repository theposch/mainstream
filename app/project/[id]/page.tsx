import { notFound } from "next/navigation";
// TODO: Replace with database queries
import { projects } from "@/lib/mock-data/projects";
import { teams } from "@/lib/mock-data/teams";
import { users } from "@/lib/mock-data/users";
import { readAssets } from "@/lib/utils/assets-storage";
import { ProjectHeader } from "@/components/projects/project-header";
import { MasonryGrid } from "@/components/assets/masonry-grid";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

// TODO: Convert to async server component and fetch from database
// async function getProject(projectId: string) {
//   const project = await db.query.projects.findFirst({
//     where: eq(projects.id, projectId),
//     with: {
//       owner: true,
//       members: true,
//       assets: {
//         orderBy: desc(assets.createdAt),
//         limit: 50
//       }
//     }
//   });
//   
//   // Check authorization - user must have access to this project
//   // if (!canAccessProject(session.user.id, project)) {
//   //   return unauthorized();
//   // }
//   
//   return project;
// }

export default async function ProjectPage({ params }: ProjectPageProps) {
  // Next.js 15+ requires awaiting params
  const { id } = await params;
  
  // TODO: Replace with: const project = await getProject(id);
  const project = projects.find((p) => p.id === id);

  if (!project) {
    notFound();
  }

  // TODO: Replace with database join/query
  const owner = project.ownerType === 'team' 
    ? teams.find(t => t.id === project.ownerId) 
    : users.find(u => u.id === project.ownerId);
  
  if (!owner) {
     return notFound();
  }

  // TODO: Replace with database query
  // Read assets from persistent storage and filter for this project
  const allAssets = readAssets();
  const projectAssets = allAssets.filter(a => a.projectId === project.id);

  // TODO: Remove duplication and implement pagination
  // const { data: projectAssets, hasMore } = await fetchProjectAssets(project.id, { page: 1 });
  const displayAssets = [
      ...projectAssets,
      ...projectAssets.map(a => ({...a, id: a.id + '-copy-1'})),
       ...projectAssets.map(a => ({...a, id: a.id + '-copy-2'})),
  ];

  return (
    <div className="w-full min-h-screen">
      <ProjectHeader project={project} owner={owner} />
      
      <div className="mt-8">
        <MasonryGrid assets={displayAssets} />
      </div>
    </div>
  );
}
