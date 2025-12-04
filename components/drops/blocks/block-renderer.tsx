"use client";

import * as React from "react";
import {
  Section,
  Heading,
  Text,
  Img,
  Hr,
  Link,
} from "@react-email/components";
import type { DropBlock, Asset } from "@/lib/types/database";

interface BlockRendererProps {
  block: DropBlock;
  isEditing?: boolean;
  onContentChange?: (content: string) => void;
  onDelete?: () => void;
  onDisplayModeChange?: (mode: "auto" | "fit" | "cover") => void;
  onCropPositionChange?: (x: number, y: number) => void;
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
    fontWeight: "700",
    color: "#ffffff",
    margin: "32px 0 16px 0",
    lineHeight: "1.3",
  },
  heading2: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#ffffff",
    margin: "28px 0 12px 0",
    lineHeight: "1.3",
  },
  heading3: {
    fontSize: "18px",
    fontWeight: "600",
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
  postImageWrapper: {
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    maxHeight: "400px",
  },
  featuredImageWrapper: {
    borderRadius: "16px",
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    maxHeight: "500px",
  },
  postImage: {
    width: "100%",
    height: "auto",
    maxHeight: "400px",
    objectFit: "cover" as const,
    display: "block",
    borderRadius: "12px",
  },
  featuredImage: {
    width: "100%",
    height: "auto",
    maxHeight: "500px",
    objectFit: "cover" as const,
    display: "block",
    borderRadius: "16px",
  },
  postContent: {
    padding: "16px 0",
  },
  postTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#ffffff",
    margin: "0 0 8px 0",
    lineHeight: "1.4",
  },
  featuredPostTitle: {
    fontSize: "24px",
    fontWeight: "700",
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
  postAuthorAvatar: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
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

// Text Block Component
function TextBlockView({ block, isEditing, onContentChange }: BlockRendererProps) {
  if (isEditing && onContentChange) {
    return (
      <div style={{ marginBottom: "16px" }}>
        <textarea
          value={block.content || ""}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Write something..."
          style={{
            width: "100%",
            minHeight: "80px",
            backgroundColor: "transparent",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "16px",
            lineHeight: "1.7",
            color: "#a0a0a0",
            resize: "vertical" as const,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
      </div>
    );
  }

  return <Text style={styles.textBlock}>{block.content}</Text>;
}

// Heading Block Component
function HeadingBlockView({ block, isEditing, onContentChange }: BlockRendererProps) {
  const level = block.heading_level || 2;
  const style = level === 1 ? styles.heading1 : level === 2 ? styles.heading2 : styles.heading3;

  if (isEditing && onContentChange) {
    return (
      <input
        type="text"
        value={block.content || ""}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={`Heading ${level}`}
        style={{
          ...style,
          width: "100%",
          backgroundColor: "transparent",
          border: "none",
          borderBottom: "2px solid transparent",
          outline: "none",
          fontFamily: "inherit",
        }}
        onFocus={(e) => {
          e.target.style.borderBottomColor = "#333";
        }}
        onBlur={(e) => {
          e.target.style.borderBottomColor = "transparent";
        }}
      />
    );
  }

  return (
    <Heading as={`h${level}` as "h1" | "h2" | "h3"} style={style}>
      {block.content}
    </Heading>
  );
}

// Divider Block Component
function DividerBlockView() {
  return <Hr style={styles.divider} />;
}

// Quote Block Component
function QuoteBlockView({ block, isEditing, onContentChange }: BlockRendererProps) {
  if (isEditing && onContentChange) {
    return (
      <div style={styles.quote}>
        <textarea
          value={block.content || ""}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Add a quote..."
          style={{
            width: "100%",
            minHeight: "60px",
            backgroundColor: "transparent",
            border: "none",
            padding: "0",
            fontSize: "16px",
            lineHeight: "1.6",
            color: "#a0a0a0",
            resize: "vertical" as const,
            outline: "none",
            fontFamily: "inherit",
            fontStyle: "italic",
          }}
        />
      </div>
    );
  }

  return (
    <div style={styles.quote}>
      <Text style={{ margin: 0 }}>{block.content}</Text>
    </div>
  );
}

// Display mode control buttons
function DisplayModeControls({ 
  block, 
  onModeChange 
}: { 
  block: DropBlock; 
  onModeChange: (mode: "auto" | "fit" | "cover") => void;
}) {
  const currentMode = getEffectiveDisplayMode(block);
  
  return (
    <div 
      className="display-mode-controls"
      style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        display: 'flex',
        gap: '4px',
        opacity: 0,
        transition: 'opacity 0.2s ease',
        zIndex: 10,
      }}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onModeChange('fit');
        }}
        title="Fit - Show entire image"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: currentMode === 'fit' ? 'rgba(167, 139, 250, 0.9)' : 'rgba(0, 0, 0, 0.7)',
          color: currentMode === 'fit' ? '#fff' : '#a0a0a0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          fontSize: '14px',
        }}
      >
        ⊡
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onModeChange('cover');
        }}
        title="Fill - Crop to fill"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: currentMode === 'cover' ? 'rgba(167, 139, 250, 0.9)' : 'rgba(0, 0, 0, 0.7)',
          color: currentMode === 'cover' ? '#fff' : '#a0a0a0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          fontSize: '14px',
        }}
      >
        ⬚
      </button>
    </div>
  );
}

// Post Block Component
function PostBlockView({ block, isEditing, onDisplayModeChange }: BlockRendererProps) {
  const asset = block.asset;
  if (!asset) return null;

  const displayMode = getEffectiveDisplayMode(block);
  const isFitMode = displayMode === "fit";

  return (
    <div style={styles.postCard}>
      <div 
        className="post-image-container"
        style={{
          ...styles.postImageWrapper,
          ...(isFitMode ? { backgroundColor: "#18181b" } : {}),
          position: "relative" as const,
        }}
      >
        <Link href={`/e/${asset.id}`}>
          <Img
            src={asset.medium_url || asset.url || asset.thumbnail_url}
            alt={asset.title}
            style={{
              ...styles.postImage,
              objectFit: isFitMode ? "contain" as const : "cover" as const,
              objectPosition: isFitMode 
                ? "center" 
                : `${block.crop_position_x ?? 50}% ${block.crop_position_y ?? 0}%`,
            }}
          />
        </Link>
        {isEditing && onDisplayModeChange && (
          <DisplayModeControls 
            block={block} 
            onModeChange={onDisplayModeChange} 
          />
        )}
      </div>
      <div style={styles.postContent}>
        <Text style={styles.postTitle}>{asset.title}</Text>
        {asset.description && (
          <Text style={styles.postDescription}>{asset.description}</Text>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
          {asset.uploader && (
            <>
              <Img
                src={asset.uploader.avatar_url || "/default-avatar.png"}
                alt={asset.uploader.display_name}
                style={styles.postAuthorAvatar}
              />
              <Text style={styles.postMeta}>{asset.uploader.display_name}</Text>
              <Text style={styles.postMeta}>•</Text>
            </>
          )}
          <Text style={styles.postMeta}>{formatPostDate(asset.created_at)}</Text>
        </div>
      </div>
      
      {/* CSS for hover effect */}
      <style>{`
        .post-image-container:hover .display-mode-controls {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

// Featured Post Block Component
function FeaturedPostBlockView({ block, isEditing, onDisplayModeChange }: BlockRendererProps) {
  const asset = block.asset;
  if (!asset) return null;

  const displayMode = getEffectiveDisplayMode(block);
  const isFitMode = displayMode === "fit";

  return (
    <div style={styles.featuredPostCard}>
      <div 
        className="featured-image-container"
        style={{
          ...styles.featuredImageWrapper,
          ...(isFitMode ? { backgroundColor: "#18181b" } : {}),
          position: "relative" as const,
        }}
      >
        <Link href={`/e/${asset.id}`}>
          <Img
            src={asset.medium_url || asset.url || asset.thumbnail_url}
            alt={asset.title}
            style={{
              ...styles.featuredImage,
              objectFit: isFitMode ? "contain" as const : "cover" as const,
              objectPosition: isFitMode 
                ? "center" 
                : `${block.crop_position_x ?? 50}% ${block.crop_position_y ?? 0}%`,
            }}
          />
        </Link>
        {isEditing && onDisplayModeChange && (
          <DisplayModeControls 
            block={block} 
            onModeChange={onDisplayModeChange} 
          />
        )}
      </div>
      <div style={{ ...styles.postContent, padding: "20px 0" }}>
        <Text style={styles.featuredPostTitle}>{asset.title}</Text>
        {asset.description && (
          <Text style={{ ...styles.postDescription, fontSize: "16px" }}>{asset.description}</Text>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
          {asset.uploader && (
            <>
              <Img
                src={asset.uploader.avatar_url || "/default-avatar.png"}
                alt={asset.uploader.display_name}
                style={{ ...styles.postAuthorAvatar, width: "28px", height: "28px" }}
              />
              <Text style={{ ...styles.postMeta, fontSize: "15px" }}>{asset.uploader.display_name}</Text>
              <Text style={styles.postMeta}>•</Text>
            </>
          )}
          <Text style={{ ...styles.postMeta, fontSize: "15px" }}>{formatPostDate(asset.created_at)}</Text>
        </div>
      </div>
      
      {/* CSS for hover effect */}
      <style>{`
        .featured-image-container:hover .display-mode-controls {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

// Main Block Renderer
export function BlockRenderer(props: BlockRendererProps) {
  const { block } = props;

  switch (block.type) {
    case "text":
      return <TextBlockView {...props} />;
    case "heading":
      return <HeadingBlockView {...props} />;
    case "divider":
      return <DividerBlockView />;
    case "quote":
      return <QuoteBlockView {...props} />;
    case "post":
      return <PostBlockView {...props} />;
    case "featured_post":
      return <FeaturedPostBlockView {...props} />;
    default:
      return null;
  }
}

// Export individual components for direct use
export {
  TextBlockView,
  HeadingBlockView,
  DividerBlockView,
  QuoteBlockView,
  PostBlockView,
  FeaturedPostBlockView,
};

