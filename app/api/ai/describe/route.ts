import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { generateImageDescription, isAIConfigured, AIError } from "@/lib/utils/ai";

export async function POST(request: NextRequest) {
  try {
    // Check if AI is configured
    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: "AI features are not configured on this server" },
        { status: 503 }
      );
    }

    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { imageUrl, existingDescription } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    // Validate URL format (skip for data URLs)
    if (!imageUrl.startsWith("data:")) {
      try {
        new URL(imageUrl);
      } catch {
        return NextResponse.json(
          { error: "Invalid imageUrl format" },
          { status: 400 }
        );
      }
    }

    // Generate description using AI (pass existing description if provided)
    const result = await generateImageDescription(imageUrl, existingDescription);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI describe error:", error);

    if (error instanceof AIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}

