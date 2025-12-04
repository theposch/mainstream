import * as React from "react";
import {
  Container,
  Section,
  Heading,
  Text,
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
  contributorsSection: {
    textAlign: "center" as const,
    padding: "24px 20px",
    borderTop: "1px solid #333",
    marginTop: "32px",
  },
  contributorText: {
    fontSize: "14px",
    color: "#888888",
    margin: "0",
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
          padding: "0 20px 32px",
          margin: "0",
          textAlign: "center" as const,
        }}>
          {description}
        </Text>
      )}

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

      {/* Footer with contributors */}
      {contributors.length > 0 && (
        <Section style={styles.contributorsSection}>
          <Text style={styles.contributorText}>
            {postCount} post{postCount !== 1 ? "s" : ""} from {contributorNames}
          </Text>
        </Section>
      )}
    </Container>
  );
}

