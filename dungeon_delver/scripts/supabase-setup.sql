-- =============================================================================
-- DungeonDelver Supabase Setup SQL
-- =============================================================================
-- Run this in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- to create all required tables for cross-device sync.
--
-- How to use:
--   1. Go to https://supabase.com/dashboard → Your project → SQL Editor
--   2. Paste this entire file into the editor
--   3. Click "Run" (or Ctrl+Enter)
--   4. All tables and policies will be created automatically
-- =============================================================================

-- ─── Characters table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dd_characters (
  id          UUID PRIMARY KEY,          -- Character UUID (matches char.id in app)
  user_id     UUID NOT NULL,             -- Supabase Auth user ID (who owns this)
  name        TEXT NOT NULL,             -- Character name (for display in lists)
  data        JSONB NOT NULL,            -- Full character JSON blob
  version     INTEGER DEFAULT 1,         -- Conflict detection (last-write-wins)
  campaign_name TEXT DEFAULT '',
  last_sync   TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_characters_user ON dd_characters (user_id);
CREATE INDEX IF NOT EXISTS idx_characters_user_sync ON dd_characters (user_id, last_sync DESC);

-- Enable Row Level Security
ALTER TABLE dd_characters ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own characters
CREATE POLICY "Users can read own characters"
  ON dd_characters FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can insert their own characters
CREATE POLICY "Users can insert own characters"
  ON dd_characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can update their own characters
CREATE POLICY "Users can update own characters"
  ON dd_characters FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: users can delete their own characters
CREATE POLICY "Users can delete own characters"
  ON dd_characters FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Sessions/Campaigns table ────────────────────────────────────────────────
-- Stores campaign configs so campaigns can sync across devices
CREATE TABLE IF NOT EXISTS dd_sessions (
  id          TEXT PRIMARY KEY,           -- Campaign ID (e.g., "camp-1234567890")
  user_id     UUID NOT NULL,             -- Supabase Auth user ID
  name        TEXT NOT NULL,             -- Campaign display name
  config      JSONB DEFAULT '{}',        -- Full campaign config JSON
  last_sync   TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON dd_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_sync ON dd_sessions (user_id, last_sync DESC);

ALTER TABLE dd_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON dd_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON dd_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON dd_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON dd_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Encounters table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dd_encounters (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  name        TEXT NOT NULL,
  session_id  TEXT,
  combatants  JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounters_user ON dd_encounters (user_id);

ALTER TABLE dd_encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own encounters"
  ON dd_encounters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own encounters"
  ON dd_encounters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own encounters"
  ON dd_encounters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own encounters"
  ON dd_encounters FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Storylines table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dd_storylines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  name          TEXT NOT NULL,
  campaign_name TEXT DEFAULT '',
  quest_ids     TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storylines_user ON dd_storylines (user_id);

ALTER TABLE dd_storylines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own storylines"
  ON dd_storylines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storylines"
  ON dd_storylines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storylines"
  ON dd_storylines FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own storylines"
  ON dd_storylines FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Notes table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dd_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  campaign_name TEXT DEFAULT '',
  content       TEXT DEFAULT '',
  type          TEXT DEFAULT 'personal',
  author        TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user ON dd_notes (user_id);

ALTER TABLE dd_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notes"
  ON dd_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON dd_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON dd_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON dd_notes FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Auto-update `updated_at` on row change ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER trg_characters_updated_at
  BEFORE UPDATE ON dd_characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON dd_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_encounters_updated_at
  BEFORE UPDATE ON dd_encounters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_storylines_updated_at
  BEFORE UPDATE ON dd_storylines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON dd_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ✅ Done! All tables and security policies are in place.
