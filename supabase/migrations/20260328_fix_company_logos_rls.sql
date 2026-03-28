-- Fix company-logos storage policies:
-- Ersetze unsichere "jeder authenticated darf alles"-Policies durch
-- Policies die prüfen ob der Nutzer zur Firma im Pfad gehört.
-- Pfadstruktur: {company_id}/logo.ext

-- Alte unsichere Policies entfernen
DROP POLICY IF EXISTS "company_logos_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "company_logos_auth_delete" ON storage.objects;

-- INSERT: Nur in den eigenen Firmen-Ordner
CREATE POLICY "company-logos: authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.company_id::text
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id IS NOT NULL
    )
  );

-- UPDATE: Nur eigene Firmen-Dateien überschreiben
CREATE POLICY "company-logos: authenticated update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.company_id::text
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id IS NOT NULL
    )
  );

-- DELETE: Nur eigene Firmen-Dateien löschen
CREATE POLICY "company-logos: authenticated delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT p.company_id::text
      FROM profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id IS NOT NULL
    )
  );
