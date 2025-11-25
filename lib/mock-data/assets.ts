// TODO: DATABASE SCHEMA - Assets Table
// When implementing database, create assets table with:
// - id (uuid, primary key)
// - title (text, not null)
// - type (enum: 'image' | 'video' | 'link', not null)
// - url (text, not null) - stored in S3/CloudFlare/CDN
// - thumbnailUrl (text, nullable) - for videos
// - projectId (uuid, foreign key -> projects.id)
// - uploaderId (uuid, foreign key -> users.id)
// - width (integer, nullable) - for layout
// - height (integer, nullable) - for layout
// - fileSize (bigint, nullable) - in bytes
// - mimeType (text, nullable)
// - dominantColor (text, nullable) - primary hex color for UI
// - colorPalette (text[], nullable) - array of hex colors (5 colors max recommended)
// - createdAt (timestamp, not null)
// - updatedAt (timestamp, not null)
//
// Related tables:
// - asset_likes (asset_id, user_id, created_at)
// - asset_comments (id, asset_id, user_id, content, parent_id, created_at)
// - asset_colors (asset_id, color_hex, percentage) - extracted color palette
// - asset_tags (asset_id, tag_name) - for categorization
//
// File Storage:
// - Use S3, Cloudflare R2, or Supabase Storage
// - Generate thumbnails on upload
// - Extract metadata (dimensions, colors) using Sharp or similar
// - Implement CDN for fast delivery

export interface Asset {
  id: string;
  title: string;
  description?: string; // Optional description for the asset
  type: 'image' | 'video' | 'link';
  url: string; // Full-size image URL
  mediumUrl?: string; // Medium-sized image URL (800px)
  thumbnailUrl?: string; // Thumbnail URL (300px)
  projectId?: string; // TODO: Foreign key to projects table (optional - assets can exist without project)
  uploaderId: string; // TODO: Foreign key to users table
  createdAt: string;
  width?: number;
  height?: number;
  dominantColor?: string;
  colorPalette?: string[]; // Array of hex colors extracted from image
}

// Helper to generate varied dimensions for masonry effect
const randomDim = () => {
  const aspectRatios = [
    { w: 600, h: 800 },   // Portrait
    { w: 800, h: 600 },   // Landscape
    { w: 600, h: 600 },   // Square
    { w: 600, h: 900 },   // Tall Portrait
    { w: 1200, h: 800 },  // Wide Landscape
    { w: 500, h: 1000 },  // Very Tall Portrait
  ];
  return aspectRatios[Math.floor(Math.random() * aspectRatios.length)];
};

// TODO: Remove mock assets - fetch from database with pagination
// GET /api/assets?page=1&limit=50&projectId={projectId}
// GET /api/assets/:assetId
// POST /api/assets/upload (multipart/form-data)
//   - Handle file upload to storage
//   - Extract dimensions and colors
//   - Create database record
//   - Return asset object
// NOTE: This is a mutable array for local development (in-memory storage)
// In production, this will be replaced with database operations
export let assets: Asset[] = [
  {
    id: "asset-1",
    title: "Modern Dashboard Interface",
    type: "image",
    url: "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=800&q=80",
    projectId: "proj-3",
    uploaderId: "user-2",
    createdAt: "2024-03-01T10:30:00.000Z",
    width: 600,
    height: 1200,
    dominantColor: "#a6bcdd",
    colorPalette: ["#a6bcdd", "#d8d1ad", "#7b27b5", "#8974df", "#c8a57c"],
  },
  {
    id: "asset-2",
    title: "Minimalist Product Card",
    type: "image",
    url: "https://images.unsplash.com/photo-1558655146-364adaf1fcc9?w=800&q=80",
    projectId: "proj-3",
    uploaderId: "user-2",
    createdAt: "2024-03-02T14:20:00.000Z",
    width: 1200,
    height: 800,
    dominantColor: "#252626",
    colorPalette: ["#252626", "#e0e0e4", "#53584f", "#7e8358", "#7e8687"],
  },
  {
    id: "asset-3",
    title: "Typography Exploration",
    type: "image",
    url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80",
    projectId: "proj-1",
    uploaderId: "user-1",
    createdAt: "2024-03-03T09:15:00.000Z",
    width: 600,
    height: 600,
    dominantColor: "#baaca8",
    colorPalette: ["#baaca8", "#2d333c", "#744443", "#696466", "#86574a"],
  },
  {
    id: "asset-4",
    title: "Mobile App Mockup",
    type: "image",
    url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80",
    projectId: "proj-4",
    uploaderId: "user-2",
    createdAt: "2024-03-04T11:45:00.000Z",
    width: 500,
    height: 1000,
    dominantColor: "#98afb8",
    colorPalette: ["#98afb8", "#324d5f", "#e9d4cb", "#9c4c69", "#d99b53"],
  },
  {
    id: "asset-5",
    title: "Brand Color Palette",
    type: "image",
    url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80",
    projectId: "proj-5",
    uploaderId: "user-3",
    createdAt: "2024-03-05T16:00:00.000Z",
    width: 800,
    height: 600,
    dominantColor: "#17324e",
    colorPalette: ["#17324e", "#c94137", "#0e89ce", "#bc70b8", "#1784a2"],
  },
  {
    id: "asset-6",
    title: "Geometric Pattern Design",
    type: "image",
    url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80",
    projectId: "proj-2",
    uploaderId: "user-1",
    createdAt: "2024-03-06T13:30:00.000Z",
    width: 600,
    height: 900,
    dominantColor: "#c3abdb",
    colorPalette: ["#c3abdb", "#c263aa", "#82bcdb", "#67b2d1", "#b87699"],
  },
  {
    id: "asset-7",
    title: "Dark Mode Interface",
    type: "image",
    url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    projectId: "proj-3",
    uploaderId: "user-2",
    createdAt: "2024-03-07T10:00:00.000Z",
    width: 800,
    height: 500,
    dominantColor: "#c5c0ba",
    colorPalette: ["#c5c0ba", "#26251f", "#a27f45", "#664c38", "#776f6a"],
  },
  {
    id: "asset-8",
    title: "Colorful Gradient Mesh",
    type: "image",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80",
    projectId: "proj-1",
    uploaderId: "user-1",
    createdAt: "2024-03-08T15:20:00.000Z",
    width: 700,
    height: 700,
    dominantColor: "#d4ccc1",
    colorPalette: ["#d4ccc1", "#59aef4", "#df3aa2", "#ef6c97", "#fcae81"],
  },
  {
    id: "asset-9",
    title: "Clean Landing Page",
    type: "image",
    url: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&q=80",
    projectId: "proj-4",
    uploaderId: "user-2",
    createdAt: "2024-03-09T12:10:00.000Z",
    width: 1000,
    height: 600,
    dominantColor: "#2d352c",
    colorPalette: ["#2d352c", "#dee0e4", "#759257", "#656362", "#869589"],
  },
  {
    id: "asset-10",
    title: "Abstract 3D Shapes",
    type: "image",
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
    projectId: "proj-2",
    uploaderId: "user-1",
    createdAt: "2024-03-10T09:45:00.000Z",
    width: 600,
    height: 800,
    dominantColor: "#d4cac6",
    colorPalette: ["#d4cac6", "#24201f", "#824f38", "#c49046", "#86848f"],
  },
  {
    id: "asset-11",
    title: "Neumorphic Button Set",
    type: "image",
    url: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80",
    projectId: "proj-3",
    uploaderId: "user-3",
    createdAt: "2024-03-11T14:30:00.000Z",
    width: 500,
    height: 750,
    dominantColor: "#333d38",
    colorPalette: ["#333d38", "#d3c6b7", "#a9bdc2", "#7b86b3", "#938273"],
  },
  {
    id: "asset-12",
    title: "Vintage Poster Design",
    type: "image",
    url: "https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=800&q=80",
    projectId: "proj-5",
    uploaderId: "user-3",
    createdAt: "2024-03-12T11:00:00.000Z",
    width: 600,
    height: 900,
    dominantColor: "#4697b2",
    colorPalette: ["#4697b2", "#271616", "#a54239", "#22586e", "#4b7c8a"],
  },
  {
    id: "asset-13",
    title: "Data Visualization Dashboard",
    type: "image",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80",
    projectId: "proj-4",
    uploaderId: "user-2",
    createdAt: "2024-03-13T16:15:00.000Z",
    width: 900,
    height: 600,
    dominantColor: "#0a100d",
    colorPalette: ["#0a100d", "#e9e3e4", "#20b7c9", "#28789f", "#9f596e"],
  },
  {
    id: "asset-14",
    title: "Minimalist Icon Set",
    type: "image",
    url: "https://images.unsplash.com/photo-1523726491678-bf852e717f6a?w=800&q=80",
    projectId: "proj-3",
    uploaderId: "user-2",
    createdAt: "2024-03-14T10:30:00.000Z",
    width: 800,
    height: 800,
    dominantColor: "#959095",
    colorPalette: ["#959095", "#252c32", "#6f3c32", "#cec8ca", "#6c4250"],
  },
  {
    id: "asset-15",
    title: "Elegant E-commerce Product Page",
    type: "image",
    url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&q=80",
    projectId: "proj-4",
    uploaderId: "user-1",
    createdAt: "2024-03-15T13:45:00.000Z",
    width: 400,
    height: 850,
    dominantColor: "#1c1b33",
    colorPalette: ["#1c1b33", "#eb0d38", "#3c5473", "#6c052f", "#394c74"],
  },
  {
    id: "asset-16",
    title: "Futuristic UI Components",
    type: "image",
    url: "https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=800&q=80",
    projectId: "proj-2",
    uploaderId: "user-1",
    createdAt: "2024-03-16T15:00:00.000Z",
    width: 1000,
    height: 600,
    dominantColor: "#a0a0a3",
    colorPalette: ["#a0a0a3", "#111818", "#523023", "#50575b", "#7e5035"],
  },
  {
    id: "asset-17",
    title: "Nature-Inspired Color Scheme",
    type: "image",
    url: "https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=800&q=80",
    projectId: "proj-5",
    uploaderId: "user-3",
    createdAt: "2024-03-17T12:20:00.000Z",
    width: 700,
    height: 450,
    dominantColor: "#baaace",
    colorPalette: ["#baaace", "#11535c", "#61819c", "#595e69", "#555261"],
  },
  {
    id: "asset-18",
    title: "Retro Gaming Interface",
    type: "image",
    url: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&q=80",
    projectId: "proj-1",
    uploaderId: "user-1",
    createdAt: "2024-03-18T14:50:00.000Z",
    width: 600,
    height: 600,
    dominantColor: "#0d080d",
    colorPalette: ["#0d080d", "#0cc5ec", "#c06797", "#065eac", "#0e3262"],
  },
];
