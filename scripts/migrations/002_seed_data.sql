-- ============================================================================
-- MAINSTREAM DATABASE SEED DATA
-- ============================================================================
-- This script populates the database with real test data for development.
-- Run after 001_initial_schema.sql and all subsequent migrations.
--
-- Usage:
--   docker exec -i supabase_db_cosmos psql -U postgres < scripts/migrations/002_seed_data.sql
--
-- Data includes:
--   - 2 users (Christian Poschmann, John Does)
--   - 5 streams (mainstream, design-a-palooza, wallpaper, credit-card, private-stream-test)
--   - 16 assets (images, GIFs, videos, Figma/Loom embeds)
--   - Comments, likes, follows, views, bookmarks
--   - 3 drops (AI newsletters) with blocks
-- ============================================================================

BEGIN;

-- ============================================================================
-- USERS
-- ============================================================================
INSERT INTO users (id, username, display_name, email, avatar_url, bio, job_title, location, created_at, updated_at) VALUES
('dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 'cposchmann', 'Christian Poschmann', 'cposchmann@questrade.com', '/uploads/avatars/dd8856e2-d0d7-45f6-a72d-37e498bb1a17-1764976802062.jpg', 'It''s just me.', 'Director, Product Design', 'Victoria, BC', '2025-12-04 20:45:27.985216+00', '2025-12-05 23:20:29.870703+00'),
('d953b5d3-f146-4085-aa2a-6aa0934cb0ae', 'johndoe', 'John Does', 'hi@christianposchmann.com', 'https://avatar.vercel.sh/johndoe.png', 'I''m just a dummy account.', 'Product Designer', '', '2025-12-05 19:39:22.339203+00', '2025-12-06 22:35:16.193405+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TEAMS (Legacy - keeping for schema compatibility)
-- ============================================================================
INSERT INTO teams (id, name, slug, description, avatar_url, created_at, updated_at) VALUES
('10000000-0000-0000-0000-000000000001', 'Design Team', 'design-team', 'Primary design team working on product interfaces', 'https://avatar.vercel.sh/design-team.png', '2024-01-01 00:00:00+00', '2025-12-04 20:35:11.591731+00'),
('10000000-0000-0000-0000-000000000002', 'Marketing Team', 'marketing-team', 'Marketing and brand design', 'https://avatar.vercel.sh/marketing-team.png', '2024-01-05 00:00:00+00', '2025-12-04 20:35:11.591731+00'),
('10000000-0000-0000-0000-000000000003', 'Product Team', 'product-team', 'Product strategy and UX research', 'https://avatar.vercel.sh/product-team.png', '2024-01-10 00:00:00+00', '2025-12-04 20:35:11.591731+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STREAMS
-- ============================================================================
INSERT INTO streams (id, name, description, owner_type, owner_id, is_private, status, created_at, updated_at) VALUES
('c66666ab-b72c-4a63-acd6-18c31986e7d9', 'mainstream', NULL, 'user', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', false, 'active', '2025-12-05 19:41:38.391526+00', '2025-12-05 19:41:38.391526+00'),
('df4be3c4-6451-4935-b654-754c335d9d22', 'design-a-palooza', NULL, 'user', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', false, 'active', '2025-12-05 22:16:13.003301+00', '2025-12-05 22:16:13.003301+00'),
('9eb6849a-92c4-47d5-8ea6-854afab088a6', 'wallpaper', NULL, 'user', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', false, 'active', '2025-12-05 22:17:04.95418+00', '2025-12-05 22:17:04.95418+00'),
('3dbeeaa6-a77a-4c83-a8b3-ab9388027db9', 'credit-card', NULL, 'user', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', false, 'active', '2025-12-05 22:23:56.07614+00', '2025-12-05 22:23:56.07614+00'),
('5f6f7f16-5c16-4d97-afe9-e6f4f103382c', 'private-stream-test', 'This is a test of a private stream', 'user', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', true, 'active', '2025-12-08 02:16:41.879121+00', '2025-12-08 17:40:20.172715+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STREAM MEMBERS (Private stream membership)
-- ============================================================================
INSERT INTO stream_members (stream_id, user_id, role, joined_at) VALUES
('5f6f7f16-5c16-4d97-afe9-e6f4f103382c', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', 'member', '2025-12-08 17:33:00.920654+00')
ON CONFLICT (stream_id, user_id) DO NOTHING;

-- ============================================================================
-- ASSETS
-- ============================================================================
INSERT INTO assets (id, title, type, url, thumbnail_url, medium_url, uploader_id, width, height, file_size, mime_type, description, view_count, asset_type, embed_url, embed_provider, visibility, created_at, updated_at) VALUES
-- Videos
('17b302c3-f3ff-44f9-98f6-89732fbad6bc', 'Trading Cards', 'video', '/uploads/full/1764975483937-4b1b49f7.webm', '/uploads/full/1764975483937-4b1b49f7.webm', '/uploads/full/1764975483937-4b1b49f7.webm', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', NULL, NULL, 12734539, 'video/webm', 'All the fun trading cards that folks created during #design-a-palooza', 2, 'video', NULL, NULL, 'public', '2025-12-05 22:58:03.978395+00', '2025-12-07 01:47:11.102116+00'),

-- Images
('979f6421-6b62-4df0-bb84-45b08085802f', 'New Feature: Profile Updates', 'image', '/uploads/full/1764978751767-c80c7201.png', '/uploads/thumbnails/1764978751767-c80c7201.png', '/uploads/medium/1764978751767-c80c7201.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 3286, 2276, 2766564, 'image/png', 'A dedicated modal for editing your profile, accessible from your profile page.

Profile customization:

Custom avatar — Upload your own profile picture (JPG, PNG, GIF, WebP up to 2MB)
Display name & username — Update how you appear across the platform
Role / Title — Add your job title (e.g., "Product Designer")
Location — Share where you''re based
Bio — Tell the community about yourself', 1, 'image', NULL, NULL, 'public', '2025-12-05 23:52:32.336621+00', '2025-12-07 01:48:09.771393+00'),

('94d9d785-fda2-4755-9309-b3f2b5d21865', 'Critical Slack Emojis!', 'image', '/uploads/full/1764973773030-3c50a4b4.png', '/uploads/thumbnails/1764973773030-3c50a4b4.png', '/uploads/medium/1764973773030-3c50a4b4.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 2674, 1628, 3516361, 'image/png', 'New Slack Emojis by Kianna Gram', 1, 'image', NULL, NULL, 'public', '2025-12-05 22:29:33.38874+00', '2025-12-07 19:33:57.549988+00'),

('30d2e63f-5e90-44a5-bb12-8672af518dfe', 'New Feature: See when others are typing', 'image', '/uploads/full/1764964135109-35e4bc56.gif', '/uploads/thumbnails/1764964135109-35e4bc56.jpg', '/uploads/medium/1764964135109-35e4bc56.gif', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 2000, 789, 2141214, 'image/gif', 'See those familiar bouncing dots when someone''s crafting a response in the comments? Now you''ll know when a colleague is about to chime in, so you can wait for their input before moving on.

Works just like your favorite chat apps—shows who''s typing and automatically clears after a few seconds of inactivity.', 2, 'image', NULL, NULL, 'public', '2025-12-05 19:49:14.791757+00', '2025-12-07 19:47:32.599596+00'),

('e796faee-5751-406c-853e-32b2f1ae32db', 'It''s Working!', 'image', '/uploads/full/1764963698597-11c53a0a.png', '/uploads/thumbnails/1764963698597-11c53a0a.png', '/uploads/medium/1764963698597-11c53a0a.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 2828, 2080, 2575390, 'image/png', 'This is the first post!', 1, 'image', NULL, NULL, 'public', '2025-12-05 19:41:38.95813+00', '2025-12-07 00:38:35.124626+00'),

('36e36af3-5f03-4395-8f35-d13f8a8db22b', 'New Feature: Stream Bookmarks', 'image', '/uploads/full/1764963866262-6b11ed8e.png', '/uploads/thumbnails/1764963866262-6b11ed8e.png', '/uploads/medium/1764963866262-6b11ed8e.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 1476, 1416, 857050, 'image/png', '- Add external links (Jira, Figma, Notion, etc.) to streams
Bookmarks display with favicons fetched from Google''s favicon service
- Contributors can add bookmarks; creators/owners can delete', 1, 'image', NULL, NULL, 'public', '2025-12-05 19:44:26.601997+00', '2025-12-07 00:38:35.124626+00'),

('e61e7071-5558-4d4a-8994-901ee91f4de7', 'New Feature: See who''s checking out your work', 'image', '/uploads/full/1764963991519-27b1b61d.png', '/uploads/thumbnails/1764963991519-27b1b61d.png', '/uploads/medium/1764963991519-27b1b61d.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 1292, 1084, 537307, 'image/png', 'Curious who''s viewing your designs? Look for "Seen by X people" below any post. Hover over it to see exactly who stopped by—complete with avatars and names.Perfect for knowing when stakeholders have reviewed your work or when your designs are making the rounds.', 2, 'image', NULL, NULL, 'public', '2025-12-05 19:46:31.692895+00', '2025-12-07 00:38:35.124626+00'),

('7e9aa6d5-bc63-4f3a-b8da-45695f1de049', 'Update: Account Settings', 'image', '/uploads/full/1764978599097-d93f3a45.png', '/uploads/thumbnails/1764978599097-d93f3a45.png', '/uploads/medium/1764978599097-d93f3a45.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 3226, 2258, 3688830, 'image/png', 'New account management options in Settings:

Change email — Update your email with confirmation
Change password — Securely update your password
Delete account — Permanently remove your account and data', 0, 'image', NULL, NULL, 'public', '2025-12-05 23:49:59.654087+00', '2025-12-07 00:38:35.124626+00'),

('be059cdc-838e-4add-95f8-592357e91a0d', 'Wallpaper', 'image', '/uploads/full/1764973025022-db3cc632.png', '/uploads/thumbnails/1764973025022-db3cc632.png', '/uploads/medium/1764973025022-db3cc632.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 1728, 1117, 2510690, 'image/png', 'Wallpaper by Jeremy Newcombe #wallpaper', 2, 'image', NULL, NULL, 'public', '2025-12-05 22:17:05.212648+00', '2025-12-07 19:41:02.341567+00'),

('44542607-c88b-4e5b-b47b-8df31070aec9', 'Wallpaper', 'image', '/uploads/full/1764973116220-b85aac0d.png', '/uploads/thumbnails/1764973116220-b85aac0d.png', '/uploads/medium/1764973116220-b85aac0d.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 1728, 1117, 1321589, 'image/png', 'Wallpaper by Dario Becher', 2, 'image', NULL, NULL, 'public', '2025-12-05 22:18:36.404001+00', '2025-12-07 19:46:09.906782+00'),

('a4dfcfe9-9f71-456a-9cd7-7336894a4bd6', 'Wallpaper', 'image', '/uploads/full/1764973076821-09998c5a.png', '/uploads/thumbnails/1764973076821-09998c5a.png', '/uploads/medium/1764973076821-09998c5a.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 1728, 1117, 931477, 'image/png', 'Wallpaper by Jeremy Newcombe', 2, 'image', NULL, NULL, 'public', '2025-12-05 22:17:56.954983+00', '2025-12-07 19:46:27.393866+00'),

('7560d606-63bf-4011-9425-631df331a895', 'Wallpaper', 'image', '/uploads/full/1764972973603-2aa510b8.png', '/uploads/thumbnails/1764972973603-2aa510b8.png', '/uploads/medium/1764972973603-2aa510b8.png', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 1728, 1117, 1958570, 'image/png', 'Wallpaper design by Jeremy Newcombe. 
#design-a-palooza', 2, 'image', NULL, NULL, 'public', '2025-12-05 22:16:13.802714+00', '2025-12-08 02:00:40.250118+00'),

-- Embeds (Figma)
('55099740-c332-4742-aa9e-f6ed281ccf30', 'New Feature: Embed Figma Files', 'link', '/uploads/thumbnails/1764964759113-d404c70c.jpg', '/uploads/thumbnails/1764964759113-d404c70c.jpg', NULL, 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 8194, 4148, NULL, NULL, 'Want to share a Figma design without leaving your workflow? Streams now supports Figma embeds—just paste a URL and your design appears right in the feed with a beautiful thumbnail preview.', 1, 'embed', 'https://www.figma.com/design/n5ZtkjgnBuSQEfgb90WSFl/DesignAPalooza?node-id=12-968&t=Bs4lasexnubyZTbZ-4', 'figma', 'public', '2025-12-05 19:59:19.135313+00', '2025-12-07 00:38:35.124626+00'),

('87839340-f6bb-426d-bb0c-0bfc990861e6', 'Credit Card Concepts', 'link', '/uploads/thumbnails/1764973457079-ac31fe37.jpg', '/uploads/thumbnails/1764973457079-ac31fe37.jpg', NULL, 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 3620, 5963, NULL, NULL, 'Credit card concepts by Andrew Cen', 0, 'embed', 'https://www.figma.com/design/n5ZtkjgnBuSQEfgb90WSFl/DesignAPalooza?node-id=118-240&t=Bs4lasexnubyZTbZ-4', 'figma', 'public', '2025-12-05 22:24:17.117692+00', '2025-12-07 00:38:35.124626+00'),

('cd765f24-bb41-4868-9931-1de37d8941a3', 'A Mascot for Questrade', 'link', '/uploads/thumbnails/1764973531684-47760503.jpg', '/uploads/thumbnails/1764973531684-47760503.jpg', NULL, 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 6265, 3461, NULL, NULL, 'Mascot concepts by Grace Lee', 0, 'embed', 'https://www.figma.com/design/n5ZtkjgnBuSQEfgb90WSFl/DesignAPalooza?node-id=106-414&t=Bs4lasexnubyZTbZ-4', 'figma', 'public', '2025-12-05 22:25:32.011486+00', '2025-12-07 00:38:35.124626+00'),

-- Embeds (Loom)
('5be74ca4-78c4-4a90-bac9-2b4f71059702', 'New Feature: Embed Loom', 'link', '/uploads/thumbnails/1764970315620-503833aa.jpg', '/uploads/thumbnails/1764970315620-503833aa.jpg', NULL, 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 1920, 1440, NULL, NULL, 'You can now embed Loom', 1, 'embed', 'https://www.loom.com/share/cab47b90a9b042c6b1ec67b24fb441a0', 'loom', 'public', '2025-12-05 21:31:55.654897+00', '2025-12-07 00:38:35.124626+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ASSET_STREAMS (Many-to-many relationship)
-- ============================================================================
INSERT INTO asset_streams (asset_id, stream_id, added_at, added_by) VALUES
-- mainstream stream
('e796faee-5751-406c-853e-32b2f1ae32db', 'c66666ab-b72c-4a63-acd6-18c31986e7d9', '2025-12-05 19:41:38.97857+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('36e36af3-5f03-4395-8f35-d13f8a8db22b', 'c66666ab-b72c-4a63-acd6-18c31986e7d9', '2025-12-05 19:45:08.004621+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('e61e7071-5558-4d4a-8994-901ee91f4de7', 'c66666ab-b72c-4a63-acd6-18c31986e7d9', '2025-12-05 19:46:31.714629+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('30d2e63f-5e90-44a5-bb12-8672af518dfe', 'c66666ab-b72c-4a63-acd6-18c31986e7d9', '2025-12-05 19:50:20.749732+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('5be74ca4-78c4-4a90-bac9-2b4f71059702', 'c66666ab-b72c-4a63-acd6-18c31986e7d9', '2025-12-05 21:42:17.963011+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('55099740-c332-4742-aa9e-f6ed281ccf30', 'c66666ab-b72c-4a63-acd6-18c31986e7d9', '2025-12-05 22:47:27.46095+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('7e9aa6d5-bc63-4f3a-b8da-45695f1de049', 'c66666ab-b72c-4a63-acd6-18c31986e7d9', '2025-12-05 23:49:59.688816+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('979f6421-6b62-4df0-bb84-45b08085802f', 'c66666ab-b72c-4a63-acd6-18c31986e7d9', '2025-12-05 23:52:32.354307+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),

-- design-a-palooza stream
('be059cdc-838e-4add-95f8-592357e91a0d', 'df4be3c4-6451-4935-b654-754c335d9d22', '2025-12-05 22:17:05.220147+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('a4dfcfe9-9f71-456a-9cd7-7336894a4bd6', 'df4be3c4-6451-4935-b654-754c335d9d22', '2025-12-05 22:17:56.96288+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('44542607-c88b-4e5b-b47b-8df31070aec9', 'df4be3c4-6451-4935-b654-754c335d9d22', '2025-12-05 22:18:36.411001+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('87839340-f6bb-426d-bb0c-0bfc990861e6', 'df4be3c4-6451-4935-b654-754c335d9d22', '2025-12-05 22:24:17.159017+00', NULL),
('cd765f24-bb41-4868-9931-1de37d8941a3', 'df4be3c4-6451-4935-b654-754c335d9d22', '2025-12-05 22:25:32.04955+00', NULL),
('94d9d785-fda2-4755-9309-b3f2b5d21865', 'df4be3c4-6451-4935-b654-754c335d9d22', '2025-12-05 22:29:33.40758+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('55099740-c332-4742-aa9e-f6ed281ccf30', 'df4be3c4-6451-4935-b654-754c335d9d22', '2025-12-05 22:47:27.46095+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('17b302c3-f3ff-44f9-98f6-89732fbad6bc', 'df4be3c4-6451-4935-b654-754c335d9d22', '2025-12-05 23:05:39.235133+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('7560d606-63bf-4011-9425-631df331a895', 'df4be3c4-6451-4935-b654-754c335d9d22', '2025-12-08 02:00:40.294501+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),

-- wallpaper stream
('be059cdc-838e-4add-95f8-592357e91a0d', '9eb6849a-92c4-47d5-8ea6-854afab088a6', '2025-12-05 22:17:05.220147+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('a4dfcfe9-9f71-456a-9cd7-7336894a4bd6', '9eb6849a-92c4-47d5-8ea6-854afab088a6', '2025-12-05 22:17:56.96288+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),
('44542607-c88b-4e5b-b47b-8df31070aec9', '9eb6849a-92c4-47d5-8ea6-854afab088a6', '2025-12-05 22:18:36.411001+00', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17'),

-- credit-card stream
('87839340-f6bb-426d-bb0c-0bfc990861e6', '3dbeeaa6-a77a-4c83-a8b3-ab9388027db9', '2025-12-05 22:24:17.159017+00', NULL)
ON CONFLICT (asset_id, stream_id) DO NOTHING;

-- ============================================================================
-- ASSET_COMMENTS
-- ============================================================================
INSERT INTO asset_comments (id, asset_id, user_id, content, parent_id, created_at, updated_at) VALUES
('10897854-dde7-4618-8d37-c84242ac6d91', 'e61e7071-5558-4d4a-8994-901ee91f4de7', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', 'Nice!', NULL, '2025-12-05 20:10:02.588073+00', '2025-12-05 20:10:02.588073+00'),
('a7bb5ee7-71f7-4bda-83dd-020c4606bbb4', 'e61e7071-5558-4d4a-8994-901ee91f4de7', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', 'cool', NULL, '2025-12-06 23:57:41.650137+00', '2025-12-06 23:57:41.650137+00'),
('851d6ea8-dcc8-4704-91ff-4109ba0e6c02', 'e61e7071-5558-4d4a-8994-901ee91f4de7', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', 'awesome', NULL, '2025-12-06 23:58:05.384659+00', '2025-12-06 23:58:05.384659+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ASSET_LIKES
-- ============================================================================
INSERT INTO asset_likes (asset_id, user_id, created_at) VALUES
('87839340-f6bb-426d-bb0c-0bfc990861e6', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-05 22:35:13.726005+00'),
('55099740-c332-4742-aa9e-f6ed281ccf30', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-05 22:43:22.933234+00'),
('e796faee-5751-406c-853e-32b2f1ae32db', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-05 22:51:56.816638+00'),
('7e9aa6d5-bc63-4f3a-b8da-45695f1de049', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-06 22:46:40.48769+00'),
('94d9d785-fda2-4755-9309-b3f2b5d21865', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-06 22:46:54.878114+00'),
('979f6421-6b62-4df0-bb84-45b08085802f', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-06 22:47:08.427944+00'),
('be059cdc-838e-4add-95f8-592357e91a0d', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-06 22:47:20.370921+00'),
('979f6421-6b62-4df0-bb84-45b08085802f', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', '2025-12-06 23:52:07.064102+00'),
('94d9d785-fda2-4755-9309-b3f2b5d21865', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', '2025-12-06 23:52:34.279732+00'),
('a4dfcfe9-9f71-456a-9cd7-7336894a4bd6', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', '2025-12-06 23:54:54.07103+00'),
('17b302c3-f3ff-44f9-98f6-89732fbad6bc', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', '2025-12-06 23:56:54.931137+00'),
('44542607-c88b-4e5b-b47b-8df31070aec9', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', '2025-12-06 23:56:56.871687+00'),
('87839340-f6bb-426d-bb0c-0bfc990861e6', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', '2025-12-06 23:56:59.37788+00'),
('a4dfcfe9-9f71-456a-9cd7-7336894a4bd6', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-07 01:44:38.014857+00'),
('7560d606-63bf-4011-9425-631df331a895', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-08 02:00:22.21191+00')
ON CONFLICT (asset_id, user_id) DO NOTHING;

-- ============================================================================
-- COMMENT_LIKES
-- ============================================================================
INSERT INTO comment_likes (comment_id, user_id, created_at) VALUES
('10897854-dde7-4618-8d37-c84242ac6d91', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-05 21:07:40.925056+00')
ON CONFLICT (comment_id, user_id) DO NOTHING;

-- ============================================================================
-- USER_FOLLOWS
-- ============================================================================
INSERT INTO user_follows (follower_id, following_id, created_at) VALUES
('d953b5d3-f146-4085-aa2a-6aa0934cb0ae', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-05 23:27:49.553623+00'),
('dd8856e2-d0d7-45f6-a72d-37e498bb1a17', 'd953b5d3-f146-4085-aa2a-6aa0934cb0ae', '2025-12-06 22:48:26.242118+00')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- ============================================================================
-- STREAM_FOLLOWS
-- ============================================================================
INSERT INTO stream_follows (stream_id, user_id, created_at) VALUES
('c66666ab-b72c-4a63-acd6-18c31986e7d9', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-05 22:31:02.131557+00')
ON CONFLICT (stream_id, user_id) DO NOTHING;

-- ============================================================================
-- STREAM_BOOKMARKS
-- ============================================================================
INSERT INTO stream_bookmarks (id, stream_id, url, title, created_by, created_at, position) VALUES
('866685a9-53d0-4e20-8cd1-43429afb5785', 'df4be3c4-6451-4935-b654-754c335d9d22', 'https://www.figma.com/design/n5ZtkjgnBuSQEfgb90WSFl/DesignAPalooza?node-id=1-414&t=Bs4lasexnubyZTbZ-1', 'Design-A-Palooza 2025 ', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-05 22:57:41.509227+00', 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DROPS (AI Newsletters)
-- ============================================================================
INSERT INTO drops (id, title, description, status, created_by, published_at, date_range_start, date_range_end, is_weekly, use_blocks, created_at, updated_at) VALUES
('8adc8ae3-6830-4e74-b675-549fd3c9dad0', 'Weekly Drop · December 4, 2025', 'This past week, Mainstream buzzed with activity, primarily driven by Christian Poschmann, who rolled out a suite of exciting new features designed to significantly enhance our workflow and collaboration. A major highlight is the newfound ability to directly embed Figma files into Streams, streamlining the sharing of designs without ever having to leave the platform. Complementing this, Christian also introduced "Stream Bookmarks," allowing users to integrate external links from crucial tools like Jira, Figma, and Notion directly within Streams, complete with favicons for easy recognition. These additions are set to significantly improve our ability to connect various design and project management tools, solidifying Mainstream as a more central hub for all our creative endeavors.

Further improving real-time interaction and transparency, Christian Poschmann implemented new features that boost awareness and engagement within the platform. Users can now see familiar bouncing dots when others are crafting a response in comments, providing a more dynamic and responsive communication experience. Additionally, a "Seen by X people" indicator now appears below posts, allowing creators to see who has viewed their work and gain insight into content reach, with the ability to hover for specific names. Beyond these robust platform developments, Christian also contributed a creative design concept in the #credit-card channel, showcasing some "Cool Credit Card ides." This blend of continuous platform enhancement and shared design innovation truly highlights the dynamic environment Mainstream is fostering.', 'published', 'dd8856e2-d0d7-45f6-a72d-37e498bb1a17', '2025-12-05 20:37:00.032+00', '2025-11-28 00:00:00+00', '2025-12-06 07:59:59+00', false, true, '2025-12-05 20:36:00.007153+00', '2025-12-05 20:37:00.049066+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DROP_BLOCKS (Notion-like blocks for drops)
-- ============================================================================
INSERT INTO drop_blocks (id, drop_id, type, position, content, heading_level, asset_id, display_mode, crop_position_x, crop_position_y, gallery_layout, gallery_featured_index, created_at, updated_at) VALUES
('07cfda9f-fdcf-4b34-a268-4d47b1f2fa5e', '8adc8ae3-6830-4e74-b675-549fd3c9dad0', 'heading', 0, 'credit-card', 2, NULL, 'auto', 50, 0, 'grid', 0, '2025-12-05 20:36:00.115458+00', '2025-12-05 20:36:00.115458+00'),
('6113f435-9549-4e4a-a180-8e16b5c43498', '8adc8ae3-6830-4e74-b675-549fd3c9dad0', 'heading', 2, 'mainstream', 2, NULL, 'auto', 50, 0, 'grid', 0, '2025-12-05 20:36:00.115458+00', '2025-12-05 20:36:00.115458+00'),
('75792a2d-0f0f-4bfc-8538-e6929a352006', '8adc8ae3-6830-4e74-b675-549fd3c9dad0', 'post', 3, NULL, NULL, '55099740-c332-4742-aa9e-f6ed281ccf30', 'auto', 50, 0, 'grid', 0, '2025-12-05 20:36:00.115458+00', '2025-12-05 20:36:00.115458+00'),
('0823e878-68f2-48eb-9fd0-3e828aa468fb', '8adc8ae3-6830-4e74-b675-549fd3c9dad0', 'text', 4, 'Dwdi', NULL, NULL, 'auto', 50, 0, 'grid', 0, '2025-12-05 20:36:43.077027+00', '2025-12-05 20:36:44.862+00'),
('7138a52b-1d34-4f89-b547-e66d87f97da1', '8adc8ae3-6830-4e74-b675-549fd3c9dad0', 'post', 5, NULL, NULL, '30d2e63f-5e90-44a5-bb12-8672af518dfe', 'auto', 50, 0, 'grid', 0, '2025-12-05 20:36:00.115458+00', '2025-12-05 20:36:00.115458+00'),
('b3f30199-5874-490c-9e99-e5fb12fb40f4', '8adc8ae3-6830-4e74-b675-549fd3c9dad0', 'post', 6, NULL, NULL, 'e61e7071-5558-4d4a-8994-901ee91f4de7', 'auto', 50, 0, 'grid', 0, '2025-12-05 20:36:00.115458+00', '2025-12-05 20:36:00.115458+00'),
('44ee5f7b-896d-4807-957a-23c3b67a13b1', '8adc8ae3-6830-4e74-b675-549fd3c9dad0', 'post', 7, NULL, NULL, '36e36af3-5f03-4395-8f35-d13f8a8db22b', 'auto', 50, 0, 'grid', 0, '2025-12-05 20:36:00.115458+00', '2025-12-05 20:36:00.115458+00'),
('5c1756eb-e25c-4ce5-9de6-6a67b13a3455', '8adc8ae3-6830-4e74-b675-549fd3c9dad0', 'post', 8, NULL, NULL, 'e796faee-5751-406c-853e-32b2f1ae32db', 'auto', 50, 0, 'grid', 0, '2025-12-05 20:36:00.115458+00', '2025-12-05 20:36:00.115458+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- USER_NOTIFICATION_SETTINGS
-- ============================================================================
INSERT INTO user_notification_settings (user_id, in_app_enabled, likes_enabled, comments_enabled, follows_enabled, mentions_enabled, created_at, updated_at) VALUES
('dd8856e2-d0d7-45f6-a72d-37e498bb1a17', true, true, true, false, false, '2025-12-06 23:51:40.167151+00', '2025-12-06 23:57:56.320421+00')
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- ✓ 2 users (Christian Poschmann, John Does)
-- ✓ 3 teams (legacy)
-- ✓ 5 streams (mainstream, design-a-palooza, wallpaper, credit-card, private-stream-test)
-- ✓ 1 stream member
-- ✓ 16 assets (images, GIFs, videos, Figma/Loom embeds)
-- ✓ 21 asset-stream relationships
-- ✓ 3 comments
-- ✓ 15 asset likes
-- ✓ 1 comment like
-- ✓ 2 user follow relationships
-- ✓ 1 stream follow
-- ✓ 1 stream bookmark
-- ✓ 1 drop with 8 blocks
-- ✓ 1 notification settings record
-- ============================================================================

-- Note: Asset views and notifications are intentionally omitted from seed data
-- as they represent transient user activity that should be regenerated.
--
-- Note: Figma access tokens are NOT included in seed data for security.
-- Users must reconnect their Figma account after seeding.
