-- PROJ-6: Project Settings & Categories Migration
-- Run this manually in the Supabase SQL Editor AFTER the PROJ-5 migration.
-- Creates project_settings, project_categories, and the project-logos storage bucket.

-- ============================================================
-- Step A: Create project_settings table
-- ============================================================

CREATE TABLE project_settings (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  firma      TEXT,
  adr        TEXT,
  logo_url   TEXT,
  logo_x     FLOAT NOT NULL DEFAULT 0.5,
  logo_y     FLOAT NOT NULL DEFAULT 0.5
);

-- ============================================================
-- Step B: Create project_categories table
-- ============================================================

CREATE TABLE project_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  typ        TEXT NOT NULL CHECK (typ IN ('personal', 'equipment')),
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_project_categories_project_id ON project_categories (project_id);

-- ============================================================
-- Step C: RLS — project_settings
-- ============================================================

ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_settings: access via project ownership" ON project_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_settings.project_id
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
-- Step D: RLS — project_categories
-- ============================================================

ALTER TABLE project_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_categories: access via project ownership" ON project_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_categories.project_id
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
-- Step E: Storage bucket project-logos
-- ============================================================

-- Create public bucket (logos must render in print popup without Auth headers)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-logos', 'project-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (bucket is public, but explicit policy is best practice)
CREATE POLICY "project-logos: public read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'project-logos');

-- Authenticated upload: only to own project folder ({project_id}/logo.ext)
CREATE POLICY "project-logos: authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      WHERE (
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

-- Authenticated update (overwrite existing logo)
CREATE POLICY "project-logos: authenticated update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      WHERE (
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

-- Authenticated delete
CREATE POLICY "project-logos: authenticated delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      WHERE (
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
