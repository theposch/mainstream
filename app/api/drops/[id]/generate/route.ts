import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isAIConfigured, AIError } from "@/lib/utils/ai";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL;
const LITELLM_API_KEY = process.env.LITELLM_API_KEY;
const LITELLM_MODEL = process.env.LITELLM_MODEL || "gemini/gemini-2.5-flash";

// POST /api/drops/[id]/generate - Generate AI description for a drop
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dropId } = await params;
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: "AI features are not configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();

    // Fetch drop and verify ownership
    const { data: drop } = await supabase
      .from("drops")
      .select("*, created_by")
      .eq("id", dropId)
      .single();

    if (!drop) {
      return NextResponse.json(
        { error: "Drop not found" },
        { status: 404 }
      );
    }

    if (drop.created_by !== user.id) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Fetch posts from blocks (blocks-based drops)
    const { data: blocks } = await supabase
      .from("drop_blocks")
      .select(`
        type,
        asset:assets(
          id,
          title,
          description,
          thumbnail_url,
          uploader:users!uploader_id(display_name)
        )
      `)
      .eq("drop_id", dropId)
      .in("type", ["post", "featured_post"])
      .order("position", { ascending: true });

    // Extract posts from blocks
    let posts = blocks?.map((b: any) => b.asset).filter(Boolean) || [];

    // Fallback: check drop_posts for legacy drops
    if (posts.length === 0) {
      const { data: dropPosts } = await supabase
        .from("drop_posts")
        .select(`
          asset:assets(
            id,
            title,
            description,
            thumbnail_url,
            uploader:users!uploader_id(display_name)
          )
        `)
        .eq("drop_id", dropId)
        .order("position", { ascending: true });

      posts = dropPosts?.map((dp: any) => dp.asset).filter(Boolean) || [];
    }

    if (posts.length === 0) {
      return NextResponse.json(
        { error: "No posts in this drop to summarize" },
        { status: 400 }
      );
    }

    // Get streams for posts
    const postIds = posts.map((p: any) => p.id);
    const { data: assetStreams } = await supabase
      .from("asset_streams")
      .select(`
        asset_id,
        stream:streams(name)
      `)
      .in("asset_id", postIds);

    const postStreams: Record<string, string[]> = {};
    assetStreams?.forEach((as: any) => {
      if (!postStreams[as.asset_id]) {
        postStreams[as.asset_id] = [];
      }
      if (as.stream?.name) {
        postStreams[as.asset_id].push(as.stream.name);
      }
    });

    // Format posts for the prompt
    const postsDescription = posts.map((post: any, index: number) => {
      const streams = postStreams[post.id] || [];
      const streamStr = streams.length > 0 ? ` in #${streams.join(", #")}` : "";
      const descStr = post.description ? ` - ${post.description.slice(0, 100)}` : "";
      return `${index + 1}. "${post.title}" by ${post.uploader?.display_name || "Unknown"}${streamStr}${descStr}`;
    }).join("\n");

    // Format date range
    const startDate = new Date(drop.date_range_start).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    const endDate = new Date(drop.date_range_end).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const prompt = `You are writing a weekly design newsletter for a platform called Mainstream.
Summarize the following ${posts.length} posts shared between ${startDate} and ${endDate}.

Posts:
${postsDescription}

Write a 2-3 paragraph summary (150-250 words) that:
- Highlights key themes and notable work
- Mentions contributors by name where relevant
- Groups related work together naturally
- Keeps a friendly, professional tone suitable for stakeholders

Respond with ONLY the summary text, no formatting or additional commentary.`;

    // Call LiteLLM
    const response = await fetch(`${LITELLM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LITELLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LITELLM_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Drops Generate] LiteLLM error:", errorText);
      throw new AIError("Failed to generate description", "LITELLM_ERROR", response.status);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim();

    if (!description) {
      throw new AIError("No content generated", "NO_CONTENT");
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error("[Drops Generate] Error:", error);
    
    if (error instanceof AIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 }
    );
  }
}

