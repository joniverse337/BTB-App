-- PROJ-7 Fix: is_active Spalte für work_notifications
-- Unterscheidet Platzhalter-Zeilen (AA angelegt, kein Tag aktiviert)
-- von explizit vom User aktivierten Tagen.
--
-- DEFAULT false: bestehende Zeilen gelten als "nicht aktiv" --
-- sie werden beim nächsten Speichern automatisch aktualisiert.

ALTER TABLE work_notifications
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;
