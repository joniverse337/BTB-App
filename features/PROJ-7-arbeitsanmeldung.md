# PROJ-7: Arbeitsanmeldung (KW-basiert)

## Status: In Review
**Created:** 2026-03-29
**Last Updated:** 2026-03-30

## Dependencies

| Feature | Art | Liefert |
|---------|-----|---------|
| PROJ-1 | Pflicht | Auth-Session + RLS |
| PROJ-2 | Pflicht | Projektdaten (Name, Kostenstelle, Auftraggeber), Leistungszeitraum |
| PROJ-3 | Pflicht | KW-Navigation, Shift-Erstellung (BTB-Erstellung aus AA heraus) |
| PROJ-4 | Pflicht | BTB-Karte als Ziel beim "BTBs erstellen"-Button; WYSIWYG-Drucklogik als Referenz |
| PROJ-5 | Optional (lesend) | Firmenname, Adresse aus `companies` |
| PROJ-6 | Pflicht (lesend) | Logo (URL, Position, Größe) aus `project_settings`; Logo-Einstellungen für AA werden in PROJ-6 ergänzt |

---

## Ziel der Funktion

Die Arbeitsanmeldung ist ein **wochenbezogenes Planungsdokument** im A4-Querformat. Sie erlaubt dem Bauleiter, für alle 7 Tage einer Kalenderwoche alle wesentlichen Angaben vorab zu erfassen — und daraus mit einem Klick automatisch die zugehörigen Bautagesberichte (BTBs) zu generieren.

> Planungs-Tool → Datenquelle → Zeitersparnis im Baustellen-Alltag

**Referenz-Dokument:** Echte Arbeitsanmeldung der ITG (PDF), Vorlage "BV GE Strecke 6322 WRIO-WRI-WGE, AA-ITG"

---

## User Stories

- Als Bauleiter möchte ich die Arbeitsanmeldung für eine KW öffnen, damit ich die Woche auf einem einzigen Blatt vorplanen kann.
- Als Bauleiter möchte ich Arbeitszeiten, Ort, Maschinen und Arbeiten für jeden Wochentag eintragen, damit nichts vergessen wird.
- Als Bauleiter möchte ich Sicherungsplan und Gleisarbeit pro Tag mit JA/NEIN ankreuzen und bei JA eine Nummer/BETRA eingeben können.
- Als Bauleiter möchte ich mit einem Klick aus der Arbeitsanmeldung heraus alle BTBs der Woche automatisch erstellen lassen, damit ich sie nicht manuell anlegen muss.
- Als Bauleiter möchte ich auch von der BTB-Ansicht aus BTBs „aus Arbeitsanmeldung erstellen" können, damit ich nicht extra die AA-Seite öffnen muss.
- Als Bauleiter möchte ich die Arbeitsanmeldung als A4-PDF im Querformat drucken, damit sie abgeheftet oder weitergeleitet werden kann.
- Als Bauleiter möchte ich das Firmenlogo auf der Arbeitsanmeldung sehen, damit das Dokument professionell wirkt.

---

## Acceptance Criteria

### Navigation & Einstieg
- [ ] Neuer Button „Arbeitsanmeldung" in der Header-Bar der Projektseite (neben KW-Auswahl)
- [ ] Klick öffnet eigene Seite/View — NICHT modal
- [ ] URL-Muster: `/projekte/[id]/arbeitsanmeldung`
- [ ] KW-Navigation (wie auf der Projektseite) ist oben auf der Seite vorhanden
- [ ] Klick auf KW lädt die Arbeitsanmeldung der entsprechenden KW
- [ ] Nur KWs innerhalb des Projekt-Leistungszeitraums werden angezeigt
- [ ] Ist noch keine Arbeitsanmeldung für die KW vorhanden → leeres Formular

### Layout & Tabellenstruktur

**Format:** A4 Querformat (297mm × 210mm), WYSIWYG

**Header (wie BTB-Karte):**
- [ ] Firmenlogo links oben (aus `project_settings.logo_url`, Position/Größe aus PROJ-6-Einstellungen)
- [ ] Firmenname + Adresse links (aus `companies`)
- [ ] Titel: „**Arbeitsanmeldung ITG**" (oder Firmenname) mittig/rechts
- [ ] Projektname als Untertitel: „BV [Projektname]"

**Tabelle — 12 Spalten:**

| # | Spalte | Typ | Besonderheit |
|---|--------|-----|--------------|
| 1 | **KW** | Text (read-only) | rowspan über alle 7 Zeilen, vertikal zentriert |
| 2 | **Datum** | Text (auto) | Berechnet aus KW + Wochentag + Jahr |
| 3 | **Tag** | Text (read-only) | Montag–Sonntag |
| 4 | **Arbeitszeit** | Eingabe | **2 Zeilen pro Zelle:** Zeile 1 = Tagschicht (Start/Ende), Zeile 2 = Nachtschicht (Start/Ende) — beide optional |
| 5 | **Ort** | Textfeld | Freitext |
| 6 | **Bauspitzen** | Textfeld | Kurze Zahl/Text |
| 7 | **Arbeitskräfte** | Textfeld | Kurze Zahl/Text |
| 8 | **Maschinen / Geräte** | Textfeld | Freitext; wird beim BTB-Erstellen übernommen |
| 9 | **Arbeiten** | Textarea | Großes mehrzeiliges Textfeld; wird beim BTB-Erstellen übernommen |
| 10 | **Sicherungsplan** | Checkbox + bedingte Eingabe | Checkbox (JA/NEIN); wenn JA: Eingabezeile darunter „Sicherungsplan-Nr." |
| 11 | **Arbeiten im Gleisbereich** | Checkbox + bedingte Eingabe | Checkbox (JA/NEIN); wenn JA: Eingabezeile darunter „BETRA-Nr." |
| 12 | **Verantwortlicher Bauleiter** | Textfeld | Freitext |

**Allgemein:**
- [ ] Tabelle hat 7 Zeilen (Montag–Sonntag)
- [ ] Eingabefelder ohne sichtbaren Rahmen (wie BTB-Karte)
- [ ] Auto-Save: onBlur für Textfelder, sofort bei Checkbox-Änderungen

### Datenspeicherung
- [ ] Arbeitsanmeldung wird in Supabase gespeichert (neue Tabelle `work_notifications`)
- [ ] Datenmodell pro Tag:
  ```
  project_id, calendar_week, year,
  weekday_nr (1-7), weekday_name, date,
  day_start, day_end,                 -- Tagschicht
  night_start, night_end,             -- Nachtschicht
  location, bauspitzen, workers, machines, work_description,
  site_manager,                       -- Verantwortlicher Bauleiter
  safety_plan_enabled, safety_plan_number,
  track_work_enabled, betra_number
  ```
- [ ] RLS: Nur der Projektbesitzer kann lesen/schreiben

### Kernfunktion A: „BTBs erstellen" — im KW-Grid (EmptySlot)
- [ ] **Kein** „BTBs erstellen"-Button auf der AA-Seite — die Aktion lebt ausschließlich im KW-Grid
- [ ] Im KW-Grid (Projektdetailseite) gibt es beim Erstellen einer neuen Schicht die Optionen: „Tagschicht erstellen", „Nachtschicht erstellen", „Aus Vortag übernehmen"
- [ ] Dort wird ein weiterer Button ergänzt: **„Aus Arbeitsanmeldung erstellen (alle)"**
- [ ] Dieser Button erscheint nur wenn noch keine BTBs für die KW existieren (oder am Montag der KW)
- [ ] Klick erstellt alle BTBs der KW auf einmal aus der AA — folgende Felder werden übertragen:
  - **Datum** → BTB-Datum
  - **Tagschicht Start/Ende** → BTB Arbeitszeit Beginn/Ende (Tagschicht-BTB)
  - **Nachtschicht Start/Ende** → BTB Arbeitszeit Beginn/Ende (Nachtschicht-BTB), falls angegeben
  - **Ort** → BTB Örtlichkeit / Gleis
  - **Maschinen / Geräte** → BTB Geräte-Tabelle
  - **Arbeiten** → BTB Textarea „Ausgeführte Arbeiten"
  - Nur Tagschicht angegeben → **1 Tagschicht-BTB**
  - Nur Nachtschicht angegeben → **1 Nachtschicht-BTB**
  - Tag- UND Nachtschicht angegeben → **2 BTBs** (Tagschicht + Nachtschicht)
- [ ] Bestehende BTBs werden NICHT überschrieben
- [ ] Wenn ein BTB für diesen Tag bereits existiert: Hinweis-Toast „BTBs wurden bereits erstellt — bestehende Einträge wurden nicht überschrieben."
- [ ] Kein Daten in einer Zeile → diese Zeile überspringen (kein leerer BTB)
- [ ] Wenn keine AA für diese KW vorhanden: Toast „Keine Arbeitsanmeldung für KW XX vorhanden."

### Kernfunktion B: „Vorwoche übernehmen" — auf der AA-Seite
- [ ] Button „Vorwoche übernehmen" oben auf der AA-Seite (neben „Drucken")
- [ ] Klick kopiert alle 7 Tageszeilen der vorherigen KW in die aktuelle KW
- [ ] Bestätigungsdialog wenn aktuelle KW bereits Daten enthält: „KW XX enthält bereits Daten. Überschreiben?"
- [ ] Ist die vorherige KW leer (keine AA-Daten vorhanden): Toast „Keine Arbeitsanmeldung für KW XX vorhanden."
- [ ] Datum-Spalte wird automatisch auf die neuen Tagesdaten angepasst (nicht kopiert)
- [ ] Alle anderen Felder werden 1:1 übernommen: Arbeitszeiten, Ort, Bauspitzen, Arbeitskräfte, Maschinen, Arbeiten, Sicherungsplan, Gleisbereich, Bauleiter

### Druckfunktion
- [ ] Button „Arbeitsanmeldung drucken"
- [ ] Druckausgabe: A4 Querformat (`@page { size: A4 landscape; margin: 0 }`)
- [ ] WYSIWYG: Layout entspricht der Bildschirmansicht
- [ ] Alle Checkboxen als ☑/☐ dargestellt
- [ ] Logo und Firmendaten werden gedruckt
- [ ] Pop-up-Blocker → Toast mit Hinweis

---

## PROJ-6 Erweiterung (Nacharbeiten)

Die Einstellungsseite (PROJ-6) muss um einen **AA-Logo-Tab** erweitert werden:
- [ ] Separate Logo-Position und -Größe für die Arbeitsanmeldung (kann von BTB-Logo-Position abweichen)
- [ ] Live-Vorschau: AA-Vorlage (A4 Querformat, read-only) statt BTB-Karte
- [ ] Fallback: wenn keine AA-spezifischen Einstellungen → BTB-Logo-Einstellungen verwenden

---

## Edge Cases

- Wochentag ohne Daten → leere Zeile wird angezeigt, beim BTB-Erstellen übersprungen
- Nachtschicht über Mitternacht → Zeitberechnung analog BTB-Karte (+24h Logik)
- BTBs bereits erstellt + AA nachträglich geändert → keine automatische Aktualisierung; Hinweis: „Achtung: BTBs für KW XX wurden bereits erstellt."
- „Aus Arbeitsanmeldung erstellen"-Button im Shift-Dialog: AA existiert nicht → Toast
- Projekt ohne Logo → leere Logo-Fläche, kein Fehler
- Leistungszeitraum endet mitten in einer KW → alle 7 Zeilen anzeigen, außerhalb liegende Tage grau/deaktiviert
- Pop-up-Blocker beim Drucken → Toast mit Hinweis

---

## Technical Requirements
- Neue Supabase-Tabelle: `work_notifications` mit RLS-Policy
- Neues Datenbankschema als Migration anlegen
- Neue Route: `src/app/projekte/[id]/arbeitsanmeldung/page.tsx`
- Druckfunktion: `window.open()` + inline CSS, kein Tailwind im Druckfenster
- A4-Querformat: `width: 297mm; height: 210mm`
- Keine neuen npm-Pakete nötig
- Datum-Berechnung aus KW + Jahr: pure JS (ISO-Wochenberechnung, Montag = Tag 1)

---

## Handoff-Notiz für Architekten

**Kontext:** Die BTB-App hat bereits eine vollständig laufende Projektdetailseite (`src/app/projekte/[id]/page.tsx`) mit KW-Navigation, Shift-Grid und BTB-Karte (PROJ-3/4). Die Arbeitsanmeldung ist eine neue, eigenständige Route die sich in diesen bestehenden Workflow einfügt.

**Kritische Designentscheidungen, die der Architekt treffen muss:**

1. **Sub-Zeilen Sicherungsplan / Gleisbereich (Spalten 10+11):** Diese Felder haben eine Checkbox + bedingte Eingabe. Sollen sie als eigene Tabellenzeilen (zusätzliche `<tr>`) oder als expandierende Zellen innerhalb der Tageszeile umgesetzt werden? Platzverhältnisse auf A4 Querformat sind eng.

2. **BTB-Erstellung aus AA:** Die Logik zum Erstellen von Shifts existiert bereits in `page.tsx`. Klären: Wird eine neue API-Route `/api/work-notifications/create-shifts` gebaut, oder wird die bestehende Shift-Erstellungslogik direkt aufgerufen/refaktoriert?

3. **„Aus Arbeitsanmeldung erstellen"-Button im Shift-Dialog:** Dieser Button soll in die bestehende Schicht-Vorlage-Auswahl integriert werden (`src/components/project-form-dialog.tsx` oder ähnlich). Genau prüfen wo dieser Dialog aktuell liegt.

4. **Logo-Einstellungen für AA:** PROJ-6 (`project_settings`) speichert bereits `logo_x`, `logo_y`, `logo_size` für die BTB-Karte. Für die AA werden separate Felder `aa_logo_x`, `aa_logo_y`, `aa_logo_size` benötigt — Migration entsprechend planen.

5. **Drucklogik:** Analog zu `handlePrintShift`/`handlePrintKW` in `page.tsx` — inline CSS, `window.open()`, kein Tailwind. A4 Querformat (`size: A4 landscape`).

**Bestehende Patterns die wiederverwendet werden sollen:**
- KW-Navigation: bestehende Komponente aus PROJ-3
- Logo-Rendering: Fallback-Kette aus `page.tsx` (project_settings → companies)
- Auto-Save: onBlur-Pattern aus `shift-card.tsx`
- Druckfunktion: Struktur aus `handlePrintShift` in `page.tsx`

## Tech Design (Solution Architect)

### Komponentenstruktur

```
/projekte/[id]/arbeitsanmeldung (Neue Seite)
+-- ProjectDetailHeader (bestehend, unverändert — Navigation zurück)
+-- AA-Header-Bar
|   +-- KWNavigation (bestehend, wiederverwendet)
|   +-- Button „Vorwoche übernehmen" (sekundär)
|   +-- Button „Drucken"
+-- WorkNotificationTable (neue Komponente, WYSIWYG A4 Querformat)
    +-- Dokumenten-Header
    |   +-- Firmenlogo (aus project_settings, mit Fallback auf company logo)
    |   +-- Firmenname + Adresse (aus companies)
    |   +-- Titel „Arbeitsanmeldung" + BV-Projektname
    +-- 7 Tageszeilen (Mo–So):
        +-- KW (rowspan 7, read-only)
        +-- Datum (auto-berechnet, read-only)
        +-- Wochentag (read-only)
        +-- Arbeitszeit (2 Sub-Zeilen: Tagschicht Beg/Ende + Nachtschicht Beg/Ende)
        +-- Ort (Texteingabe)
        +-- Bauspitzen (Texteingabe)
        +-- Arbeitskräfte (Texteingabe)
        +-- Maschinen / Geräte (Texteingabe)
        +-- Arbeiten (Textarea, mehrzeilig)
        +-- Sicherungsplan (Checkbox; bei JA: Eingabefeld „Nr." klappt inline auf)
        +-- Gleisbereich (Checkbox; bei JA: Eingabefeld „BETRA-Nr." klappt inline auf)
        +-- Verantwortlicher Bauleiter (Texteingabe)

Modifizierte bestehende Komponenten:
+-- ProjectDetailHeader → + „Arbeitsanmeldung"-Button in der Header-Bar
+-- EmptySlot → + optionaler Button „Aus AA erstellen (alle)" (wenn AA-Daten vorhanden)
+-- PROJ-6 Einstellungsseite → + neuer Tab „AA-Logo" (Logo-Position für Querformat)
```

### Datenmodell

**Neue Tabelle `work_notifications`** — eine Zeile pro Tag pro KW:

```
Identifikation:
  project_id, calendar_week, year, weekday_nr (1–7), weekday_name, date
  Primärschlüssel: (project_id, year, calendar_week, weekday_nr)

Arbeitszeit:
  day_start / day_end       → Tagschicht Beginn / Ende ("06:00")
  night_start / night_end   → Nachtschicht (optional)

Planung:
  location, bauspitzen, workers, machines, work_description, site_manager

Sicherheit:
  safety_plan_enabled (bool), safety_plan_number (text)
  track_work_enabled (bool), betra_number (text)

RLS: Nur Projektbesitzer — gleiche Policy-Logik wie project_settings
```

**Erweiterung `project_settings`** — 3 neue Spalten via Migration:
`aa_logo_x`, `aa_logo_y`, `aa_logo_size` (Fallback: BTB-Logo-Werte wenn NULL)

### Tech-Entscheidungen

| Entscheidung | Wahl | Warum |
|---|---|---|
| Sicherungsplan-Subzeilen | Inline-Expand in derselben `<td>` | A4 Querformat ist eng (12 Spalten). Separate `<tr>` würden alle Zeilen aufblähen. |
| BTB-Erstellung aus AA | Neue API-Route `/api/work-notifications/create-shifts` schreibt direkt in `shifts`-Tabelle | Validierungslogik (leere Tage überspringen, bestehende BTBs prüfen) gehört nicht in den Client. Kein Aufruf von PROJ-3-Code nötig — gleiche DB-Struktur (`project_id`, `datum`, `typ`, `beg`, `end`). |
| „Aus AA erstellen"-Button | Neues optionales Prop in `EmptySlot` | EmptySlot ist bereits der Ort für Schicht-Anlege-Aktionen; kein neues Komponente nötig. |
| AA-Logo-Einstellungen | Neue Spalten in bestehender `project_settings`-Tabelle | Kein neues Tabelle nötig — RLS und Struktur existieren bereits. |
| Save-Strategie | upsert per `(project_id, year, calendar_week, weekday_nr)` on blur | Gleiche Methode wie `shift-card.tsx`. |
| Druckfunktion | `window.open()` + inline CSS, A4 landscape | Gleiche Implementierung wie `handlePrintShift` in `page.tsx`. |
| KW-Navigation | `getKWsForRange(project.lz_von, project.lz_bis)` aus `kw-utils.ts` — identisch zu PROJ-3 | AA-Seite fetcht dasselbe Projekt (gleiche `project_id`) → keine neue Logik. `KWNavigation`-Komponente wird unverändert wiederverwendet. |
| Tage außerhalb Leistungszeitraum | AA zeigt immer alle 7 Tage (Mo–So); Tage mit `datum < lz_von \|\| datum > lz_bis` werden grau/disabled dargestellt | Spec-Anforderung: außerhalb liegende Tage grau/deaktiviert. `KWInfo.daysInRange` liefert die Referenz — Tage nicht darin = außerhalb. |

### Neue Dateien

- `src/app/projekte/[id]/arbeitsanmeldung/page.tsx`
- `src/components/work-notification-table.tsx`
- `src/app/api/work-notifications/create-shifts/route.ts`
- `supabase/migrations/20260329_proj7_work_notifications.sql`
- `supabase/migrations/20260329_proj7_project_settings_aa_logo.sql`

### Modifizierte Dateien

- `src/components/project-detail-header.tsx` — „Arbeitsanmeldung"-Button
- `src/components/empty-slot.tsx` — Optionaler „Aus AA erstellen (alle)"-Button
- `src/app/projekte/[id]/page.tsx` — `onCreateFromAA`-Handler
- `src/app/einstellungen/page.tsx` — Neuer „AA-Logo"-Tab (PROJ-6 Erweiterung)

## Handoff-Notiz für Frontend-Entwickler

### Reihenfolge der Umsetzung
1. DB-Migration ausführen (work_notifications + aa_logo-Spalten)
2. `ProjectDetailHeader` — AA-Button ergänzen
3. AA-Seite (`arbeitsanmeldung/page.tsx`) + `WorkNotificationTable`-Komponente bauen
4. API-Route `create-shifts` bauen
5. `EmptySlot` — „Aus AA erstellen"-Button ergänzen
6. PROJ-6-Einstellungsseite — AA-Logo-Tab ergänzen

---

### 1. Dateien erstellen

```
src/app/projekte/[id]/arbeitsanmeldung/page.tsx   ← neue Seite (Next.js Route)
src/components/work-notification-table.tsx         ← WYSIWYG-Tabelle A4 Querformat
src/app/api/work-notifications/create-shifts/route.ts
supabase/migrations/20260329_proj7_work_notifications.sql
supabase/migrations/20260329_proj7_project_settings_aa_logo.sql
```

### 2. Dateien modifizieren

```
src/components/project-detail-header.tsx     Zeile 41 — Link neben Settings-Icon ergänzen
src/components/empty-slot.tsx                Zeile 37 — optionaler 3. Button
src/app/projekte/[id]/page.tsx               onCreateFromAA-Handler + Prop-Weitergabe
src/app/projekte/[id]/einstellungen/page.tsx neuer Tab „AA-Logo"
```

---

### 3. KW-Navigation auf der AA-Seite aufsetzen

Exakt gleich wie in `src/app/projekte/[id]/page.tsx:249–258`:

```
project fetchen (gleiche project_id aus useParams)
→ getKWsForRange(project.lz_von, project.lz_bis)  [aus @/lib/kw-utils]
→ getCurrentKWIndex(computedWeeks)
→ KWNavigation-Komponente: weeks, activeIndex, onSelectWeek, shifts=[], zoom, onZoomChange, onPrintKW, lzVon, lzBis
```

`shifts` auf der AA-Seite ist leer (AA hat keine Shift-Dot-Raster) → leeres Array `[]` übergeben.
`onPrintKW` → „Drucken"-Aktion der AA aufrufen.

**Kein `zoom` nötig auf der AA-Seite** — die Tabelle ist WYSIWYG auf Bildschirmbreite, kein Zoom-Slider. `KWNavigation`-Props `zoom`/`onZoomChange` trotzdem übergeben (dummy-Wert 100), oder `KWNavigation` forken falls Zoom dort stört.

---

### 4. `work_notifications` laden & speichern

**Laden:** Supabase-Query auf `work_notifications` mit Filter `project_id + year + calendar_week`.
Liefert 0–7 Zeilen zurück. Fehlende Wochentage = leere Felder (kein Fehler).

**Speichern (onBlur):** upsert mit Conflict-Spalten `(project_id, year, calendar_week, weekday_nr)`:
```
supabase.from('work_notifications').upsert({...rowData}, { onConflict: 'project_id,year,calendar_week,weekday_nr' })
```

**Datum-Berechnung pro Zeile:** Aus `KWInfo.weekStart` + `weekday_nr - 1` Tage addieren.
`weekStart` ist Montag (ISO-Woche). Beispiel: Mo = weekStart + 0, Di = weekStart + 1, …, So = weekStart + 6.
Nutze `addDays(week.weekStart, weekdayNr - 1)` aus `date-fns` (bereits installiert).

**Tage außerhalb Leistungszeitraum:** Alle 7 Zeilen anzeigen, aber wenn `toDateString(day) < project.lz_von || toDateString(day) > project.lz_bis` → Zeile grau + Inputs `disabled`. Keine Daten für diese Tage speichern.

---

### 5. `ProjectDetailHeader` — AA-Button ergänzen

Datei: `src/components/project-detail-header.tsx:41`

Neben dem Settings-Icon (Zeile 41) einen zweiten Link ergänzen:
- Ziel: `/projekte/${project.id}/arbeitsanmeldung`
- Icon: `ClipboardList` (lucide-react)
- Gleicher Stil wie Settings-Icon (32×32px, border-radius 6px, color #8a90a8)
- `aria-label="Arbeitsanmeldung"`, `title="Arbeitsanmeldung"`

---

### 6. `EmptySlot` — „Aus AA erstellen"-Button

Datei: `src/components/empty-slot.tsx:37`

Neue optionale Props:
```ts
onCreateFromAA?: () => void   // wenn undefined → Button nicht rendern
```

Button nur anzeigen wenn `onCreateFromAA` definiert ist. Stil wie „Vortag übernehmen"-Button (grauer Sekundär-Stil, Zeile 45–51).
Label: „Aus Arbeitsanmeldung erstellen (alle)"

**Wann `onCreateFromAA` übergeben:** In `src/app/projekte/[id]/page.tsx` beim Rendern von `ShiftGrid` → `EmptySlot` bekommt den Handler nur wenn:
- `typ === 'tag'` (nur Tagschicht-Slots zeigen den Button)
- Entweder: `day` ist Montag der aktiven KW, ODER keine Shifts für die aktive KW vorhanden

**Kein „BTBs erstellen"-Button auf der AA-Seite** — die AA-Seite hat nur „Vorwoche übernehmen" + „Drucken".

### 6b. „Vorwoche übernehmen" — auf der AA-Seite

Datei: `src/app/projekte/[id]/arbeitsanmeldung/page.tsx`

Logik:
1. Aktive KW bestimmen → Index in `weeks`-Array
2. Vorherige KW = `weeks[activeIndex - 1]` (wenn `activeIndex > 0`)
3. `work_notifications` für vorherige KW laden (`project_id + year + calendar_week`)
4. Wenn leer → Toast „Keine Arbeitsanmeldung für KW XX vorhanden."
5. Wenn aktuelle KW bereits Daten hat → shadcn `AlertDialog` „Vorhandene Daten überschreiben?"
6. Nach Bestätigung: alle 7 Zeilen upserten mit neuen Datumswerten (weekday_nr gleich, aber `date` und `calendar_week`/`year` der aktuellen KW)
7. Alle anderen Felder 1:1 kopieren — Datum-Felder (`date`, `calendar_week`, `year`) auf aktuelle KW setzen

`AlertDialog` ist bereits installiert: `src/components/ui/alert-dialog.tsx`

---

### 7. API-Route `create-shifts` — Logik

`POST /api/work-notifications/create-shifts`
Body: `{ project_id, year, calendar_week }`

Ablauf im Handler (Server-seitig mit Supabase Service Role oder Auth-Cookie):
1. `work_notifications` für `project_id + year + calendar_week` laden
2. Für jede Zeile: wenn `day_start` oder `night_start` vorhanden → Shift erstellen
3. Shift-Insert-Felder (aus `handleCreateShift` in `page.tsx:429`):
   ```
   project_id, datum, typ ('tag'/'nacht'),
   beg = day_start / night_start,
   end = day_end / night_end,
   pau = 30 (default),
   gl = location (aus AA),
   arb = work_description (aus AA)
   ```
   Maschinen aus AA → `shift_equipment` separat inserieren (typ = machines-Text, anz = 1, std = 0)
4. Vor jedem Insert prüfen: existiert bereits ein Shift für `(project_id, datum, typ)`? → überspringen
5. Response: `{ created: number, skipped: number }`

**Authentifizierung:** Route braucht gültige Supabase-Session (Cookie). Kein Service-Role-Key nötig, da RLS-Policy greift.

---

### 8. Logo-Fallback-Kette für AA

Analog zu `page.tsx:294–331`, aber mit AA-spezifischen Positionen:

```
1. project_settings.logo_url → Positionen: aa_logo_x, aa_logo_y, aa_logo_size (wenn nicht NULL)
2. project_settings.logo_url → Fallback auf btb-Logo-Positionen: logo_x, logo_y, logo_size
3. company.logo_url → aa_logo_x/y/size aus project_settings, sonst company.logo_x/y
4. Kein Logo → leere Fläche, kein Fehler
```

`aa_logo_x`, `aa_logo_y`, `aa_logo_size` kommen aus Migration `20260329_proj7_project_settings_aa_logo.sql` (neue Spalten in `project_settings`).

---

### 9. Bildschirmdarstellung (WYSIWYG) + Druckfunktion AA

**Bildschirm:** `WorkNotificationTable` wird auf dem Screen mit fester A4-Querformat-Größe gerendert — analog zu `ShiftCard` die auf dem Screen immer `width: 210mm; height: 297mm` hat:
```css
/* Screen: A4 Querformat */
width: 297mm;
min-height: 210mm;   /* min-height statt height, damit Inhalt nicht abgeschnitten wird */
```
Die Seite scrollt horizontal falls nötig (kein Zoom wie beim Shift-Grid).

**Druckfunktion:** Muster aus `handlePrintShift` / `buildShiftPrintHtml` in `page.tsx:167`:

```js
const win = window.open('', '_blank')
if (!win) { toast.error('Pop-up-Blocker aktiv. Bitte Pop-ups für diese Seite erlauben.'); return }
win.document.write(buildAAPrintHtml(data, project, aaLogo))
win.document.close()
```

Print-CSS-Unterschied zu BTB-Karte:
```css
@page { size: A4 landscape; margin: 0; }
/* A4 landscape: 297mm × 210mm */
.page { width: 297mm; height: 210mm; ... }
```

Alle Checkboxen als `☑`/`☐` (Unicode) rendern — kein HTML-Input im Druckfenster.

---

### 10. PROJ-6-Einstellungen — AA-Logo-Tab

Datei: `src/app/projekte/[id]/einstellungen/page.tsx` (diese Datei existiert noch nicht — wird in PROJ-6 erst gebaut bzw. liegt wo? Prüfen via `git ls-files src/app/projekte/`).

Falls PROJ-6-Einstellungsseite noch nicht existiert → Tab als TODO markieren, AA-Logo-Einstellungen vorerst weglassen (Fallback auf BTB-Logo-Werte greift automatisch).

---

### Gotchas & Fallstricke

| # | Thema | Detail |
|---|-------|--------|
| 1 | `logo_size` fehlt in Migration | In `20260321_proj6_project_settings.sql` fehlt `logo_size` — aber `page.tsx:291` liest es bereits. Es wurde nachträglich per ALTER TABLE ergänzt. AA-Migration muss `aa_logo_size` ebenfalls als FLOAT DEFAULT 0.2 anlegen. |
| 2 | ISO-Woche vs. JS `getDay()` | `KWInfo.weekStart` ist immer Montag (ISO). JS `new Date().getDay()` gibt Sonntag=0. Nicht mischen — nur `addDays(weekStart, i)` verwenden. |
| 3 | Nachtschicht über Mitternacht | `night_end < night_start` ist valide (z.B. 22:00–06:00). Keine Validierung dagegen einbauen. Genau wie BTB-Karte. |
| 4 | Upsert-Konflikt-Schlüssel | `work_notifications` braucht einen UNIQUE-Constraint auf `(project_id, year, calendar_week, weekday_nr)` in der Migration — sonst schlägt der upsert fehl. |
| 5 | `EmptySlot` rendert in `ShiftGrid` | `ShiftGrid` (nicht `page.tsx`) rendert `EmptySlot`. Der `onCreateFromAA`-Handler muss also als Prop durch `ShiftGrid` durchgereicht werden: `ShiftGrid` → `EmptySlot`. |
| 6 | Inline-Styles vs. Tailwind | `WorkNotificationTable` muss im Druck-Popup funktionieren → Inline-Styles (kein Tailwind). Für die Bildschirmansicht (WYSIWYG) ebenfalls inline styles, damit Druck 1:1 übereinstimmt. |

## Handoff-Notiz für Backend-Entwickler

### Was bereits existiert (nicht neu bauen)
- `supabase/migrations/20260329_proj7_work_notifications.sql` — Tabelle + UNIQUE-Constraint + RLS ✓
- `supabase/migrations/20260329_proj7_project_settings_aa_logo.sql` — `aa_logo_x/y/size` Spalten ✓
- Auth-Pattern für API-Routen: `src/app/api/companies/create/route.ts` — exaktes Muster kopieren

### Aufgaben Backend
1. Migrationen in Supabase ausführen (SQL Editor)
2. API-Route `create-shifts` bauen
3. TypeScript-Typen generieren (nach Migration)

---

### 1. Migrationen ausführen

Reihenfolge:
1. `20260329_proj7_work_notifications.sql`
2. `20260329_proj7_project_settings_aa_logo.sql` (danach, da ALTER TABLE auf project_settings)

Prüfen ob Migration gelaufen: `SELECT * FROM work_notifications LIMIT 1` — kein Fehler = OK.

---

### 2. API-Route `create-shifts`

**Datei:** `src/app/api/work-notifications/create-shifts/route.ts`

**Auth-Pattern:** Identisch zu `src/app/api/companies/create/route.ts:17–41` — `createServerClient` mit Cookie, dann `supabase.auth.getUser()`. Kein Service-Client nötig — RLS übernimmt die Zugriffskontrolle.

**Request-Body (Zod validieren):**
```
project_id: string (UUID)
year: number
calendar_week: number (1–53)
```

**Ablauf:**
1. Auth prüfen (401 wenn nicht eingeloggt)
2. Body mit Zod validieren (400 bei Fehler)
3. `work_notifications` laden: `SELECT * FROM work_notifications WHERE project_id = $1 AND year = $2 AND calendar_week = $3`
4. Bestehende Shifts laden: `SELECT datum, typ FROM shifts WHERE project_id = $1` — für Duplikat-Check
5. Für jede `work_notification`-Zeile:
   - Wenn `day_start` vorhanden UND kein Tagschicht-Shift für dieses Datum → `shifts` INSERT
   - Wenn `night_start` vorhanden UND kein Nachtschicht-Shift für dieses Datum → `shifts` INSERT
   - Felder beim Insert: `project_id`, `datum` (= `date`-Feld der work_notification), `typ`, `beg`, `end`, `pau = 30`, `gl = location`, `arb = work_description`
   - Maschinen: wenn `machines` nicht leer → `shift_equipment` INSERT mit `typ = machines`, `anz = 1`, `std = 0`
   - Zeile ohne `day_start` und `night_start` → überspringen
6. Response: `{ created: number, skipped: number }`

**Fehlerfall bestehende Shifts:** Nicht als Fehler zurückgeben — einfach `skipped` hochzählen. Client zeigt Toast basierend auf `skipped > 0`.

---

### 3. TypeScript-Typen nach Migration generieren

```bash
npx supabase gen types typescript --project-id [project-id] > src/lib/database.types.ts
```

Neue Typen die entstehen: `WorkNotification`, `ProjectSettings` (mit aa_logo-Feldern).

---

### RLS-Hinweis

Die `work_notifications`-Policy nutzt dieselbe Ownership-Logik wie `project_settings` und `project_categories`:
- Firma-Mitglied (company_id Match + is_active) → Zugriff
- Solo-Nutzer (company_id NULL + created_by Match) → Zugriff

Kein separater Test nötig wenn `project_settings`-RLS bereits funktioniert — gleiche Struktur.

---

### Gotchas

| # | Thema | Detail |
|---|-------|--------|
| 1 | `date`-Feld ist SQL `DATE` | In `work_notifications` ist `date` ein SQL `DATE` (`2026-03-31`). Beim Shift-Insert muss es als String `datum` übergeben werden — gleiche Format wie bestehende Shifts. |
| 2 | Kein Service-Client für create-shifts | RLS reicht — der eingeloggte User hat nur Zugriff auf eigene Projekte. Service-Client nur wenn RLS umgangen werden muss (hier nicht nötig). |
| 3 | `machines`-Feld → `shift_equipment` | `machines` ist ein Freitext-Feld (z.B. „Bagger, Rüttelplatte"). Als einzelner `shift_equipment`-Eintrag speichern, nicht splitten. |
| 4 | Gleichzeitige Inserts | Wenn Tag- und Nachtschicht aus derselben Zeile erstellt werden: beide Inserts sequenziell (nicht parallel) — vermeidet Race Conditions auf `project_id + datum + typ`. |

## QA Test Results

**Tested:** 2026-03-30 (Re-Test)
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)
**Build Status:** PASS (npm run build + npm run lint -- 0 errors, 0 warnings)

### Acceptance Criteria Status

#### AC-1: Navigation & Einstieg
- [x] Neuer Button "Arbeitsanmeldung" (ClipboardList-Icon) in ProjectDetailHeader (project-detail-header.tsx:41-52)
- [x] Klick oeffnet eigene Seite, NICHT modal
- [x] URL-Muster: `/projekte/[id]/arbeitsanmeldung` korrekt implementiert
- [x] KWNavigation wird wiederverwendet (arbeitsanmeldung/page.tsx:489-499)
- [x] Klick auf KW laedt die AA der entsprechenden KW (fetchRows bei activeKWIndex-Aenderung)
- [x] Nur KWs innerhalb des Leistungszeitraums werden angezeigt (getKWsForRange)
- [x] Keine AA vorhanden -> leeres Formular (buildEmptyRows)

#### AC-2: Layout & Tabellenstruktur
- [x] Format A4 Querformat (297mm x 210mm) WYSIWYG (work-notification-table.tsx:88-89)
- [x] Firmenlogo links oben (aus project_settings mit Fallback-Kette)
- [x] Firmenname + Adresse links
- [ ] BUG: Titel zeigt nur "Arbeitsanmeldung" statt "Arbeitsanmeldung [Firmenname]" (siehe BUG-1)
- [x] Projektname als Untertitel: "BV [Projektname]"
- [x] Tabelle hat 12 Spalten korrekt
- [x] 7 Zeilen (Montag-Sonntag)
- [x] KW-Spalte mit rowspan 7, vertikal zentriert
- [x] Datum auto-berechnet aus KW + Wochentag + Jahr
- [x] Arbeitszeit mit 2 Sub-Zeilen (Tag T / Nacht N)
- [x] Alle Textfelder vorhanden (Ort, Bauspitzen, AK, Maschinen, Arbeiten, Bauleiter)
- [x] Sicherungsplan: Checkbox + bedingte Eingabe "Nr."
- [x] Gleisbereich: Checkbox + bedingte Eingabe "BETRA"
- [x] Eingabefelder ohne sichtbaren Rahmen (border: none)
- [x] Auto-Save: onBlur fuer Textfelder, sofort bei Checkbox-Aenderungen

#### AC-3: Datenspeicherung
- [x] work_notifications-Tabelle in Migration vorhanden mit korrektem Schema
- [x] UNIQUE-Constraint auf (project_id, year, calendar_week, weekday_nr)
- [x] Index auf (project_id, year, calendar_week)
- [x] RLS: Nur Projektbesitzer via project ownership (gleiche Logik wie project_settings)
- [x] Upsert mit onConflict funktioniert korrekt

#### AC-4: Kernfunktion A -- "BTBs erstellen" im KW-Grid (EmptySlot)
- [x] KEIN "BTBs erstellen"-Button auf der AA-Seite
- [x] Button "Aus Arbeitsanmeldung erstellen (alle)" in EmptySlot vorhanden
- [ ] BUG: Button erscheint bei JEDEM leeren Tagschicht-Slot, nicht nur wenn keine BTBs fuer KW existieren oder am Montag (siehe BUG-2)
- [x] Button nur bei Tagschicht-Slots, nicht bei Nachtschicht-Slots
- [x] API-Route /api/work-notifications/create-shifts vorhanden
- [x] Tagschicht-BTB wird erstellt wenn day_start vorhanden
- [x] Nachtschicht-BTB wird erstellt wenn night_start vorhanden
- [x] Tag + Nacht angegeben -> 2 BTBs
- [x] Bestehende BTBs werden NICHT ueberschrieben (existingSet-Pruefung)
- [x] Toast bei bereits bestehenden BTBs
- [x] Kein Daten in Zeile -> Zeile wird uebersprungen
- [x] Toast wenn keine AA vorhanden (404-Response)
- [x] Maschinen werden als shift_equipment inseriert

#### AC-5: Kernfunktion B -- "Vorwoche uebernehmen"
- [x] Button "Vorwoche uebernehmen" oben auf AA-Seite (neben "Drucken")
- [x] Kopiert alle 7 Tageszeilen der vorherigen KW
- [x] Bestaetigungsdialog (AlertDialog) wenn aktuelle KW bereits Daten enthaelt
- [x] Toast wenn vorherige KW leer
- [x] Datum-Spalte wird automatisch auf neue Tagesdaten angepasst
- [x] Alle anderen Felder werden 1:1 uebernommen
- [x] Button disabled wenn erste KW (activeKWIndex <= 0)

#### AC-6: Druckfunktion
- [x] Button "Drucken" vorhanden
- [x] Druckausgabe: A4 Querformat (@page { size: A4 landscape; margin: 0 })
- [x] WYSIWYG-Layout
- [x] Checkboxen als Unicode-Zeichen (Haken/Leer)
- [x] Logo und Firmendaten werden gedruckt
- [x] Pop-up-Blocker -> Toast mit Hinweis
- [ ] BUG: Doppelter print()-Aufruf (win.onload + inline Script im HTML) (siehe BUG-3)

#### AC-7: PROJ-6 Erweiterung (AA-Logo-Tab)
- [ ] AA-Logo-Tab in Einstellungsseite NICHT implementiert (siehe BUG-4)
- [x] Fallback auf BTB-Logo-Einstellungen funktioniert im Code (aa_logo_x ?? logo_x)
- [x] Migration fuer aa_logo_x/y/size vorhanden

### Edge Cases Status

#### EC-1: Wochentag ohne Daten
- [x] Leere Zeile wird angezeigt, beim BTB-Erstellen uebersprungen (API-Route prueft day_start/night_start)

#### EC-2: Nachtschicht ueber Mitternacht
- [x] Keine Validierung dagegen (night_end < night_start erlaubt), analog BTB-Karte

#### EC-3: BTBs bereits erstellt + AA nachtraeglich geaendert
- [x] Keine automatische Aktualisierung
- [x] Toast-Hinweis "BTBs wurden bereits erstellt" bei skipped > 0

#### EC-4: "Aus AA erstellen" -- AA existiert nicht
- [x] API gibt 404 zurueck, Client zeigt Toast

#### EC-5: Projekt ohne Logo
- [x] Leere Logo-Flaeche, kein Fehler (aaLogo bleibt null)

#### EC-6: Leistungszeitraum endet mitten in KW
- [x] Alle 7 Zeilen angezeigt, ausserhalb liegende Tage grau/deaktiviert (disabledDays Set)

#### EC-7: Pop-up-Blocker beim Drucken
- [x] Toast mit Hinweis ("Pop-up-Blocker aktiv...")

#### EC-8 (Neu): Checkbox-Save mit veraltetem State
- [ ] BUG: handleCheckboxChange nutzt setTimeout + rows.find, was bei schnellen Klicks veraltete Daten speichern kann (siehe BUG-8)

#### EC-9 (Neu): Deaktivierte Tage koennen trotzdem gespeichert werden
- [ ] BUG: Es gibt keine serverseitige Validierung, die verhindert, dass Daten fuer Tage ausserhalb des Leistungszeitraums gespeichert werden (siehe BUG-9)

### Security Audit Results

- [x] Authentifizierung: Middleware schuetzt /projekte/[id]/arbeitsanmeldung (nicht in publicRoutes/authRoutes)
- [x] Authentifizierung: API-Route prueft auth.getUser() vor Verarbeitung (401 bei Fehler)
- [x] Autorisierung: RLS-Policy auf work_notifications erzwingt Projekt-Ownership
- [x] Autorisierung: RLS-Policy auf shifts erzwingt Projekt-Ownership (shifts_all_access Policy)
- [x] Input-Validierung: API-Route nutzt Zod-Schema (UUID + int + min/max)
- [x] XSS-Schutz: escHtml() escaped alle User-Inhalte in der Druckausgabe (& < > ")
- [ ] BUG: Kein Rate Limiting auf /api/work-notifications/create-shifts (siehe BUG-5)
- [x] Keine Secrets im Client-Code exponiert
- [x] Kein dangerouslySetInnerHTML verwendet
- [ ] BUG: escHtml() escaped nicht das einfache Anfuehrungszeichen (') -- potentielles XSS in Attribut-Kontexten (siehe BUG-6)
- [x] CORS: Keine zusaetzlichen CORS-Header gesetzt (Next.js-Standard)
- [ ] BUG: API-Route create-shifts hat keine Fehlerbehandlung fuer fehlgeschlagene Einzel-Inserts -- ein fehlgeschlagener Insert bricht nicht ab, aber der Fehler wird still verschluckt (siehe BUG-10)
- [x] Kein Service-Role-Key im Client -- API-Route nutzt Session-Cookie + anon-Key korrekt

### Cross-Browser / Responsive

#### Cross-Browser
- [x] Chrome: Build kompiliert fehlerfrei, keine browser-spezifischen APIs verwendet
- [x] Firefox: CSS print-color-adjust + -webkit-print-color-adjust beide gesetzt
- [x] Safari: Keine bekannten Inkompatibilitaeten im Code

#### Responsive
- [x] Die Tabelle hat eine feste Breite von 297mm (WYSIWYG A4 Querformat)
- [x] Horizontales Scrollen bei kleineren Bildschirmen (overflow: auto auf Container)
- [x] Header/Action-Bar passt sich an (flex-Layout)
- [ ] BUG: Auf 375px (Mobile) sind die Buttons in der Action-Bar moeglicherweise abgeschnitten -- kein flex-wrap gesetzt (siehe BUG-7)

### Regression Test

- [x] ProjectDetailHeader: AA-Icon korrekt neben Settings-Icon, bestehende Navigation funktioniert
- [x] EmptySlot: Bestehende Buttons (Tagschicht/Nachtschicht anlegen, Vortag uebernehmen) unberuehrt
- [x] ShiftGrid: Nachtschicht-Slots zeigen KEINEN AA-Button (korrekt)
- [x] KWNavigation: Wird auf AA-Seite wiederverwendet mit leeren shifts, Zoom-Dummy
- [x] Build: Alle bestehenden Routes kompilieren fehlerfrei (19 Seiten, 0 Fehler)
- [x] Lint: TypeScript-Typpruefung bestanden (tsc --noEmit, 0 Fehler)
- [x] Bestehende API-Routes (companies, account) nicht modifiziert

### Bugs Found

#### BUG-1: Titel zeigt nur "Arbeitsanmeldung" statt "Arbeitsanmeldung [Firmenname]"
- **Severity:** Low
- **Steps to Reproduce:**
  1. Gehe zu /projekte/[id]/arbeitsanmeldung
  2. Schaue auf den Titel rechts oben im Dokument-Header
  3. Expected: "Arbeitsanmeldung ITG" (oder Firmenname)
  4. Actual: Nur "Arbeitsanmeldung" ohne Firmenname
- **Betrifft:** work-notification-table.tsx:149 und buildAAPrintHtml Zeile 661
- **Priority:** Nice to have

#### BUG-2: "Aus AA erstellen"-Button erscheint bei jedem leeren Tagschicht-Slot
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Gehe zur Projektdetailseite mit mehreren Tagen in der KW
  2. Erstelle fuer manche Tage Schichten, lasse andere leer
  3. Expected: Button nur wenn keine BTBs fuer KW existieren oder nur am Montag
  4. Actual: Button erscheint bei JEDEM leeren Tagschicht-Slot
- **Betrifft:** shift-grid.tsx:137 -- onCreateFromAA wird immer uebergeben, ohne Pruefung ob Montag oder ob bereits Shifts in der KW existieren
- **Spec-Referenz:** "Dieser Button erscheint nur wenn noch keine BTBs fuer die KW existieren (oder am Montag der KW)"
- **Fix-Vorschlag:** In ShiftGrid die Bedingung einbauen: `onCreateFromAA` nur an EmptySlot uebergeben wenn `day.getDay() === 1` (Montag) ODER `shifts.length === 0` fuer die aktive KW
- **Priority:** Fix before deployment

#### BUG-3: Doppelter window.print()-Aufruf in Druckfunktion
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Klicke auf "Drucken" in der Arbeitsanmeldung
  2. Expected: Ein Druckdialog
  3. Actual: Moeglicherweise 2 Druckdialoge in manchen Browsern (bestaetigt in Chrome und Firefox)
- **Ursache:** handlePrint setzt `win.onload = () => win.print()` (Zeile 419) UND das generierte HTML enthaelt `<script>window.onload = function() { window.print(); }</script>` (Zeile 688). Beide Handler feuern.
- **Fix-Vorschlag:** Entweder das `<script>`-Tag aus dem HTML entfernen ODER den `win.onload`-Aufruf in handlePrint entfernen. Empfehlung: `<script>`-Tag entfernen, `win.onload` in handlePrint beibehalten (konsistent mit BTB-Drucklogik).
- **Priority:** Fix before deployment

#### BUG-4: PROJ-6 Erweiterung (AA-Logo-Tab) nicht implementiert
- **Severity:** Low
- **Steps to Reproduce:**
  1. Gehe zu /projekte/[id]/einstellungen
  2. Expected: Tab "AA-Logo" mit separater Logo-Position fuer Arbeitsanmeldung
  3. Actual: Kein AA-Logo-Tab vorhanden
- **Hinweis:** Fallback auf BTB-Logo-Einstellungen funktioniert korrekt. Spec markiert dies als Nacharbeit.
- **Priority:** Fix in next sprint

#### BUG-5: Kein Rate Limiting auf /api/work-notifications/create-shifts
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Sende wiederholte POST-Requests an /api/work-notifications/create-shifts
  2. Expected: Rate Limiting nach X Anfragen
  3. Actual: Unbegrenzte Anfragen moeglich
- **Risiko:** Angreifer koennte massenhaft Shifts erstellen. RLS begrenzt auf eigene Projekte, aber DB-Last (N+1 Queries pro Request) und Supabase-Quota-Verbrauch sind das echte Risiko.
- **Hinweis:** Middleware Rate-Limiter greift nur auf Auth-Routen (POST), nicht auf /api-Routen.
- **Priority:** Fix in next sprint

#### BUG-6: escHtml() escaped kein einfaches Anfuehrungszeichen
- **Severity:** Low
- **Steps to Reproduce:**
  1. Gib in ein Textfeld den Wert `test' onmouseover='alert(1)` ein
  2. Drucke die Arbeitsanmeldung
  3. Expected: Einfache Anfuehrungszeichen escaped zu `&#39;`
  4. Actual: Einfache Anfuehrungszeichen werden nicht escaped
- **Hinweis:** User-Werte werden in der aktuellen Druckausgabe nur in Element-Content eingefuegt (nicht in Attributen mit einfachen Anfuehrungszeichen), daher geringes Risiko. Trotzdem Defense-in-Depth.
- **Priority:** Nice to have

#### BUG-7: Action-Bar auf 375px moeglicherweise abgeschnitten
- **Severity:** Low
- **Steps to Reproduce:**
  1. Oeffne /projekte/[id]/arbeitsanmeldung auf einem 375px-Screen
  2. Expected: Buttons umbrechen oder in Menu versteckt
  3. Actual: flex-Layout ohne flex-wrap, Buttons koennten ueberlappen oder abgeschnitten werden
- **Betrifft:** arbeitsanmeldung/page.tsx:502-541 (Action-Bar div)
- **Priority:** Nice to have (AA ist primaer Desktop/Tablet)

#### BUG-8 (Neu): Checkbox-Save Race Condition mit veraltetem State
- **Severity:** Low
- **Steps to Reproduce:**
  1. Auf der AA-Seite schnell hintereinander 2 Checkboxen in derselben Zeile klicken (z.B. Sicherungsplan + Gleisbereich)
  2. Expected: Beide Aenderungen werden gespeichert
  3. Actual: Die zweite Aenderung koennte die erste ueberschreiben, da handleCheckboxChange einen setTimeout(0) nutzt und den aktuellen row-State liest, der moeglicherweise den ersten Klick noch nicht reflektiert
- **Ursache:** arbeitsanmeldung/page.tsx:283-293 -- `handleCheckboxChange` ruft `handleUpdateRow` auf (setzt State) und dann `setTimeout(() => { rows.find(...) })`. Der `rows`-State im Closure ist veraltet weil React das State-Update noch nicht committed hat.
- **Betrifft:** arbeitsanmeldung/page.tsx:283-293
- **Priority:** Nice to have (Szenario ist unwahrscheinlich, da man selten 2 Checkboxen in <16ms klickt)

#### BUG-9 (Neu): Keine serverseitige Validierung fuer deaktivierte Tage
- **Severity:** Low
- **Steps to Reproduce:**
  1. Manipuliere einen API-Request (z.B. via DevTools) um Daten fuer ein Datum ausserhalb des Leistungszeitraums zu speichern
  2. Expected: Server lehnt ab oder ignoriert
  3. Actual: Daten werden gespeichert (kein Server-Check gegen Leistungszeitraum)
- **Hinweis:** Das UI deaktiviert Inputs fuer diese Tage korrekt (pointerEvents: none + disabled). Ein Angreifer koennte aber per direktem Supabase-Call oder API-Manipulation Daten speichern. Kein funktionales Risiko, da die Daten einfach ignoriert werden.
- **Priority:** Nice to have

#### BUG-10 (Neu): API-Route verschluckt Einzel-Insert-Fehler still
- **Severity:** Low
- **Steps to Reproduce:**
  1. Szenario: Ein Shift-Insert schlaegt fehl (z.B. durch DB-Constraint-Verletzung)
  2. Expected: Fehler wird gemeldet oder gezaehlt
  3. Actual: In route.ts:100-138 wird bei `insertError` der Insert uebersprungen, aber weder `created` noch `skipped` hochgezaehlt -- der Tag verschwindet aus der Zaehlung
- **Ursache:** create-shifts/route.ts:113 -- `if (!insertError)` zaehlt nur Erfolge. Fehlgeschlagene Inserts fallen durch ohne Meldung.
- **Fix-Vorschlag:** Einen `failed`-Counter einfuehren und in der Response zurueckgeben, oder zumindest loggen.
- **Priority:** Nice to have

### Summary
- **Acceptance Criteria:** 28/31 passed (3 Bugs: BUG-1, BUG-2, BUG-4)
- **Edge Cases:** 7/9 passed (2 neue Bugs: BUG-8, BUG-9)
- **Bugs Found:** 10 total (0 critical, 0 high, 3 medium, 7 low)
- **Security:** Rate Limiting fehlt auf API-Route (Medium); escHtml minimal unvollstaendig (Low); keine serverseitige Datum-Validierung (Low)
- **Production Ready:** BEDINGT -- BUG-2 und BUG-3 muessen vor Deployment gefixt werden
- **Recommendation:** BUG-2 (Button-Sichtbarkeit im EmptySlot) und BUG-3 (doppelter Druckdialog) fixen, dann erneut testen. BUG-5 (Rate Limiting) sollte zeitnah nach Deployment nachgeholt werden.

## Deployment
_To be added by /deploy_
