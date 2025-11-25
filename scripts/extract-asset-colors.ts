/**
 * Script to extract colors from all mock assets using node-vibrant
 * 
 * Usage:
 * npx tsx scripts/extract-asset-colors.ts
 * 
 * This will analyze all asset images and update the mock data with real color palettes
 */

import getColors from 'get-image-colors';
import { assets } from '../lib/mock-data/assets';
import * as fs from 'fs';
import * as path from 'path';

interface ColorData {
  dominantColor: string;
  colorPalette: string[];
}

async function extractColorsFromImage(imageUrl: string): Promise<ColorData> {
  try {
    console.log(`  Extracting colors from: ${imageUrl}`);
    
    // Extract colors from image
    const colors = await getColors(imageUrl, { count: 5 });
    
    // Convert Color objects to hex strings
    const colorPalette = colors.map(color => color.hex());
    const dominantColor = colorPalette[0]; // First color is most prominent

    console.log(`  ✓ Found ${colorPalette.length} colors. Dominant: ${dominantColor}`);
    
    return {
      dominantColor,
      colorPalette,
    };
  } catch (error) {
    console.error(`  ✗ Error extracting colors:`, error);
    throw error;
  }
}

async function main() {
  console.log('🎨 Extracting colors from asset images...\n');
  
  const results: Record<string, ColorData> = {};
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    console.log(`[${i + 1}/${assets.length}] ${asset.title}`);
    
    try {
      const colorData = await extractColorsFromImage(asset.url);
      results[asset.id] = colorData;
      successCount++;
      
      // Add a small delay to avoid overwhelming the image hosts
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to process ${asset.title}`);
      failCount++;
    }
    
    console.log('');
  }

  // Save results to a JSON file
  const outputPath = path.join(process.cwd(), 'scripts', 'extracted-colors.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log('✅ Color extraction complete!');
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
  console.log(`   Results saved to: ${outputPath}`);
  console.log('\n📝 Next step: Update lib/mock-data/assets.ts with the extracted colors');
}

main().catch(console.error);

