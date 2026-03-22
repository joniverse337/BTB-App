# PROJ-4: BTB-Karte & Drucken

## Status: In Review
**Created:** 2026-03-12
**Last Updated:** 2026-03-22

## Implementation Notes

> PROJ-4 wurde zusammen mit PROJ-3 implementiert. Der Code existiert vollständig — diese Spec dokumentiert was gebaut wurde und was noch aussteht.

**Implementiert in:**
- `src/components/shift-card.tsx` — komplette A4-Karte, alle editierbaren Felder, Auto-Save
- `src/app/projekte/[id]/page.tsx` — alle CRUD-Handler für Schicht, Mitarbeiter, Geräte; Druckfunktionen `handlePrintShift()` + `handlePrintKW()`

**Implementiert (2026-03-22):**
- Firmenname: aus `companies.name` (PROJ-5), Fallback-Kette: `project_settings.firma → companies.name → 'Firmenname'`
- Adresse: aus `companies.adr` (PROJ-5)
- Logo: aus `companies.logo_url`, `logo_x`, `logo_y` (PROJ-5) — als Wasserzeichen auf Karte und im Druck
- Quick-Button-Kategorien: aus `project_categories` (PROJ-6) mit Standard-Fallback; eigene Kategorien ergänzen Defaults

---

## Dependencies

| Feature | Art | Liefert |
|---------|-----|---------|
| PROJ-1 | Pflicht | Auth-Session für RLS |
| PROJ-2 | Pflicht | Projektdaten (Name, Kostenstelle, Auftraggeber) read-only auf der Karte |
| PROJ-3 | Pflicht | Shift-Datensatz + Grid-Container in dem die Karte gerendert wird |
| PROJ-6 | Optional (lesend) | `project_settings.firma` + `project_settings.adr` + `project_settings.logo_url` + `logo_x/y` für Karten-Header; `project_categories` für Quick-Buttons; Fallback wenn nicht vorhanden |

---

## Kernprinzip (geerbt von PROJ-3)

Die ShiftCard ist das Dokument. Was auf dem Bildschirm ausgefüllt wird, wird exakt so gedruckt — kein zweites Layout, kein separater Drucktemplate.

---

## User Stories
- Als Nutzer möchte ich alle BTB-Felder direkt auf der A4-Karte ausfüllen.
- Als Nutzer möchte ich, dass meine Eingaben sofort gespeichert werden (kein Speichern-Button).
- Als Nutzer möchte ich Mitarbeiter und Geräte per Quick-Button hinzufügen.
- Als Nutzer möchte ich eine Schicht als DIN-A4-PDF drucken.
- Als Nutzer möchte ich alle Schichten einer KW auf einmal drucken.
- Als Nutzer möchte ich eine Schicht löschen (mit Bestätigung).

---

## Acceptance Criteria

### A4-Karte (Bildschirm)
- [x] Karte hat festes A4-Seitenverhältnis (210:297mm), weißer Hintergrund
- [x] Header: Firmenname (groß, Syne-Font) + Adresse links; "BAUTAGESBERICHT TAG DATUM" + Schicht-Badge rechts
- [x] Sektion PROJEKT: Name, Kostenstelle, Auftraggeber (read-only aus Projekt)
- [x] Sektion WETTER: Temperatur (Zahl), Witterung (Dropdown, 8 Optionen), Bodenzustand (Dropdown, 5 Optionen)
- [x] Sektion ARBEITSZEIT: Beginn/Ende (HH:MM), Pause (Min.) → Nettostunden auto-berechnet
- [x] Sektion ÖRTLICHKEIT: Gleis/Strecke/Bauteil, km von, km bis
- [x] MITARBEITER-Tabelle: Zeilen (Beruf/Name, Anz, Std, Löschen) + Quick-Buttons + Gesamt-Stundenzeile
- [x] GERÄTE-Tabelle: identische Struktur; Quick-Buttons aus user_categories (PROJ-5) oder Fallback
- [x] Quick-Add befüllt Std automatisch mit Nettostunden wenn Arbeitszeit bekannt
- [x] AUSGEFÜHRTE ARBEITEN: Textarea (auto-resize)
- [x] VORKOMMNISSE / BEHINDERUNGEN: Textarea (auto-resize)
- [x] Fußzeile: Auftragnehmer / Auftraggeber (absolut unten, 7mm Abstand)
- [x] Eingabefelder ohne sichtbaren Rahmen — wirkt wie gedruckter Text
- [x] Auto-Save: onBlur für Textfelder, sofort bei Select-/Zeit-Änderungen (Supabase update)
- [x] Zeitänderung (beg/end/pau) aktualisiert Nettostunden und alle Std-Felder in MA/Geräte-Tabellen
- [ ] Hover über Karte zeigt Drucken- + Löschen-Button *(noch nicht implementiert)*
- [x] Firmenname aus `companies.name` (PROJ-5), Adresse aus `companies.adr` (PROJ-5); Fallback-Kette implementiert

### Löschen
- [x] Löschen-Button öffnet Bestätigungs-Dialog (shadcn AlertDialog)
- [x] Schicht + alle Workers + Equipment werden gelöscht (CASCADE)

### Drucken
- [x] Einzelschicht drucken: öffnet neues Browserfenster, startet Druckdialog automatisch
- [x] KW drucken: alle Schichten der aktiven KW in einem mehrseitigen Dokument (chronologisch: erst Tag dann Nacht)
- [x] Drucklayout = Kartenansicht: gleiche Sektionen, gleiche Typografie, gleiche Farbakzente
- [x] `@page { size: A4 portrait; margin: 0 }` — randloser Druck
- [x] Tagschicht = orange (#e8a020), Nachtschicht = blau (#4a7cf7)
- [x] Fonts: Syne + IBM Plex Sans via Google Fonts CDN im Druckfenster
- [x] Leere Tabellen zeigen "Keine Einträge" im Druckdokument
- [ ] Pop-up-Blocker → Hinweis-Toast *(noch nicht implementiert)*
- [ ] KW-Druck-Button in KW-Navigation *(implementiert, aber noch ohne Feedback wenn keine Schichten)*

---

## Edge Cases
- Mitarbeiter-/Geräte-Tabelle leer → "Keine Einträge" im Druck, Quick-Buttons bleiben sichtbar auf Karte
- Sehr langer Text in "Ausgeführte Arbeiten" → Overflow auf zweite Seite möglich (kein Fix in MVP)
- Pause > Gesamtdauer → Nettostunden = 0
- Nachtschicht (Ende < Beginn): Nettostunden korrekt über Mitternacht berechnet (+1440 Min.)
- Nachtschicht-Datumslabel: "Mi/Do, 18./19. Mär"
- Druckfenster in Citrix: Pop-up-Blocker kann Druck verhindern

---

## Technical Requirements
- Karte: `width: 210mm; height: 297mm` — feste physische Größe, wird via `transform: scale()` skaliert
- Druckfunktion: `window.open()` + `window.print()` + inline CSS (kein Tailwind im Druckfenster)
- Keine neuen Pakete nötig

---

## QA Test Results

**Tested:** 2026-03-22 | **Tester:** QA Engineer (AI) | **Build:** PASS
**Getestete Dateien:**
- `src/app/projekte/[id]/page.tsx` (buildShiftPageDiv, buildShiftPrintHtml, handlePrintShift, handlePrintKW)
- `src/components/shift-card.tsx` (A4-Karte, alle Felder)
- `src/components/shift-grid.tsx` (Slot-Overlay mit Drucken/Loeschen)

---

### Acceptance Criteria: A4-Karte (Bildschirm)

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-1 | Karte A4, weisser Hintergrund | PASS | `shift-card.tsx:436-437` |
| AC-2 | Header: Firmenname + Adresse links, BTB-Titel + Badge rechts | PASS | `shift-card.tsx:449-465` |
| AC-3 | PROJEKT: Name, Kostenstelle, AG read-only | PASS | `shift-card.tsx:470-477` |
| AC-4 | WETTER: Temperatur, Witterung (8), Bodenzustand (5) | PASS | `shift-card.tsx:478-491`, `WITTERUNG_OPTIONS` hat 8, `BODENZUSTAND_OPTIONS` hat 5 |
| AC-5 | ARBEITSZEIT: Beginn/Ende (HH:MM), Pause, Nettostunden | PASS | Custom TimeInput mit Popup, Nettostunden auto-berechnet |
| AC-6 | OERTLICHKEIT: Gleis/Strecke/Bauteil | PASS (teilweise) | `gl` Feld vorhanden. **ABER** `kv` (km von) und `kb` (km bis) fehlen auf der Karte -- siehe BUG-S3-3 in PROJ-3. |
| AC-7 | MITARBEITER-Tabelle + Quick-Buttons + Gesamt | PASS | `shift-card.tsx:544-564` |
| AC-8 | GERAETE-Tabelle + Quick-Buttons + Gesamt | PASS | `shift-card.tsx:566-587` |
| AC-9 | Quick-Add befuellt Std mit Nettostunden | PASS | `handleAddWorker/handleAddEquipment` in `page.tsx:612-621, 691-700` |
| AC-10 | ARBEITEN: Textarea auto-resize | PASS | `RichTextArea` mit contentEditable, auto-resize durch natuerliche Hoehe |
| AC-11 | VORKOMMNISSE: Textarea auto-resize | PASS | Analog zu AC-10 |
| AC-12 | Fusszeile: Auftragnehmer / Auftraggeber | PASS | `shift-card.tsx:607-619` |
| AC-13 | Eingabefelder ohne Rahmen | PASS | `border: 'none'` in inputStyle |
| AC-14 | Auto-Save | PASS | onBlur fuer Text, onChange fuer Selects, handleTimeBlur fuer Zeiten |
| AC-15 | Zeitaenderung aktualisiert alle Std-Felder | PASS | `handleTimeBlur` + `page.tsx:548-583` |
| AC-16 | Hover ueber Karte zeigt Drucken + Loeschen | PASS | `shift-grid.tsx:49-72` Slot mit group-hover |
| AC-17 | Firmenname aus companies (PROJ-5) + Fallback | PASS | `page.tsx:260-331` laed Company-Daten mit Fallback-Kette |

### Acceptance Criteria: Loeschen

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-L1 | Loeschen-Button oeffnet Bestaetigungsdialog | PASS | `DeleteShiftDialog` in `page.tsx:925-932` |
| AC-L2 | CASCADE Delete Workers + Equipment | PASS | DB-Constraint CASCADE auf shift_workers/shift_equipment |

### Acceptance Criteria: Drucken

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-D1 | Einzelschicht drucken: neues Fenster + Druckdialog | PASS | `handlePrintShift` Zeile 766-772: `window.open` + `window.print()` |
| AC-D2 | KW drucken: mehrseitig, chronologisch | PASS | `handlePrintKW` Zeile 775-812: page-break-after, Tag vor Nacht |
| AC-D3 | Drucklayout = Kartenansicht | PASS | `PRINT_STYLES` + `buildShiftPageDiv` reproduziert gleiche Sektionen |
| AC-D4 | @page A4 portrait margin 0 | PASS | `PRINT_STYLES` Zeile 38 |
| AC-D5 | Tagschicht orange, Nachtschicht blau | PASS | `schichtColor` in buildShiftPageDiv: `#e8a020` vs `#4a7cf7` |
| AC-D6 | Fonts: Syne + IBM Plex Sans via Google Fonts CDN | PASS | `<link>` in buildShiftPrintHtml Zeile 174 |
| AC-D7 | Leere Tabellen: "Keine Eintraege" | PASS | `buildShiftPageDiv` Zeile 132, 139 |
| AC-D8 | Pop-up-Blocker Hinweis-Toast | FAIL | Spec markiert als "noch nicht implementiert". Kein Toast wenn `window.open` null zurueckgibt -- Funktion kehrt still zurueck (Zeile 769). |
| AC-D9 | KW-Druck-Button ohne Feedback bei 0 Schichten | FAIL | Spec markiert als "noch nicht implementiert". `handlePrintKW` Zeile 788 `if (kwShifts.length === 0) return` -- stiller Abbruch. |

---

### Edge Cases

| # | Edge Case | Status | Anmerkung |
|---|-----------|--------|-----------|
| E1 | MA/Geraete leer -> "Keine Eintraege" im Druck | PASS | buildShiftPageDiv Zeile 132/139 |
| E2 | Langer Text in Arbeiten -> Overflow | PASS (MVP) | Kein Fix in MVP laut Spec, Overflow auf zweite Seite moeglich |
| E3 | Pause > Gesamtdauer -> 0 | PASS | `total > 0 ? ... : 0` |
| E4 | Nachtschicht korrekt ueber Mitternacht | PASS | `if (total < 0) total += 24 * 60` |
| E5 | Nachtschicht-Datumslabel "Mi/Do, 18./19." | PASS | `formatNightShiftDate` in kw-utils |
| E6 | Druckfenster in Citrix/Pop-up-Blocker | FAIL | Kein Hinweis bei blockiertem Pop-up (AC-D8) |

---

### Bug-Liste

#### BUG-D4-1: Druckfenster-Blocker kein Feedback (bekannt)
- **Severity:** Medium
- **Datei:** `src/app/projekte/[id]/page.tsx:769`
- **Beschreibung:** Wenn `window.open('', '_blank')` durch Pop-up-Blocker blockiert wird, gibt die Funktion `null` zurueck und der Code springt mit `return` ab -- ohne Toast oder Fehlermeldung.
- **Reproduktion:** Pop-up-Blocker im Browser aktivieren, Drucken klicken.
- **Erwartetes Verhalten:** Toast: "Pop-up-Blocker verhindert den Druck. Bitte erlaube Pop-ups fuer diese Seite."

#### BUG-D4-2: KW-Druck bei leerer KW ohne Feedback
- **Severity:** Low
- **Datei:** `src/app/projekte/[id]/page.tsx:788`
- **Beschreibung:** Wenn keine Schichten in der aktiven KW vorhanden sind, kehrt `handlePrintKW` still zurueck. Nutzer klickt "KW drucken" und nichts passiert.
- **Erwartetes Verhalten:** Toast: "Keine Schichten in dieser KW zum Drucken."

#### BUG-D4-3: arb/vor Felder nicht escaped im Druck-HTML (= BUG-S3-7)
- **Severity:** HIGH
- **Datei:** `src/app/projekte/[id]/page.tsx:149, 156`
- **Beschreibung:** Siehe BUG-S3-7 in PROJ-3. `shift.arb` und `shift.vor` werden ohne `escHtml()` in den Druck-Output injiziert. Stored-XSS-Vektor.
- **Priority:** Fix vor Deployment.

#### BUG-D4-4: km-Felder fehlen im Druck-Output
- **Severity:** Medium
- **Datei:** `src/app/projekte/[id]/page.tsx:121-124`
- **Beschreibung:** Die Oertlichkeit-Sektion im Druck zeigt nur `shift.gl`. Die Felder `shift.kv` (km von) und `shift.kb` (km bis) werden nicht gerendert. In der Spec sind diese Felder definiert.
- **Reproduktion:** Schicht mit km-Werten drucken -- km-Felder fehlen.

---

### Zusammenfassung

| Kategorie | Anzahl |
|-----------|--------|
| Acceptance Criteria PASS | 18/21 (2x FAIL bekannt/planned, 1x Teilweise: km-Felder) |
| Edge Cases PASS | 5/6 (1x FAIL: Pop-up-Feedback) |
| Bugs gefunden | 4 (1x High XSS, 2x Medium, 1x Low) |
| Production Ready | **NEIN** -- BUG-D4-3 (XSS) muss vor Deployment gefixt werden |

**Empfohlene naechste Schritte:**
1. (P0) BUG-D4-3: escHtml fuer arb/vor im Druck
2. (P1) BUG-D4-4: km-Felder in Druck + Karte anzeigen
3. (P2) BUG-D4-1: Pop-up-Blocker Feedback
4. (P3) BUG-D4-2: Leere-KW Feedback

## Deployment
_To be added by /deploy_
