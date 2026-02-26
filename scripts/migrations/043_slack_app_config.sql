-- Migration 043: Slack app configuration
--
-- Allows admins to configure their Slack OAuth app credentials (Client ID +
-- Client Secret) through the admin UI instead of requiring environment variables.
-- The Client Secret is stored AES-256-GCM encrypted (same scheme as bot tokens).

CREATE TABLE IF NOT EXISTS slack_app_config (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Slack OAuth App credentials
  client_id   TEXT        NOT NULL,
  -- AES-256-GCM encrypted Client Secret: "iv:tag:ciphertext" (hex)
  client_secret TEXT      NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only admins and owners can read or write this table
ALTER TABLE slack_app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage slack_app_config"
  ON slack_app_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.platform_role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.platform_role IN ('admin', 'owner')
    )
  );

-- Auto-update updated_at on modification
CREATE TRIGGER update_slack_app_config_updated_at
  BEFORE UPDATE ON slack_app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
