import * as React from "react";
import {
  Container,
  Section,
  Heading,
  Text,
  Img,
  Hr,
} from "@react-email/components";
import { BlockRenderer } from "./block-renderer";
import type { DropBlock, User } from "@/lib/types/database";

interface DropBlocksViewProps {
  title: string;
  description?: string | null;
  blocks: DropBlock[];
  contributors: User[];
  isEditing?: boolean;
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
  blocksContainer: {
    padding: "0 20px 40px",
  },
};

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

// Count posts in blocks
function countPosts(blocks: DropBlock[]): number {
  return blocks.filter((b) => b.type === "post" || b.type === "featured_post").length;
}

export function DropBlocksView({
  title,
  description,
  blocks,
  contributors,
  isEditing = false,
}: DropBlocksViewProps) {
  const postCount = countPosts(blocks);
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
        <Text style={{
          fontSize: "16px",
          lineHeight: "1.7",
          color: "#a0a0a0",
          padding: "0 20px 16px",
          margin: "0",
          textAlign: "center" as const,
          whiteSpace: "pre-wrap" as const, // Preserve line breaks and paragraphs
        }}>
          {description}
        </Text>
      )}

      {/* Contributors avatars */}
      {contributors.length > 0 && (
        <Section style={{ textAlign: "center" as const, padding: "16px 20px" }}>
          {/* Overlapping avatars using table for email compatibility */}
          <div style={{ display: "inline-block" }}>
            {contributors.slice(0, 5).map((contributor, index) => (
              <div
                key={contributor.id}
                style={{
                  display: "inline-block",
                  marginLeft: index === 0 ? "0" : "-12px",
                  position: "relative" as const,
                  zIndex: contributors.length - index,
                }}
              >
                {contributor.avatar_url ? (
                  <Img
                    src={contributor.avatar_url}
                    alt={contributor.display_name}
                    width={48}
                    height={48}
                    style={{
                      borderRadius: "50%",
                      border: "2px solid #000000",
                      objectFit: "cover" as const,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      border: "2px solid #000000",
                      backgroundColor: "#3f3f46",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    {contributor.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
            {contributors.length > 5 && (
              <div
                style={{
                  display: "inline-block",
                  marginLeft: "-12px",
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  border: "2px solid #000000",
                  backgroundColor: "#27272a",
                  color: "#a1a1aa",
                  fontSize: "14px",
                  fontWeight: "500",
                  lineHeight: "44px",
                  textAlign: "center" as const,
                }}
              >
                +{contributors.length - 5}
              </div>
            )}
          </div>
          
          {/* Post count text */}
          <Text style={{
            fontSize: "14px",
            color: "#71717a",
            margin: "12px 0 0 0",
          }}>
            {postCount} post{postCount !== 1 ? "s" : ""} from {contributorNames}
          </Text>
        </Section>
      )}

      {/* Divider */}
      <Hr style={{ borderColor: "#27272a", margin: "16px 20px 32px" }} />

      {/* Blocks */}
      <div style={styles.blocksContainer}>
        {blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            isEditing={false}
          />
        ))}
      </div>
    </Container>
  );
}

