/**
 * Script to update lib/mock-data/assets.ts with extracted colors
 * 
 * Usage:
 * npx tsx scripts/update-asset-colors.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface ColorData {
  dominantColor: string;
  colorPalette: string[];
}

async function main() {
  // Read extracted colors
  const colorsPath = path.join(__dirname, 'extracted-colors.json');
  const colorsJson = fs.readFileSync(colorsPath, 'utf8');
  const extractedColors: Record<string, ColorData> = JSON.parse(colorsJson);

  // Read assets file
  const assetsPath = path.join(__dirname, '../lib/mock-data/assets.ts');
  let assetsContent = fs.readFileSync(assetsPath, 'utf8');

  // Update each asset's colors
  for (const [assetId, colorData] of Object.entries(extractedColors)) {
    const { dominantColor, colorPalette } = colorData;
    
    // Find and replace the asset's color data
    // Match pattern: id: "asset-X"... dominantColor: "...", (optional colorPalette)
    const assetRegex = new RegExp(
      `(id: "${assetId}",[\\s\\S]*?dominantColor: )"[^"]*"(,\\s*colorPalette: \\[[^\\]]*\\])?(,)?`,
      'g'
    );

    const formattedPalette = `["${colorPalette.join('", "')}"]`;
    const replacement = `$1"${dominantColor}",\n    colorPalette: ${formattedPalette}$3`;

    assetsContent = assetsContent.replace(assetRegex, replacement);
  }

  // Write back to file
  fs.writeFileSync(assetsPath, assetsContent, 'utf8');

  console.log('✅ Successfully updated lib/mock-data/assets.ts with extracted colors!');
  console.log(`   Updated ${Object.keys(extractedColors).length} assets`);
}

main().catch(console.error);



