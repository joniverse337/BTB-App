# PROJ-9: Gerätebedarf

## Status: Deployed
**Created:** 2026-04-08
**Last Updated:** 2026-04-17

## Deployment
**Deployed:** 2026-04-17
**Commits:** feat, fix, security (PROJ-9) — Citrix PATCH-Fixes, IDOR-Schutz, Datum-Automatik

## Dependencies

| Feature | Art | Liefert |
|---------|-----|---------|
| PROJ-1 | Pflicht | Auth-Session + RLS |
| PROJ-2 | Pflicht | Projektdaten (Name, Kostenstelle, Auftraggeber) |
| PROJ-5 | Optional (lesend) | Firmenname, Adresse aus `companies` |
| PROJ-6 | Optional (lesend) | Logo aus `project_settings` |
| PROJ-8 | Pflicht | PaperEngine für A4-Layout und WYSIWYG-Druck |

## Ziel der Funktion

„Gerätebedarf" ist ein projektgebundenes Modul zur Verwaltung des Geräteeinsatzes auf der
Baustelle. Es erscheint als dritter Tab im `ProjectDetailHeader` neben „Bautagesberichte"
und „Arbeitsanmeldung".

Die Ansicht zeigt **drei A4-Karten nebeneinander**, die den Lebensweg eines Geräts
abbilden:

- **Bedarf** → **Auf der Baustelle** → **Freigemeldet**

Zwischen den Karten sind visuelle Pfeile (→) als Fluss-Indikatoren dargestellt.
Unterhalb des Headers gibt es eine schmale Aktionsleiste mit „Drucken" (immer alle 3
Seiten) und „Lagerplätze" (Platzhalter, vorerst leer).

## Seitenstruktur

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: BTB-Logo  │  Projektname  │  Gerätebedarf  AA  BTB  ⚙  │
├─────────────────────────────────────────────────────────────────┤
│  Aktionsleiste: [🖨 Drucken]  [Lagerplätze]          [Zoom ±]   │
├───────────────────┬───────────────────┬───────────────────────┤
│                   │                   │                       │
│  A4-Karte         │  A4-Karte         │  A4-Karte             │
│  BEDARF           │  AUF DER          │  FREIGEMELDET         │
│                   │  BAUSTELLE        │                       │
└───────────────────┴───────────────────┴───────────────────────┘
```

Keine dekorativen Pfeile zwischen den Karten — das Verschieben erfolgt über die
Aktionen-Spalte in jeder Zeile.

## User Stories

- Als Bauleiter möchte ich den Gerätebedarf meines Projekts aufrufen, um den Überblick
  über alle Geräte zu haben.
- Als Bauleiter möchte ich ein neues Gerät anlegen (Name, Nummer, Lieferadresse,
  Lieferdatum), damit der Bauhof alle nötigen Infos hat.
- Als Bauleiter möchte ich den Status eines Geräts per Pfeil-Button weiterschalten
  (Bedarf → Baustelle → Freigemeldet), damit die Liste immer aktuell ist.
- Als Bauleiter möchte ich alle drei Karten auf einmal drucken, um sie dem Auftraggeber
  oder Bauhof zu übergeben.
- Als Bauleiter möchte ich Geräte löschen können, wenn sie nicht mehr relevant sind.
- Als Bauleiter möchte ich die Gerätenummer nachträglich eintragen können (wird oft erst
  vom Bauhof mitgeteilt).

## Acceptance Criteria

### Navigation
- [ ] Tab „Gerätebedarf" erscheint im `ProjectDetailHeader` (neben „Bautagesberichte"
      und „Arbeitsanmeldung")
- [ ] Route `/projekte/[id]/geraete` ist erreichbar
- [ ] Aktiver Tab hervorgehoben (`#e8c547` Rahmen + Textfarbe)

### Aktionsleiste (unterhalb des Headers)
- [ ] Button „🖨 Drucken": druckt immer alle 3 Karten als 3-seitiges A4-Dokument
- [ ] Button „Lagerplätze": vorerst deaktiviert / Platzhalter (kein Fehler beim Klick)
- [ ] Zoom-Steuerung (+ / −) wirkt auf alle 3 Karten gleichzeitig

### Layout & Karten
- [ ] Drei A4-Karten (portrait, 210×297mm, skaliert per Zoom) in einem horizontalen
      Scroll-Container nebeneinander angezeigt
- [ ] Zwischen Card 1↔2 und Card 2↔3 je ein visueller Pfeil (→) als Fluss-Indikator
      (nicht klickbar, rein dekorativ)
- [ ] Jede Karte hat einen **Card-Header** (oben):
      - Karten-Titel BEDARF / AUF DER BAUSTELLE / FREIGEMELDET (prominent)
      - Projektname (readonly)
      - Kostenstelle (readonly)
      - Ansprechpartner (readonly, aus Projektdaten)
- [ ] Jede Karte hat eine **Tabelle** mit Spalten: Gerät, Gerätenummer, Lieferadresse,
      Lieferdatum, Anmerkungen, Aktionen
- [ ] Aktionen-Spalte (`<th>` + alle `<td>`) trägt `data-no-print="true"` → unsichtbar
      im Druck, alle anderen Spalten werden gedruckt
- [ ] Jede Karte hat eine **Card-Fußzeile** (unten):
      - Firmenname (links)
      - Seitenzahl 1 / 2 / 3 je nach Karte (rechts)

### Bearbeiten
- [ ] „+ Gerät hinzufügen" Button unterhalb der Tabelle in Card 1
- [ ] **Card 1 (Bedarf)**: alle Felder inline editierbar (Gerät, Gerätenummer,
      Lieferadresse, Lieferdatum, Anmerkungen)
- [ ] **Card 2 (Auf der Baustelle)**: nur Gerätenummer editierbar, Rest readonly
- [ ] **Card 3 (Freigemeldet)**: alle Felder readonly

### Statuswechsel
- [ ] Pfeil **→** in Card 1 verschiebt Gerät zu „Auf der Baustelle"
- [ ] Pfeil **→** in Card 2 verschiebt Gerät zu „Freigemeldet"
- [ ] Pfeil **←** in Card 2 verschiebt Gerät zurück zu „Bedarf"
- [ ] Pfeil **←** in Card 3 verschiebt Gerät zurück zu „Auf der Baustelle"
- [ ] `status_ts` (Unix-Timestamp) wird beim Statuswechsel gesetzt und sofort gespeichert
- [ ] Gerät erscheint am Ende der Ziel-Spalte

### Löschen
- [ ] Löschen-Button (×) in jeder Zeile öffnet `AlertDialog` (shadcn/ui)
- [ ] Nach Bestätigung: Gerät aus DB entfernt, Karten neu gerendert

### Drucken
- [ ] „Drucken"-Button druckt alle 3 Karten als 3-seitiges Dokument (`page-break-after`)
- [ ] Druck-Reihenfolge: Bedarf → Auf der Baustelle → Freigemeldet
- [ ] Im Druck: keine Buttons / Inputs sichtbar (`data-no-print`)
- [ ] **Kein** individueller Print-Button pro Karte

### Daten & Sicherheit
- [ ] Alle Änderungen sofort in Supabase gespeichert
- [ ] RLS: Zugriff nur für Mitglieder der eigenen Company
- [ ] Leere Spalten zeigen Platzhaltertext („Keine Geräte")

## Edge Cases

- Gerät ohne Namen: Zulässig, kein Pflichtfeld
- Viele Geräte in einer Spalte: Tabelle scrollt innerhalb der A4-Karte; Footer bleibt
  am unteren Rand (absolut positioniert)
- Gleichzeitige Bearbeitung: Letzte Änderung gewinnt, kein Locking
- Kein Leistungszeitraum: Gerätebedarf trotzdem zugänglich (keine LZ-Abhängigkeit)
- Statuswechsel ohne Namen: Erlaubt
- Drucken bei leerer Spalte: Leere Tabelle gedruckt (kein Fehler)
- Projekt nicht gefunden: Fehlerstate analog zu Arbeitsanmeldung-Seite
- Lagerplätze-Button klicken: Kein Fehler, keine Aktion (deaktiviert oder toast)

## Technical Requirements

**Neue Supabase-Tabelle:** `equipment_items`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | UUID PK | `gen_random_uuid()` |
| `project_id` | UUID FK | → `projects(id)` ON DELETE CASCADE |
| `name` | TEXT | nullable |
| `nummer` | TEXT | nullable — Gerätenummer |
| `lieferadresse` | TEXT | nullable |
| `lieferdatum` | DATE | nullable |
| `anmerkungen` | TEXT | nullable |
| `status` | TEXT | CHECK IN ('bedarf', 'baustelle', 'frei'), DEFAULT 'bedarf' |
| `status_ts` | BIGINT | nullable — Unix-Timestamp der letzten Statusänderung |
| `sort_order` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

- **RLS:** Zugriff über Projektzugehörigkeit (company_id-Kette wie bei `work_notifications`)
- **Index:** `(project_id, status)`
- **Print-Strategie:** `window.print()` direkt auf der Seite; alle 3 Karten im DOM,
  `@media print` blendet Aktionsleiste aus, `page-break-after: always` nach Card 1 + 2
- **Drag & Drop:** NICHT in MVP
- **Quick-Add Chips:** NICHT in MVP — nur freies Textfeld

---

## Tech Design (Solution Architect)

### Komponentenstruktur

```
/projekte/[id]/geraete (Page — 'use client')
+-- ProjectDetailHeader (bestehend — dritter Tab „Gerätebedarf" hinzufügen)
+-- GeraeteView (Client Component — hält gesamten State)
    +-- GeraeteActionBar            ← custom (kein KWNavigation, s.u.)
    |   +-- Button „Drucken"        (window.print)
    |   +-- Button „Lagerplätze"    (disabled / no-op)
    |   +-- ZoomControl (+ / −)
    +-- GeraeteBoard (horizontaler Scroll-Container, flex-row)
        +-- PaperEngine orientation="portrait" zoom={zoom}   ← Karte 1
        |   +-- GeraeteCard status="bedarf"
        |       +-- CardHeader
        |       |   +-- Titel „BEDARF" (prominent)
        |       |   +-- Projektname, Kostenstelle, Ansprechpartner (readonly)
        |       +-- EquipmentTable (alle Felder editierbar)
        |       |   +-- EquipmentRow × N
        |       |   |   +-- Inline-Inputs (Gerät, Nr., Adresse, Datum, Anmerkungen)
        |       |   |   +-- Pfeil → (bedarf → baustelle)  [data-no-print]
        |       |   |   +-- Löschen ×  [data-no-print]
        |       |   +-- AddEquipmentRow (+ Gerät hinzufügen)  [data-no-print]
        |       +-- CardFooter
        |           +-- Firmenname (links)
        |           +-- Seite 1 (rechts)
        +-- FlowArrow (→ dekorativ)  [data-no-print]
        +-- PaperEngine orientation="portrait" zoom={zoom}   ← Karte 2
        |   +-- GeraeteCard status="baustelle"
        |       +-- CardHeader
        |       |   +-- Titel „AUF DER BAUSTELLE"
        |       |   +-- Projektname, Kostenstelle, Ansprechpartner (readonly)
        |       +-- EquipmentTable (nur Gerätenummer editierbar)
        |       |   +-- EquipmentRow × N
        |       |   |   +-- Pfeil ← (baustelle → bedarf)   [data-no-print]
        |       |   |   +-- Pfeil → (baustelle → frei)     [data-no-print]
        |       |   |   +-- Löschen ×  [data-no-print]
        |       +-- CardFooter
        |           +-- Firmenname (links)
        |           +-- Seite 2 (rechts)
        +-- FlowArrow (→ dekorativ)  [data-no-print]
        +-- PaperEngine orientation="portrait" zoom={zoom}   ← Karte 3
            +-- GeraeteCard status="frei"
                +-- CardHeader
                |   +-- Titel „FREIGEMELDET"
                |   +-- Projektname, Kostenstelle, Ansprechpartner (readonly)
                +-- EquipmentTable (alle Felder readonly)
                |   +-- EquipmentRow × N
                |   |   +-- Pfeil ← (frei → baustelle)    [data-no-print]
                |   |   +-- Löschen ×  [data-no-print]
                +-- CardFooter
                    +-- Firmenname (links)
                    +-- Seite 3 (rechts)

DeleteEquipmentDialog (AlertDialog — shadcn/ui, einmalig, per State gesteuert)
```

### Datenmodell (plain language)

Neue Tabelle `equipment_items` in Supabase:

| Feld | Bedeutung |
|------|-----------|
| `id` | Eindeutige ID (UUID) |
| `project_id` | Welchem Projekt gehört das Gerät |
| `name` | Gerätename (optional) |
| `nummer` | Gerätenummer — wird oft erst vom Bauhof nachgereicht (optional) |
| `lieferadresse` | Wohin soll das Gerät geliefert werden (optional) |
| `lieferdatum` | Wann soll es geliefert werden (optional, Datum) |
| `anmerkungen` | Freitext (optional) |
| `status` | Aktueller Schritt: `bedarf` / `baustelle` / `frei` |
| `status_ts` | Zeitpunkt des letzten Statuswechsels (Unix-Timestamp) |
| `sort_order` | Reihenfolge innerhalb einer Spalte |
| `created_at` / `updated_at` | Zeitstempel |

Sicherheit: RLS über `project_id → projects.company_id` — gleiche Kette wie `work_notifications`. Nur Mitglieder der eigenen Firma haben Zugriff.

### Antworten auf offene Fragen

#### Print-Strategie: `@media print` — kein separates Print-Layout

Alle 3 PaperEngine-Instanzen sind permanent im DOM (keine `display:none`-Trick).
Im Druck gilt:

- `GeraeteActionBar` → `display: none` (via `data-no-print` oder eigene Klasse in globals.css)
- `FlowArrow` → `display: none` (via `data-no-print`)
- Aktionsspalten (`th` + `td` mit `data-no-print`) → `display: none` (bereits in globals.css)
- `.geraete-board` → `flex-direction: column` statt `row` (Print-Override in globals.css)
- PaperEngine `.paper-engine-zoom-wrapper` → `transform: none` (bereits in globals.css gehandelt)
- `page-break-after: always` auf die ersten beiden PaperEngine-Wrapper im GeraeteBoard

**Warum kein separates Print-Layout?** Der PaperEngine-Ansatz (WYSIWYG: was du siehst = was du druckst) ist bereits im gesamten Projekt etabliert. Ein zweites DOM-Layout wäre doppelter Pflege-Aufwand.

**Hinweis für Frontend:** PaperEngine setzt `overflow: hidden` auf das Paper-div. Die EquipmentTable muss daher `overflow-y: auto` innerhalb einer fixen Höhe nutzen (Scroll on screen) — und per `@media print` auf `overflow: visible` / `height: auto` umschalten, damit alle Zeilen gedruckt werden.

#### Zoom-Control: Eigene `GeraeteActionBar` — kein KWNavigation

`KWNavigation` ist tief mit dem KW-Konzept verzahnt (Kalenderwochen, Schichtdaten, lzVon/lzBis, renderWeekStatus usw.). Für Gerätebedarf gibt es keine Kalenderwochen — eine eigene `GeraeteActionBar` mit 3 Buttons (Drucken, Lagerplätze, Zoom +/−) ist klarer und braucht ~30 Zeilen.

### Weitere Tech-Entscheidungen

**PaperEngine — 3 Instanzen, portrait, ohne onPrint/onDelete**
Gleiche Komponente wie in PROJ-7/AA, nur 3× für die 3 Statusspalten. Die `onPrint`/`onDelete`-Props werden nicht übergeben — der schwebende Print-Button auf dem Blatt erscheint dann zwar noch beim Hover, stört aber nicht (druckt dasselbe wie der globale Drucken-Button). Der `@page`-Style wird 3× gesetzt — kein Problem, da alle portrait/gleiche Größe.

**Inline-Editing ohne Modal**
Analog zu `work-notification-table.tsx` (PROJ-7): Inputs direkt in Tabellenzellen. `onBlur` → sofortiger Supabase-Save.

**Kein neuer API-Route**
Direkte Supabase-Browser-Client-Calls mit RLS. Konsistent mit PROJ-3, PROJ-7.

**Tab-Erweiterung in `ProjectDetailHeader`**
Neuer Link-Tab „Gerätebedarf" → `/projekte/[id]/geraete`, aktiv wenn `pathname.includes('/geraete')`. Gleiche Styling-Logik wie bestehende Tabs.

### Abhängigkeiten

Keine neuen npm-Pakete. Alle benötigten shadcn/ui-Komponenten bereits installiert:
- `AlertDialog` — Löschen-Bestätigung
- `Button`, `Input` — Aktionen und Inline-Editing
- `Table, TableRow, TableCell` — Geräteliste

## QA Test Results (Runde 1 - 2026-04-08)

**Ergebnis:** 2 Bugs gefunden und behoben (sort_order-Logik, fehlende Umlaute)

---

## QA Test Results (Runde 2 - 2026-04-11)

**Tested:** 2026-04-11
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI) - Code Review + Security Audit

### Acceptance Criteria Status

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| 1 | Tab "Geraetebedarf" im ProjectDetailHeader | PASS | Korrekt als dritter Tab neben BTB und AA |
| 2 | Route `/projekte/[id]/geraete` erreichbar | PASS | Page-Komponente vorhanden |
| 3 | Aktiver Tab hervorgehoben (#e8c547) | PASS | Border + Textfarbe korrekt |
| 4 | Button "Drucken" druckt alle 3 Karten | PASS | window.print() mit korrekten @media print Regeln |
| 5 | Button "Lagerplaetze" deaktiviert / no-op | FAIL | BUG-1: Button fehlt komplett in der Aktionsleiste |
| 6 | Zoom-Steuerung wirkt auf alle 3 Karten | PASS | Zoom-Slider skaliert Bundle |
| 7 | Drei A4-Karten nebeneinander | PASS | Horizontaler Scroll-Container mit flex-row |
| 8 | Visuelle Pfeile zwischen Karten | PASS | data-no-print, aria-hidden |
| 9 | Card-Header mit Titel, BV, KST, AP | PASS | Alle Felder vorhanden |
| 10 | Tabelle mit allen 6 Spalten | PASS | Geraet, Nr., Lieferadresse, Lieferdatum, Anmerkungen, Aktionen |
| 11 | Aktionen-Spalte data-no-print | PASS | th + td korrekt |
| 12 | Card-Footer (Firma, Seitenzahl) | PASS | Firmenname links, Seite X rechts |
| 13 | "+ Geraet hinzufuegen" nur in Card 1 | FAIL | BUG-2: Button erscheint in allen 3 Karten |
| 14 | Card 1: alle Felder editierbar | PASS | editableFields="all" |
| 15 | Card 2: nur Geraetenummer editierbar | FAIL | BUG-3: editableFields="all" statt "nummer-only" |
| 16 | Card 3: alle Felder readonly | FAIL | BUG-3: editableFields="all" statt "none" |
| 17 | Pfeil -> Card 1 -> Baustelle | PASS | Transition bedarf -> baustelle validiert |
| 18 | Pfeil -> Card 2 -> Freigemeldet | PASS | Transition baustelle -> frei validiert |
| 19 | Pfeil <- Card 2 -> Bedarf | PASS | Transition baustelle -> bedarf validiert |
| 20 | Pfeil <- Card 3 -> Baustelle | PASS | Transition frei -> baustelle validiert |
| 21 | status_ts beim Statuswechsel gesetzt | PASS | Math.floor(Date.now() / 1000) |
| 22 | Geraet erscheint am Ende der Zielspalte | PASS | max + 1 Logik (nach Fix Runde 1) |
| 23 | Loeschen-Button oeffnet AlertDialog | PASS | shadcn/ui AlertDialog |
| 24 | Nach Bestaetigung: Geraet entfernt | PASS | delete + State-Update |
| 25 | Drucken: 3-seitiges Dokument | PASS | page-break via absolute positioning je 297mm |
| 26 | Druck-Reihenfolge korrekt | PASS | Bedarf -> Baustelle -> Freigemeldet |
| 27 | Im Druck: keine Buttons/Inputs | PASS | [data-no-print] display:none |
| 28 | Kein individueller Print-Button pro Karte | FAIL | BUG-4: handlePrintSingle existiert und PaperEngine zeigt Hover-Print-Button |
| 29 | Aenderungen sofort in Supabase gespeichert | PASS | onBlur -> direkter Supabase-Call |
| 30 | RLS: Zugriff via company_id-Kette | PASS | USING + WITH CHECK ueber projects.company_id |
| 31 | Leere Spalten: Platzhaltertext | PASS | "Keine Geraete" |

### Edge Cases Status

| Edge Case | Status | Anmerkung |
|-----------|--------|-----------|
| Geraet ohne Namen | PASS | Zulassig, kein Pflichtfeld in Schema |
| Viele Geraete: Tabelle scrollt | PASS | geraete-table-scroll overflow-y:auto, print: overflow:visible |
| Statuswechsel ohne Namen | PASS | Erlaubt, keine Name-Validierung |
| Drucken bei leerer Spalte | PASS | Leere Tabelle mit "Keine Geraete" wird gedruckt |
| Projekt nicht gefunden | PASS | Fehlerstate mit AlertCircle-Icon |
| Lagerplaetze-Button klicken | FAIL | Button fehlt komplett (siehe BUG-1) |

### Security Audit Results

- [x] **Authentication:** Middleware prueft Auth-Session, leitet zu /login um
- [x] **RLS:** equipment_items hat FOR ALL Policy ueber project -> company_id Kette
- [x] **RLS WITH CHECK:** Vorhanden -- verhindert Inserts/Updates fuer fremde Projekte
- [x] **XSS:** Kein dangerouslySetInnerHTML, React-Escaping schuetzt Ausgabe
- [x] **Zod-Validierung:** createEquipmentSchema und updateEquipmentSchema vorhanden
- [x] **SQL-Injection:** Supabase-Client parametrisiert Queries automatisch
- [x] **CSP:** Content-Security-Policy mit Nonce im Middleware korrekt
- [ ] **BUG-5 (Security):** updateEquipmentSchema erlaubt `status`-Feld -- Statuswechsel ohne Transitions-Validierung moeglich
- [ ] **BUG-6 (Security):** fetchEquipmentItems und deleteEquipmentItem validieren `id`/`projectId` nicht als UUID vor dem Query
- [x] **Rate Limiting:** Auth-Endpoints haben Rate-Limiting (POST)
- [x] **Sensitive Data:** Keine Secrets in Browser-Console/Network-Tab

### Bugs Found

#### BUG-1: "Lagerplaetze"-Button fehlt in Aktionsleiste

- **Severity:** Low
- **Datei:** `src/components/geraete-action-bar.tsx`
- **Steps to Reproduce:**
  1. Oeffne `/projekte/[id]/geraete`
  2. Schaue in die Aktionsleiste unterhalb des Headers
  3. Erwartet: Button "Lagerplaetze" (deaktiviert/Platzhalter) neben "Drucken"
  4. Tatsaechlich: Nur Zoom-Slider und "Alle drucken" Button vorhanden
- **AC-Referenz:** "Button Lagerplaetze: vorerst deaktiviert / Platzhalter (kein Fehler beim Klick)"
- **Priority:** Nice to have (mittlerweile gibt es den Lagerplaetze-Tab im Header, der diesen Button ersetzt)

#### BUG-2: "+ Geraet hinzufuegen" Button erscheint in allen 3 Karten

- **Severity:** High
- **Datei:** `src/components/geraete-view.tsx` (Zeile 271, 302, 329)
- **Steps to Reproduce:**
  1. Oeffne `/projekte/[id]/geraete`
  2. Scrolle zu Card 2 (Auf der Baustelle) und Card 3 (Freigemeldet)
  3. Erwartet: "+ Geraet hinzufuegen" nur in Card 1 (Bedarf)
  4. Tatsaechlich: Button erscheint in allen 3 Karten
- **Code:** `onAddEquipment` wird an alle 3 GeraeteCard-Instanzen uebergeben
- **AC-Referenz:** "+ Geraet hinzufuegen Button unterhalb der Tabelle in Card 1"
- **Priority:** Fix before deployment

#### BUG-3: Card 2 und Card 3 haben falsche editableFields

- **Severity:** High
- **Datei:** `src/components/geraete-view.tsx` (Zeile 300, 331)
- **Steps to Reproduce:**
  1. Oeffne `/projekte/[id]/geraete`
  2. Verschiebe ein Geraet nach Card 2 (Auf der Baustelle)
  3. Erwartet: Nur Geraetenummer-Feld ist editierbar
  4. Tatsaechlich: Alle Felder sind editierbar (Name, Adresse, Datum, etc.)
  5. Verschiebe ein Geraet nach Card 3 (Freigemeldet)
  6. Erwartet: Alle Felder readonly
  7. Tatsaechlich: Alle Felder sind editierbar
- **Code:**
  - Zeile 300: `editableFields="all"` -- sollte `"nummer-only"` sein
  - Zeile 331: `editableFields="all"` -- sollte `"none"` sein
- **AC-Referenz:** "Card 2: nur Geraetenummer editierbar" + "Card 3: alle Felder readonly"
- **Priority:** Fix before deployment

#### BUG-4: Individueller Print-Button pro Karte existiert (handlePrintSingle)

- **Severity:** Low
- **Datei:** `src/components/geraete-view.tsx` (Zeile 187-200, 262, 293, 324)
- **Steps to Reproduce:**
  1. Oeffne `/projekte/[id]/geraete`
  2. Hovere ueber eine einzelne A4-Karte
  3. Erwartet: Kein individueller Print-Button
  4. Tatsaechlich: PaperEngine zeigt Hover-Print-Button, handlePrintSingle-Logik ist implementiert
- **AC-Referenz:** "Kein individueller Print-Button pro Karte"
- **Hinweis:** Funktional nicht schaedlich, aber widerspricht der Spezifikation
- **Priority:** Nice to have

#### BUG-5: Status-Bypass ueber updateEquipmentItem (Security)

- **Severity:** Medium
- **Datei:** `src/lib/validations/equipment.ts` (Zeile 42-51), `src/lib/services/equipment-service.ts` (Zeile 74-98)
- **Steps to Reproduce:**
  1. Im Browser-Console: Supabase-Client direkt nutzen oder handleUpdateField manipulieren
  2. `handleUpdateField(itemId, 'status', 'frei')` aufrufen
  3. Erwartet: Status-Aenderung wird abgelehnt (muss ueber changeEquipmentStatus mit Transitions-Validierung laufen)
  4. Tatsaechlich: updateEquipmentSchema akzeptiert `status`-Feld, Update wird ohne Transitions-Check ausgefuehrt
- **Impact:** Geraete koennen von "bedarf" direkt zu "frei" verschoben werden, ohne den vorgesehenen Workflow
- **Fix-Vorschlag:** `status`, `status_ts`, `sort_order` aus updateEquipmentSchema entfernen (diese Felder sollten nur ueber changeEquipmentStatus aenderbar sein)
- **Priority:** Fix before deployment

#### BUG-6: Fehlende UUID-Validierung bei Service-Funktionen (Security)

- **Severity:** Low
- **Datei:** `src/lib/services/equipment-service.ts` (Zeile 20, 169)
- **Description:**
  - `fetchEquipmentItems(projectId)` validiert `projectId` nicht als UUID
  - `deleteEquipmentItem(id)` validiert `id` nicht als UUID
  - Supabase/PostgreSQL wuerde bei ungueltigem UUID-Format einen Fehler werfen, aber die Validierung sollte clientseitig erfolgen (Defense in Depth)
- **Impact:** Gering -- Supabase wuerde den Query ablehnen, aber saubere Validierung ist Best Practice
- **Priority:** Nice to have

### Hinweise (kein Bug)

- Zoom ist als Drag-Slider implementiert, AC nennt "+ / -". Funktional aequivalent, technisch in Ordnung.
- PaperEngine-Hover-Print-Buttons pro Karte: Im Tech Design als "stoert nicht" dokumentiert, widerspricht aber dem AC "Kein individueller Print-Button pro Karte".
- Der "Lagerplaetze"-Button in der Aktionsleiste wurde vermutlich durch den neuen Lagerplaetze-Tab im Header ersetzt (PROJ-10). AC sollte aktualisiert werden.

### Summary

- **Acceptance Criteria:** 27/31 passed, 4 failed
- **Bugs Found:** 6 total (0 Critical, 2 High, 1 Medium, 3 Low)
- **Security:** 1 Medium-Finding (Status-Bypass), 1 Low-Finding (UUID-Validierung)
- **Production Ready:** NEIN
- **Recommendation:** BUG-2 (Add-Button in allen Karten), BUG-3 (editableFields falsch), und BUG-5 (Status-Bypass) muessen vor Deployment gefixt werden. Die Fixes sind trivial (3 Zeilen-Aenderungen in geraete-view.tsx + Schema-Bereinigung).

## Deployment
_To be added by /deploy_
