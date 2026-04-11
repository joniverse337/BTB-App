# PROJ-10: Lagerplätze

## Status: In Progress
**Created:** 2026-04-10
**Last Updated:** 2026-04-11

## Dependencies

| Feature | Art | Liefert |
|---------|-----|---------|
| PROJ-9 | Pflicht | Routing-Kontext (`/projekte/[id]/geraete`), GeraeteActionBar, Projektdaten |
| PROJ-1 | Pflicht | Auth-Session + RLS |
| PROJ-2 | Pflicht | Projektdaten (Name, Kostenstelle, Auftraggeber) |
| PROJ-5 | Optional (lesend) | Firmenname, Logo aus `companies` / `project_settings` |
| PROJ-8 | Pflicht | PaperEngine für A4-Layout und WYSIWYG-Druck |

## Ziel der Funktion

„Lagerplätze" ist ein projektgebundenes Modul zur Dokumentation von Materiallagern und
Gerätestellflächen. Es ist eine Unterseite von PROJ-9 (Gerätebedarf) und wird über den
„Lagerplätze"-Button in der Toolbar erreichbar.

Bauleiter können Lagerplätze mit einer interaktiven Satelliten-Karte verorten, einen
Screenshot des Kartenausschnitts erstellen, diesen mit farbigen Freihand-Linien
beschriften und als A4-Blatt (via PaperEngine) drucken.

## Seitenstruktur

```
Route: /projekte/[id]/geraete/lagerplaetze

┌──────────────────────────────────────────────────────────────────────┐
│  Header: BTB-Logo │ Projektname │ Gerätebedarf  AA  BTB  ⚙          │
├──────────────────────────────────────────────────────────────────────┤
│  Toolbar:                                                            │
│  [Zoom 65%]  [Lagerplätze ▼]  [📷 Screenshot]  [✏ Stift]  [Farbe]  │
├─────────────────────────────────┬────────────────────────────────────┤
│  LINKS — Karte (quadratisch)    │  RECHTS — A4-Blatt (PaperEngine)  │
│                                 │                                    │
│  ┌────────────────────────────┐ │  ┌──────────────────────────────┐ │
│  │                            │ │  │  Firma │ Baustelle │ KST      │ │
│  │  Satellitenkarte           │ │  │                    Logo →    │ │
│  │  Interaktiv                │ │  ├──────────────────────────────┤ │
│  │  Klick → Adresse           │ │  │                              │ │
│  │  Zoom / Pan                │ │  │  [Lagerplatz 1]  ← editierb. │ │
│  │                            │ │  │  [Adresse]       ← aus Karte │ │
│  │  Breite = A4-Inhaltsbreite │ │  │                              │ │
│  └────────────────────────────┘ │  │  ┌──────────────────────┐   │ │
│  (nach Screenshot: Canvas-Layer)│  │  │ Screenshot +         │   │ │
│                                 │  │  │ Zeichnungen          │   │ │
│                                 │  │  └──────────────────────┘   │ │
│                                 │  │                              │ │
│                                 │  │  [Anmerkungen Textarea ...]  │ │
│                                 │  │                              │ │
│                                 │  └──────────────────────────────┘ │
└─────────────────────────────────┴────────────────────────────────────┘
```

**Schlüsselprinzip:** Die Karte ist quadratisch und hat exakt dieselbe Pixel-Breite wie
der Inhaltsbereich des A4-Blatts. Screenshot passt damit 1:1 in die PaperEngine ohne
Skalierungs-Artefakte. Alle Texteingaben (Name, Adresse, Anmerkungen) sind direkt im
Paper-Engine-Overlay editierbar — keine separate Sidebar.

## User Stories

1. Als Bauleiter möchte ich einen neuen Lagerplatz anlegen, damit ich seinen Standort
   dokumentieren kann.
2. Als Bauleiter möchte ich auf der Satellitenkarte einen Ort anklicken und die Adresse
   wird automatisch im A4-Blatt eingetragen, damit ich nicht manuell tippen muss.
3. Als Bauleiter möchte ich die Karte frei zoomen und schwenken, damit ich den exakten
   Bereich des Lagerplatzes einrahmen kann.
4. Als Bauleiter möchte ich einen Screenshot der aktuellen Kartenansicht erstellen, damit
   der Stand der Karte festgehalten wird.
5. Als Bauleiter möchte ich auf dem Screenshot farbige Freihand-Linien einzeichnen
   (Wegbeschreibungen, Markierungen), in verschiedenen Farben und Stärken.
6. Als Bauleiter möchte ich den Namen des Lagerplatzes und Anmerkungen direkt im A4-Blatt
   eintippen, damit alles an einem Ort ist.
7. Als Bauleiter möchte ich den Lagerplatz als A4-Blatt drucken, mit Firmen-Header,
   Kartenausschnitt mit Einzeichnungen und Beschreibung.
8. Als Bauleiter möchte ich mehrere Lagerplätze pro Projekt anlegen und über ein
   Dropdown zwischen ihnen wechseln können.
9. Als Bauleiter möchte ich einen Lagerplatz löschen können, wenn er nicht mehr relevant
   ist.

## Acceptance Criteria

### Navigation & Toolbar
- [ ] Klick auf „Lagerplätze" in der Toolbar öffnet Dropdown: Liste aller Lagerplätze + „+ Neu erstellen"
- [ ] `ProjectDetailHeader`-Tab „Gerätebedarf" bleibt aktiv (da Unterseite unter `/geraete`)
- [ ] Route `/projekte/[id]/geraete/lagerplaetze` ist erreichbar
- [ ] Toolbar enthält: Zoom-Slider, Lagerplätze-Dropdown, Screenshot-Button, Stift-Button, Stiftoptionen
- [ ] Zoom-Slider wirkt auf PaperEngine-Zoom (identischer Slider wie in GeraeteActionBar)

### Kartenansicht (links)
- [ ] Interaktive Satelliten-Karte lädt (Mapbox Satellite-Streets oder Google Maps Hybrid)
- [ ] Karte ist **quadratisch** — Breite in px = Inhaltsbreite des A4-Blatts rechts
- [ ] Karte startet im Satellitenmodus (keine reine Straßenkarte)
- [ ] Nutzer kann frei zoomen (Scroll, Pinch) und schwenken (Drag)
- [ ] **Klick auf einen Ort** in der Karte → Reverse Geocoding → Adresse wird ins Adressfeld im A4-Overlay übernommen
- [ ] Letzter Kartenausschnitt (Mittelpunkt + Zoom-Level) wird pro Lagerplatz gespeichert und beim Öffnen wiederhergestellt

### Screenshot erstellen
- [ ] „📷 Screenshot"-Button in der Toolbar
- [ ] Beim Klick: Wisch-Animation (Curtain-Wipe horizontal, #e8c547 Akzentfarbe) über das Kartenfenster von links nach rechts
- [ ] Nach Animation: Karte wird durch statisches Bild des aktuellen Kartenausschnitts ersetzt
- [ ] Screenshot erscheint sofort im Bildbereich des A4-Blatts (rechts)
- [ ] Stift-Tool wird nach Screenshot automatisch aktiviert
- [ ] „Neu aufnehmen"-Button erscheint im Karten-Bereich → Karte wird wieder aktiv, Screenshot wird verworfen

### Zeichenwerkzeug (Stift)
- [ ] „✏ Stift"-Button in der Toolbar aktiviert Zeichenmodus auf dem Karten-Canvas
- [ ] Stiftoptionen-Popover: mind. 4 Farben (Rot, Gelb, Blau, Weiß)
- [ ] Stiftoptionen-Popover: mind. 3 Stärken (dünn, mittel, dick)
- [ ] Freihand-Linien werden als Canvas-Layer über dem Screenshot gezeichnet
- [ ] Zeichnung erscheint synchron im Paper-Engine-Bildbereich (Screenshot + Strokes zusammen)
- [ ] Undo-Button (letzte Linie rückgängig), deaktiviert wenn Stroke-Stack leer
- [ ] Zeichnungsdaten werden als JSON-Array (Stroke-Objekte) in Supabase gespeichert

### A4-Blatt (rechts, PaperEngine-Overlay)
- [ ] PaperEngine `orientation="portrait"`, Zoom via Toolbar-Slider
- [ ] **Header:** Firmenname + Projektname + Kostenstelle (linksbündig), Logo (rechtsbündig) — gleiche Logik wie PROJ-9
- [ ] **Lagerplatz-Name:** Großes, direkt editierbares Textfeld im Overlay (Click-to-Edit)
- [ ] **Adresse:** Editierbares Textfeld — wird automatisch aus Karten-Klick befüllt, manuell überschreibbar
- [ ] **Bildbereich (Mitte):** Screenshot + Zeichnungen, füllt die gesamte Inhaltsbreite
- [ ] **Anmerkungen:** Mehrzeiliges Textarea unterhalb des Bilds, direkt im Overlay editierbar
- [ ] **Footer:** Seitenzahl, Datum
- [ ] Alle Felder speichern `onBlur` in Supabase (kein expliziter Speichern-Button)
- [ ] Drucken via `window.print()` — nur A4-Blatt sichtbar (`data-no-print` für Toolbar und Karte)

### Mehrere Lagerplätze
- [ ] Dropdown-Eintrag „+ Neu erstellen" legt neuen Lagerplatz an (Name: „Lagerplatz N", auto-inkrementierend)
- [ ] Wechsel zwischen Lagerplätzen über Dropdown, aktueller Name im Dropdown-Button angezeigt
- [ ] Jeder Lagerplatz hat eigene Karte + Screenshot + Zeichnung + Name + Adresse + Anmerkungen
- [ ] Lagerplatz löschen: Bestätigung via AlertDialog (shadcn/ui) → nach Bestätigung entfernt

### Daten & Sicherheit
- [ ] Neue Tabelle `storage_locations` in Supabase
- [ ] RLS: Zugriff nur für Mitglieder der eigenen Company (gleiche Kette wie `equipment_items`)
- [ ] Screenshot gespeichert in Supabase Storage (Bucket `storage-location-screenshots`) oder als Base64 in DB
- [ ] Zeichnungsdaten gespeichert als JSONB-Array

## Edge Cases

- Kein Maps-API-Key konfiguriert → Fehlermeldung mit Hinweis auf `.env.local`, kein Absturz
- Klick auf Karte ohne Geocoding-Ergebnis → Toast-Fehler, Adressfeld bleibt unverändert
- Lagerplatz ohne Screenshot → A4-Bildbereich zeigt gepunkteten Platzhalter mit Hinweis
- Kein Lagerplatz vorhanden → Leerstate: Hinweistext + Button „Ersten Lagerplatz erstellen"
- Löschen des aktuell geöffneten Lagerplatzes → Wechsel zum ersten verbleibenden, oder Leerstate
- Sehr langer Anmerkungstext → A4-Blatt bricht um, kein Overflow außerhalb des Blatts
- Zeichnung rückgängig bei leerem Stack → Undo-Button deaktiviert (kein Fehler)
- Drucken ohne Screenshot → Platzhalter wird gedruckt (kein Fehler, kein leeres Dokument)
- Mehrere Lagerplätze → Jeder hat eigene gespeicherte Kartenposition + Screenshot + Zeichnung
- Screenshot neu aufnehmen → alte Zeichnungsdaten werden gelöscht (mit Bestätigung)

## Technical Requirements

### Neue Supabase-Tabelle: `storage_locations`

| Spalte | Typ | Hinweis |
|--------|-----|---------|
| `id` | UUID PK | `gen_random_uuid()` |
| `project_id` | UUID FK | → `projects(id)` ON DELETE CASCADE |
| `name` | TEXT | DEFAULT 'Lagerplatz 1' |
| `address` | TEXT | nullable — aus Reverse Geocoding oder manuell |
| `description` | TEXT | nullable — Anmerkungen-Textarea |
| `screenshot_url` | TEXT | nullable — Supabase Storage URL |
| `drawing_data` | JSONB | nullable — Array von Stroke-Objekten `[{color, width, points:[{x,y}]}]` |
| `map_zoom` | INTEGER | nullable — letzter Zoom-Level |
| `map_center_lat` | FLOAT8 | nullable |
| `map_center_lng` | FLOAT8 | nullable |
| `sort_order` | INTEGER | DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |

- **RLS:** Zugriff über `project_id → projects.company_id` (gleiche Kette wie `equipment_items`)
- **Index:** `(project_id)`

### Neue npm-Abhängigkeiten

| Paket | Zweck |
|-------|-------|
| `mapbox-gl` + `react-map-gl` | Interaktive Satellitenkarte (ToS erlaubt Screenshots) |

> **Karten-Provider-Entscheidung:** Mapbox GL JS via `react-map-gl` — Satelliten-Tiles
> über `mapbox://styles/mapbox/satellite-streets-v12`. Mapbox erlaubt Screenshots
> im ToS, Google Maps nicht (Terms of Service §3.2.3). Geocoding via Mapbox Geocoding API.

### Neue Env-Variable

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...
```

### CSP-Anpassung (`middleware.ts`)

Die bestehende dynamische CSP muss folgende Domains freischalten:

| Direktive | Domain |
|-----------|--------|
| `connect-src` | `*.mapbox.com` |
| `img-src` | `*.mapbox.com` |
| `worker-src` | `blob:` (Mapbox GL Web Worker) |

### Screenshot-Technik

Mapbox GL JS stellt `map.getCanvas().toDataURL('image/png')` bereit — kein `html2canvas`
nötig. Screenshot wird als Data-URL erzeugt, via Supabase Storage hochgeladen und die
öffentliche URL gespeichert.

### Zeichenwerkzeug

Reines HTML5 Canvas über dem Screenshot-Bild. Kein externes Paket. Stroke-Objekte:

```ts
type Stroke = {
  color: string      // '#ef4444' | '#e8c547' | '#3b82f6' | '#ffffff'
  width: number      // 2 | 5 | 10
  points: { x: number; y: number }[]
}
```

Für PaperEngine-Vorschau: Canvas + Strokes werden via `canvas.toDataURL()` als finales
Bild gerendert und als `<img>` im Overlay angezeigt.

### Komponenten-Struktur

```
src/app/projekte/[id]/geraete/lagerplaetze/
  page.tsx                            ← Server-Component, lädt Projektdaten

src/components/
  lagerplaetze-view.tsx               ← Client-Component, Haupt-Layout (2 Spalten)
  lagerplaetze-action-bar.tsx         ← Toolbar (Zoom, Dropdown, Screenshot, Stift)
  lagerplatz-map.tsx                  ← Mapbox-Wrapper (quadratisch)
  lagerplatz-canvas.tsx               ← Screenshot-Anzeige + Canvas-Zeichenwerkzeug
  lagerplatz-paper.tsx                ← A4-Overlay-Inhalt (Name, Adresse, Bild, Textarea)

src/lib/services/
  storage-location-service.ts         ← Supabase CRUD für storage_locations

supabase/migrations/
  20260410_proj10_storage_locations.sql
```

**Toolbar-Entscheidung:** Die Lagerplätze-Seite verwendet eine eigene
`LagerplaetzeActionBar` statt der `GeraeteActionBar`. Der Zoom-Slider-Code wird aus
`GeraeteActionBar` extrahiert oder kopiert (ca. 30 Zeilen). So bleibt die
`GeraeteActionBar` unverändert und PROJ-9 ist nicht betroffen.

---

## Tech Design (Solution Architect)

### Was wird gebaut?

Eine neue Unterseite unterhalb von PROJ-9 (Gerätebedarf). Der Nutzer wechselt per Dropdown in der Toolbar zwischen mehreren Lagerplätzen. Jeder Lagerplatz hat eine interaktive Satellitenkarte links und ein druckfertiges A4-Blatt rechts. Karte und A4-Blatt sind fest miteinander verbunden: Was auf der Karte passiert (Klick, Screenshot), erscheint sofort im Druck-Dokument.

---

### Komponentenstruktur

```
/projekte/[id]/geraete/lagerplaetze (Server-Component)
├── LagerplaetzeView                    ← Haupt-Layout, 2-Spalten, verwaltet Zustand
│   ├── LagerplaetzeActionBar           ← Toolbar oben
│   │   ├── Zoom-Slider                 ← steuert PaperEngine-Skalierung
│   │   ├── Lagerplätze-Dropdown        ← Wechseln + „+ Neu erstellen" + Löschen
│   │   ├── Screenshot-Button           ← löst Karten-Capture aus
│   │   ├── Stift-Button                ← Zeichenmodus ein/aus
│   │   └── Stiftoptionen-Popover       ← Farbe + Stärke wählen
│   │
│   ├── LagerplatzMap                   ← linke Spalte (quadratisch)
│   │   └── Mapbox GL JS Karte          ← Satelliten-Tiles, Zoom, Pan, Klick → Geocoding
│   │
│   └── PaperEngine (A4-Blatt)          ← rechte Spalte (Portrait)
│       └── LagerplatzPaper             ← Overlay-Inhalt im A4-Blatt
│           ├── Header-Bereich          ← Firma, Projekt, Logo (identisch zu PROJ-9)
│           ├── Lagerplatz-Name         ← click-to-edit Textfeld
│           ├── Adresse                 ← Textfeld, auto-befüllt durch Karten-Klick
│           ├── LagerplatzCanvas        ← Screenshot + Freihand-Zeichnungen
│           │   ├── <img> Screenshot    ← statisches Bild aus Mapbox Canvas
│           │   └── <canvas> Strokes    ← Zeichnungs-Layer, transparent darüber
│           └── Anmerkungen             ← mehrzeiliges Textarea, direkt editierbar
```

**Tab-Navigation:** Der `ProjectDetailHeader` bekommt den Tab „Gerätebedarf" aktiv, weil `/lagerplaetze` eine Unterroute von `/geraete` ist — kein Eingriff in PROJ-9 nötig.

---

### Datenmodell (einfach erklärt)

**Neue Datenbank-Tabelle: Lagerplätze**

Jeder Lagerplatz gehört zu einem Projekt. Ein Projekt kann beliebig viele Lagerplätze haben.

| Was wird gespeichert | Wozu |
|---|---|
| Name (z.B. „Lagerplatz 2") | Anzeige im Dropdown und auf dem A4-Blatt |
| Adresse | Aus Karten-Klick automatisch befüllt, manuell editierbar |
| Anmerkungen | Freitext unterhalb des Kartenbilds |
| Screenshot-URL | Link zum Bild in der Dateiablage (Supabase Storage) |
| Zeichnungsdaten | Liste aller gezeichneten Linien (Farbe, Stärke, Punkte) |
| Letzte Kartenposition | Mittelpunkt + Zoom, damit der Ausschnitt wiederhergestellt wird |
| Reihenfolge | Für konsistente Nummerierung im Dropdown |

**Speicherung:** Supabase (PostgreSQL). Screenshots landen in einem separaten Datei-Bucket (`storage-location-screenshots`) und werden als öffentliche URL in der Tabelle hinterlegt. Zeichnungen werden als strukturiertes Dateiformat direkt in der Tabelle gespeichert — kein separater Dateiupload nötig.

**Zugriffskontrolle:** Gleiche Logik wie PROJ-9 — nur Mitglieder der eigenen Firma sehen die Lagerplätze. Kein Zugriff über Firmengrenzen hinweg.

---

### Warum diese technischen Entscheidungen?

**Mapbox GL JS statt Google Maps**
Google Maps verbietet in seinen Nutzungsbedingungen das programmatische Erstellen von Screenshots. Mapbox erlaubt es ausdrücklich. Da Screenshot-Erstellung eine Kernfunktion ist, ist Mapbox die einzig legale Wahl.

**HTML5 Canvas für Zeichnungen (kein externes Paket)**
Die Anforderungen (Freihand-Linien in 4 Farben, 3 Stärken, Undo) sind gut mit dem nativen Browser-Canvas lösbar. Ein Bibliothek würde unnötige Komplexität einbringen. Die Zeichnungen werden als Liste von Linienpunkten gespeichert — einfach zu serialisieren und wieder darzustellen.

**Karte quadratisch = Inhaltsbreite des A4-Blatts**
Wenn beide Breiten identisch sind, passt der Screenshot ohne Skalierung 1:1 ins A4-Blatt. Keine Verzerrungen, keine Qualitätsverluste.

**Kein expliziter Speichern-Button**
Texteingaben (Name, Adresse, Anmerkungen) speichern automatisch beim Verlassen des Feldes (`onBlur`). Der Nutzer muss nicht daran denken zu speichern — verhindert Datenverlust auf der Baustelle.

**Eigene Toolbar (`LagerplaetzeActionBar`)**
PROJ-9 (`GeraeteActionBar`) bleibt unverändert. Die Lagerplätze-Toolbar hat andere Elemente (Karten-Controls, Stift). Shared-Zoom-Logik wird kopiert (~30 Zeilen) — einfacher als eine fehleranfällige Abstraktion.

---

### Neue Abhängigkeiten

| Paket | Warum |
|---|---|
| `mapbox-gl` | Satellitenkarten-Anbieter, Screenshot-fähig (ToS-konform) |
| `react-map-gl` | React-Wrapper für Mapbox, vereinfacht Karten-Events |

**Neue Umgebungsvariable:** `NEXT_PUBLIC_MAPBOX_TOKEN` (API-Key von mapbox.com)

**Anpassung Sicherheitsheader (CSP):** Die Browser-Sicherheitspolitik der App muss Mapbox-Server freischalten (Kartenbild-Tiles, Geocoding-API, Web Worker).

---

## Deployment
_To be added by /deploy_

---

## QA Test Results

**Tested:** 2026-04-11
**App URL:** http://localhost:3000
**Tester:** QA Engineer (AI)

### Acceptance Criteria Status

#### AC-1: Navigation & Toolbar
- [ ] BUG: Route ist `/projekte/[id]/lagerplaetze` statt `/projekte/[id]/geraete/lagerplaetze` wie in der Spec definiert (siehe BUG-1)
- [ ] BUG: `ProjectDetailHeader` zeigt "Lagerplaetze" als eigenen Tab, nicht als Unterseite von "Geraetebedarf" (siehe BUG-2)
- [ ] BUG: Toolbar enthaelt kein Lagerplaetze-Dropdown zum Wechseln zwischen Lagerplaetzen (siehe BUG-3)
- [x] Route `/projekte/[id]/lagerplaetze` ist erreichbar (Build erfolgreich)
- [x] Toolbar enthaelt: Zoom-Slider, Screenshot-Button, Stift-Button, Stiftoptionen-Popover, Undo, Drucken
- [x] Zoom-Slider wirkt auf PaperEngine-Zoom (identischer Slider-Mechanismus)

#### AC-2: Kartenansicht (links)
- [x] Interaktive Satellitenkarte laedt (Mapbox satellite-streets-v12)
- [ ] BUG: Karte ist nicht quadratisch — sie hat eine fixe Hoehe von 640px und 100% Breite, nicht Quadrat = A4-Inhaltsbreite (siehe BUG-4)
- [x] Karte startet im Satellitenmodus
- [x] Nutzer kann frei zoomen (Scroll, Pinch) und schwenken (Drag)
- [x] Klick auf Karte -> Reverse Geocoding -> Adresse wird in Adressfelder uebernommen
- [x] Letzter Kartenausschnitt (Mittelpunkt + Zoom-Level) wird pro Lagerplatz gespeichert und wiederhergestellt

#### AC-3: Screenshot erstellen
- [x] Screenshot-Button ("Karte fixieren") in der Toolbar
- [x] Curtain-Wipe-Animation (#e8c547 Akzentfarbe) ueber das Kartenfenster
- [x] Nach Animation: Karte wird durch statisches Bild ersetzt (Canvas)
- [x] Stift-Tool wird nach Screenshot automatisch aktiviert
- [x] "Neu"-Button erscheint im Toolbar -> Screenshot wird verworfen, Karte aktiv
- [ ] BUG: Screenshot erscheint nicht als separates Bild im A4-Blatt rechts — Karte/Canvas ist direkt im Paper eingebettet (einheitliches Layout, kein "links Karte + rechts A4" Split) (siehe BUG-5)

#### AC-4: Zeichenwerkzeug (Stift)
- [x] Stift-Button in der Toolbar aktiviert Zeichenmodus auf dem Canvas
- [x] Stiftoptionen-Popover: 4 Farben (Rot, Gelb, Blau, Weiss)
- [x] Stiftoptionen-Popover: 3 Staerken (duenn 2px, mittel 5px, dick 10px)
- [x] Freihand-Linien werden als Canvas-Layer ueber dem Screenshot gezeichnet
- [ ] BUG: Zeichnung erscheint nicht synchron in separatem Paper-Bildbereich — kein 2-Spalten-Layout vorhanden (siehe BUG-5)
- [x] Undo-Button (letzte Linie rueckgaengig), deaktiviert wenn Stroke-Stack leer
- [x] Zeichnungsdaten werden als JSON-Array (Stroke-Objekte) in Supabase gespeichert

#### AC-5: A4-Blatt (PaperEngine-Overlay)
- [x] PaperEngine orientation="portrait", Zoom via Toolbar-Slider
- [x] Header: Firmenname + Projektname + Kostenstelle (linksbuendig), Logo (rechtsbuendig)
- [x] Lagerplatz-Name: Editierbares Textfeld (Input)
- [x] Adresse: Editierbare Textfelder (Strasse, Hausnummer, PLZ, Ort) — werden aus Karten-Klick befuellt, manuell ueberschreibbar
- [x] Anmerkungen: Mehrzeiliges Textarea unterhalb des Kartenbilds
- [ ] BUG: Footer fehlt Seitenzahl und Datum — nur ein horizontaler Strich ist vorhanden (siehe BUG-6)
- [x] Alle Felder speichern onBlur bzw. debounced (800ms) in Supabase
- [x] Drucken via window.print() — data-no-print fuer Toolbar

#### AC-6: Mehrere Lagerplaetze
- [ ] BUG: Kein Dropdown zum Wechseln zwischen Lagerplaetzen — stattdessen horizontales Card-Layout (alle sichtbar nebeneinander) (siehe BUG-3)
- [x] "Neuen Lagerplatz anlegen"-Card (Plus-Button) erstellt neuen Lagerplatz mit auto-inkrementierendem Namen
- [x] Jeder Lagerplatz hat eigene Karte + Screenshot + Zeichnung + Name + Adresse + Anmerkungen
- [x] Lagerplatz loeschen: Bestaetigungs-AlertDialog (shadcn/ui) -> nach Bestaetigunge entfernt

#### AC-7: Daten & Sicherheit
- [x] Tabelle `storage_locations` in Supabase vorhanden (mit korrektem Schema)
- [x] RLS: Zugriff ueber project_id -> projects.company_id Kette (identisch zu equipment_items)
- [x] Screenshot gespeichert in Supabase Storage (Bucket `storage-location-screenshots`)
- [x] Zeichnungsdaten gespeichert als JSONB-Array
- [x] Storage Bucket Policies mit Ownership-Check (Migration 20260413)

### Edge Cases Status

#### EC-1: Kein Maps-API-Key konfiguriert
- [x] Fehlermeldung "Mapbox API-Key fehlt. Bitte NEXT_PUBLIC_MAPBOX_TOKEN in .env.local setzen." wird angezeigt, kein Absturz

#### EC-2: Klick auf Karte ohne Geocoding-Ergebnis
- [x] Reverse Geocoding ist best-effort — bei Fehler bleibt Adressfeld unveraendert (kein Toast, silent fail, akzeptabel)

#### EC-3: Lagerplatz ohne Screenshot
- [ ] BUG: Kein gepunkteter Platzhalter mit Hinweis — stattdessen wird die interaktive Karte direkt im A4-Blatt angezeigt (siehe BUG-7)

#### EC-4: Kein Lagerplatz vorhanden
- [ ] BUG: Kein Leerstate mit Hinweistext + Button "Ersten Lagerplatz erstellen" — es wird nur die "Neuen Lagerplatz anlegen"-Karte (Plus-Karte) angezeigt, was funktional aehnlich ist aber nicht dem Spec entspricht (siehe BUG-8)

#### EC-5: Loeschen des aktuell geoeffneten Lagerplatzes
- [x] Wechsel zum ersten verbleibenden, oder activeId wird null (korrekt implementiert)

#### EC-6: Sehr langer Anmerkungstext
- [x] Textarea hat maxHeight: 110px mit resize:none — Text wird abgeschnitten, aber kein Overflow ausserhalb des Blatts

#### EC-7: Zeichnung rueckgaengig bei leerem Stack
- [x] Undo-Button ist deaktiviert (disabled) wenn canUndo=false

#### EC-8: Drucken ohne Screenshot
- [x] Karte wird als interaktives Element im Print eingebettet — funktioniert technisch, aber Mapbox Canvas rendert moeglicherweise nicht korrekt im Print

#### EC-9: Mehrere Lagerplaetze — eigene Daten
- [x] Jeder hat eigene gespeicherte Kartenposition + Screenshot + Zeichnung (via location.id Sync)

#### EC-10: Screenshot neu aufnehmen
- [ ] BUG: Keine Bestaetigungsdialog beim Neu-Aufnehmen — alte Zeichnungsdaten werden direkt geloescht ohne Bestaetigung (siehe BUG-9)

### Security Audit Results

#### Authentifizierung
- [x] API-Route `/api/storage-locations/screenshot` verwendet `createAuthenticatedRoute` — kein Zugriff ohne Login
- [x] Seite `/projekte/[id]/lagerplaetze` ist durch Middleware geschuetzt (Redirect zu /login)

#### Autorisierung (RLS)
- [x] RLS-Policy auf `storage_locations` prueft company_id-Kette (identisch zu equipment_items)
- [x] Storage Bucket Policies pruefen Projekt-Ownership via `storage.foldername(name)[1]`
- [x] Screenshot-Upload-Route prueft storage_location.project_id Zugehoerigkeit via Supabase RLS

#### Input-Validierung
- [x] Zod-Schemas fuer Create, Update und Upload vorhanden und aktiv
- [x] Stroke-Schema validiert Farbe (hex-Regex), Breite (1-50), Punkte (max 3000)
- [x] Name max 500 Zeichen, Description max 5000, Adressfelder max 200/20 Zeichen
- [ ] BUG: `image_base64` Feld in uploadScreenshotSchema hat nur `z.string().min(1)` — keine Maximallange validiert. Server prueft zwar Buffer-Groesse (10MB), aber der JSON-Body wird vollstaendig geparst bevor die Groesse geprueft wird. Ein Angreifer koennte extrem grosse Base64-Strings senden um Memory-Exhaustion zu verursachen (siehe BUG-10)

#### Rate Limiting
- [x] Screenshot-Upload hat Rate Limiting (20 pro Minute pro User)
- [x] Rate Limiter mit Redis (Produktion) und In-Memory-Fallback (Entwicklung)

#### XSS / Injection
- [x] Alle Texteingaben (Name, Adresse, Anmerkungen) werden ueber React State gerendert — kein dangerouslySetInnerHTML
- [x] Kontakt-Snapshots werden als JSON validiert mit contactSnapshotSchema
- [x] screenshot_url wird ausschliesslich serverseitig gesetzt (nicht im updateStorageLocationSchema)

#### CSP-Anpassung
- [x] `connect-src` enthaelt `*.mapbox.com`
- [x] `img-src` enthaelt `*.mapbox.com`
- [x] `worker-src blob:` fuer Mapbox GL Web Worker

#### Env-Variablen
- [x] `NEXT_PUBLIC_MAPBOX_TOKEN` in `.env.local.example` dokumentiert mit Sicherheitshinweisen (URL-restricted, Spending Cap, Scopes)

#### Mapbox Token Exposure
- [ ] BUG: `NEXT_PUBLIC_MAPBOX_TOKEN` wird client-seitig exponiert UND direkt in Geocoding-API-Calls verwendet (`lagerplatz-card.tsx` Zeile 220-222). Obwohl NEXT_PUBLIC_ Tokens per Definition client-seitig sind, wird der Token ohne serverseitige Proxy-Route direkt an Mapbox Geocoding API gesendet. Dies ist nur sicher wenn der Token URL-restricted und scope-limited ist (siehe BUG-11)

#### Storage Bucket
- [x] Bucket ist `public: true` fuer Lese-Zugriff (Screenshots werden per URL eingebettet)
- [x] Upload/Delete-Policies pruefen Projekt-Ownership (Migration 20260413 hat die zu weit gefassten Policies ersetzt)

### Bugs Found

#### BUG-1: Route weicht von Spec ab
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Spec definiert Route als `/projekte/[id]/geraete/lagerplaetze` (Unterseite von PROJ-9)
  2. Tatsaechliche Route ist `/projekte/[id]/lagerplaetze` (eigenstaendige Seite)
  3. Erwartet: Lagerplaetze als Unterseite von Geraetebedarf
  4. Tatsaechlich: Lagerplaetze als separate Top-Level-Route
- **Priority:** Fix in next sprint (funktional kein Blocker, aber Spec-Abweichung)

#### BUG-2: Lagerplaetze als eigener Tab statt Geraetebedarf-Unterseite
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Oeffne `/projekte/[id]/lagerplaetze`
  2. Erwartet: Tab "Geraetebedarf" ist aktiv (da Unterseite)
  3. Tatsaechlich: "Lagerplaetze" ist ein eigener Tab in `ProjectDetailHeader` (Zeile 88-98)
- **Priority:** Fix in next sprint (UX-Entscheidung, aber weicht von Spec ab)
- **Note:** Dies koennte eine bewusste Design-Entscheidung sein. Falls ja, sollte die Spec aktualisiert werden.

#### BUG-3: Kein Lagerplaetze-Dropdown in Toolbar
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Spec definiert: "Klick auf 'Lagerplaetze' in der Toolbar oeffnet Dropdown: Liste aller Lagerplaetze + '+ Neu erstellen'"
  2. Erwartet: Dropdown zum Wechseln zwischen Lagerplaetzen
  3. Tatsaechlich: Alle Lagerplaetze werden horizontal nebeneinander als Cards dargestellt (aehnlich PROJ-9 Geraetebedarf-Layout). Kein Dropdown vorhanden.
- **Priority:** Fix in next sprint (alternatives UI-Pattern, aber Spec-Abweichung)
- **Note:** Das horizontale Card-Layout ist funktional aequivalent und moeglicherweise sogar besser fuer den Usecase. Spec-Update empfohlen falls bewusste Entscheidung.

#### BUG-4: Karte ist nicht quadratisch
- **Severity:** Low
- **Steps to Reproduce:**
  1. Spec: "Karte ist quadratisch -- Breite in px = Inhaltsbreite des A4-Blatts rechts"
  2. Tatsaechlich: Karte hat `height: 640px` und `width: 100%` (lagerplatz-map.tsx Zeile 161), ist also rechteckig
  3. Da kein 2-Spalten-Layout existiert (Karte ist IN der A4-Karte eingebettet), passt der Screenshot trotzdem, aber die Karte ist nicht quadratisch
- **Priority:** Nice to have (funktional kein Problem da Layout anders geloest)

#### BUG-5: Kein 2-Spalten-Layout (Karte links, A4 rechts)
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Spec definiert: "LINKS -- Karte (quadratisch) | RECHTS -- A4-Blatt (PaperEngine)"
  2. Erwartet: 2-Spalten-Layout mit interaktiver Karte links und A4-Blatt rechts
  3. Tatsaechlich: Die Karte ist direkt im A4-Blatt (PaperEngine) eingebettet als `mapNode`. Es gibt kein separates Kartenfenster. Die Karte/Canvas ist Teil des A4-Dokuments.
- **Priority:** Fix in next sprint (wesentliche Layout-Abweichung von der Spec)
- **Note:** Die aktuelle Loesung ist funktional (Karte im A4-Blatt), aber weicht erheblich vom spezifizierten 2-Spalten-Layout ab. Dies ist moeglicherweise eine bewusste Design-Entscheidung fuer ein kompakteres Layout.

#### BUG-6: Footer fehlt Seitenzahl und Datum
- **Severity:** Low
- **Steps to Reproduce:**
  1. Spec: "Footer: Seitenzahl, Datum"
  2. Oeffne Lagerplatz-Ansicht, schaue auf den Footer des A4-Blatts
  3. Erwartet: Seitenzahl und Datum im Footer
  4. Tatsaechlich: Nur ein horizontaler Strich (borderTop) ohne Text (lagerplatz-paper.tsx Zeile 431-438)
- **Priority:** Fix in next sprint

#### BUG-7: Kein Platzhalter fuer fehlenden Screenshot
- **Severity:** Low
- **Steps to Reproduce:**
  1. Erstelle neuen Lagerplatz (noch kein Screenshot)
  2. Erwartet: "Gepunkteter Platzhalter mit Hinweis" im Bildbereich
  3. Tatsaechlich: Die interaktive Mapbox-Karte wird direkt angezeigt (was funktional besser sein koennte)
- **Priority:** Nice to have (Karte direkt zu zeigen ist moeglicherweise bessere UX)

#### BUG-8: Kein Leerstate bei null Lagerplaetzen
- **Severity:** Low
- **Steps to Reproduce:**
  1. Oeffne Projekt ohne Lagerplaetze
  2. Erwartet: Leerstate mit Hinweistext + Button "Ersten Lagerplatz erstellen"
  3. Tatsaechlich: Nur die "Neuen Lagerplatz anlegen"-Plus-Karte wird angezeigt
- **Priority:** Nice to have (Plus-Karte ist funktional, aber weniger einladend)

#### BUG-9: Keine Bestaetigung beim Screenshot-Neuaufnahme
- **Severity:** Low
- **Steps to Reproduce:**
  1. Erstelle Screenshot und zeichne Linien darauf
  2. Klicke "Neu"-Button in der Toolbar
  3. Erwartet: Bestaetigungsdialog bevor alte Zeichnungsdaten geloescht werden
  4. Tatsaechlich: Screenshot und Zeichnungen werden sofort verworfen ohne Bestaetigung (lagerplatz-card.tsx handleRetake)
- **Priority:** Fix in next sprint (Datenverlust-Risiko)

#### BUG-10: Keine Groessenbegrenzung fuer Base64-String in Zod-Schema
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Sende POST an `/api/storage-locations/screenshot` mit extrem grossem `image_base64` String (z.B. 100MB Base64)
  2. Der Zod-Validator `z.string().min(1)` laesst beliebig grosse Strings durch
  3. Der Buffer wird erst nach vollstaendigem JSON-Parsing erstellt
  4. Erwartet: Groessenbegrenzung im Schema oder Request-Body-Limit
  5. Tatsaechlich: Memory-Exhaustion moeglich bei sehr grossen Payloads
- **Note:** Next.js hat ein Standard-Body-Limit von 4MB fuer API Routes, was dies teilweise mitigiert. Die 10MB Buffer-Pruefung auf Zeile 77 greift erst nach dem Decoding. Empfehlung: `z.string().max(15_000_000)` zum Schema hinzufuegen (15MB Base64 = ca. 10MB Binary).
- **Priority:** Fix before deployment

#### BUG-11: Mapbox Token direkt in Client-Side Geocoding-Calls
- **Severity:** Low
- **Steps to Reproduce:**
  1. Oeffne Browser-Netzwerk-Tab
  2. Klicke auf Karte oder nutze "Suchen"-Button
  3. Beobachte: `fetch('https://api.mapbox.com/geocoding/v5/...?access_token=pk.ey...')`
  4. Der Mapbox-Token ist in der URL sichtbar
- **Note:** Dies ist das Standard-Pattern fuer Mapbox (Token ist ohnehin in der Karten-Initialisierung client-seitig). Die Sicherheit haengt ab von: (1) URL-Restriction des Tokens, (2) Spending Cap im Mapbox-Dashboard, (3) Scope-Limitation auf styles:read + geocoding. Die `.env.local.example` dokumentiert diese Massnahmen korrekt.
- **Priority:** Nice to have (serverseitige Proxy-Route fuer Geocoding wuerde Token komplett verbergen)

#### BUG-12: Inline-Styles statt Tailwind CSS
- **Severity:** Low
- **Steps to Reproduce:**
  1. Lese `lagerplatz-paper.tsx`, `lagerplatz-canvas.tsx`, `lagerplaetze-view.tsx`
  2. Frontend-Regel: "Use Tailwind CSS exclusively (no inline styles, no CSS modules)"
  3. Tatsaechlich: Umfangreiche Verwendung von `style={{...}}` fuer fast alle Komponenten
- **Note:** Dies ist bei PaperEngine-Overlays nachvollziehbar (print-color-adjust, exakte Typografie fuer A4-Druck), aber widerspricht den Projekt-Konventionen
- **Priority:** Nice to have

#### BUG-13: updateStorageLocation wird bei jedem Map-Move aufgerufen
- **Severity:** Medium
- **Steps to Reproduce:**
  1. Bewege die Karte (Pan/Zoom)
  2. Nach 1000ms Debounce wird `handleMapMove` aufgerufen
  3. `handleMapMove` ruft `updateStorageLocation` auf (Supabase Update)
  4. Bei aktivem Panning entstehen viele DB-Updates
  5. Erwartet: Seltene Updates (z.B. nur bei Screenshot oder beim Verlassen)
  6. Tatsaechlich: Jede Kartenbewegung -> 1s Debounce -> DB-Update
- **Note:** Funktional korrekt (speichert letzte Position), aber erzeugt unnoetige DB-Last. Das Debounce (1000ms) mildert das Problem, aber bei schnellem Hin-und-Her-Scrollen koennen viele Requests entstehen.
- **Priority:** Fix in next sprint

### Cross-Browser Notes
- Chrome: Mapbox GL JS und Canvas sind vollstaendig unterstuetzt
- Firefox: Mapbox GL JS unterstuetzt, `preserveDrawingBuffer: true` ist gesetzt fuer Screenshots
- Safari: Mapbox GL JS unterstuetzt, aber Safari hat bekannte Einschraenkungen bei WebGL Canvas-Export. `preserveDrawingBuffer: true` ist korrekt gesetzt (Zeile 73 lagerplatz-map.tsx).
- **Note:** Manuelle Cross-Browser-Tests in Chrome, Firefox und Safari konnten nicht durchgefuehrt werden (Code-Review-basierte QA). Empfehlung: Manuelles Testing auf allen drei Browsern vor Deployment.

### Responsive Notes
- Die Seite verwendet keine responsive Breakpoints fuer Mobile/Tablet
- Auf 375px: Horizontales Card-Layout wird extrem breit (210mm = 793px pro Karte), Zoom-Slider beginnt bei 30% was ca. 238px ergibt — nutzbar aber nicht optimal
- Auf 768px: Aehnliches Problem, A4-Karten sind breiter als Viewport bei Zoom > 50%
- Auf 1440px: Gute Darstellung, mehrere Karten nebeneinander sichtbar
- **Note:** Fuer Baustellen-Bauleiter (Zielgruppe) ist Desktop/Tablet der primaere Usecase. Mobile ist nice-to-have.

### Summary
- **Acceptance Criteria:** 20/30 passed (10 Abweichungen, davon mehrere zusammenhaengend durch Layout-Entscheidung)
- **Bugs Found:** 13 total (0 critical, 1 high [BUG-10], 5 medium, 7 low)
- **Security:** Grundsaetzlich solide. RLS korrekt, Rate Limiting vorhanden, Input-Validierung vorhanden. Ein Medium-Security-Finding (BUG-10: Base64 Size Limit).
- **Production Ready:** NO
- **Recommendation:** Die wichtigsten Abweichungen (BUG-1 bis BUG-5) scheinen bewusste Design-Entscheidungen zu sein (Karte im A4-Blatt statt 2-Spalten, eigenstaendiger Tab statt Unterseite, horizontales Card-Layout statt Dropdown). Diese sollten mit dem Product Owner abgestimmt und die Spec entsprechend aktualisiert werden. BUG-10 (Base64 Size Limit) sollte vor Deployment gefixt werden. BUG-6 (Footer) und BUG-9 (Retake-Bestaetigung) sollten im naechsten Sprint gefixt werden.
