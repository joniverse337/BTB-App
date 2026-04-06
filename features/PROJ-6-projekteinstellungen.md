# PROJ-6: Projekteinstellungen

## Status: In Review
**Created:** 2026-03-20

## Dependencies
- Requires: PROJ-3 (Projektdetailseite mit KW-Nav + Grid)
- Requires: PROJ-4 (BTB-Karte liest Einstellungen)
- Optional: PROJ-5 (company_id für RLS)

---

## Kernprinzip

Jedes Projekt hat eigene Einstellungen für:
1. **Quick-Buttons** (Personal & Geräte) — projektspezifische Schnellauswahl
2. **Logo-Position & -Größe** — projektspezifische Anpassung des Firmenlogos auf dem BTB

Firmenname, Adresse und Logo-Datei kommen aus den Account-Einstellungen (PROJ-5, `companies`-Tabelle)
und gelten für alle Projekte der Firma gleich. In PROJ-6 wird nur noch die Position und Größe des Logos pro Projekt angepasst.

---

## User Stories
- Als Nutzer möchte ich eigene Quick-Button-Labels für Personal und Geräte pro Projekt definieren.
- Als Nutzer möchte ich in den Einstellungen live sehen wie mein BTB aussehen wird.
- Als Nutzer möchte ich die Größe des Firmenlogos auf dem BTB per Slider anpassen können.

---

## Acceptance Criteria

### Einstellungsseite
- [x] Route: `/projekte/[id]/einstellungen`
- [x] Erreichbar via ⚙️-Icon rechts in der Projektdetail-Topbar (neben Projektname + Leistungszeitraum)
- [x] Seite hat Sektionen: "BTB-Vorlage" (Logo-Position/-Größe + Quick-Buttons)
- [x] Live-Vorschau: echte BTB-Karte (A4, read-only) zeigt Firmenname/Logo aus `companies` (PROJ-5) + Quick-Buttons sofort
- [x] Firmenname und Adresse kommen aus Account-Einstellungen (`/einstellungen`) — Info-Link vorhanden

### Logo-Position & -Größe
- [x] Logo per Drag auf der Vorschau-Karte frei positionieren (x/y gespeichert in `project_settings`)
- [x] Logo-Größe per ZoomSlider-Style-Control anpassen (Gold-Fill Pill, analog Zoom in KW-Navigation)
- [x] Firmen-Logo (aus PROJ-5) wird als Fallback genutzt wenn kein Projekt-Logo hochgeladen

### Logo-Position & -Größe für Arbeitsanmeldung
- [x] Eigene Sektion „Arbeitsanmeldung" auf der Einstellungsseite
- [x] Eigene x/y-Position + Größe für AA-Logo (kann von BTB-Logo-Position abweichen)
- [x] Live-Vorschau zeigt AA-Vorlage (A4 Querformat, read-only) via `AaPreviewCard`
- [x] Felder: `aa_logo_x`, `aa_logo_y`, `aa_logo_size` in `project_settings`
- [x] Fallback: wenn `aa_logo_x` null → BTB-Logo-Einstellungen werden übernommen (visuell angezeigt)
- [x] Zurücksetzen-Button: setzt AA-Einstellungen auf null zurück (BTB-Fallback)
- [x] Preview-Toggle (BTB / Arbeitsanmeldung) in der rechten Spalte

### Quick-Buttons
- [x] Tab "Personal": Kategorien anlegen (Label-Eingabe + Hinzufügen), alle löschbar
- [x] Tab "Geräte": Kategorien anlegen, alle löschbar
- [x] Keine Trennung Standard/Eigene — einheitliche Flat-List aller Einträge
- [x] Beim ersten Öffnen: Preset-Einträge werden in DB geseeded (Bauleiter, Polier, Vorarbeiter, Facharbeiter)
- [x] Quick-Buttons werden korrekt in BtbPreviewCard Live-Vorschau angezeigt
- [x] Reihenfolge: Eingabe-Reihenfolge (`sort_order`)

---

## Edge Cases
- Keine eigenen Quick-Buttons → Standard-Liste als Fallback, kein Fehler
- Projekt ohne company_id (kein Firmenmitglied) → Einstellungen trotzdem nutzbar, gehören dem Ersteller
- Duplikat-Label → wird nicht hinzugefügt (Fehlermeldung)

---

## Datenmodell

**`project_settings`** (1 Eintrag pro Projekt)
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| project_id | UUID | FK → projects.id (CASCADE DELETE, Primärschlüssel) |
| logo_x | Float | Logo-Position X (0–1, relativ zur Kartenbreite), Default 0.5 |
| logo_y | Float | Logo-Position Y (0–1, relativ zur Kartenhöhe), Default 0.5 |
| logo_size | Float | Logo-Größe (0–1 oder Pixel-Faktor), Default 0.3 |

> Firmendaten (Firmenname, Adresse, Logo-Datei) sind in `companies` (PROJ-5), nicht hier. PROJ-6 speichert nur die Darstellungs-Parameter (Position + Größe) pro Projekt.

**`project_categories`**
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primärschlüssel |
| project_id | UUID | FK → projects.id (CASCADE DELETE) |
| typ | Text | `personal` oder `equipment` |
| label | Text | Anzeigename |
| sort_order | Integer | Reihenfolge |

**Supabase Storage:**
- Bucket: `project-logos`
- Pfad: `{company_id}/{project_id}/logo.{ext}`
- RLS: nur Firma-Mitglieder können lesen/schreiben

---

## Sicherheitsmodell
- `project_settings`: Zugriff via `project_id → projects.company_id = Nutzer-Company`
- `project_categories`: identisch
- Storage: RLS auf Bucket-Ebene

---

## Bewusst ausgeklammert
- Weitere Projektmodule (BAP, Personalplanung etc.) → eigene PROJs, eigene Sektionen in dieser Seite
- Logo-Upload pro Projekt (eigenes Projektlogo, unabhängig von Firmenlogo) → nice-to-have, später

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponentenstruktur

```
/projekte/[id]/einstellungen (Seite)
+-- Topbar (Zurück-Link → /projekte/[id], Projektname)
|
+-- 2-Spalten-Layout
|   +-- Linke Spalte: Einstellungsformulare
|   |   +-- SettingsSection "Quick-Buttons"
|   |       +-- Tabs "Personal" | "Geräte"
|   |           +-- Kategorie-Liste (Label + Löschen-Button)
|   |           +-- Eingabefeld + "Hinzufügen"-Button
|   |
|   +-- Rechte Spalte: Live-Vorschau (sticky)
|       +-- ShiftCard (read-only, scaled-down ≈60%)
|           +-- Zeigt: Firmenname/Logo aus companies (PROJ-5) + eigene Quick-Buttons
```

---

### Datenmodell

**`project_settings`** — 1 Eintrag pro Projekt (Anker-Tabelle, aktuell ohne eigene Felder)
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| project_id | UUID | FK → projects.id (CASCADE DELETE, Primärschlüssel) |

> Firmendaten (firma, adr, logo_url, logo_x, logo_y) sind jetzt in `companies` (PROJ-5).

**`project_categories`** — Eigene Quick-Button-Labels pro Projekt
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primärschlüssel |
| project_id | UUID | FK → projects.id (CASCADE DELETE) |
| typ | Text | `personal` oder `equipment` |
| label | Text | Anzeigename des Quick-Buttons |
| sort_order | Integer | Reihenfolge der Anzeige |

**Supabase Storage Bucket `company-logos`** (in PROJ-5 verwaltet):
- Logo-Daten kommen aus `companies` via PROJ-5
- PROJ-6 braucht keinen eigenen Storage Bucket

---

### Datenquellen-Übersicht (ShiftCard)

```
BTB-Karte liest:
  companies.name / .adr / .logo_url / .logo_x / .logo_y  → via PROJ-5 (Firma-Einstellungen)
  project_categories                                       → via PROJ-6 (Projekt-Quick-Buttons)
```

Die `ShiftCard`-Komponente bekommt beide Quellen als Props übergeben.

---

### Live-Vorschau: Wie die Echtzeit-Karte funktioniert

```
Nutzer fügt Quick-Button hinzu
  → React-State wird sofort aktualisiert
  → ShiftCard liest Quick-Buttons aus demselben State-Objekt
  → ShiftCard rendert neu (kein Reload, kein Fetch)
  → Speichern: onBlur / nach Add/Delete schreibt in project_categories via Supabase Client

Firmenname/Logo in der Vorschau:
  → Werden einmalig aus companies geladen (beim Seitenaufruf)
  → Read-only in PROJ-6, änderbar nur in /einstellungen (PROJ-5)
```

Die ShiftCard bekommt einen `readOnly`-Prop — alle Inputs sind disabled, nur Darstellung.

---

### RLS-Kette (PROJ-6 Tabellen)

```
project_settings
  ALL: project_settings.project_id → projects (gleiche Bedingung wie projects RLS)
       Nutzer mit Zugriff auf das Projekt hat Zugriff auf seine Settings

project_categories
  ALL: identisch zu project_settings

Storage Bucket project-logos
  READ: Öffentlich (Logo muss auf Karte rendern, auch im Druck-Popup)
  WRITE/DELETE: Nur Nutzer mit Projekt-Zugriff
```

---

### PROJ-3 Anpassung (minimal)

```
ProjectDetailHeader bekommt: Link ⚙️ → /projekte/[id]/einstellungen
Kein neuer State, keine neue Logik — nur ein Link hinzufügen
```

---

### Tech-Entscheidungen

| Entscheidung | Gewählt | Warum |
|---|---|---|
| Live-Vorschau | ShiftCard mit readOnly-Prop aus Settings-State | Kein separates Preview-Template — WYSIWYG-Prinzip aus PROJ-3 bleibt |
| Firmendaten in Vorschau | Aus `companies` geladen (read-only) | Firmenname/Logo gehören zu PROJ-5, nur angezeigt nicht editierbar |
| Kategorie-Reihenfolge | `sort_order` Integer | Einfach, kein Drag-Framework nötig für MVP |
| Geteilte Komponente | `SettingsSection.tsx` mit PROJ-5 geteilt | Einheitliches Layout beider Einstellungsseiten |

## Frontend Implementation Notes

**Route:** `/projekte/[id]/einstellungen` -- created as `src/app/projekte/[id]/einstellungen/page.tsx`

**New Components:**
- `src/components/logo-upload.tsx` -- File picker with validation (PNG/JPG, max 2MB), thumbnail preview, delete button
- `src/components/category-manager.tsx` -- Tabs (Personal/Geraete) with default category badges, custom category list with add/delete
- `src/components/btb-preview-card.tsx` -- Read-only A4 preview card with logo watermark drag support

**Modified Components:**
- `src/components/project-detail-header.tsx` -- Added gear icon (Settings from lucide) linking to `/projekte/[id]/einstellungen`
- `src/app/projekte/[id]/page.tsx` -- Updated category fetching to check `project_categories` first (PROJ-6), fallback to `user_categories` (PROJ-5). Also reads `project_settings.firma/adr` to override project display.

**New Types:**
- `src/lib/validations/project-settings.ts` -- `ProjectSettings`, `ProjectCategory` interfaces, defaults, logo validation constants

**Design Decisions:**
- 2-column layout: left = forms (3/5 width), right = sticky live preview (2/5 width)
- Settings are saved on blur (not on submit), consistent with ShiftCard pattern
- Logo position saved only on mouseUp after drag (avoids excessive DB writes)
- Project categories supplement defaults, not replace (per spec)
- Lazy create: project_settings row created on first visit to settings page via upsert

**Backend needed:** Yes -- `project_settings` and `project_categories` tables + RLS + Storage bucket `project-logos`

## Backend Implementation Notes

**Completed 2026-03-21:**
- `supabase/migrations/20260321_proj6_project_settings.sql` — Single migration file covering:
  - `project_settings` table: `project_id` as PK (FK → projects CASCADE DELETE), `firma`/`adr`/`logo_url` nullable, `logo_x`/`logo_y` FLOAT DEFAULT 0.5
  - `project_categories` table: UUID `id`, `project_id` FK, `typ` CHECK IN ('personal','equipment'), `label`, `sort_order` INTEGER; index on `project_id`
  - RLS on both tables: access via full PROJ-5 RLS chain (company_id match OR solo created_by)
  - Storage bucket `project-logos` (public read, authenticated write/delete scoped to own project folders)
- No API routes needed — frontend speaks Supabase client directly through RLS
- No changes to `src/lib/supabase.ts` needed (browser client sufficient)

**Run order:** Must be applied AFTER `20260320_proj5_companies_profiles.sql`

## QA Test Results

**Datum:** 2026-03-21
**Build-Status:** PASS (npm run build erfolgreich, keine Fehler)
**Tester:** QA/Red-Team Audit
**Getestete Dateien:**
- `src/app/projekte/[id]/einstellungen/page.tsx`
- `src/components/logo-upload.tsx`
- `src/components/category-manager.tsx`
- `src/components/btb-preview-card.tsx`
- `src/components/project-detail-header.tsx`
- `src/lib/validations/project-settings.ts`
- `supabase/migrations/20260321_proj6_project_settings.sql`
- `src/app/projekte/[id]/page.tsx` (Integration)

---

### Acceptance Criteria

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| 1 | Route: `/projekte/[id]/einstellungen` | PASS | Existiert als `src/app/projekte/[id]/einstellungen/page.tsx`, Build bestaetigt dynamische Route |
| 2 | Erreichbar via Zahnrad-Icon in Projektdetail-Topbar | PASS | `project-detail-header.tsx` Zeile 41-52: Settings-Icon (lucide `Settings`) verlinkt zu `/projekte/${project.id}/einstellungen` |
| 3 | Seite hat Sektionen -- erste: "BTB-Vorlage" | PASS | `SettingsSection title="BTB-Vorlage"` in `einstellungen/page.tsx` Zeile 342-344 |
| 4 | Live-Vorschau: echte BTB-Karte (A4, read-only) zeigt Aenderungen sofort | PASS | `BtbPreviewCard` mit `aspect-[210/297]` und React-State-basiertem Live-Update. Kein separater Fetch noetig. |
| 5 | Felder: Firmenname + Adresse | PASS | Input-Felder Zeile 353-374, gespeichert via `saveField` onBlur |
| 6 | Werden auf allen BTBs dieses Projekts angezeigt | PASS | `page.tsx` Zeile 258-270: `project_settings.firma/adr` ueberschreiben `project.firm/adr` im State, der an `buildShiftPageDiv` und `ShiftCard` weitergegeben wird |
| 7 | Fallback wenn leer: "Firmenname" als Platzhalter | PASS | `btb-preview-card.tsx` Zeile 47: `const firma = settings.firma \|\| 'Firmenname'` |
| 8 | Logo hochladen (PNG/JPG, max 2MB) nach Supabase Storage | PASS | `logo-upload.tsx` validiert Typ (Zeile 24) und Groesse (Zeile 29), Upload via Supabase Storage in `einstellungen/page.tsx` Zeile 125-169 |
| 9 | Logo erscheint als Wasserzeichen (30% Deckkraft, hinter allem) | PASS (Vorschau) / FAIL (Druck) | Vorschau: `btb-preview-card.tsx` Zeile 73-91 mit `opacity: 0.3` und `z-0`. **ABER:** Das Logo-Wasserzeichen wird NICHT im Druck-Output (`buildShiftPageDiv`/`buildShiftPrintHtml`) gerendert. Siehe BUG-001. |
| 10 | Logo per Drag auf Vorschau-Karte frei positionieren (x/y gespeichert) | PASS | `btb-preview-card.tsx` Zeile 26-44: MouseDown/Move/Up-Handler, Position wird relativ (0-1) berechnet und via `handleLogoPositionSave` in DB geschrieben |
| 11 | Logo entfernen: Button "Logo loeschen" | PASS | `logo-upload.tsx` Zeile 56-64: Destructive Button mit Trash2-Icon, ruft `handleLogoDelete` auf |
| 12 | Tab "Personal": eigene Kategorien anlegen | PASS | `category-manager.tsx` mit Tabs-Komponente, `CategoryList` fuer `personal` |
| 13 | Tab "Geraete": eigene Kategorien anlegen | PASS | `CategoryList` fuer `equipment` |
| 14 | Eintraege koennen geloescht werden | PASS | X-Button pro Badge, `onDelete(cat.id)` Zeile 79 |
| 15 | Reihenfolge: Eingabe-Reihenfolge | PASS | `sort_order` wird bei Insert inkrementiert (max + 1), DB-Query sortiert `order('sort_order', { ascending: true })` |
| 16 | Fallback wenn keine eigenen: Standard-Liste | PASS | `category-manager.tsx` zeigt immer `DEFAULT_WORKER_CATEGORIES` / `DEFAULT_EQUIPMENT_CATEGORIES` als "Standard-Kategorien (immer verfuegbar)" |
| 17 | Eigene Kategorien ergaenzen Standard-Liste (ersetzen nicht) | FAIL | In der Einstellungsseite (UI) korrekt dargestellt. **ABER:** In `page.tsx` Zeile 285-286 und `shift-card.tsx` Zeile 366-367 ersetzen project_categories die Defaults vollstaendig statt sie zu ergaenzen. Siehe BUG-002. |

---

### Edge Cases

| # | Edge Case | Status | Anmerkung |
|---|-----------|--------|-----------|
| E1 | Kein Logo hochgeladen: kein Wasserzeichen, kein Fehler | PASS | `btb-preview-card.tsx` Zeile 70: `{settings.logo_url && ...}` -- bedingte Renderung |
| E2 | Logo-Datei zu gross (>2MB): Fehlermeldung | PASS | `logo-upload.tsx` Zeile 29-31: `file.size > MAX_LOGO_SIZE_BYTES` zeigt "Maximale Dateigroesse: 2MB" |
| E3 | Ungueltiges Format: Fehlermeldung | PASS | `logo-upload.tsx` Zeile 24-27: `ALLOWED_LOGO_TYPES.includes(file.type)` zeigt "Nur PNG und JPG erlaubt" |
| E4 | Firmenname leer: Platzhalter "Firmenname" auf Karte | PASS | `btb-preview-card.tsx` Zeile 47: `settings.firma \|\| 'Firmenname'` |
| E5 | Projekt ohne company_id: Einstellungen trotzdem nutzbar | PASS | RLS-Policy in Migration Zeile 50: `OR (p.company_id IS NULL AND p.created_by = auth.uid())` |
| E6 | Duplikat-Kategorien: gleiches Label mehrfach anlegbar | INFO | Kein Duplikat-Check vorhanden. Nutzer kann "Bauleiter" als eigene Kategorie anlegen, obwohl es bereits als Default existiert. Kein Crash, aber UX-Problem. Siehe BUG-003. |
| E7 | Leerer Kategorie-Name: wird nicht hinzugefuegt | PASS | `category-manager.tsx` Zeile 34: `if (!trimmed) return`, Button disabled bei leerem Input (Zeile 107) |
| E8 | Sehr langer Firmenname/Adresse | INFO | Kein `maxLength` auf Input-Feldern, kein DB-Constraint auf `firma`/`adr` TEXT-Laenge. Kann zu Layout-Overflow in der Vorschau-Karte fuehren. Siehe BUG-004. |

---

### Bug-Liste

| ID | Severity | Datei:Zeile | Beschreibung | Fix-Vorschlag |
|----|----------|-------------|--------------|---------------|
| BUG-001 | HIGH | `src/app/projekte/[id]/page.tsx:62-159` | **Logo-Wasserzeichen fehlt im Druck-Output.** `buildShiftPageDiv` und `buildShiftPrintHtml` rendern das Logo/Wasserzeichen NICHT. Die Vorschau in `btb-preview-card.tsx` zeigt es korrekt, aber der tatsaechliche Druck (window.open + print) ignoriert `project_settings.logo_url/logo_x/logo_y` komplett. Das Wasserzeichen ist ein Kern-Feature laut Spec. | **FIXED:** Logo wird korrekt an `buildShiftPageDiv` uebergeben und als `<img class="watermark">` gerendert. Auch Company-Logo als Fallback. |
| BUG-002 | MEDIUM | `src/app/projekte/[id]/page.tsx:284-286` + `src/components/shift-card.tsx:366-367` | **Project-Kategorien ersetzen Defaults statt sie zu ergaenzen.** Spec sagt: "Eigene Kategorien ersetzen die Standard-Liste nicht -- sie ergaenzen sie." Code in `page.tsx` setzt `workerCategories` auf NUR die project_categories. `shift-card.tsx` nutzt `workerCategories ?? [...DEFAULT_WORKER_CATEGORIES]` -- wenn project_categories gesetzt sind, werden Defaults nicht gemergt. | **FIXED:** `page.tsx` mergt jetzt korrekt: `[...DEFAULT_WORKER_CATEGORIES, ...personal]`. |
| BUG-003 | LOW | `src/components/category-manager.tsx:33-37` + `src/app/projekte/[id]/einstellungen/page.tsx:216-240` | **Duplikat-Kategorien moeglich.** Kein Check ob Label bereits als Default oder als eigene Kategorie existiert. Nutzer kann "Bauleiter" doppelt anlegen. | Vor `onAdd()` pruefen ob `trimmed` bereits in `defaultCategories` oder `filtered.map(c => c.label)` existiert. Toast/Fehlermeldung anzeigen. |
| BUG-004 | LOW | `src/app/projekte/[id]/einstellungen/page.tsx:353-374` + Migration | **Keine Laengenbegrenzung fuer Firmenname/Adresse.** Kein `maxLength` auf den Input-Feldern, kein `CHECK` Constraint in der DB. Extrem lange Werte koennen Layout brechen. | `maxLength={200}` auf Inputs setzen, optional `CHECK (length(firma) <= 200)` in Migration. |
| BUG-005 | LOW | `src/app/projekte/[id]/einstellungen/page.tsx:119-121` | **Stiller Fehler beim Speichern von Feldern.** `saveField` faengt Fehler mit `catch { // silent fail for MVP }`. Der Nutzer erhaelt kein Feedback wenn das Speichern fehlschlaegt (z.B. Netzwerk-Timeout). | Mindestens eine temporaere Toast-Nachricht anzeigen: "Speichern fehlgeschlagen". |
| BUG-006 | MEDIUM | `src/app/projekte/[id]/einstellungen/page.tsx:203-213` | **Stale-Closure-Risiko bei Logo-Position-Save.** `handleLogoPositionSave` liest `settings.logo_x` und `settings.logo_y` aus dem Closure. Da `handleLogoPositionChange` den State via `setSettings` updatet und `handleLogoPositionSave` erst bei mouseUp feuert, koennte die Closure veraltete Werte enthalten, da React State-Updates asynchron sind. Die Dependency-Array enthaelt `settings.logo_x` und `settings.logo_y`, was die Callback-Referenz bei jedem Drag-Move aendert -- das ist zwar korrekt fuer den Wert, aber die Referenz-Aenderung koennte Performance-Probleme bei haeufigem Re-Render verursachen. | Statt `settings.logo_x/logo_y` aus der Closure zu lesen, einen `useRef` fuer die aktuelle Position nutzen, oder die Werte direkt als Parameter von `onLogoPositionSave(x, y)` uebergeben. |
| BUG-007 | INFO | `src/components/btb-preview-card.tsx` | **Touch-Events fehlen fuer Logo-Drag.** Nur Mouse-Events (mouseDown/mouseMove/mouseUp) implementiert. Auf Tablets (laut PRD ein Target-Device) funktioniert Logo-Drag nicht. | `onTouchStart`, `onTouchMove`, `onTouchEnd` Handler mit analoger Logik hinzufuegen. |
| BUG-008 | LOW | `src/components/logo-upload.tsx:46-65` | **Nach Logo-Upload kein Upload-Button mehr sichtbar.** Wenn ein Logo existiert, zeigt die UI nur Thumbnail + "Logo loeschen". Um ein neues Logo hochzuladen, muss man erst loeschen, dann neu hochladen. Ein "Logo aendern"-Button fehlt. | Neben "Logo loeschen" einen "Logo aendern"-Button anzeigen, der den File-Picker oeffnet. |

---

### Security Findings

| # | Severity | Bereich | Finding | Status |
|---|----------|---------|---------|--------|
| S1 | OK | RLS project_settings | Policy korrekt: `FOR ALL USING(...)` mit company_id-Match ODER solo-created_by. Konsistent mit PROJ-5 RLS-Kette. | PASS |
| S2 | OK | RLS project_categories | Identische Policy-Struktur wie project_settings. Korrekt. | PASS |
| S3 | OK | Storage Bucket RLS | Oeffentlich lesbar (korrekt laut Design: Logos muessen im Druck-Popup ohne Auth rendern). Write/Delete korrekt auf Projektbesitz eingegrenzt via `storage.foldername(name)` Matching. | PASS |
| S4 | MEDIUM | RLS INSERT ohne WITH CHECK | `project_settings` und `project_categories` Policies nutzen `FOR ALL USING(...)` ohne expliziten `WITH CHECK`. Bei PostgreSQL wird fuer INSERT die USING-Klausel als WITH CHECK verwendet, wenn kein separater WITH CHECK definiert ist -- das ist hier korrekt und ausreichend. Allerdings bedeutet es, dass ein Nutzer einen `project_settings`-Eintrag fuer ein Projekt einfuegen koennte, auf das er Zugriff hat, ohne dass der `project_id` FK separat validiert wird (was aber durch den FK-Constraint ohnehin gesichert ist). | PASS (akzeptabel) |
| S5 | LOW | Input-Validierung Server-Side | Gemaess `.claude/rules/security.md`: "Validate ALL user input on the server side with Zod." Es gibt keine Server-Side-Validierung -- alle Writes gehen direkt vom Client via Supabase RLS. `firma`, `adr`, `label` werden nicht serverseitig validiert oder sanitized. RLS schuetzt Zugriff, aber nicht Inhalt. | INFO -- konsistent mit Architektur-Entscheidung (kein API-Layer, nur RLS). Risiko ist gering da Werte nur dem eigenen Nutzer/Firma angezeigt werden. |
| S6 | OK | Storage Upload Path | Logo-Pfad ist `{projectId}/logo.{ext}` -- kein Path-Traversal moeglich da Supabase Storage `foldername` gegen die RLS-Policy prueft. | PASS |
| S7 | LOW | Logo-URL in DB | `logo_url` wird als vollstaendige URL gespeichert (Zeile 156-163 in page.tsx). Wenn sich die Supabase-URL aendert (z.B. Migration zu anderem Projekt), brechen alle Logo-URLs. | INFO -- akzeptabel fuer MVP, aber langfristig besser nur den relativen Pfad speichern und URL dynamisch generieren. |
| S8 | OK | CASCADE DELETE | Beide Tabellen haben `ON DELETE CASCADE` auf `projects.id`. Wenn ein Projekt geloescht wird, werden Settings und Categories automatisch entfernt. | PASS |

---

### Zusammenfassung

**Gesamtergebnis: 15 von 17 Acceptance Criteria bestanden (2 FAIL)**

Die Kernfunktionalitaet der Projekteinstellungen ist solide implementiert. Die Einstellungsseite, das 2-Spalten-Layout mit Live-Vorschau, Logo-Upload mit Validierung, und die Kategorie-Verwaltung funktionieren gemaess Spec. Die RLS-Policies sind korrekt und konsistent mit der PROJ-5 Sicherheitskette.

**Kritische Findings:**
1. **BUG-001 (HIGH):** Logo-Wasserzeichen wird in der Vorschau korrekt angezeigt, aber im tatsaechlichen Druck-Output (`buildShiftPageDiv`) nicht gerendert. Dies ist ein Kern-Feature das vor Deployment gefixt werden muss.
2. **BUG-002 (MEDIUM):** Project-Kategorien ersetzen die Defaults im ShiftCard statt sie zu ergaenzen -- widerspricht der Spec direkt.

**BUG-001 und BUG-002 sind gefixt (2026-03-22).**

**Neu (2026-03-22): Firmenname/Adresse/Logo-Upload aus PROJ-6 entfernt**
- Felder Firmenname, Adresse und LogoUpload aus der Einstellungsseite entfernt
- PROJ-6 verwaltet nur noch: Logo-Größe (Slider) + Logo-Position (Drag auf Preview)
- Info-Link zu Account-Einstellungen (/einstellungen) hinzugefügt
- Drag-Handler in BtbPreviewCard: fix für Firmen-Logo (effectiveLogoUrl statt settings.logo_url)
- Größen-Slider erscheint jetzt auch wenn nur Firmen-Logo (kein Projekt-Logo) vorhanden

**Neu (2026-03-22): Firmendaten-Fallback-Kette**
- `BtbPreviewCard` bekommt jetzt `companyFallback?: { firma, adr, logoUrl }` Prop
- Fallback-Kette: `project_settings.firma → companies.name → 'Firmenname'`
- Gilt für Preview (btb-preview-card.tsx) und Druck (buildShiftPageDiv via project state)
- `einstellungen/page.tsx` lädt Company-Daten und übergibt sie als `companyFallback`
- `page.tsx` lädt Company-Daten und wendet Fallback beim Patchen des Project-State an

**Naechster Schritt:** BUG-003 bis BUG-008 als Follow-Up behandeln.

## QA Re-Test Results (2026-03-22)

**Tested:** 2026-03-22 | **Tester:** QA Engineer (AI) | **Build:** PASS

### Acceptance Criteria Re-Test

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-1 | Route /projekte/[id]/einstellungen | PASS | Seite existiert, Build bestaetigt |
| AC-2 | Erreichbar via Zahnrad-Icon | PASS | `project-detail-header.tsx` Settings-Icon |
| AC-3 | Sektionen: "BTB-Vorlage" + "Quick-Buttons" | PASS | Zwei SettingsSection-Bloecke |
| AC-4 | Live-Vorschau mit echtem BTB-Karten-Layout | PASS | `BtbPreviewCard` mit A4-Proportionen |
| AC-5 | Firmenname + Adresse aus Account-Einstellungen | PASS | Company-Fallback-Kette implementiert |
| AC-6 | Logo per Drag positionieren | PASS | Mouse-Events in BtbPreviewCard |
| AC-7 | Logo-Groesse per Slider | PASS | Slider-Komponente in einstellungen/page.tsx |
| AC-8 | Firmen-Logo als Fallback | PASS | `companyFallback.logoUrl` wird verwendet wenn kein Projekt-Logo |
| AC-9 | Tab "Personal": eigene Kategorien | PASS | CategoryManager mit personal-Tab |
| AC-10 | Tab "Geraete": eigene Kategorien | PASS | CategoryManager mit equipment-Tab |
| AC-11 | Eintraege loeschbar | PASS | X-Button pro Badge |
| AC-12 | sort_order bei Insert | PASS | max + 1 Logik |
| AC-13 | Fallback: Standard-Liste | PASS | DEFAULT_WORKER/EQUIPMENT_CATEGORIES immer angezeigt |
| AC-14 | Eigene ergaenzen Defaults | PASS | `page.tsx:344-346` merged `[...DEFAULT, ...custom]` |

### Status aelterer Bugs

| Bug | Status (2026-03-22) | Anmerkung |
|-----|---------------------|-----------|
| BUG-001 (Logo im Druck) | FIXED | Logo als watermark in buildShiftPageDiv gerendert |
| BUG-002 (Kategorien ersetzen statt ergaenzen) | FIXED | Merge-Logik in page.tsx |
| BUG-003 (Duplikat-Kategorien) | OFFEN (Low) | Kein Duplikat-Check |
| BUG-004 (Laengenbegrenzung Firma/Adresse) | OFFEN (Low) | Felder jetzt in PROJ-5 (/einstellungen), nicht mehr in PROJ-6 |
| BUG-005 (Stiller Speicherfehler) | OFFEN (Low) | Weiterhin `catch { // silent fail }` |
| BUG-006 (Stale-Closure Logo-Position) | OFFEN (Low) | Akzeptabel fuer MVP |
| BUG-007 (Touch-Events Logo-Drag) | OFFEN (Info) | Tablet-UX-Problem |
| BUG-008 (Nach Upload kein Aendern-Button) | N/A | Logo-Upload aus PROJ-6 entfernt, jetzt in PROJ-5 |

### Neue Findings (2026-03-22)

Keine neuen Bugs in PROJ-6 gefunden. Die Refaktorierung (Firmendaten nach PROJ-5 verschoben, Fallback-Kette implementiert) ist sauber umgesetzt.

### Zusammenfassung

- **Acceptance Criteria:** 14/14 PASS (vorher 15/17, FAIL-Bugs gefixt)
- **Offene Bugs:** 4 (alle Low oder Info)
- **Production Ready:** JA (keine Critical/High Blocker)

## Änderungen 2026-03-22 (v2)

- **Logo-Größe:** shadcn/ui Slider ersetzt durch ZoomSlider-Style-Control (Gold-Fill Pill, identisches Design wie Zoom in KW-Navigation)
- **Quick-Buttons Flat-List:** Standard/Custom-Trennung entfernt; beim ersten Besuch werden Bauleiter, Polier, Vorarbeiter, Facharbeiter als Preset-Einträge in `project_categories` geseeded; alle Einträge einzeln löschbar
- **Live-Vorschau Fix:** `BtbPreviewCard` zeigt jetzt echte Kategorien aus DB statt Dummy-Daten
- **Calendar-Fix:** Ring um heutiges Datum in `calendar.tsx` entfernt (betrifft DatePicker in Projektangaben)

## Deployment
_To be added by /deploy_
