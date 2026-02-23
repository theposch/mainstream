/**
 * Slack integration utilities
 *
 * Handles Slack OAuth, API calls, and bot token encryption/decryption.
 * The bot token is stored AES-256-GCM encrypted in the slack_integration table.
 */

import crypto from "crypto";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;

// ─── Error ────────────────────────────────────────────────────────────────────

export class SlackError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "SlackError";
  }
}

// ─── Config check ─────────────────────────────────────────────────────────────

/** Returns true if SLACK_CLIENT_ID and SLACK_CLIENT_SECRET are both set. */
export function isSlackConfigured(): boolean {
  return !!(SLACK_CLIENT_ID && SLACK_CLIENT_SECRET);
}

// ─── Token encryption (AES-256-GCM) ──────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new SlackError(
      "ENCRYPTION_KEY must be a 64-character hex string",
      "missing_encryption_key"
    );
  }
  return Buffer.from(key, "hex");
}

/** Encrypt a Slack bot token. Returns "iv:tag:ciphertext" (hex-encoded). */
export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/** Decrypt a previously encrypted token. Expects "iv:tag:ciphertext" (hex). */
export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    throw new SlackError("Invalid encrypted token format", "invalid_token_format");
  }
  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8");
}

// ─── OAuth ─────────────────────────────────────────────────────────────────────

const SLACK_BOT_SCOPES = ["chat:write", "channels:read", "groups:read"].join(",");

/** Build the Slack OAuth authorization URL. */
export function buildOAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID!,
    scope: SLACK_BOT_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export interface SlackOAuthResult {
  access_token: string;
  team: { id: string; name: string; icon?: { image_68?: string } };
  bot_user_id: string;
}

/** Exchange an OAuth authorization code for a bot access token. */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<SlackOAuthResult> {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID!,
    client_secret: SLACK_CLIENT_SECRET!,
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new SlackError(
      `Slack OAuth failed: ${data.error}`,
      data.error as string,
      response.status
    );
  }
  return data as SlackOAuthResult;
}

// ─── Channels ──────────────────────────────────────────────────────────────────

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  num_members?: number;
}

/** List all channels the bot is a member of (public and private). */
export async function listChannels(botToken: string): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: "200",
    });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(
      `https://slack.com/api/conversations.list?${params.toString()}`,
      { headers: { Authorization: `Bearer ${botToken}` } }
    );

    const data = await response.json();
    if (!data.ok) {
      throw new SlackError(
        `Failed to list channels: ${data.error}`,
        data.error as string
      );
    }

    channels.push(...(data.channels as SlackChannel[]));
    cursor = (data.response_metadata?.next_cursor as string) || undefined;
  } while (cursor);

  return channels.sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Messaging ─────────────────────────────────────────────────────────────────

export interface PostMessageOptions {
  text: string;
  blocks?: unknown[];
  unfurl_links?: boolean;
}

/**
 * Post a message to a Slack channel.
 * Returns the Slack message timestamp (ts) on success.
 */
export async function postMessage(
  botToken: string,
  channelId: string,
  options: PostMessageOptions
): Promise<string> {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: channelId, ...options }),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new SlackError(
      `Failed to post message: ${data.error}`,
      data.error as string
    );
  }
  return data.ts as string;
}

// ─── URL helper ────────────────────────────────────────────────────────────────

/** Build the absolute base URL from a Next.js request object. */
export function getBaseUrl(request: { headers: { get(name: string): string | null } }): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
