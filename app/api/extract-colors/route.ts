import { NextRequest, NextResponse } from 'next/server';
import getColors from 'get-image-colors';

export const runtime = 'nodejs'; // Ensure Node.js runtime

/**
 * POST /api/extract-colors
 * 
 * Extracts a color palette from an image URL using get-image-colors
 * 
 * Request body:
 * {
 *   "imageUrl": "https://example.com/image.jpg",
 *   "colorCount": 5 // optional, defaults to 5
 * }
 * 
 * Response:
 * {
 *   "colors": ["#hex1", "#hex2", ...],
 *   "dominantColor": "#hex"
 * }
 */
export async function POST(request: NextRequest) {
  console.log('[POST /api/extract-colors] 🎨 Color extraction endpoint called');
  
  try {
    const body = await request.json();
    const { imageUrl, colorCount = 5 } = body;

    console.log('[POST /api/extract-colors] Request params:');
    console.log(`  - imageUrl: ${imageUrl}`);
    console.log(`  - colorCount: ${colorCount}`);

    if (!imageUrl) {
      console.error('[POST /api/extract-colors] ❌ Missing imageUrl parameter');
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    console.log('[POST /api/extract-colors] Calling get-image-colors library...');
    
    // Extract colors from image
    const colorObjects = await getColors(imageUrl, { count: colorCount });
    
    console.log(`[POST /api/extract-colors] ✅ Extracted ${colorObjects.length} color objects`);
    
    // Convert Color objects to hex strings
    const colors = colorObjects.map(color => color.hex());
    const dominantColor = colors[0]; // First color is most prominent

    console.log('[POST /api/extract-colors] ✅ Successfully extracted colors:');
    console.log(`  - Dominant: ${dominantColor}`);
    console.log(`  - Palette: ${colors.join(', ')}`);

    return NextResponse.json({
      colors,
      dominantColor,
    });
  } catch (error) {
    console.error('[POST /api/extract-colors] ❌ Error extracting colors:');
    console.error(`  - Error type: ${error instanceof Error ? error.name : typeof error}`);
    console.error(`  - Error message: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.error(`  - Stack trace:\n${error.stack}`);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to extract colors from image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

