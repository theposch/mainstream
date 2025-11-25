/**
 * Persistent Asset Storage using JSON File
 * 
 * This module provides simple file-based persistence for asset metadata
 * during development. It's designed to be easily replaceable with a
 * database implementation.
 * 
 * TODO: DATABASE MIGRATION
 * When ready to migrate to a database, replace this entire file with
 * database queries. This module is intentionally isolated to make the
 * transition seamless.
 * 
 * Example Migration (using Drizzle ORM):
 * 
 * ```typescript
 * import { db } from '@/lib/db';
 * import { assets } from '@/lib/db/schema';
 * import { desc, eq } from 'drizzle-orm';
 * 
 * export async function readAssets(): Promise<Asset[]> {
 *   return await db.select().from(assets).orderBy(desc(assets.createdAt));
 * }
 * 
 * export async function addAsset(asset: Asset): Promise<void> {
 *   await db.insert(assets).values(asset);
 * }
 * 
 * export async function deleteAsset(assetId: string): Promise<boolean> {
 *   const result = await db.delete(assets).where(eq(assets.id, assetId));
 *   return result.rowCount > 0;
 * }
 * ```
 * 
 * Benefits of Database Migration:
 * - Better performance with indexes
 * - ACID compliance
 * - Concurrent access handling
 * - Full-text search
 * - Relationships (joins)
 * - Backup and replication
 * 
 * @see /docs/IMAGE_UPLOAD.md for complete migration guide
 */

import fs from 'fs';
import path from 'path';
import { Asset } from '@/lib/mock-data/assets';

// Storage file location - contains all asset metadata
const STORAGE_FILE = path.join(process.cwd(), 'data', 'assets.json');

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory(): void {
  const dataDir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Reads all assets from the JSON file
 * 
 * On first run, automatically initializes with mock data from
 * lib/mock-data/assets.ts. On subsequent runs, reads from the
 * persistent JSON file.
 * 
 * TODO: Replace with database query:
 * ```typescript
 * export async function readAssets(): Promise<Asset[]> {
 *   return await db
 *     .select()
 *     .from(assets)
 *     .orderBy(desc(assets.createdAt))
 *     .limit(1000); // Add pagination in real app
 * }
 * ```
 * 
 * @returns Array of all assets
 */
export function readAssets(): Asset[] {
  try {
    ensureDataDirectory();
    
    // First run: initialize with mock data
    if (!fs.existsSync(STORAGE_FILE)) {
      console.log('[assets-storage] No storage file found, initializing with mock data...');
      const { assets: mockAssets } = require('@/lib/mock-data/assets');
      writeAssets(mockAssets);
      return mockAssets;
    }
    
    // Read from persistent storage
    const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const assets = JSON.parse(data);
    console.log(`[assets-storage] Loaded ${assets.length} assets from storage`);
    return assets;
  } catch (error) {
    console.error('[assets-storage] Error reading assets:', error);
    return [];
  }
}

/**
 * Writes all assets to the JSON file
 * 
 * This is a destructive operation that replaces the entire file.
 * Used internally by addAsset() and deleteAsset().
 * 
 * TODO: Not needed with database (each operation is atomic)
 * 
 * @param assets - Complete array of assets to save
 */
export function writeAssets(assets: Asset[]): void {
  try {
    ensureDataDirectory();
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(assets, null, 2), 'utf-8');
    console.log(`[assets-storage] Saved ${assets.length} assets to storage`);
  } catch (error) {
    console.error('[assets-storage] Error writing assets:', error);
    throw error;
  }
}

/**
 * Adds a new asset to storage
 * 
 * Reads all assets, appends the new one, and writes back to file.
 * Not ideal for concurrent access, but works fine for development.
 * 
 * TODO: Replace with database INSERT:
 * ```typescript
 * export async function addAsset(asset: Asset): Promise<Asset> {
 *   const [inserted] = await db.insert(assets).values(asset).returning();
 *   return inserted;
 * }
 * ```
 * 
 * @param asset - Asset object to add
 */
export function addAsset(asset: Asset): void {
  const assets = readAssets();
  assets.push(asset);
  writeAssets(assets);
  console.log(`[assets-storage] Added new asset: ${asset.id} - ${asset.title}`);
}

/**
 * Deletes an asset from storage
 * 
 * Reads all assets, filters out the one to delete, and writes back.
 * Returns true if asset was found and deleted, false otherwise.
 * 
 * TODO: Replace with database DELETE:
 * ```typescript
 * export async function deleteAsset(assetId: string): Promise<boolean> {
 *   const result = await db
 *     .delete(assets)
 *     .where(eq(assets.id, assetId));
 *   return result.rowCount > 0;
 * }
 * ```
 * 
 * Note: You should also delete the actual image files from storage
 * when deleting an asset. Use deleteUploadedFiles() from file-storage.ts
 * 
 * @param assetId - ID of asset to delete
 * @returns true if deleted, false if not found
 */
export function deleteAsset(assetId: string): boolean {
  const assets = readAssets();
  const initialLength = assets.length;
  const filtered = assets.filter(a => a.id !== assetId);
  
  if (filtered.length === initialLength) {
    return false; // Asset not found
  }
  
  writeAssets(filtered);
  console.log(`[assets-storage] Deleted asset: ${assetId}`);
  return true;
}

