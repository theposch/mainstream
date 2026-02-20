import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { isAIConfigured, AIError } from "@/lib/utils/ai";
import { createScopedLogger } from "@/lib/logger";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/middleware/rate-limit";

const log = createScopedLogger("GenerateRoute");

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PostAsset {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  uploader: { display_name: string | null } | null;
}

interface BlockRow {
  type: string;
  asset: PostAsset | null;
}

interface DropPostRow {
  asset: PostAsset | null;
}

interface AssetStreamRow {
  asset_id: string;
  stream: { name: string } | null;
}

const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL;
const LITELLM_API_KEY = process.env.LITELLM_API_KEY;
const LITELLM_MODEL = process.env.LITELLM_MODEL || "gemini/gemini-2.5-flash";

// POST /api/drops/[id]/generate - Generate AI description for a drop
export async function POST(request: NextRequest, { params }: RouteParams) {
  const start = Date.now();

  const rl = checkRateLimit(request, RATE_LIMITS.aiGenerate);
  if (!rl.success) {
    log.warn("Rate limit exceeded for AI generate");
    return rateLimitResponse(rl);
  }

  try {
    const { id: dropId } = await params;
    log.info("Generating AI description", { dropId });

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
    let posts: PostAsset[] = (blocks as BlockRow[] | null)
      ?.map((b) => b.asset)
      .filter((a): a is PostAsset => a !== null) || [];

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

      posts = (dropPosts as DropPostRow[] | null)
        ?.map((dp) => dp.asset)
        .filter((a): a is PostAsset => a !== null) || [];
    }

    if (posts.length === 0) {
      log.warn("No posts found in drop", { dropId });
      return NextResponse.json(
        { error: "No posts in this drop to summarize" },
        { status: 400 }
      );
    }

    // Get streams for posts
    const postIds = posts.map((p) => p.id);
    const { data: assetStreams } = await supabase
      .from("asset_streams")
      .select(`
        asset_id,
        stream:streams(name)
      `)
      .in("asset_id", postIds);

    const postStreams: Record<string, string[]> = {};
    (assetStreams as AssetStreamRow[] | null)?.forEach((as) => {
      if (!postStreams[as.asset_id]) {
        postStreams[as.asset_id] = [];
      }
      if (as.stream?.name) {
        postStreams[as.asset_id].push(as.stream.name);
      }
    });

    log.info("Collected posts for generation", { count: posts.length });

    // Format posts for the prompt
    const postsDescription = posts.map((post, index) => {
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
      log.error("LiteLLM request failed", new Error(errorText), { status: response.status });
      throw new AIError("Failed to generate description", "LITELLM_ERROR", response.status);
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content?.trim();

    if (!description) {
      throw new AIError("No content generated", "NO_CONTENT");
    }

    log.request("POST", `/api/drops/${dropId}/generate`, 200, Date.now() - start);
    return NextResponse.json({ description });
  } catch (error) {
    log.error("Error generating drop description", error instanceof Error ? error : new Error(String(error)));
    
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

