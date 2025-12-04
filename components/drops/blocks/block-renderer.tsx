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
import type { DropBlock, Asset, GalleryLayout } from "@/lib/types/database";

interface BlockRendererProps {
  block: DropBlock;
  isEditing?: boolean;
  onContentChange?: (content: string) => void;
  onDelete?: () => void;
  onDisplayModeChange?: (mode: "auto" | "fit" | "cover") => void;
  onCropPositionChange?: (x: number, y: number) => void;
  // Gallery-specific props
  onGalleryLayoutChange?: (layout: GalleryLayout) => void;
  onGalleryFeaturedIndexChange?: (index: number) => void;
  onGalleryAddImages?: (assetIds: string[]) => void;
  onGalleryRemoveImage?: (assetId: string) => void;
  availableAssets?: Asset[];
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
  // Gallery styles
  galleryContainer: {
    marginBottom: "32px",
  },
  galleryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "8px",
  },
  galleryGridItem: {
    aspectRatio: "1",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  galleryFeaturedContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  galleryFeaturedMain: {
    aspectRatio: "16/9",
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  galleryFeaturedImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  galleryThumbnailRow: {
    display: "flex",
    gap: "8px",
  },
  galleryThumbnail: {
    flex: "1",
    aspectRatio: "1",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    position: "relative" as const,
  },
  galleryThumbnailImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  galleryOverflowBadge: {
    position: "absolute" as const,
    inset: "0",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "600",
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

// Draggable image for adjusting crop position in cover mode
function DraggableImage({ 
  block, 
  imgStyle,
  onPositionChange,
}: { 
  block: DropBlock; 
  imgStyle: React.CSSProperties;
  onPositionChange: (x: number, y: number) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startPos, setStartPos] = React.useState({ x: 0, y: 0 });
  const [cropPos, setCropPos] = React.useState({ 
    x: block.crop_position_x ?? 50, 
    y: block.crop_position_y ?? 0 
  });

  // Update local state when block prop changes
  React.useEffect(() => {
    setCropPos({
      x: block.crop_position_x ?? 50,
      y: block.crop_position_y ?? 0,
    });
  }, [block.crop_position_x, block.crop_position_y]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = ((e.clientX - startPos.x) / rect.width) * 100;
    const deltaY = ((e.clientY - startPos.y) / rect.height) * 100;
    
    // Invert direction: dragging right moves crop left (lower x value)
    const newX = Math.max(0, Math.min(100, cropPos.x - deltaX));
    const newY = Math.max(0, Math.min(100, cropPos.y - deltaY));
    
    setCropPos({ x: newX, y: newY });
    setStartPos({ x: e.clientX, y: e.clientY });
  }, [isDragging, startPos, cropPos]);

  const handleMouseUp = React.useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onPositionChange(cropPos.x, cropPos.y);
    }
  }, [isDragging, cropPos, onPositionChange]);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const asset = block.asset;
  if (!asset) return null;

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{ 
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      <Img
        src={asset.medium_url || asset.url || asset.thumbnail_url}
        alt={asset.title}
        style={{
          ...imgStyle,
          objectPosition: `${cropPos.x}% ${cropPos.y}%`,
        }}
      />
      {isDragging && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(167, 139, 250, 0.1)',
          border: '2px solid rgba(167, 139, 250, 0.5)',
          borderRadius: '12px',
          pointerEvents: 'none',
        }} />
      )}
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
function PostBlockView({ block, isEditing, onDisplayModeChange, onCropPositionChange }: BlockRendererProps) {
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
        {/* Draggable image in cover mode when editing */}
        {isEditing && !isFitMode && onCropPositionChange ? (
          <DraggableImage
            block={block}
            imgStyle={{
              ...styles.postImage,
              objectFit: 'cover' as const,
            }}
            onPositionChange={onCropPositionChange}
          />
        ) : (
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
        )}
        {isEditing && onDisplayModeChange && (
          <DisplayModeControls 
            block={block} 
            onModeChange={onDisplayModeChange} 
          />
        )}
        {/* Drag hint */}
        {isEditing && !isFitMode && onCropPositionChange && (
          <div 
            className="drag-hint"
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '4px 8px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#888',
              fontSize: '12px',
              borderRadius: '4px',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none',
            }}
          >
            Drag to adjust crop
          </div>
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
        .post-image-container:hover .drag-hint {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

// Featured Post Block Component
function FeaturedPostBlockView({ block, isEditing, onDisplayModeChange, onCropPositionChange }: BlockRendererProps) {
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
        {/* Draggable image in cover mode when editing */}
        {isEditing && !isFitMode && onCropPositionChange ? (
          <DraggableImage
            block={block}
            imgStyle={{
              ...styles.featuredImage,
              objectFit: 'cover' as const,
            }}
            onPositionChange={onCropPositionChange}
          />
        ) : (
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
        )}
        {isEditing && onDisplayModeChange && (
          <DisplayModeControls 
            block={block} 
            onModeChange={onDisplayModeChange} 
          />
        )}
        {/* Drag hint */}
        {isEditing && !isFitMode && onCropPositionChange && (
          <div 
            className="drag-hint"
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              padding: '4px 8px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#888',
              fontSize: '12px',
              borderRadius: '4px',
              opacity: 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: 'none',
            }}
          >
            Drag to adjust crop
          </div>
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
        .featured-image-container:hover .drag-hint {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

// Gallery Layout Toggle Controls
function GalleryLayoutControls({
  layout,
  onLayoutChange,
}: {
  layout: GalleryLayout;
  onLayoutChange: (layout: GalleryLayout) => void;
}) {
  return (
    <div
      className="gallery-layout-controls"
      style={{
        position: 'absolute',
        top: '12px',
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
          onLayoutChange('grid');
        }}
        title="Grid layout (2x2)"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: layout === 'grid' ? 'rgba(167, 139, 250, 0.9)' : 'rgba(0, 0, 0, 0.7)',
          color: layout === 'grid' ? '#fff' : '#a0a0a0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          fontSize: '12px',
        }}
      >
        ⊞
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLayoutChange('featured');
        }}
        title="Featured layout (1 large + thumbnails)"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: layout === 'featured' ? 'rgba(167, 139, 250, 0.9)' : 'rgba(0, 0, 0, 0.7)',
          color: layout === 'featured' ? '#fff' : '#a0a0a0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          fontSize: '12px',
        }}
      >
        ⬒
      </button>
    </div>
  );
}

// Image Gallery Block Component
function ImageGalleryBlockView({
  block,
  isEditing,
  onGalleryLayoutChange,
  onGalleryFeaturedIndexChange,
  onGalleryRemoveImage,
  onGalleryAddImages,
  availableAssets,
}: BlockRendererProps) {
  const [showAddModal, setShowAddModal] = React.useState(false);
  const images = block.gallery_images || [];
  const layout = block.gallery_layout || 'grid';
  const featuredIndex = block.gallery_featured_index || 0;

  // Get featured image and remaining images
  const featuredImage = images[featuredIndex] || images[0];
  const thumbnailImages = images.filter((_, i) => i !== featuredIndex);

  if (images.length === 0 && isEditing) {
    return (
      <div
        style={{
          padding: "40px",
          border: "2px dashed #333",
          borderRadius: "12px",
          textAlign: "center",
          marginBottom: "32px",
        }}
      >
        <p style={{ color: "#666", marginBottom: "12px" }}>No images in gallery</p>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#a78bfa",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Add Images
        </button>
        {showAddModal && availableAssets && onGalleryAddImages && (
          <GalleryAddModal
            assets={availableAssets}
            existingImageIds={images.map((img) => img.asset_id)}
            onAdd={(assetIds) => {
              onGalleryAddImages(assetIds);
              setShowAddModal(false);
            }}
            onClose={() => setShowAddModal(false)}
          />
        )}
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div style={styles.galleryContainer}>
      <div
        className="gallery-container"
        style={{ position: "relative" }}
      >
        {layout === 'grid' ? (
          // Grid layout (2x2)
          <div style={styles.galleryGrid}>
            {images.slice(0, 4).map((img, index) => (
              <div
                key={img.id}
                style={styles.galleryGridItem}
                className="gallery-item"
              >
                <Img
                  src={img.asset?.medium_url || img.asset?.url || img.asset?.thumbnail_url}
                  alt={img.asset?.title || ''}
                  style={styles.galleryImage}
                />
                {isEditing && onGalleryRemoveImage && (
                  <button
                    onClick={() => onGalleryRemoveImage(img.asset_id)}
                    className="remove-btn"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}
                  >
                    ×
                  </button>
                )}
                {index === 3 && images.length > 4 && (
                  <div style={styles.galleryOverflowBadge}>
                    +{images.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Featured layout (1 large + thumbnails)
          <div style={styles.galleryFeaturedContainer}>
            {featuredImage && (
              <div
                style={styles.galleryFeaturedMain}
                className="gallery-item"
                onClick={() => isEditing && onGalleryFeaturedIndexChange && onGalleryFeaturedIndexChange(featuredIndex)}
              >
                <Img
                  src={featuredImage.asset?.medium_url || featuredImage.asset?.url || featuredImage.asset?.thumbnail_url}
                  alt={featuredImage.asset?.title || ''}
                  style={styles.galleryFeaturedImage}
                />
                {isEditing && onGalleryRemoveImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onGalleryRemoveImage(featuredImage.asset_id);
                    }}
                    className="remove-btn"
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            )}
            {thumbnailImages.length > 0 && (
              <div style={styles.galleryThumbnailRow}>
                {thumbnailImages.slice(0, 4).map((img, index) => {
                  const actualIndex = images.findIndex((i) => i.id === img.id);
                  return (
                    <div
                      key={img.id}
                      style={styles.galleryThumbnail}
                      className="gallery-item"
                      onClick={() => isEditing && onGalleryFeaturedIndexChange && onGalleryFeaturedIndexChange(actualIndex)}
                    >
                      <Img
                        src={img.asset?.thumbnail_url || img.asset?.url}
                        alt={img.asset?.title || ''}
                        style={styles.galleryThumbnailImage}
                      />
                      {isEditing && onGalleryRemoveImage && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onGalleryRemoveImage(img.asset_id);
                          }}
                          className="remove-btn"
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'none',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                          }}
                        >
                          ×
                        </button>
                      )}
                      {index === 3 && thumbnailImages.length > 4 && (
                        <div style={styles.galleryOverflowBadge}>
                          +{thumbnailImages.length - 4}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Layout toggle controls */}
        {isEditing && onGalleryLayoutChange && (
          <GalleryLayoutControls
            layout={layout}
            onLayoutChange={onGalleryLayoutChange}
          />
        )}

        {/* Add more images button */}
        {isEditing && availableAssets && onGalleryAddImages && (
          <button
            onClick={() => setShowAddModal(true)}
            className="add-images-btn"
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              padding: '6px 12px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: '#a0a0a0',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              opacity: 0,
              transition: 'opacity 0.2s ease',
            }}
          >
            + Add images
          </button>
        )}
      </div>

      {/* Add modal */}
      {showAddModal && availableAssets && onGalleryAddImages && (
        <GalleryAddModal
          assets={availableAssets}
          existingImageIds={images.map((img) => img.asset_id)}
          onAdd={(assetIds) => {
            onGalleryAddImages(assetIds);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* CSS for hover effects */}
      <style>{`
        .gallery-container:hover .gallery-layout-controls {
          opacity: 1 !important;
        }
        .gallery-container:hover .add-images-btn {
          opacity: 1 !important;
        }
        .gallery-item {
          position: relative;
        }
        .gallery-item:hover .remove-btn {
          display: flex !important;
        }
      `}</style>
    </div>
  );
}

// Gallery Add Modal (simplified asset picker for adding to existing gallery)
function GalleryAddModal({
  assets,
  existingImageIds,
  onAdd,
  onClose,
}: {
  assets: Asset[];
  existingImageIds: string[];
  onAdd: (assetIds: string[]) => void;
  onClose: () => void;
}) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState("");

  const filteredAssets = assets.filter(
    (asset) =>
      !existingImageIds.includes(asset.id) &&
      asset.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelection = (assetId: string) => {
    if (selectedIds.includes(assetId)) {
      setSelectedIds(selectedIds.filter((id) => id !== assetId));
    } else {
      setSelectedIds([...selectedIds, assetId]);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: "0",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.8)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "80vh",
          backgroundColor: "#18181b",
          border: "1px solid #333",
          borderRadius: "12px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, color: "#fff" }}>Add images to gallery</h3>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "18px" }}
            >
              ×
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{
              width: "100%",
              padding: "8px 12px",
              backgroundColor: "#27272a",
              border: "1px solid #333",
              borderRadius: "6px",
              color: "#fff",
              outline: "none",
            }}
          />
          {selectedIds.length > 0 && (
            <p style={{ margin: "8px 0 0", color: "#a78bfa", fontSize: "14px" }}>
              {selectedIds.length} selected
            </p>
          )}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
          {filteredAssets.length === 0 ? (
            <p style={{ color: "#666", textAlign: "center" }}>No images available</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
              {filteredAssets.map((asset) => {
                const isSelected = selectedIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    onClick={() => toggleSelection(asset.id)}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: isSelected ? "2px solid #a78bfa" : "2px solid transparent",
                      padding: 0,
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <img
                      src={asset.thumbnail_url || asset.url}
                      alt={asset.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          top: "4px",
                          right: "4px",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: "#a78bfa",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ padding: "16px", borderTop: "1px solid #333", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{ padding: "8px 16px", background: "none", border: "none", color: "#666", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onAdd(selectedIds)}
            disabled={selectedIds.length === 0}
            style={{
              padding: "8px 16px",
              backgroundColor: selectedIds.length > 0 ? "#a78bfa" : "#333",
              color: selectedIds.length > 0 ? "#fff" : "#666",
              border: "none",
              borderRadius: "6px",
              cursor: selectedIds.length > 0 ? "pointer" : "not-allowed",
            }}
          >
            Add {selectedIds.length} image{selectedIds.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
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
    case "image_gallery":
      return <ImageGalleryBlockView {...props} />;
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
  ImageGalleryBlockView,
};

