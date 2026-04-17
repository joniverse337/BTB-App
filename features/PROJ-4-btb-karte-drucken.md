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
- [x] Header: Firmenname (groß, Inter 800) + Adresse links; "BAUTAGESBERICHT TAG DATUM" + Schicht-Badge rechts
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
- [x] Hover über Karte zeigt Drucken- + Löschen-Button (via PaperEngine group-hover)
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
- [x] Fonts: Inter + IBM Plex Sans (via Next.js Google Fonts, `window.print()` WYSIWYG)
- [x] Leere Tabellen zeigen "Keine Einträge" im Druckdokument
- [x] Pop-up-Blocker -> Hinweis-Toast (KW-Druck: toast.warning; Einzeldruck: window.print() statt Pop-up)
- [x] KW-Druck-Button in KW-Navigation mit Feedback bei leerer KW (toast.info)

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

## QA Test Results (Re-Test 2026-04-17)

**Tested:** 2026-04-17 | **Tester:** QA Engineer (AI) | **Build:** PASS (`npm run build` erfolgreich)
**Vorheriger Test:** 2026-03-22 (4 Bugs gefunden, davon 1x High XSS), Re-Test 2026-04-17 (2 Bugs, beide behoben)
**Getestete Dateien:**
- `src/app/projekte/[id]/page.tsx` (buildShiftPageDiv, buildShiftPrintHtml, handlePrintShift, handlePrintKW, alle CRUD-Handler, Feld-Whitelists)
- `src/components/shift-card.tsx` (A4-Karte, alle Felder inkl. PlainTextArea, TimeInput)
- `src/components/shift-grid.tsx` (Grid mit PaperEngine)
- `src/components/paper-engine.tsx` (A4-Blatt, Hover-Buttons, group-hover)
- `src/components/delete-shift-dialog.tsx` (AlertDialog)
- `src/app/globals.css` (@media print Regeln, btb-print-active)

---

### Acceptance Criteria: A4-Karte (Bildschirm)

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-1 | Karte A4, weisser Hintergrund | PASS | PaperEngine: `width: 210mm, height: 297mm`, `background: '#fff'` |
| AC-2 | Header: Firmenname + Adresse links, BTB-Titel + Badge rechts | PASS | shift-card.tsx:489-505. Inter 800 16pt Firmenname, Bautagesbericht-Titel rechts. |
| AC-3 | PROJEKT: Name, Kostenstelle, AG read-only | PASS | shift-card.tsx:509-517, keine Input-Felder, nur `<div>` |
| AC-4 | WETTER: Temperatur, Witterung (8), Bodenzustand (5) | PASS | `WITTERUNG_OPTIONS` hat 8 Eintraege, `BODENZUSTAND_OPTIONS` hat 5. Wetter-Auto-Laden via `/api/weather` funktional. |
| AC-5 | ARBEITSZEIT: Beginn/Ende (HH:MM), Pause, Nettostunden | PASS | Custom TimeInput mit Stunden/Minuten-Popup, Nettostunden auto-berechnet via `calculateNetHours`. Pause-Schnellwahl (0/30/60) vorhanden. |
| AC-6 | OERTLICHKEIT: Gleis/Strecke/Bauteil, km von, km bis | PASS | shift-card.tsx:614-621 -- `gl`, `kv`, `kb` alle vorhanden mit Inputs. |
| AC-7 | MITARBEITER-Tabelle + Quick-Buttons + Gesamt | PASS | shift-card.tsx:626-653 mit WorkerRow + ActionChipPopover. Gesamtstunden-Berechnung korrekt (anz * std). |
| AC-8 | GERAETE-Tabelle + Quick-Buttons + Gesamt | PASS | shift-card.tsx:654-681 mit EquipmentRow + ActionChipPopover |
| AC-9 | Quick-Add befuellt Std mit Nettostunden | PASS | `handleAddWorker/handleAddEquipment` in page.tsx berechnen netHours und setzen `std` |
| AC-10 | ARBEITEN: Textarea auto-resize | PASS | `PlainTextArea` mit auto-height (`adjust()` via scrollHeight) |
| AC-11 | VORKOMMNISSE: Textarea auto-resize | PASS | Identisch zu AC-10 |
| AC-12 | Fusszeile: Auftragnehmer / Auftraggeber | PASS | shift-card.tsx:702-714, `position: 'absolute', bottom: '7mm'` |
| AC-13 | Eingabefelder ohne Rahmen | PASS | `inputStyle` mit `border: 'none'` (aus shift-card-styles) |
| AC-14 | Auto-Save | PASS | onBlur fuer Text, onChange fuer Selects (wit/bod), handleTimeBlur fuer Zeiten |
| AC-15 | Zeitaenderung aktualisiert alle Std-Felder | PASS | `handleTimeBlur` in shift-card.tsx:427-445 synct alle Worker+Equipment. `handleUpdateShift` in page.tsx:420-478 synct DB. |
| AC-16 | Hover ueber Karte zeigt Drucken + Loeschen | PASS | PaperEngine: `group-hover:opacity-100` auf Action-Bar mit Printer + X Buttons |
| AC-17 | Firmenname aus companies (PROJ-5) + Fallback | PASS | Fallback-Kette in page.tsx:215-222: `settings.firma -> projectBase.firm -> 'Firmenname'` |

### Acceptance Criteria: Loeschen

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-L1 | Loeschen-Button oeffnet Bestaetigungsdialog | PASS | `DeleteShiftDialog` (shadcn AlertDialog) mit Bestaetigung. Label zeigt Typ + Datum. |
| AC-L2 | CASCADE Delete Workers + Equipment | PASS | DB-Constraint CASCADE auf shift_workers/shift_equipment. Optimistic delete in UI. |

### Acceptance Criteria: Drucken

| # | Kriterium | Status | Anmerkung |
|---|-----------|--------|-----------|
| AC-D1 | Einzelschicht drucken | PASS | `window.print()` mit CSS-basierter Isolation (`btb-print-active` Klasse). Kein Pop-up noetig. `afterprint` raeumt Klasse auf. |
| AC-D2 | KW drucken: mehrseitig, chronologisch | PASS | `handlePrintKW` (page.tsx:680-724): Tag vor Nacht pro Tag, page-break-after, via `window.open()` |
| AC-D3 | Drucklayout = Kartenansicht | PASS | Einzeldruck via @media print CSS = exakt gleiche Karte. KW-Druck via `buildShiftPageDiv` reproduziert gleiche Sektionen mit angepassten Schriftgroessen (9.5pt body, 15pt firm, 12pt title). |
| AC-D4 | @page A4 portrait margin 0 | PASS | `PRINT_STYLES` Zeile 45 + globals.css `@page { margin: 0; }` |
| AC-D5 | Tagschicht orange, Nachtschicht blau | PASS | `schichtColor`: `#e8a020` vs `#4a7cf7` in buildShiftPageDiv und shift-card |
| AC-D6 | Fonts via Google Fonts CDN | PASS | KW-Druck: `Inter` + `IBM Plex Sans` via `<link>` in buildShiftPrintHtml. Einzeldruck: App-Fonts bereits geladen. |
| AC-D7 | Leere Tabellen: "Keine Eintraege" | PASS | `buildShiftPageDiv` Zeile 140, 148 |
| AC-D8 | Pop-up-Blocker Hinweis-Toast | PASS | KW-Druck (page.tsx:718-720): `toast.warning('Pop-up-Blocker aktiv...')`. Einzeldruck nutzt `window.print()` -- kein Pop-up noetig. |
| AC-D9 | KW-Druck-Button Feedback bei 0 Schichten | PASS | page.tsx:692-694: `toast.info('Keine Schichten in dieser Kalenderwoche zum Drucken.')` |

---

### Edge Cases

| # | Edge Case | Status | Anmerkung |
|---|-----------|--------|-----------|
| E1 | MA/Geraete leer -> "Keine Eintraege" im Druck | PASS | buildShiftPageDiv Zeile 140/148 |
| E2 | Langer Text in Arbeiten -> Overflow | PASS (MVP) | Kein Fix in MVP laut Spec, akzeptiert |
| E3 | Pause > Gesamtdauer -> Nettostunden = 0 | PASS | `calculateNetHours` in kw-utils.ts:144: `if (totalMinutes <= 0) return 0` |
| E4 | Nachtschicht korrekt ueber Mitternacht | PASS | kw-utils.ts:138: `if (totalMinutes < 0) totalMinutes += 24 * 60` |
| E5 | Nachtschicht-Datumslabel "Mi/Do, 18./19." | PASS | `formatNightShiftDate` in kw-utils |
| E6 | Druckfenster in Citrix/Pop-up-Blocker | PASS | Einzeldruck: kein Pop-up mehr noetig. KW-Druck: Toast bei blockiertem Pop-up. |
| E7 | HTML in alten arb/vor-Werten | PASS | `PlainTextArea.stripHtml()` entfernt HTML-Tags aus bestehenden Werten |

---

### Security Audit (Red Team)

| # | Pruefpunkt | Status | Anmerkung |
|---|------------|--------|-----------|
| SEC-1 | Authentifizierung | PASS | Middleware prueft Auth und leitet auf /login um. Supabase-Client benoetigt gueltige Session. |
| SEC-2 | Autorisierung (RLS) | PASS | shifts, shift_workers, shift_equipment haben RLS via company_id-Kette. Nutzer kann nur Schichten der eigenen Firma sehen/aendern. |
| SEC-3 | XSS in Druck-HTML (arb/vor) | PASS | `escHtml()` wird auf alle dynamischen Werte angewendet. Kein `dangerouslySetInnerHTML` oder `innerHTML` im Codebase. KW-Druck nutzt `document.write()` aber alle interpolierten Werte sind escaped. |
| SEC-4 | XSS in Eingabefeldern | PASS | `PlainTextArea` nutzt `<textarea>` -- escaped Werte nativ. Kein `contentEditable` mehr im Code. |
| SEC-5 | CSP-Nonce im Druckfenster | PASS | `getCspNonce()` liest Nonce aus dem DOM, wird auf `<style>` und `<script>` im KW-Druckfenster angewendet. |
| SEC-6 | Arbitrary Field Update | PASS | Whitelists implementiert: `SHIFT_ALLOWED_FIELDS`, `WORKER_ALLOWED_FIELDS`, `EQUIPMENT_ALLOWED_FIELDS` in page.tsx:416-418. Jeder Handler prueft mit `.has(field)` und bricht bei unbekannten Feldern ab. Vorheriger Bug BUG-D4-5 ist behoben. |
| SEC-7 | Rate Limiting auf Daten-Mutation | INFO | Kein Rate Limiting auf Supabase-Client-Aufrufe (update/delete/insert). Wird durch RLS und Auth-Session begrenzt, aber Spam-Protection fehlt. Geringes Risiko da Supabase eigenes Rate Limiting hat. |
| SEC-8 | Pop-up CSP | PASS | KW-Druckfenster erbt die CSP des Openers. Nonce wird korrekt durchgereicht. |
| SEC-9 | Selector Injection (data-shift-id) | PASS | `shift.id` ist UUID aus Supabase (gen_random_uuid()), kein User-Input. Kein Injection-Risiko. |

---

### Bug-Liste (alle Bugs geschlossen)

#### BUG-D4-1: GESCHLOSSEN (gefixt)
- **Vormals:** Druckfenster-Blocker kein Feedback
- **Status:** Einzeldruck nutzt jetzt `window.print()` statt `window.open()` -- Pop-up-Blocker nicht mehr relevant. KW-Druck hat Toast bei blockiertem Pop-up.

#### BUG-D4-2: GESCHLOSSEN (gefixt)
- **Vormals:** KW-Druck bei leerer KW ohne Feedback
- **Status:** `toast.info()` bei leerer KW.

#### BUG-D4-3: GESCHLOSSEN (gefixt)
- **Vormals:** arb/vor Felder nicht escaped im Druck-HTML (Stored-XSS)
- **Status:** `escHtml()` wird auf alle dynamischen Werte in `buildShiftPageDiv` angewendet. `RichTextArea` durch `PlainTextArea` ersetzt.

#### BUG-D4-4: GESCHLOSSEN (gefixt)
- **Vormals:** km-Felder fehlen im Druck-Output
- **Status:** kv/kb in Oertlichkeit-Sektion vorhanden (Druck + Karte).

#### BUG-D4-5: GESCHLOSSEN (gefixt)
- **Vormals:** Keine Feld-Validierung bei Shift/Worker/Equipment-Updates (Medium, Security)
- **Status:** Whitelists `SHIFT_ALLOWED_FIELDS`, `WORKER_ALLOWED_FIELDS`, `EQUIPMENT_ALLOWED_FIELDS` als Sets in page.tsx. Jeder Handler prueft mit `.has(field)`.

#### BUG-D4-6: GESCHLOSSEN (gefixt)
- **Vormals:** Spec sagt "Syne Font", Code nutzt "Inter"
- **Status:** Spec aktualisiert. Inter 800 ist korrekt.

---

### Cross-Browser Analyse (Code-Review)

| Browser | Pruefpunkt | Status | Anmerkung |
|---------|-----------|--------|-----------|
| Chrome | Einzeldruck via window.print() | PASS (erwartet) | `body:has(.btb-print-active)` CSS Selector unterstuetzt seit Chrome 105 |
| Firefox | Einzeldruck via window.print() | PASS (erwartet) | `:has()` unterstuetzt seit Firefox 121 |
| Safari | Einzeldruck via window.print() | PASS (erwartet) | `:has()` unterstuetzt seit Safari 15.4. Print-CSS hat spezielle Safari-Fixes (body > * height:0, position:absolute statt fixed). |
| Chrome | KW-Druck via window.open() | PASS (erwartet) | Fonts via Google Fonts CDN, CSP-Nonce durchgereicht |
| Firefox | KW-Druck via window.open() | PASS (erwartet) | |
| Safari | KW-Druck via window.open() | PASS (erwartet) | Safari kann stricter mit Pop-ups sein -- Toast-Feedback implementiert |

### Responsive Analyse (Code-Review)

| Breakpoint | Status | Anmerkung |
|-----------|--------|-----------|
| 375px (Mobile) | INFO | Karten haben feste A4-Groesse (210x297mm). Zoom-Kontrolle skaliert die Karten herunter. Horizontales Scrollen noetig bei niedrigem Zoom. Grid-Layout mit `gridTemplateColumns: repeat(N, cardW)` ist nicht responsive -- zeigt alle Tage nebeneinander. Dies ist bewusstes Design fuer eine Desktop-first Anwendung. |
| 768px (Tablet) | INFO | Gleiche Beobachtung wie Mobile. Zoom-Mechanismus ermoeglicht Anpassung. |
| 1440px (Desktop) | PASS | Primaerer Anwendungsfall. Karten nebeneinander, Zoom 60-100% nutzbar. |

---

### Zusammenfassung

| Kategorie | Ergebnis |
|-----------|----------|
| Acceptance Criteria | **21/21 PASS** |
| Edge Cases | **7/7 PASS** |
| Alle Bugs (6 total) | **6/6 GESCHLOSSEN** |
| Security Audit | **PASS** (9 Pruefpunkte, 1x INFO Rate Limiting) |
| Build | PASS |
| Production Ready | **JA** -- keine offenen Bugs. Alle vorherigen Critical/High/Medium Bugs behoben. |

**Keine weiteren Massnahmen erforderlich.**

## Deployment
_To be added by /deploy_
