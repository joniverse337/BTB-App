# BTB – Visionspapier

> Erstellt: 2026-04-11  
> Kontext: Strategische Bewertung der BTB-App im Digitalisierungskontext

---

## 1. Ausgangslage: Was heute auf Baustellen passiert

Bauleiter und Poliere arbeiten heute mit Excel-Vorlagen — lokal gespeichert, kein Sync, kein gleichzeitiger Zugriff. Der tägliche Bautagesbericht wird ausgefüllt, per WhatsApp oder Mail weitergeleitet und vom Bauleiter manuell in eine Monatsauswertung kopiert. Wochenauswertungen entstehen durch Copy-Paste aus 20 verschiedenen Dateien. Drucken bedeutet Seitenumbrüche prüfen, Logos einfügen, Dateien teilen.

BTB ersetzt diesen Prozess durch eine cloud-basierte, einfach bedienbare Plattform — ohne Einarbeitung, auch für Nicht-IT-Experten.

---

## 2. Was BTB heute spart (gegenüber Excel)

| Aufgabe | Excel | BTB-App | Ersparnis |
|---|---|---|---|
| BTB täglich anlegen | Vorlage suchen, öffnen, speichern, umbenennen | 2 Klicks | ~5 min/Tag |
| Drucken | Seitenumbrüche, Logo, Datei teilen | 1-Klick DIN-A4 | ~10 min/BTB |
| Wochenübersicht | Manuell aggregieren | KW-Rasteransicht sofort | ~30 min/KW |
| Arbeitsanmeldung | Separate Liste, Kopfrechnen | Direkt aus Schichtdaten | ~15 min/KW |
| Gerätebedarf | Eigene Tabelle, kein Projektbezug | Verknüpft mit Schicht | ~10 min/KW |

**Konservative Schätzung: 1–2 Stunden Ersparnis pro Bauleiter pro Woche.**

### Die 10-Minuten-Regel

Wenn jede neue Funktion 10 Minuten pro Woche spart, sparen 6 Funktionen eine Stunde pro Woche. Das entspricht über 2% der Arbeitszeit — und macht einen messbaren wirtschaftlichen Unterschied.

### Der Business Case für Kunden

> Ein Bauleiter mit 5 aktiven Projekten, 2h/Woche gespart = 100h/Jahr.  
> Bei 50 €/h Lohnkosten = **5.000 € Einsparung pro Jahr** — für eine App die 50 €/Monat kostet.

---

## 3. Grad der Datenverknüpfung — heute und morgen

### Heute (Verknüpfungsgrad: mittel)

```
Firma ──► Projekte ──► Schichten ──► BTB-Karte (Druck)
               │               └──► Arbeitsanmeldung
               └──► Einstellungen (Kategorien, Logo, Vorlage)
               └──► Geräte
               └──► Lagerplätze
```

Das Kernobjekt **Schicht** ist richtig gewählt — alle anderen Module hängen daran.  
Schwachpunkt heute: Daten fließen noch nicht zurück. Geräte, Personal und Material sind Inseln ohne Synergieeffekt.

### Morgen (Verknüpfungsgrad: hoch)

Sobald Personal, LV-Positionen und Mengen verbunden sind, verändert sich die Logik:

```
Mitarbeiter ──► Schicht ──► Arbeitsanmeldung ──► Lohnbüro-Export
LV-Position ──► Schicht ──► BTB ──► Fortschritt ──► Abweichungsalarm
Menge (IST) ──► LV-Menge (SOLL) ──► Abrechnung ──► Nachtragserkennung
```

**Der entscheidende Effekt:** Eine Dateneingabe erzeugt mehrfachen Mehrwert.  
Nicht additiv — sondern multiplikativ.

```
Ohne Verknüpfung:  f1 + f2 + f3 = 3 × 10 min = 30 min gespart
Mit Verknüpfung:   f1 × f2 × f3 → 1 Eingabe, 3× Zeitersparnis
```

---

## 4. Die drei Evolutionsstufen

### Stufe A: Personalplanung

Heute wird Personal im BTB erfasst — aber nicht im Voraus geplant.

- Mitarbeiterstammdaten (Name, Qualifikation, Zugehörigkeit)
- Schicht bekommt zugewiesene Mitarbeiter → Arbeitsanmeldung entsteht automatisch
- Soll/Ist-Vergleich: geplante vs. tatsächliche Anwesenheit

**Neue Kette:** `Mitarbeiter → Schicht → Arbeitsanmeldung → Lohnbüro-Export`

### Stufe B: Bauablaufplanung

Heute sind Schichten unverbunden — Schicht 5 weiß nicht, was Schicht 4 noch offen ließ.

- LV-Positionen werden Schichten zugeordnet
- Fortschrittserfassung: "Position 3.2 heute 40% fertig"
- SOLL-Terminplan vs. IST aus den BTBs
- Bauleiter sieht sofort ob er im Plan liegt — nicht erst nach dem Monatsgespräch

**Neue Kette:** `LV-Position → Schicht → BTB → Fortschritt → Abweichungsalarm`

### Stufe C: LV-Import (Leistungsverzeichnis)

Der größte Hebel und stärkste Wettbewerbsvorteil.

- GAEB-Format (Standard im deutschen Bauwesen, `.d83`/`.x83`) oder Excel-Import
- Jede LV-Position wird eine buchbare Einheit im System
- Mengen auf der Baustelle werden gegen LV-Mengen gebucht
- Abrechnung, Nachtragserkennung und Restmengen entstehen automatisch

**Neue Kette:** `LV → Positionen → Schicht → Mengen → Abrechnung`

---

## 5. Die KI-Stufe: Baustelle auf Knopfdruck planen

### Was dann möglich ist

Jeder BTB der heute eingetragen wird, ist ein Datenpunkt:

```
"Position 3.2 (Gleisbett verdichten), 4 Mann, Rüttelplatte,
 Wetter: Regen, Dauer: 6h, Menge: 80m²"
```

Nach 50 Projekten und 500 Schichten weiß das System:
- Verdichten bei Regen → 30% langsamer
- Diese Kolonne schafft 15m²/h bei trockenem Wetter
- Rüttelplatte immer mit Kleinbagger kombiniert → Gerätebedarf vorhersehbar

### Beispiel: KI-gestützte Baustellenplanung

**Input:**
> "Neues Projekt: 2.400m² Gleisbett, Start KW 22, 3 verfügbare Kolonnen"

**Output:**
```
Vorgeschlagener Ablauf:
  KW 22: Kolonne A — Oberbau (historisch: 12 Tage bei dieser Menge)
  KW 24: Kolonne B — Verdichten (Puffer +2 Tage wegen Wetterrisiko Mai)

Gerätebedarf automatisch:
  2× Rüttelplatte, 1× Bagger (basierend auf ähnlichen Projekten)

Risikohinweis:
  ⚠ KW 23 ist Pfingsten — Kolonne B nicht verfügbar laut Historik

Kalkulation:
  Schätzung 18.400 € Lohnkosten (±12%) basierend auf 8 ähnlichen Projekten
```

### Warum das realistisch ist

Die KI braucht keine externe Intelligenz — sie braucht **strukturierte Betriebsdaten:**

```
Heute:       Daten werden eingetragen     (Pflicht, Papierersatz)
Morgen:      Daten werden verknüpft       (LV, Personal, Mengen)
Übermorgen:  Daten werden gelernt         (Muster, Abweichungen)
KI-Stufe:    Daten werden vorausgedacht   (Planung, Warnung, Kalkulation)
```

Jeder Bauleiter der heute seinen BTB ausfüllt, **trainiert unbewusst das Modell** für seine Firma.

### Der entscheidende Unterschied zu SAP & Co.

Große ERP-Systeme haben diese Daten auch — aber sie sind so komplex, dass kein Polier sie bedient. BTB sammelt **echte Baudaten von echten Bauleuten**, weil die Eingabe einfach genug ist.

> **Das ist der Wettbewerbsvorteil: Nicht die KI. Die Datenbasis, die entsteht weil die App benutzbar ist.**

Die KI ist das letzte Feature. Die Grundlage dafür wird heute gebaut — mit jedem BTB der eingetragen wird.

---

## 6. Priorisierte Roadmap

```
Phase 1 — Fundament fertigstellen (jetzt)
  PROJ-8   PaperEngine           → sofort sichtbarer Wert, Drucken

Phase 2 — Verknüpfungen aktivieren
  PROJ-13  Mitarbeiterstamm      → Grundlage für alles Weitere
  PROJ-14  Personalplanung       → Arbeitsanmeldung entsteht automatisch
  PROJ-15  LV-Import (GAEB/XLS)  → größter Einzelhebel

Phase 3 — Daten fließen lassen
  PROJ-16  Mengenerfassung pro Schicht
  PROJ-17  Bauablauf / Gantt-light
  PROJ-18  Lohnbüro-Export (DATEV o.ä.)

Phase 4 — KI-Stufe
  PROJ-19  Planungsassistent (basierend auf Projekthistorie)
  PROJ-20  Abweichungswarnung & Kalkulationshilfe
```

---

## 7. Vision in einem Satz

> BTB beginnt als digitaler Bautagesbericht — und wird zum Betriebssystem der Baustelle: von der Schichtplanung über die Abrechnung bis zur KI-gestützten Bauablaufplanung, aufgebaut auf den Daten die Bauleiter täglich ohnehin erfassen müssen.
