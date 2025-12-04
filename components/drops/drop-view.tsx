import * as React from "react";
import {
  Container,
  Section,
  Heading,
  Text,
  Img,
  Hr,
  Link,
} from "@react-email/components";
import type { Asset, User, Stream } from "@/lib/types/database";

interface DropPost extends Asset {
  position: number;
  streams?: Stream[];
}

interface DropViewProps {
  title: string;
  description: string | null;
  dateRangeStart: string;
  dateRangeEnd: string;
  posts: DropPost[];
  contributors: User[];
  isEditing?: boolean;
  onRemovePost?: (assetId: string) => void;
}

// Group posts by their primary stream
function groupPostsByStream(posts: DropPost[]): Map<string, DropPost[]> {
  const grouped = new Map<string, DropPost[]>();
  const noStream: DropPost[] = [];

  posts.forEach((post) => {
    const stream = post.streams?.[0];
    if (stream) {
      const key = stream.name;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(post);
    } else {
      noStream.push(post);
    }
  });

  // Add posts without streams at the end
  if (noStream.length > 0) {
    grouped.set("Uncategorized", noStream);
  }

  return grouped;
}

// Format date for post
function formatPostDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Format contributor names
function formatContributorNames(contributors: User[]): string {
  if (contributors.length === 0) return "";
  if (contributors.length === 1) return contributors[0].display_name;
  if (contributors.length === 2) {
    return `${contributors[0].display_name} and ${contributors[1].display_name}`;
  }
  const othersCount = contributors.length - 2;
  return `${contributors[0].display_name}, ${contributors[1].display_name}, and ${othersCount} other${othersCount > 1 ? "s" : ""}`;
}

// Styles for email compatibility
const styles = {
  container: {
    maxWidth: "700px",
    margin: "0 auto",
    backgroundColor: "#000000",
    color: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    textAlign: "center" as const,
    padding: "40px 20px 20px",
  },
  brandName: {
    fontSize: "12px",
    color: "#888888",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    margin: "0",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    color: "#ffffff",
    margin: "24px 0 8px",
    lineHeight: "1.2",
  },
  description: {
    fontSize: "16px",
    lineHeight: "1.7",
    color: "#a0a0a0",
    padding: "0 20px 32px",
    margin: "0",
    textAlign: "center" as const,
  },
  contributorsSection: {
    textAlign: "center" as const,
    padding: "16px 20px 32px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "3px solid #000000",
    marginLeft: "-12px",
  },
  contributorText: {
    fontSize: "14px",
    color: "#888888",
    margin: "16px 0 0",
  },
  divider: {
    borderColor: "#333333",
    margin: "0 20px 32px",
  },
  streamSection: {
    padding: "0 20px 40px",
  },
  streamHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  streamName: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#ffffff",
    margin: "0 0 24px 0",
  },
  // Post card - large vertical layout
  postCard: {
    marginBottom: "32px",
    position: "relative" as const,
  },
  postImageWrapper: {
    position: "relative" as const,
    borderRadius: "12px",
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  postImage: {
    width: "100%",
    height: "auto",
    display: "block",
    borderRadius: "12px",
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
  postDescription: {
    fontSize: "15px",
    color: "#a0a0a0",
    margin: "0 0 12px 0",
    lineHeight: "1.5",
  },
  postMeta: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  postAuthorAvatar: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
  },
  postAuthorName: {
    fontSize: "14px",
    color: "#888888",
    margin: "0",
  },
  postTags: {
    fontSize: "14px",
    color: "#666666",
    margin: "0",
  },
  removeButton: {
    position: "absolute" as const,
    top: "12px",
    right: "12px",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(4px)",
  },
};

export function DropView({
  title,
  description,
  posts,
  contributors,
  isEditing = false,
  onRemovePost,
}: DropViewProps) {
  const groupedPosts = groupPostsByStream(posts);
  const contributorNames = formatContributorNames(contributors);

  return (
    <Container style={styles.container}>
      {/* Header */}
      <Section style={styles.header}>
        <Text style={styles.brandName}>Mainstream</Text>
        <Heading style={styles.title}>{title}</Heading>
      </Section>

      {/* Description */}
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {/* Contributors */}
      {contributors.length > 0 && (
        <Section style={styles.contributorsSection}>
          <div style={{ display: "inline-block" }}>
            {contributors.slice(0, 6).map((contributor, index) => (
              <Img
                key={contributor.id}
                src={contributor.avatar_url || "/default-avatar.png"}
                alt={contributor.display_name}
                style={{
                  ...styles.avatar,
                  marginLeft: index === 0 ? "0" : "-12px",
                  position: "relative" as const,
                  zIndex: 10 - index,
                }}
              />
            ))}
            {contributors.length > 6 && (
              <span style={{
                ...styles.avatar,
                marginLeft: "-12px",
                backgroundColor: "#333",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "#fff",
                fontWeight: "600",
              }}>
                +{contributors.length - 6}
              </span>
            )}
          </div>
          <Text style={styles.contributorText}>
            {posts.length} post{posts.length !== 1 ? "s" : ""} from {contributorNames}
          </Text>
        </Section>
      )}

      <Hr style={styles.divider} />

      {/* Posts grouped by stream - vertical list */}
      {Array.from(groupedPosts.entries()).map(([streamName, streamPosts]) => (
        <Section key={streamName} style={styles.streamSection}>
          <Heading as="h2" style={styles.streamName}>
            # {streamName}
          </Heading>
          
          {/* Vertical list of posts */}
          {streamPosts.map((post) => (
            <div key={post.id} style={styles.postCard}>
              {/* Image - use medium or full size for quality */}
              <div style={styles.postImageWrapper}>
                <Link href={`/e/${post.id}`}>
                  <Img
                    src={post.medium_url || post.url || post.thumbnail_url}
                    alt={post.title}
                    style={styles.postImage}
                  />
                </Link>
                {isEditing && onRemovePost && (
                  <button
                    type="button"
                    onClick={() => onRemovePost(post.id)}
                    style={styles.removeButton}
                    title="Remove from drop"
                  >
                    ×
                  </button>
                )}
              </div>
              
              {/* Content */}
              <div style={styles.postContent}>
                <Text style={styles.postTitle}>{post.title}</Text>
                {post.description && (
                  <Text style={styles.postDescription}>
                    {post.description.length > 200 
                      ? `${post.description.slice(0, 200)}...` 
                      : post.description}
                  </Text>
                )}
                
                {/* Author & meta */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
                  {post.uploader && (
                    <>
                      <Img
                        src={post.uploader.avatar_url || "/default-avatar.png"}
                        alt={post.uploader.display_name}
                        style={styles.postAuthorAvatar}
                      />
                      <Text style={styles.postAuthorName}>
                        {post.uploader.display_name}
                      </Text>
                      <Text style={styles.postTags}>•</Text>
                    </>
                  )}
                  <Text style={styles.postTags}>
                    {formatPostDate(post.created_at)}
                  </Text>
                  {post.streams && post.streams.length > 0 && (
                    <>
                      <Text style={styles.postTags}>•</Text>
                      <Text style={styles.postTags}>
                        {post.streams.map(s => `#${s.name}`).join(" ")}
                      </Text>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Section>
      ))}
    </Container>
  );
}

