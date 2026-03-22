-- Create company-logos storage bucket (public read, auth write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'company_logos_public_read' AND tablename = 'objects') THEN
    CREATE POLICY "company_logos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'company-logos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'company_logos_auth_insert' AND tablename = 'objects') THEN
    CREATE POLICY "company_logos_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'company_logos_auth_update' AND tablename = 'objects') THEN
    CREATE POLICY "company_logos_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-logos');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'company_logos_auth_delete' AND tablename = 'objects') THEN
    CREATE POLICY "company_logos_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-logos');
  END IF;
END $$;
