import { SearchResults } from "@/components/search/search-results";

// In Next.js 15+, searchParams is a Promise and must be awaited
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  
  return <SearchResults initialQuery={query} />;
}

