import { Asset } from "@/lib/mock-data/assets";
import { Stream } from "@/lib/mock-data/streams";
import { User } from "@/lib/mock-data/users";
import { Team } from "@/lib/mock-data/teams";
import { getAssetStreamObjects } from "@/lib/mock-data/migration-helpers";

/**
 * Search assets by title, uploader name, or stream
 * Case-insensitive fuzzy matching
 */
export function searchAssets(query: string, assets: Asset[], users: User[], streams: Stream[]): Asset[] {
  if (!query.trim()) return assets;
  
  const lowerQuery = query.toLowerCase().trim();
  
  // Create lookup maps for performance (O(n) instead of O(n*m))
  const userMap = new Map(users.map(u => [u.id, u]));
  const streamMap = new Map(streams.map(s => [s.id, s]));
  
  return assets.filter((asset) => {
    // Search by title
    if (asset.title.toLowerCase().includes(lowerQuery)) return true;
    
    // Search by uploader name
    const uploader = userMap.get(asset.uploaderId);
    if (uploader?.displayName.toLowerCase().includes(lowerQuery)) return true;
    if (uploader?.username.toLowerCase().includes(lowerQuery)) return true;
    
    // Search by stream name (check all streams asset belongs to)
    const assetStreams = getAssetStreamObjects(asset);
    for (const stream of assetStreams) {
      if (stream.name.toLowerCase().includes(lowerQuery)) return true;
    }
    
    return false;
  });
}

/**
 * Search streams by name or description
 */
export function searchStreams(query: string, streams: Stream[]): Stream[] {
  if (!query.trim()) return streams;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return streams.filter((stream) => {
    if (stream.name.toLowerCase().includes(lowerQuery)) return true;
    if (stream.description?.toLowerCase().includes(lowerQuery)) return true;
    return false;
  });
}

/**
 * Search users by username or display name
 */
export function searchUsers(query: string, users: User[]): User[] {
  if (!query.trim()) return users;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return users.filter((user) => {
    if (user.username.toLowerCase().includes(lowerQuery)) return true;
    if (user.displayName.toLowerCase().includes(lowerQuery)) return true;
    if (user.bio?.toLowerCase().includes(lowerQuery)) return true;
    return false;
  });
}

/**
 * Search teams by name, slug, or description
 */
export function searchTeams(query: string, teams: Team[]): Team[] {
  if (!query.trim()) return teams;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return teams.filter((team) => {
    if (team.name.toLowerCase().includes(lowerQuery)) return true;
    if (team.slug.toLowerCase().includes(lowerQuery)) return true;
    if (team.description?.toLowerCase().includes(lowerQuery)) return true;
    return false;
  });
}

/**
 * Combined search results interface
 */
export interface SearchResults {
  assets: Asset[];
  streams: Stream[];
  users: User[];
  teams: Team[];
  total: number;
}

/**
 * Search across all entity types
 */
export function searchAll(
  query: string,
  data: {
    assets: Asset[];
    streams: Stream[];
    users: User[];
    teams: Team[];
  }
): SearchResults {
  const assets = searchAssets(query, data.assets, data.users, data.streams);
  const streams = searchStreams(query, data.streams);
  const users = searchUsers(query, data.users);
  const teams = searchTeams(query, data.teams);
  
  return {
    assets,
    streams,
    users,
    teams,
    total: assets.length + streams.length + users.length + teams.length,
  };
}

/**
 * Highlight matching text in search results
 * Returns text with <mark> tags around matches
 */
export function highlightMatch(text: string, query: string): string {
  if (!query.trim()) return text;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) return text;
  
  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);
  
  return `${before}<mark class="bg-primary/20 text-foreground">${match}</mark>${after}`;
}

// TODO: Replace with API call when backend is implemented
// export async function searchAPI(query: string): Promise<SearchResults> {
//   const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
//   if (!response.ok) throw new Error('Search failed');
//   return response.json();
// }

