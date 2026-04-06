# Project Rules

## Feature Tracking
- Features sind in `features/INDEX.md` gelistet — vor jeder Arbeit lesen
- Neue Features brauchen einen Eintrag in INDEX.md mit nächster freier PROJ-ID
- Status in INDEX.md nach Abschluss aktualisieren: Planned → In Progress → In Review → Deployed

## Git
- Commit-Format: `type(PROJ-X): description`
- Types: feat, fix, refactor, test, docs, chore

## Qualität
- Vor dem Editieren immer lesen — nie Inhalte aus dem Gedächtnis annehmen
- Import-Pfade, Komponentennamen und API-Routen verifizieren bevor verwenden
- shadcn/ui-Komponenten nie nachbauen — installierte Komponenten direkt nutzen

## TODO: Vor Deployment erledigen
- [ ] **Upstash Redis einrichten** für persistenten Rate Limiter:
  1. Account bei [upstash.com](https://upstash.com) erstellen (kostenloser Tier reicht)
  2. Redis-Datenbank anlegen
  3. In Vercel zwei Environment Variables setzen:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`
  4. Ohne diese Variablen läuft der Rate Limiter nur im Speicher (unsicher bei Serverless)
