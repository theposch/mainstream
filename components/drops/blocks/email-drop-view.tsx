/**
 * Email-only drop view - no client-side code
 * Used for generating email HTML on the server
 */
import * as React from "react";
import {
  Container,
  Section,
  Heading,
  Text,
  Img,
  Hr,
} from "@react-email/components";
import { EmailBlockRenderer } from "./email-block-renderer";
import type { DropBlock, User } from "@/lib/types/database";

interface EmailDropViewProps {
  title: string;
  description?: string | null;
  blocks: DropBlock[];
  contributors: User[];
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
    fontWeight: "700" as const,
    color: "#ffffff",
    margin: "24px 0 8px",
    lineHeight: "1.2",
  },
  description: {
    fontSize: "16px",
    lineHeight: "1.7",
    color: "#a0a0a0",
    padding: "0 20px 16px",
    margin: "0",
    textAlign: "center" as const,
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

export function EmailDropView({
  title,
  description,
  blocks,
  contributors,
}: EmailDropViewProps) {
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
        <Text style={styles.description}>
          {description}
        </Text>
      )}

      {/* Contributors avatars */}
      {contributors.length > 0 && (
        <Section style={{ textAlign: "center" as const, padding: "16px 20px" }}>
          {/* Overlapping avatars - using tables for email compatibility */}
          <table cellPadding="0" cellSpacing="0" style={{ margin: "0 auto" }}>
            <tbody>
              <tr>
                {contributors.slice(0, 5).map((contributor, index) => (
                  <td
                    key={contributor.id}
                    style={{
                      paddingLeft: index === 0 ? "0" : "0",
                      marginLeft: index === 0 ? "0" : "-12px",
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
                          display: "block",
                          marginLeft: index === 0 ? "0" : "-12px",
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
                          textAlign: "center" as const,
                          lineHeight: "44px",
                          color: "#ffffff",
                          fontSize: "14px",
                          fontWeight: "500" as const,
                          marginLeft: index === 0 ? "0" : "-12px",
                        }}
                      >
                        {contributor.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                ))}
                {contributors.length > 5 && (
                  <td>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        border: "2px solid #000000",
                        backgroundColor: "#27272a",
                        textAlign: "center" as const,
                        lineHeight: "44px",
                        color: "#a1a1aa",
                        fontSize: "14px",
                        fontWeight: "500" as const,
                        marginLeft: "-12px",
                      }}
                    >
                      +{contributors.length - 5}
                    </div>
                  </td>
                )}
              </tr>
            </tbody>
          </table>
          
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
      <Section style={styles.blocksContainer}>
        {blocks.map((block) => (
          <EmailBlockRenderer key={block.id} block={block} />
        ))}
      </Section>
    </Container>
  );
}

