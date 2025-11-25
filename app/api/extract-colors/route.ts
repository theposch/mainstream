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
  try {
    const body = await request.json();
    const { imageUrl, colorCount = 5 } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    // Extract colors from image
    const colorObjects = await getColors(imageUrl, { count: colorCount });
    
    // Convert Color objects to hex strings
    const colors = colorObjects.map(color => color.hex());
    const dominantColor = colors[0]; // First color is most prominent

    return NextResponse.json({
      colors,
      dominantColor,
    });
  } catch (error) {
    console.error('Error extracting colors:', error);
    return NextResponse.json(
      { 
        error: 'Failed to extract colors from image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

