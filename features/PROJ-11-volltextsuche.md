# PROJ-11: BTB-Volltextsuche

## Status: In Progress
**Created:** 2026-04-11
**Last Updated:** 2026-04-11

## Dependencies

| Feature | Art | Liefert |
|---------|-----|---------|
| PROJ-1 | Pflicht | Auth-Session + RLS |
| PROJ-3 | Pflicht | Schichtdaten (`shifts`, `ShiftWithDetails`) |
| PROJ-2 | Optional | Projektliste für projektübergreifende Suche (Phase 2) |

## Ziel der Funktion

Innerhalb eines Projekts können Bauleiter Schichten nach Freitext durchsuchen — z.B.
nach Arbeitsbeschreibungen (`arb`) oder Vorkommnissen (`vor`). Die passenden KWs werden
gefiltert angezeigt, alle nicht-passenden KWs ausgeblendet.

**Phase 1 (implementiert):** Intra-Projekt-Suche auf der BTB-Ansicht.  
**Phase 2 (geplant):** Projektübergreifende Suche über alle Projekte einer Firma.

## Seitenstruktur

Die Suche ist in die bestehende `KWNavigation`-Leiste integriert — kein eigener Tab,
keine eigene Route. Ein Suchfeld erscheint rechts in der Navigation.

```
┌─────────────────────────────────────────────────────────────────┐
│  KW01  KW02  KW03  …   [🔍 Suchfeld       ] [Suchen] [×]        │
├─────────────────────────────────────────────────────────────────┤
│  Gefilterte Schichtkarten (nur Treffer)                          │
└─────────────────────────────────────────────────────────────────┘
```

## User Stories

- Als Bauleiter möchte ich in den Schichtbeschreibungen eines Projekts nach einem Begriff
  suchen, damit ich eine bestimmte Schicht schnell wiederfinde.
- Als Bauleiter möchte ich die Suche mit einem Klick beenden und zur normalen KW-Ansicht
  zurückkehren.

## Acceptance Criteria

### Suche (Phase 1 — Intra-Projekt)
- [x] Suchfeld in `KWNavigation` (Props: `searchQuery`, `onSearch`, `onClearSearch`,
      `searchResultCount`)
- [x] Suche filtert Schichten nach `arb` (Arbeitsbeschreibung) und `vor` (Vorkommnisse)
- [x] Gefilterte Schichten werden in `displayedShifts` übergeben (Seite page.tsx)
- [x] „×"-Button beendet Suche und zeigt alle KWs wieder
- [x] `searchResultCount` zeigt Trefferanzahl in der Navigationsleiste
- [ ] Suche greift auch auf Mitarbeiter-Namen (`shift_workers`) — **noch nicht implementiert**
- [ ] Trefferbegriff wird im Schicht-Text hervorgehoben — **noch nicht implementiert**

### Suche (Phase 2 — Projektübergreifend, geplant)
- [ ] Eigene Suchseite `/suche` oder Modal mit projektenübergreifenden Ergebnissen
- [ ] Suche über alle Projekte der eigenen Firma
- [ ] Ergebnis: Liste von Schichten mit Projekt + Datum + Snippet

## Aktueller Implementierungsstand

**Implementiert (page.tsx:221–232):**
```tsx
// Volltextsuche (PROJ-11)
const [searchQuery, setSearchQuery] = useState('')

const matchSearch = useCallback((s: ShiftWithDetails) => {
  const q = searchQuery.toLowerCase()
  return (
    (s.arb ?? '').toLowerCase().includes(q) ||
    (s.vor ?? '').toLowerCase().includes(q)
  )
}, [searchQuery])

const displayedShifts = searchQuery ? shifts.filter(matchSearch) : shifts
```

**Implementiert (kw-navigation.tsx):**
- Props: `searchQuery`, `onSearch`, `onClearSearch`, `searchResultCount`
- UI: Suchfeld + Suchen-Button + ×-Button rechts in der KW-Leiste

**Noch offen:**
- Suche auf Mitarbeiter-Namen erweitern
- Treffer-Highlighting in ShiftCard
- Phase 2 (projektübergreifend)

## Technical Requirements

- Keine neue DB-Tabelle nötig — clientseitiges Filtering auf bereits geladene Schichten
- Phase 2 würde API-Route oder Supabase Full-Text-Search (`to_tsvector`) benötigen

## Deployment
_To be added by /deploy_

---

## QA Test Results

**Tested:** 2026-04-11
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

### Acceptance Criteria Status

#### AC-1: Suchfeld in KWNavigation
- [x] Suchfeld ist als "Such-Chip" in der KW-Navigationsleiste integriert (kw-navigation.tsx, Zeile 193-246)
- [x] Props `searchQuery`, `onSearch`, `onClearSearch`, `searchResultCount` korrekt definiert und verbunden
- [x] Suchen-Button deaktiviert bei leerem Eingabefeld (`disabled={!inputValue.trim()}`)
- [x] Enter-Taste loest Suche aus, Escape-Taste beendet Suche

#### AC-2: Suche filtert nach arb und vor
- [x] `matchSearch` filtert korrekt auf `arb` (Arbeitsbeschreibung) und `vor` (Vorkommnisse)
- [x] Suche ist case-insensitive (`.toLowerCase()`)
- [x] Null-Safety: `(s.arb ?? '')` verhindert Fehler bei leeren Feldern

#### AC-3: Gefilterte Schichten in displayedShifts
- [x] `displayedShifts = searchQuery ? shifts.filter(matchSearch) : shifts` korrekt implementiert
- [x] `displayedShifts` wird an KWNavigation UND ShiftGrid uebergeben
- [x] DotRaster in KW-Chips zeigt nur Treffer-Schichten waehrend aktiver Suche

#### AC-4: X-Button beendet Suche
- [x] X-Button erscheint nur bei aktiver Suche (`isSearchActive ? X-Button : Suchen-Button`)
- [x] `handleClear` setzt `inputValue` zurueck und ruft `onClearSearch` auf
- [x] `onClearSearch` setzt `searchQuery` auf '' in page.tsx, was alle Schichten wieder anzeigt

#### AC-5: searchResultCount zeigt Trefferanzahl
- [x] `searchResultCount={searchQuery ? displayedShifts.length : undefined}` korrekt berechnet
- [x] Anzeige "X Treffer" im Such-Chip neben "Suchen"-Label

#### AC-6: Suche auf Mitarbeiter-Namen (shift_workers) -- NOCH NICHT IMPLEMENTIERT
- [ ] OFFEN: Wie im Spec dokumentiert, greift die Suche nicht auf `shift_workers.beruf` oder Mitarbeiternamen

#### AC-7: Treffer-Highlighting -- NOCH NICHT IMPLEMENTIERT
- [ ] OFFEN: Wie im Spec dokumentiert, keine Hervorhebung des Suchbegriffs in ShiftCard

### Edge Cases Status

#### EC-1: Leerer Suchbegriff
- [x] Suchen-Button ist deaktiviert bei leerem/whitespace-only Input
- [x] `inputValue.trim()` verhindert Suche mit nur Leerzeichen

#### EC-2: Kein Treffer
- [x] Bei 0 Treffern: "0 Treffer" wird angezeigt, ShiftGrid zeigt leere Slots (EmptySlot) fuer aktive KW

#### EC-3: Sonderzeichen im Suchbegriff
- [x] Kein Risiko: `.includes()` behandelt Sonderzeichen als Literale (kein Regex), kein XSS da kein `dangerouslySetInnerHTML`

#### EC-4: Suche ueber KW-Grenzen hinweg
- [ ] BUG: Suche filtert alle Schichten des Projekts, aber ShiftGrid zeigt nur Tage der aktiven KW. Wenn Treffer in KW05 liegen, der User aber KW01 betrachtet, sieht er leere Slots statt der Treffer. Es fehlt ein visueller Hinweis, welche KWs Treffer enthalten (z.B. farbliche Markierung der KW-Chips).

#### EC-5: Sync von inputValue und searchQuery
- [x] `useEffect` synchronisiert `inputValue` zurueck wenn `searchQuery` extern zurueckgesetzt wird

#### EC-6: Suche waehrend Schichtbearbeitung
- [x] Kein Konflikt: `displayedShifts` ist ein abgeleiteter Wert, Aenderungen an Schichten aktualisieren `shifts` State und damit auch die gefilterte Liste

#### EC-7: Suche schliesst Felder gl/kv/kb aus
- [x] Gewolltes Verhalten laut Spec -- nur `arb` und `vor` werden durchsucht. Allerdings waere `gl` (Oertlichkeit) ein sinnvoller Kandidat fuer zukuenftige Erweiterung.

### Security Audit Results

- [x] Authentifizierung: Seite `/projekte/[id]` ist durch Middleware geschuetzt, kein Zugriff ohne Login
- [x] Autorisierung: Supabase-Query filtert auf `project_id`, RLS-Policies schuetzen Datenzugriff
- [x] Input-Validierung: Suchbegriff wird nur client-seitig als String-Vergleich verwendet, kein SQL/NoSQL/XSS-Vektor
- [x] Keine neue API-Route: Suche ist rein client-seitig auf bereits geladenen Daten -- kein Injection-Risiko
- [x] Kein `dangerouslySetInnerHTML`: Alle Werte werden ueber React JSX gerendert (automatisches Escaping)
- [x] Rate-Limiting: Nicht relevant da kein Server-Request bei Suche
- [x] Keine sensiblen Daten exponiert: Suchbegriff wird nicht an Server gesendet, nicht in URL gespeichert

### Bugs Found

#### BUG-1: Keine visuelle Kennzeichnung von KW-Chips mit Treffern bei aktiver Suche
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Oeffne ein Projekt mit Schichten in mehreren KWs
  2. Gib einen Suchbegriff ein, der nur in bestimmten KWs vorkommt
  3. Expected: KW-Chips mit Treffern sind visuell hervorgehoben (z.B. Badge, farbiger Rand), damit der User weiss wo er klicken soll
  4. Actual: Alle KW-Chips sehen gleich aus; nur das DotRaster zeigt weniger Punkte, was schwer erkennbar ist
- **Priority:** Fix in next sprint

#### BUG-2: Suchfeld fehlt auf mobilen Breakpoints (375px)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Oeffne die BTB-Ansicht auf einem 375px-Viewport
  2. Such-Chip hat `minWidth: 180px` und befindet sich im scrollbaren KW-Container
  3. Expected: Suchfeld ist gut erreichbar und nutzbar auf kleinen Screens
  4. Actual: Suchfeld wird zusammen mit KW-Chips horizontal gescrollt und ist moeglicherweise nicht sofort sichtbar; ausserdem ist ein 180px breites Eingabefeld auf 375px Gesamtbreite eng, besonders neben Print/Zoom-Controls
- **Priority:** Fix in next sprint

#### BUG-3: Kein Feedback wenn keine Schichten geladen sind
- **Severity:** Low
- **Steps to Reproduce:**
  1. Oeffne ein Projekt ohne Schichten
  2. Gib einen Suchbegriff ein und klicke "Suchen"
  3. Expected: Hinweistext wie "Keine Schichten vorhanden" oder Suchfeld wird ausgeblendet
  4. Actual: "0 Treffer" wird angezeigt, was korrekt aber nicht besonders hilfreich ist
- **Priority:** Nice to have

### Cross-Browser Assessment

| Browser | Status | Anmerkung |
|---------|--------|-----------|
| Chrome | OK | Standard-Input und Flexbox funktionieren einwandfrei |
| Firefox | OK | Keine bekannten Inkompatibilitaeten mit verwendeten CSS-Features |
| Safari | Pruefung empfohlen | `min-width` auf Flex-Items und `scrollIntoView` koennen sich unterschiedlich verhalten |

### Responsive Assessment

| Breakpoint | Status | Anmerkung |
|------------|--------|-----------|
| 375px (Mobile) | Eingeschraenkt | BUG-2: Suchfeld im horizontalen Scroll-Bereich, schwer erreichbar |
| 768px (Tablet) | OK | Ausreichend Platz fuer Such-Chip + KW-Chips |
| 1440px (Desktop) | OK | Optimale Darstellung |

### Summary
- **Acceptance Criteria:** 5/7 bestanden (2 sind dokumentiert als "noch nicht implementiert" und kein Bug)
- **Bugs Found:** 3 total (0 critical, 0 high, 2 medium, 1 low)
- **Security:** Bestanden -- keine Findings. Rein client-seitige Suche ohne Server-Interaktion minimiert Angriffsflaeche.
- **Production Ready:** JA (fuer Phase 1)
- **Recommendation:** Die implementierten Features funktionieren korrekt. BUG-1 und BUG-2 sind UX-Verbesserungen, die im naechsten Sprint adressiert werden sollten. Die zwei offenen ACs (Mitarbeiter-Suche, Highlighting) sind bereits im Spec als "noch nicht implementiert" dokumentiert und blockieren Phase 1 nicht.
