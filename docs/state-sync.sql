-- =============================================================================
--  ATLAS — client state sync   (2026-08-31)
--  One JSON blob per user. The app persists its whole client state
--  ({ vacancies, profile }) as-is; this is what the deployed app actually
--  reads/writes today. The normalized vault_* / radar_* tables in schema.sql
--  are the future target and are NOT wired up yet.
--
--  Run once in the Supabase SQL editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS atlas_state (
    user_id     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    data        JSONB       NOT NULL DEFAULT '{}'::JSONB,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE atlas_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY atlas_state_select ON atlas_state
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY atlas_state_insert ON atlas_state
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY atlas_state_update ON atlas_state
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY atlas_state_delete ON atlas_state
    FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON atlas_state TO authenticated;
