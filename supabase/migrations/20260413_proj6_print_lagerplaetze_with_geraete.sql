-- PROJ-6: project_settings — print_lagerplaetze_with_geraete toggle
-- Wenn aktiviert, werden Lagerplatz-Karten beim Gerätebedarf-Druck angehängt.

ALTER TABLE project_settings
  ADD COLUMN IF NOT EXISTS print_lagerplaetze_with_geraete BOOLEAN NOT NULL DEFAULT FALSE;
