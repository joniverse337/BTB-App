-- PROJ-5: Companies & Profiles Migration
-- Run this manually in the Supabase SQL Editor.
-- This migration creates the companies/profiles tables, migrates projects,
-- and establishes the full RLS chain for the entire app.

-- ============================================================
-- Step A: Create companies table
-- ============================================================

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_companies_code ON companies (code);

-- ============================================================
-- Step B: Create profiles table
-- ============================================================

CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_company_id ON profiles (company_id);

-- ============================================================
-- Step C: DB Trigger for auto-create profiles on new user
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Step D: Backfill existing users into profiles
-- ============================================================

INSERT INTO profiles (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step E: Migrate projects table (6-step process)
-- ============================================================

-- Step E1: Add created_by column (nullable first)
ALTER TABLE projects ADD COLUMN created_by UUID;

-- Step E2: Copy data from user_id to created_by
UPDATE projects SET created_by = user_id;

-- Step E3: Set NOT NULL on created_by
ALTER TABLE projects ALTER COLUMN created_by SET NOT NULL;

-- Step E4: Add company_id column (nullable, FK to companies)
ALTER TABLE projects ADD COLUMN company_id UUID REFERENCES companies(id);

CREATE INDEX idx_projects_company_id ON projects (company_id);
CREATE INDEX idx_projects_created_by ON projects (created_by);

-- Step E5: Drop old user_id-based RLS policies on projects
-- (Drop all existing policies so we can recreate them cleanly)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'projects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
  END LOOP;
END $$;

-- Step E6: Drop user_id column
ALTER TABLE projects DROP COLUMN user_id;

-- ============================================================
-- Step F: Create RLS policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- projects should already have RLS enabled, but ensure it
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_equipment ENABLE ROW LEVEL SECURITY;

-- ---- companies ----

CREATE POLICY "companies_select_own"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  );

-- No INSERT/UPDATE/DELETE for authenticated users (service_role only)

-- ---- profiles ----

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- No UPDATE policy for authenticated users on profiles.
-- company_id changes are exclusively handled by API routes using service_role key.
-- This prevents any client-side bypass of the join code.

-- ---- projects ----

-- Drop any remaining policies on projects (safety net)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'projects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "projects_all_access"
  ON projects FOR ALL
  TO authenticated
  USING (
    (company_id IS NOT NULL
     AND company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
     AND EXISTS (SELECT 1 FROM companies WHERE id = projects.company_id AND is_active = true))
    OR
    (company_id IS NULL AND created_by = auth.uid())
  )
  WITH CHECK (
    (company_id IS NOT NULL
     AND company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
     AND EXISTS (SELECT 1 FROM companies WHERE id = projects.company_id AND is_active = true))
    OR
    (company_id IS NULL AND created_by = auth.uid())
  );

-- ---- shifts ----

-- Drop existing shift policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'shifts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON shifts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "shifts_all_access"
  ON shifts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = shifts.project_id
      AND (
        (p.company_id IS NOT NULL
         AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
         AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true))
        OR
        (p.company_id IS NULL AND p.created_by = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = shifts.project_id
      AND (
        (p.company_id IS NOT NULL
         AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
         AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true))
        OR
        (p.company_id IS NULL AND p.created_by = auth.uid())
      )
    )
  );

-- ---- shift_workers ----

-- Drop existing shift_workers policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'shift_workers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON shift_workers', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "shift_workers_all_access"
  ON shift_workers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shifts s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = shift_workers.shift_id
      AND (
        (p.company_id IS NOT NULL
         AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
         AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true))
        OR
        (p.company_id IS NULL AND p.created_by = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = shift_workers.shift_id
      AND (
        (p.company_id IS NOT NULL
         AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
         AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true))
        OR
        (p.company_id IS NULL AND p.created_by = auth.uid())
      )
    )
  );

-- ---- shift_equipment ----

-- Drop existing shift_equipment policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'shift_equipment'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON shift_equipment', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "shift_equipment_all_access"
  ON shift_equipment FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shifts s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = shift_equipment.shift_id
      AND (
        (p.company_id IS NOT NULL
         AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
         AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true))
        OR
        (p.company_id IS NULL AND p.created_by = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM shifts s
      JOIN projects p ON p.id = s.project_id
      WHERE s.id = shift_equipment.shift_id
      AND (
        (p.company_id IS NOT NULL
         AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
         AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true))
        OR
        (p.company_id IS NULL AND p.created_by = auth.uid())
      )
    )
  );
