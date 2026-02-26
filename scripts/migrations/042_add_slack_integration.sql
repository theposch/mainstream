-- Migration 042: Add Slack integration
--
-- Creates tables for platform-level Slack workspace connection and message tracking.
-- Also adds slack_channel_id to drop_schedules and streams for default channel persistence.
--
-- Apply:
--   psql -h localhost -p 5432 -U postgres < 042_add_slack_integration.sql
--   docker exec -i supabase-db psql -U postgres < scripts/migrations/042_add_slack_integration.sql

-- ─── slack_integration ────────────────────────────────────────────────────────
-- Singleton-style table (one row per Mainstream instance, enforced via unique
-- constraint on workspace_id).  Stores the OAuth bot token encrypted with
-- AES-256-GCM.  Admins and owners are the only principals allowed to manage it.

CREATE TABLE IF NOT EXISTS slack_integration (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   TEXT NOT NULL,
  workspace_name TEXT NOT NULL,
  workspace_icon TEXT,                  -- workspace avatar URL (may be null)
  bot_token      TEXT NOT NULL,         -- AES-256-GCM encrypted: iv:tag:ciphertext
  bot_user_id    TEXT NOT NULL,         -- Slack bot user ID returned by auth.test
  installed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT slack_integration_workspace_unique UNIQUE (workspace_id)
);

COMMENT ON TABLE  slack_integration               IS 'Platform-level Slack workspace connection (one row per instance)';
COMMENT ON COLUMN slack_integration.bot_token     IS 'AES-256-GCM encrypted Slack bot token (iv:tag:ciphertext hex)';
COMMENT ON COLUMN slack_integration.bot_user_id   IS 'Slack user ID of the installed bot (Bxxxx…)';
COMMENT ON COLUMN slack_integration.workspace_id  IS 'Slack workspace/team ID (Txxxx…)';

ALTER TABLE slack_integration ENABLE ROW LEVEL SECURITY;

-- Only admins and owners can read the integration record
CREATE POLICY slack_integration_select
  ON slack_integration FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.platform_role IN ('admin', 'owner')
    )
  );

-- Only admins and owners can create/replace the integration record
CREATE POLICY slack_integration_insert
  ON slack_integration FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.platform_role IN ('admin', 'owner')
    )
  );

CREATE POLICY slack_integration_update
  ON slack_integration FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.platform_role IN ('admin', 'owner')
    )
  );

CREATE POLICY slack_integration_delete
  ON slack_integration FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.platform_role IN ('admin', 'owner')
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_slack_integration_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_slack_integration_updated_at
  BEFORE UPDATE ON slack_integration
  FOR EACH ROW EXECUTE FUNCTION update_slack_integration_updated_at();


-- ─── slack_messages ───────────────────────────────────────────────────────────
-- Tracks the Slack message timestamp (ts) for every message we post.
-- Enables idempotency (don't post twice), future message updates, and
-- unpublish cleanup.  One row per (resource_type, resource_id, channel_id).

CREATE TABLE IF NOT EXISTS slack_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,   -- 'drop' | 'asset' | 'drop_remind'
  resource_id   UUID NOT NULL,
  channel_id    TEXT NOT NULL,
  message_ts    TEXT NOT NULL,   -- Slack message timestamp (e.g. "1234567890.123456")
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT slack_messages_resource_channel_unique
    UNIQUE (resource_type, resource_id, channel_id)
);

COMMENT ON TABLE  slack_messages              IS 'Tracks Slack message timestamps per resource for idempotency and future updates';
COMMENT ON COLUMN slack_messages.resource_type IS 'Resource kind: drop | asset | drop_remind';
COMMENT ON COLUMN slack_messages.resource_id   IS 'FK to the resource (drop id, asset id, etc.)';
COMMENT ON COLUMN slack_messages.message_ts    IS 'Slack message timestamp returned by chat.postMessage';

CREATE INDEX IF NOT EXISTS idx_slack_messages_resource
  ON slack_messages (resource_type, resource_id);

ALTER TABLE slack_messages ENABLE ROW LEVEL SECURITY;

-- Admins and owners can read all Slack messages
CREATE POLICY slack_messages_select_admin
  ON slack_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.platform_role IN ('admin', 'owner')
    )
  );

-- Service role (used by API routes) handles inserts/updates via admin client
CREATE POLICY slack_messages_insert
  ON slack_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.platform_role IN ('admin', 'owner')
    )
  );


-- ─── drop_schedules — add slack_channel_id ───────────────────────────────────
-- Default Slack channel for auto-posting when a scheduled drop becomes ready.
-- Null means "don't post to Slack automatically".

ALTER TABLE drop_schedules
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;

COMMENT ON COLUMN drop_schedules.slack_channel_id IS
  'Default Slack channel ID to notify when this scheduled drop is ready (null = disabled)';


-- ─── streams — add slack_channel_id ──────────────────────────────────────────
-- Default Slack channel for asset upload notifications from this stream.
-- Null means "don't post upload notifications to Slack".

ALTER TABLE streams
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;

COMMENT ON COLUMN streams.slack_channel_id IS
  'Default Slack channel ID for asset upload notifications from this stream (null = disabled)';
