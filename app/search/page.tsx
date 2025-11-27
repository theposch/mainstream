import { SearchResults } from "@/components/search/search-results";

// In Next.js 15+, searchParams is a Promise and must be awaited
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; color?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  const color = params.color || '';
  
  return <SearchResults initialQuery={query} initialColor={color} />;
}

