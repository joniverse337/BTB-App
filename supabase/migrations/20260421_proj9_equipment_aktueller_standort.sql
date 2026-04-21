-- PROJ-9: Aktueller Standort für Gerätebedarf
-- Zeigt wo ein Gerät aktuell steht (z.B. anderes BV, Lager), bevor es geliefert wird.

ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS aktueller_standort text;
