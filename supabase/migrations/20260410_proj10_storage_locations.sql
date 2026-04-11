-- PROJ-10: Storage Locations (Lagerplaetze) Migration
-- Run this manually in the Supabase SQL Editor.
-- Creates the storage_locations table for project storage location tracking.

-- ============================================================
-- Step A: Create storage_locations table
-- ============================================================

CREATE TABLE storage_locations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'Lagerplatz 1',
  address         TEXT,                                  -- Reverse Geocoding oder manuell
  description     TEXT,                                  -- Anmerkungen-Textarea
  screenshot_url  TEXT,                                  -- Supabase Storage URL
  drawing_data    JSONB,                                 -- Array von Stroke-Objekten [{color, width, points:[{x,y}]}]
  map_zoom        INTEGER,                               -- letzter Zoom-Level
  map_center_lat  FLOAT8,                                -- Kartenposition: Breitengrad
  map_center_lng  FLOAT8,                                -- Kartenposition: Laengengrad
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Step B: Indexes
-- ============================================================

-- Primary query pattern: fetch all storage locations for a project
CREATE INDEX idx_storage_locations_project_id
  ON storage_locations (project_id);

-- ============================================================
-- Step C: Auto-update updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION update_storage_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_storage_locations_updated_at
  BEFORE UPDATE ON storage_locations
  FOR EACH ROW EXECUTE FUNCTION update_storage_locations_updated_at();

-- ============================================================
-- Step D: RLS — storage_locations
-- ============================================================

ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;

-- Single FOR ALL policy: access via project -> company_id chain
-- Same pattern as equipment_items, work_notifications, shifts, shift_workers, shift_equipment
CREATE POLICY "storage_locations: access via project ownership"
  ON storage_locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = storage_locations.project_id
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
      WHERE p.id = storage_locations.project_id
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

-- ============================================================
-- Step E: Supabase Storage Bucket + RLS Policies
-- ============================================================

-- Bucket erstellen (idempotent via ON CONFLICT)
INSERT INTO storage.buckets (id, name, public)
VALUES ('storage-location-screenshots', 'storage-location-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Eingeloggte Nutzer dürfen Screenshots hochladen
CREATE POLICY "Authenticated users can upload screenshots"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'storage-location-screenshots');

-- RLS: Öffentlicher Lesezugriff (Screenshots werden per URL eingebettet)
CREATE POLICY "Public read access for screenshots"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'storage-location-screenshots');

-- RLS: Eingeloggte Nutzer dürfen eigene Screenshots löschen
CREATE POLICY "Authenticated users can delete own screenshots"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'storage-location-screenshots');
