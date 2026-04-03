# PROJ-8: PaperEngine

## Status: In Progress
**Created:** 2026-04-03
**Last Updated:** 2026-04-03

## Dependencies
- PROJ-7: Arbeitsanmeldung (wird migriert)

## Kontext
Die BTB-App digitalisiert physische Formulare. Bisher haben alle Formulare (BTB, Arbeitsanmeldung) zwei getrennte Render-Pfade: eine React-Komponente für die Anzeige und einen separaten HTML-String-Builder für den Druck. Das führt zu strukturellen Inkonsistenzen zwischen Anzeige und Druck (z.B. unterschiedliche Spaltenbreiten in der AA).

Die PaperEngine löst dieses Problem durch ein einheitliches 3-Layer-Modell:
- **Layer 1 – Paper:** DIN-A4-Container (Hochformat oder Querformat), immer gleich
- **Layer 2 – Overlay:** Auswechselbare Eingabemaske (React-Komponente), enthält Layout + Daten
- **Layer 3 – Print:** Druckt exakt das, was Layer 1+2 zeigen – kein separater Render-Pfad

## User Stories
- Als Bauleiter möchte ich, dass der Druck exakt das zeigt was ich auf dem Bildschirm sehe
- Als Entwickler möchte ich neue Formulare nur als Overlay bauen, ohne Druck-Logik implementieren zu müssen
- Als Nutzer möchte ich den Zoom anpassen können um das Formular bequem zu bearbeiten

## Acceptance Criteria
- [ ] PaperEngine-Komponente existiert in `src/components/paper-engine.tsx`
- [ ] Engine akzeptiert `orientation: 'portrait' | 'landscape'` und `children` (das Overlay)
- [ ] Zoom (40–100%) ist Teil der Engine, gesteuert via `TriangleZoomContainer`
- [ ] Print-Button ist Teil der Engine, löst `window.print()` aus
- [ ] `@media print` in globals.css: alles außer `.paper-print-target` wird ausgeblendet
- [ ] `[data-no-print]`-Elemente verschwinden beim Drucken
- [ ] Inputs und Textareas zeigen im Druck ihren Wert (kein leeres Feld)
- [ ] Arbeitsanmeldung ist auf PaperEngine migriert – `buildAAPrintHtml` ist entfernt
- [ ] Druck-Ausgabe der AA ist visuell identisch mit der Bildschirm-Ansicht
- [ ] BTB bleibt unverändert

## Edge Cases
- Pop-up-Blocker blockiert `window.print()` nicht mehr (da kein neues Fenster geöffnet wird)
- Zoom betrifft nur die Bildschirm-Darstellung, nicht den Druck (Druck immer 100%)
- `data-no-print` Elemente (Buttons, Hinweise) erscheinen nicht im Druck

## Tech Design

### Komponenten-Architektur

```
ArbeitsanmeldungPage (Daten-Layer: Supabase, State, KW-Navigation)
  └── PaperEngine (orientation="landscape", zoom, onPrint)
        └── WorkNotificationTable (reines Overlay: Layout + Inputs)
```

### PaperEngine Props
```tsx
interface PaperEngineProps {
  orientation: 'portrait' | 'landscape'
  zoom?: number
  onZoomChange?: (zoom: number) => void
  children: React.ReactNode
}
```

### Print-Strategie
- Kein `window.open()`, kein HTML-String-Builder
- `window.print()` direkt auf der aktuellen Seite
- `@media print` CSS blendet alles außer `.paper-print-target` aus (visibility-Trick)
- Zoom wird für Druck auf 100% zurückgesetzt (transform: scale(1))

### globals.css @media print Regeln
```css
@media print {
  body * { visibility: hidden; }
  .paper-print-target,
  .paper-print-target * { visibility: visible; }
  .paper-print-target {
    position: fixed; left: 0; top: 0;
    transform: none !important;
  }
  [data-no-print] { display: none !important; }
  input, textarea, select {
    -webkit-appearance: none;
    border: none !important;
    background: transparent !important;
    resize: none;
  }
}
```

### data-no-print Konvention
Alle interaktiven UI-Elemente die nicht gedruckt werden sollen erhalten `data-no-print="true"`:
- "+ Arbeit hinzufügen" Button
- "Vom Vortag übernehmen" Button
- "Tag entfernen" (×) Button
- Print- und Delete-Buttons (jetzt in Engine)

### Zoom
- Zoom-State bleibt in der jeweiligen Page (wie heute beim BTB)
- Engine erhält `zoom` als Prop und wendet `transform: scale(zoom/100)` auf den Paper-Container an
- `TriangleZoomContainer` (bereits vorhanden) wird in die Engine integriert

### Nicht in Scope
- BTB-Migration (BTB läuft stabil, wird nicht angefasst)
- Overlay-Builder / Schema-basierte Overlays (Zukunftsvision)
- Multi-Page-Support (AA ist immer 1 Seite)

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
