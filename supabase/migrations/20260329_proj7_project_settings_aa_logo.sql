-- PROJ-7: Add AA (Arbeitsanmeldung) logo settings to project_settings
-- Run this manually in the Supabase SQL Editor AFTER the work_notifications migration.

ALTER TABLE project_settings
  ADD COLUMN aa_logo_x    FLOAT DEFAULT NULL,
  ADD COLUMN aa_logo_y    FLOAT DEFAULT NULL,
  ADD COLUMN aa_logo_size FLOAT DEFAULT NULL;

-- When NULL, the AA uses the BTB logo settings as fallback (handled in app code).
