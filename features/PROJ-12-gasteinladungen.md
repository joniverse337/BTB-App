# PROJ-12 · Projekt-Gasteinladungen

**Status:** Planned  
**Erstellt:** 2026-04-11

## Problem

Das aktuelle Zugriffsmodell erlaubt nur Zugriff über `company_id` — ein Nutzer sieht ausschließlich Projekte seiner eigenen Firma. Es gibt keine Möglichkeit, ein einzelnes Projekt mit einem externen Bauleiter (andere Firma) zu teilen.

**Konkreter Anlass:** Zwei externe Bauleiter (je von einer anderen Firma) sollen Zugriff auf spezifische Projekte erhalten, ohne der eigenen Firma beizutreten.

## Lösung (Idee)

Neue Tabelle `project_members` als Brücke zwischen Projekten und externen Nutzern:

```
project_members
  id          UUID PK
  project_id  UUID → projects.id
  user_id     UUID → auth.users.id
  role        TEXT ('viewer' | 'editor')
  invited_by  UUID → auth.users.id
  created_at  TIMESTAMPTZ
```

RLS-Policies auf allen Projekttabellen um eine dritte Zugriffsbedingung erweitern:
```sql
OR EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = projects.id
    AND pm.user_id = auth.uid()
)
```

## Offene Fragen

- **Einladungsflow:** Per E-Mail-Link, per User-ID, oder per generiertem Code?
- **Rollen:** Nur Lesezugriff (viewer) oder auch Bearbeitung (editor)?
- **Scope:** Nur Schichten/BTB lesen — oder auch Arbeitsanmeldung, Lagerplätze etc.?
- **Verwaltung:** Wer kann Einladungen zurückziehen? Nur Projektbesitzer?

## Technische Abhängigkeiten

- Berührt RLS-Policies auf: `projects`, `shifts`, `shift_workers`, `shift_equipment`, `work_notifications`, `equipment_items`, `storage_locations`, `project_settings`, `project_categories`
- Alle Policies müssen um die `project_members`-Bedingung erweitert werden
- Aufwand: mittel — viele kleine Migrations-Änderungen, aber kein neues Architektur-Konzept
