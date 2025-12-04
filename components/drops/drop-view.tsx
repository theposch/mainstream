import * as React from "react";
import {
  Container,
  Section,
  Heading,
  Text,
  Img,
  Hr,
  Row,
  Column,
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

// Format date range for display
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  
  const startFormatted = startDate.toLocaleDateString("en-US", options);
  const endFormatted = endDate.toLocaleDateString("en-US", { ...options, year: "numeric" });
  
  return `${startFormatted} – ${endFormatted}`;
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
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#000000",
    color: "#ffffff",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    textAlign: "center" as const,
    padding: "40px 20px 20px",
  },
  logo: {
    width: "40px",
    height: "40px",
    marginBottom: "8px",
  },
  brandName: {
    fontSize: "12px",
    color: "#888888",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    margin: "0",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#ffffff",
    margin: "24px 0 8px",
    lineHeight: "1.2",
  },
  dateRange: {
    fontSize: "14px",
    color: "#888888",
    margin: "0 0 24px",
  },
  description: {
    fontSize: "16px",
    lineHeight: "1.6",
    color: "#cccccc",
    padding: "0 20px 24px",
    margin: "0",
  },
  contributorsSection: {
    textAlign: "center" as const,
    padding: "16px 20px",
  },
  contributorAvatars: {
    display: "inline-block",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "2px solid #000000",
    marginLeft: "-8px",
  },
  contributorText: {
    fontSize: "14px",
    color: "#888888",
    margin: "12px 0 0",
  },
  divider: {
    borderColor: "#333333",
    margin: "24px 0",
  },
  streamSection: {
    padding: "0 20px 32px",
  },
  streamHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
  },
  streamName: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#ffffff",
    margin: "0",
  },
  postsGrid: {
    width: "100%",
  },
  postCard: {
    width: "180px",
    padding: "0 8px 16px 0",
    verticalAlign: "top",
  },
  postImage: {
    width: "100%",
    height: "120px",
    objectFit: "cover" as const,
    borderRadius: "8px",
    backgroundColor: "#1a1a1a",
  },
  postTitle: {
    fontSize: "13px",
    color: "#ffffff",
    margin: "8px 0 0",
    lineHeight: "1.3",
  },
  removeButton: {
    position: "absolute" as const,
    top: "4px",
    right: "12px",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#ffffff",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};

export function DropView({
  title,
  description,
  dateRangeStart,
  dateRangeEnd,
  posts,
  contributors,
  isEditing = false,
  onRemovePost,
}: DropViewProps) {
  const groupedPosts = groupPostsByStream(posts);
  const dateRange = formatDateRange(dateRangeStart, dateRangeEnd);
  const contributorNames = formatContributorNames(contributors);

  return (
    <Container style={styles.container}>
      {/* Header */}
      <Section style={styles.header}>
        <Text style={styles.brandName}>Mainstream</Text>
        <Heading style={styles.title}>{title}</Heading>
        <Text style={styles.dateRange}>{dateRange}</Text>
      </Section>

      {/* Description */}
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}

      {/* Contributors */}
      {contributors.length > 0 && (
        <Section style={styles.contributorsSection}>
          <div style={styles.contributorAvatars}>
            {contributors.slice(0, 5).map((contributor, index) => (
              <Img
                key={contributor.id}
                src={contributor.avatar_url || "/default-avatar.png"}
                alt={contributor.display_name}
                style={{
                  ...styles.avatar,
                  marginLeft: index === 0 ? "0" : "-8px",
                  zIndex: 5 - index,
                }}
              />
            ))}
            {contributors.length > 5 && (
              <span style={{
                ...styles.avatar,
                marginLeft: "-8px",
                backgroundColor: "#333",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                color: "#fff",
              }}>
                +{contributors.length - 5}
              </span>
            )}
          </div>
          <Text style={styles.contributorText}>
            {posts.length} post{posts.length !== 1 ? "s" : ""} from {contributorNames}
          </Text>
        </Section>
      )}

      <Hr style={styles.divider} />

      {/* Posts grouped by stream */}
      {Array.from(groupedPosts.entries()).map(([streamName, streamPosts]) => (
        <Section key={streamName} style={styles.streamSection}>
          <Heading as="h2" style={styles.streamName}>
            # {streamName}
          </Heading>
          <Row>
            {streamPosts.slice(0, 3).map((post) => (
              <Column key={post.id} style={styles.postCard}>
                <div style={{ position: "relative" }}>
                  <Link href={`/e/${post.id}`}>
                    <Img
                      src={post.thumbnail_url || post.url}
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
                <Text style={styles.postTitle}>{post.title}</Text>
              </Column>
            ))}
          </Row>
          {streamPosts.length > 3 && (
            <Text style={{ fontSize: "13px", color: "#888", marginTop: "8px" }}>
              +{streamPosts.length - 3} more in this stream
            </Text>
          )}
        </Section>
      ))}
    </Container>
  );
}

