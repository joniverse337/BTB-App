-- PROJ-7: Work Notifications (Arbeitsanmeldung) Migration
-- Run this manually in the Supabase SQL Editor.
-- Creates the work_notifications table for weekly work planning.

-- ============================================================
-- Step A: Create work_notifications table
-- ============================================================

CREATE TABLE work_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  calendar_week   INTEGER NOT NULL CHECK (calendar_week >= 1 AND calendar_week <= 53),
  year            INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  weekday_nr      INTEGER NOT NULL CHECK (weekday_nr >= 1 AND weekday_nr <= 7),
  weekday_name    TEXT NOT NULL,
  date            DATE NOT NULL,

  -- Arbeitszeit
  day_start       TEXT,   -- e.g. "07:00"
  day_end         TEXT,   -- e.g. "18:00"
  night_start     TEXT,   -- e.g. "21:00"
  night_end       TEXT,   -- e.g. "06:00"

  -- Planung
  location        TEXT,
  bauspitzen      TEXT,
  workers         TEXT,
  machines        TEXT,
  work_description TEXT,
  site_manager    TEXT,

  -- Sicherheit
  safety_plan_enabled  BOOLEAN NOT NULL DEFAULT false,
  safety_plan_number   TEXT,
  track_work_enabled   BOOLEAN NOT NULL DEFAULT false,
  betra_number         TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint for upsert
  CONSTRAINT uq_work_notifications_day UNIQUE (project_id, year, calendar_week, weekday_nr)
);

CREATE INDEX idx_work_notifications_project_week
  ON work_notifications (project_id, year, calendar_week);

-- ============================================================
-- Step B: RLS — work_notifications
-- ============================================================

ALTER TABLE work_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_notifications: access via project ownership" ON work_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = work_notifications.project_id
        AND (
          (
            p.company_id IS NOT NULL
            AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
            AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true)
          )
          OR
          (p.company_id IS NULL AND p.created_by = auth.uid())
        )
    )
  );
