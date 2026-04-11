-- PROJ-10: Storage Locations — Ansprechpartner pro Lagerplatz
-- Ergaenzt die storage_locations-Tabelle um ein JSON-Feld fuer gespeicherte Kontakt-Snapshots.

ALTER TABLE storage_locations
  ADD COLUMN IF NOT EXISTS contacts_json text;
