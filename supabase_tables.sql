-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Profiles table
CREATE TABLE IF NOT EXISTS fa_profiles (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id   TEXT        NOT NULL,
  profile_id  TEXT        NOT NULL,
  name        TEXT        NOT NULL DEFAULT 'Hauptprofil',
  profile     JSONB       NOT NULL DEFAULT '{}',
  extras      JSONB       NOT NULL DEFAULT '{}',
  is_active   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, profile_id)
);

ALTER TABLE fa_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read-write" ON fa_profiles USING (true) WITH CHECK (true);

-- History table
CREATE TABLE IF NOT EXISTS fa_history (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id   TEXT        NOT NULL,
  domain      TEXT,
  title       TEXT,
  url         TEXT,
  field_count INT         NOT NULL DEFAULT 0,
  profile_id  TEXT,
  ts          BIGINT      NOT NULL DEFAULT extract(epoch FROM NOW()) * 1000,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fa_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read-write" ON fa_history USING (true) WITH CHECK (true);

-- Index for fast device lookups
CREATE INDEX IF NOT EXISTS idx_fa_profiles_device  ON fa_profiles (device_id);
CREATE INDEX IF NOT EXISTS idx_fa_history_device   ON fa_history  (device_id);
CREATE INDEX IF NOT EXISTS idx_fa_history_ts       ON fa_history  (device_id, ts DESC);
