-- PROJ-9: Equipment Items (Gerätebedarf) Migration
-- Run this manually in the Supabase SQL Editor.
-- Creates the equipment_items table for project equipment tracking.

-- ============================================================
-- Step A: Create equipment_items table
-- ============================================================

CREATE TABLE equipment_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT,                               -- Gerätename (optional)
  nummer          TEXT,                               -- Gerätenummer (optional, oft erst vom Bauhof nachgereicht)
  lieferadresse   TEXT,                               -- Lieferadresse (optional)
  lieferdatum     DATE,                               -- Lieferdatum (optional)
  anmerkungen     TEXT,                               -- Freitext-Anmerkungen (optional)
  status          TEXT NOT NULL DEFAULT 'bedarf'
                    CHECK (status IN ('bedarf', 'baustelle', 'frei')),
  status_ts       BIGINT,                             -- Unix-Timestamp der letzten Statusänderung
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Step B: Indexes
-- ============================================================

-- Composite index for the main query pattern: fetch all items for a project, filtered/grouped by status
CREATE INDEX idx_equipment_items_project_status
  ON equipment_items (project_id, status);

-- ============================================================
-- Step C: Auto-update updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_equipment_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_equipment_items_updated_at
  BEFORE UPDATE ON equipment_items
  FOR EACH ROW EXECUTE FUNCTION update_equipment_items_updated_at();

-- ============================================================
-- Step D: RLS — equipment_items
-- ============================================================

ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;

-- Single FOR ALL policy: access via project → company_id chain
-- Same pattern as work_notifications, shifts, shift_workers, shift_equipment
CREATE POLICY "equipment_items: access via project ownership"
  ON equipment_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = equipment_items.project_id
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = equipment_items.project_id
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
