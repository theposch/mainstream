/**
 * Email-only block renderer - no client-side interactivity
 * Used for generating email HTML on the server
 */
import * as React from "react";
import {
  Section,
  Heading,
  Text,
  Img,
  Hr,
} from "@react-email/components";
import type { DropBlock } from "@/lib/types/database";

interface EmailBlockRendererProps {
  block: DropBlock;
}

// Shared styles
const styles = {
  textBlock: {
    fontSize: "16px",
    lineHeight: "1.7",
    color: "#a0a0a0",
    margin: "0 0 16px 0",
  },
  heading1: {
    fontSize: "28px",
    fontWeight: "700" as const,
    color: "#ffffff",
    margin: "32px 0 16px 0",
    lineHeight: "1.3",
  },
  heading2: {
    fontSize: "22px",
    fontWeight: "600" as const,
    color: "#ffffff",
    margin: "28px 0 12px 0",
    lineHeight: "1.3",
  },
  heading3: {
    fontSize: "18px",
    fontWeight: "600" as const,
    color: "#ffffff",
    margin: "24px 0 10px 0",
    lineHeight: "1.3",
  },
  divider: {
    borderColor: "#333333",
    margin: "32px 0",
  },
  quote: {
    borderLeft: "3px solid #a78bfa",
    paddingLeft: "16px",
    margin: "24px 0",
    fontStyle: "italic" as const,
    color: "#a0a0a0",
    fontSize: "16px",
    lineHeight: "1.6",
  },
  postCard: {
    marginBottom: "32px",
  },
  featuredPostCard: {
    marginBottom: "40px",
  },
  postImage: {
    width: "100%",
    height: "auto",
    maxHeight: "400px",
    objectFit: "cover" as const,
    display: "block" as const,
    borderRadius: "12px",
  },
  featuredImage: {
    width: "100%",
    height: "auto",
    maxHeight: "500px",
    objectFit: "cover" as const,
    display: "block" as const,
    borderRadius: "16px",
  },
  postTitle: {
    fontSize: "18px",
    fontWeight: "600" as const,
    color: "#ffffff",
    margin: "0 0 8px 0",
    lineHeight: "1.4",
  },
  featuredPostTitle: {
    fontSize: "24px",
    fontWeight: "700" as const,
    color: "#ffffff",
    margin: "0 0 12px 0",
    lineHeight: "1.3",
  },
  postDescription: {
    fontSize: "15px",
    color: "#a0a0a0",
    margin: "0 0 12px 0",
    lineHeight: "1.5",
  },
  postMeta: {
    fontSize: "14px",
    color: "#666666",
    margin: "0",
  },
};

// Format post date
function formatPostDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get effective display mode
function getEffectiveDisplayMode(block: DropBlock): "fit" | "cover" {
  if (block.display_mode && block.display_mode !== "auto") {
    return block.display_mode;
  }
  return block.asset?.embed_provider === "figma" ? "fit" : "cover";
}

export function EmailBlockRenderer({ block }: EmailBlockRendererProps) {
  switch (block.type) {
    case "text":
      return <Text style={styles.textBlock}>{block.content}</Text>;

    case "heading": {
      const level = block.heading_level || 2;
      const style = level === 1 ? styles.heading1 : level === 2 ? styles.heading2 : styles.heading3;
      return (
        <Heading as={`h${level}` as "h1" | "h2" | "h3"} style={style}>
          {block.content}
        </Heading>
      );
    }

    case "divider":
      return <Hr style={styles.divider} />;

    case "quote":
      return (
        <Section style={styles.quote}>
          <Text style={{ margin: 0 }}>{block.content}</Text>
        </Section>
      );

    case "post":
    case "featured_post": {
      const asset = block.asset;
      if (!asset) return null;

      const isFeatured = block.type === "featured_post";
      const displayMode = getEffectiveDisplayMode(block);
      const isFigma = asset.embed_provider === "figma";

      const imageUrl = asset.medium_url || asset.url || asset.thumbnail_url;
      
      // Calculate object-position from crop values
      const cropX = block.crop_position_x ?? 50;
      const cropY = block.crop_position_y ?? 0;

      const imageStyle: React.CSSProperties = {
        ...(isFeatured ? styles.featuredImage : styles.postImage),
        objectFit: displayMode === "fit" ? "contain" : "cover",
        objectPosition: displayMode === "cover" ? `${cropX}% ${cropY}%` : "center",
        backgroundColor: isFigma ? "#1a1a1a" : "transparent",
      };

      return (
        <Section style={isFeatured ? styles.featuredPostCard : styles.postCard}>
          {imageUrl && (
            <Img
              src={imageUrl}
              alt={asset.title || "Post image"}
              style={imageStyle}
            />
          )}
          <Section style={{ padding: "16px 0" }}>
            <Text style={isFeatured ? styles.featuredPostTitle : styles.postTitle}>
              {asset.title}
            </Text>
            {asset.description && (
              <Text style={styles.postDescription}>
                {asset.description}
              </Text>
            )}
            <Text style={styles.postMeta}>
              {asset.uploader?.display_name && `By ${asset.uploader.display_name}`}
              {asset.created_at && ` • ${formatPostDate(asset.created_at)}`}
            </Text>
          </Section>
        </Section>
      );
    }

    default:
      return null;
  }
}

