-- PROJ-10: Storage Locations — strukturierte Adressfelder
-- Ergaenzt die storage_locations-Tabelle um 4 separate Adress-Spalten
-- fuer Forward-Geocoding (Eingabe → Karte statt Karte → Adresse).

ALTER TABLE storage_locations
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_number text,
  ADD COLUMN IF NOT EXISTS address_zip    text,
  ADD COLUMN IF NOT EXISTS address_city   text;
