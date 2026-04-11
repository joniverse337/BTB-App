-- PROJ-10: Fix Storage Bucket Policies für storage-location-screenshots
-- Ersetzt die zu weit gefassten INSERT/DELETE-Policies durch Ownership-Checks.
-- Pfadstruktur im Bucket: {project_id}/{storage_location_id}.{ext}
-- Das erste Path-Segment ist die project_id → darüber wird Ownership geprüft.

-- ============================================================
-- Step 1: Alte Policies entfernen
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload screenshots"
  ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can delete own screenshots"
  ON storage.objects;

-- ============================================================
-- Step 2: Neue INSERT-Policy mit Ownership-Check
-- Erlaubt Upload nur, wenn das Projekt dem User gehört (direkt oder via Company).
-- ============================================================

CREATE POLICY "Authenticated users can upload screenshots for own projects"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'storage-location-screenshots'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM projects p
      WHERE
        p.created_by = auth.uid()
        OR (
          p.company_id IS NOT NULL
          AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
          AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true)
        )
    )
  );

-- ============================================================
-- Step 3: Neue DELETE-Policy mit Ownership-Check
-- Erlaubt Löschen nur für Dateien im eigenen Projekt-Ordner.
-- ============================================================

CREATE POLICY "Authenticated users can delete screenshots for own projects"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'storage-location-screenshots'
    AND (storage.foldername(name))[1] IN (
      SELECT p.id::text
      FROM projects p
      WHERE
        p.created_by = auth.uid()
        OR (
          p.company_id IS NOT NULL
          AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
          AND EXISTS (SELECT 1 FROM companies WHERE id = p.company_id AND is_active = true)
        )
    )
  );

-- Public read bleibt unverändert (Screenshots werden per URL eingebettet).
