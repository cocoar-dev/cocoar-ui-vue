---
title: Vergleichsbilder – Beleg, dass sich die Standard-Darstellung nicht ändert
status: done
created: 2026-11-12
summary: Der Playground bekommt Vergleichsbilder der Komponenten (Standard und `.coar-mobile`, hell und dunkel). Jeder Pull Request wird dagegen geprüft; eine Änderung eines Standard-Bildes braucht die ausdrückliche Freigabe des Maintainers. Das ist der Beleg für die Garantie des Mobil-RFC, dass reine Web-Apps unverändert bleiben.
---

# Vergleichsbilder

Der Mobil-Support verspricht: **Was ohne `.coar-mobile` läuft, sieht aus wie vorher.** Heute lässt sich das nicht belegen – es gibt keinen einzigen Bildvergleich. Nach dieser Arbeit zeigt jeder Pull Request von selbst, ob er ein Bild ändert, und ein geändertes Standard-Bild kann nicht versehentlich gemergt werden:

```
$ node .alta/skills/cocoar-pr/scripts/pr.mjs merge 51
error: #51 changes default-presentation baselines:
  apps/playground/visual/__screenshots__/button--default-light.png
  Web apps would look different. Merge only when the maintainer says so: --accept-default-visual-change
```

## Entwurf

- **Geschichten statt Demos.** Je Komponente eine kleine Vue-Datei `apps/playground/src/visual/stories/<name>.vue`, die alle Zustände statisch nebeneinander zeigt (Größen, Varianten, disabled, readonly, Fehler). Keine Interaktion, keine Zufallswerte, keine Uhr.
- **Eine Liste für beide Seiten.** `apps/playground/src/visual/manifest.ts` nennt die Geschichten und ihre Optionen (`capture: 'root' | 'page'`, `focus`, `clock`). Die Ansicht und der Playwright-Test lesen dieselbe Liste.
- **Eine nackte Route.** `/visual/:story?mode=default|mobile&scheme=light|dark` zeigt nur die Geschichte: ohne Navigation und Theme-Editor des Playgrounds. `mode=mobile` setzt `coar-mobile`, `scheme=dark` setzt `dark-mode` – beides auf `html`, so wie eine App es tut.
- **Vier Bilder je Geschichte:** Standard/Mobil × hell/dunkel, als `visual/__screenshots__/<story>--<mode>-<scheme>.png`. Geschichten mit Overlay (`capture: 'page'`) fotografieren die ganze Seite, weil das Overlay nach `body` teleportiert wird.
- **Streng und reproduzierbar.** Keine Toleranz (`maxDiffPixels: 0`, `threshold: 0`), Animationen aus, Cursor versteckt, Schriften geladen (`document.fonts.ready`), feste Uhr für Datums-Komponenten. Bilder entstehen **nur** im Playwright-Docker-Image (Version aus dem Lockfile, `linux/amd64` wie die CI) – nie direkt auf dem Mac.
- **Eigene Playwright-Konfiguration** `playwright.visual.config.ts` mit `testDir: ./visual`. Der normale `pnpm test` bleibt unberührt.
- **Ein Befehl lokal:** `node apps/playground/scripts/visual.mjs [--update] [story…]` startet den Container, kopiert das Repo hinein (ohne `node_modules`), installiert dort (pnpm-Store als Docker-Volume), lässt den Vergleich laufen und holt neue Bilder und den Bericht zurück.
- **Prüfung im Pull Request:** Job „Visual“ in `ci.yml` im selben Image, mit denselben Befehlen. Bei Abweichung: rot, Bericht mit Soll/Ist/Differenz als Artefakt.
- **Das Tor:** `pr.mjs merge` verlangt, dass „Visual“ bestanden ist, und verweigert einen Pull Request, der ein vorhandenes `…--default-….png` **ändert**, ohne `--accept-default-visual-change`. Neue Bilder und geänderte Mobil-Bilder gehen durch. `AGENTS.md` nennt die Regel und die Warnung.

## Schritte

### 1. Gerüst und die sieben Mobil-Controls

- [x] Route `/visual/:story` mit nackter Darstellung (`App.vue`: Navigation und Theme-Editor nur außerhalb), `VisualStoryView.vue`, `manifest.ts` — `main.ts` mountet nach `router.isReady()`, damit der Theme-Editor auf der Route nie kurz mountet (er setzt Klassen auf `html`)
- [x] Geschichten: `button`, `text-input`, `password-input`, `number-input`, `checkbox`, `radio-group`, `switch`
- [x] `playwright.visual.config.ts`, `visual/visual.spec.ts` (ein Test je Geschichte × Modus × Schema, aus dem Manifest) — dazu `visual/warm-up.ts`: der kalte Vite-Server kompiliert beim ersten Aufruf und lädt Seiten neu
- [x] `scripts/visual.mjs` (Docker, `--update`, einzelne Geschichten, Bericht zurückholen); `linux/amd64` läuft auf dem Mac: kalt 56 s, warm 54–57 s
- [x] Bilder erzeugen (28, 976 KB), dreimal hintereinander ohne Abweichung vergleichen
- [x] Gegenprobe: eine Token-Änderung im Standardmodus (z. B. Button-Höhe `m`) macht genau die betroffenen Standard-Bilder rot; eine Änderung nur unter `.coar-mobile` lässt alle Standard-Bilder grün
- [x] Job „Visual“ in `ci.yml`; `pr.mjs`: „Visual“ muss bestehen, Sperre für geänderte Standard-Bilder — der Job lief noch nicht in der CI (die inneren Befehle liefen lokal im selben Image mit `CI=true`)
- [x] `AGENTS.md` (Regel, Warnung, Befehl), Skill `cocoar-pr`, `apps/playground/visual/README.md`

**Nachbesserung nach Review (2026-11-12):** `pr.mjs` sperrt auch Änderungen am Vergleich selbst und an bestehenden Geschichten (`VISUAL_HARNESS`, `VISUAL_STORY`, `--accept-visual-harness-change`); die Liste der Geschichten ist reine Daten (`stories.json`). Es entscheidet für genau den Kopf-Commit der Checks (`--match-head-commit`), prüft die Jobs im `ci.yml`-Lauf dieses Commits statt nach Anzeigenamen und verweigert eine abgeschnittene Dateiliste. Der Test vergleicht zusätzlich jeden Bildpunkt exakt (Playwright übergeht geglättete Kanten). `visual.mjs` scheitert, wenn das Kopieren in den Container scheitert. Neue Zustände: Zahlenfeld an Minimum/Maximum, leere löschbare Felder, mehrzeilige Felder in allen Größen (28 Bilder, 1,3 MB).

**Fertig, wenn:** der Befehl lokal und der Job in der CI dieselben Bilder grün vergleichen; die Gegenprobe wie beschrieben ausfällt; `pr.mjs` einen Pull Request mit geändertem Standard-Bild verweigert.

### 2. Overlays, Picker, Formularteile

- [x] Geschichten mit geöffnetem Overlay (`capture: 'page'`): `select`, `multi-select`, `menu`, `popover`, `tooltip`, `dialog`, `date-picker`, `date-time-picker`, `zoned-date-time-picker` — geschlossene Zustände als eigene Geschichte, offene als `<name>-open`; dazu `tag-select`(`-open`) und `context-menu` (`menu` selbst ist kein Overlay)
- [x] `form-field`, `segmented-control`, `tabs`, `tag`, `badge`
- [x] lokaler Bereich: Mobil-Container neben Desktop-Geschwister, Overlay aus dem lokalen Bereich (hält die heutige Grenze fest, bis der Overlay-Vertrag kommt) — ein Popover mit Knopf und Eingabe: der Auslöser ist mobil, der Inhalt im Overlay nicht
- [x] Fokus-Bilder für Controls (`focus` im Manifest) — die sieben Controls aus Schritt 1, `segmented-control`, `tabs`, `tag`

**Umgesetzt (2026-11-13):** Manifest-Optionen `capture`, `open` (Aktionen als Events ohne Zeiger, `overlays`, `ready`, `focus`), `clock`, `focus`, `scope: 'local'`, `viewport` — Schritt 3 braucht nur neue Geschichten. Eigene Seite `visual.html` + `src/visual/main.ts` statt der Playground-Route (dessen `main.ts` lud Monaco und einen pdf.js-Worker, 14 MB je Seite; 160 parallele Aufnahmen stürzten ab); `App.vue`, `main.ts`, `routes.ts` sind wieder wie vor Schritt 1. 27 Geschichten, 146 Bilder (118 neu), die 28 alten unverändert; drei Läufe grün in 152–183 s. Gegenprobe: Optionshöhe des Select-Dropdowns ändert genau die vier `select-open`-Bilder.

**Nachbesserung nach der zweiten Prüfung (2026-11-13):** Bestehende Einträge in `stories.json` sind geschützt (`changedStoryRecipes` vergleicht Basis und Kopf Eintrag für Eintrag; neue Einträge gehen durch), und `manifest.ts` prüft jeden Eintrag zur Laufzeit (bekannte Optionen, Werte, Viewport 1024–1920 × 768–1200, Aktionsarten). Eigener Server `vite.visual.config.ts` (nur Vue-Plugin und Quell-Aliasse inkl. Kalender für Schritt 3, Scan nur `visual.html`): Vorbündelung funktioniert, alle Bilder byte-gleich; die Laufzeit bleibt bei 2,5–3,5 min, weil sie fast ganz von der amd64-Emulation kommt (nativ arm64: 1,0 s je Test, 59 s gesamt). Tooltip und Tag-Select öffnen per echtem Tastaturfokus; Aufnahmen gelten erst als fertig, wenn zwei hintereinander byte-gleich sind (`toHaveScreenshot` entfernt). Neu: `form-field-status` (offene Status-Panels), aufgeklapptes `CoarSubExpand` in `menu`. 28 Geschichten, 150 Bilder.

**Deterministische Rasterung (2026-11-13, lokal, wartet auf die Freigabe des Maintainers):** Chromium läuft mit `--disable-lcd-text` (Graustufen-Textglättung; sonst je Ebene und gelegentlich je Timing Subpixel) und `--disable-partial-raster` (ganze Kacheln neu; sonst runden runde Ecken neben Fokus oder Overlay ab und zu 1–2 Stufen anders). Gemessen mit dem neuen `visual.mjs --repeat N`: Probe-Satz (zehn Fokus-Geschichten + `local-scope` mit Eingabe im Popover) ohne zweiten Flag 20 Fehler in 1.700 Aufnahmen, mit ihm 0 in 850; ohne Wirkung `--num-raster-threads=1` (18/850), `--disable-skia-runtime-opts` (23/850), `--disable-gpu` (11/850; der Container rastert ohnehin in Software); `--disable-threaded-compositing` lädt die Seiten nicht. Ergebnis: ganze Suite zweimal `--repeat 10` (2 × 1.530 Aufnahmen, 0 Fehler), erneutes `--update` ändert nichts, sechs normale Läufe grün (188–430 s). `local-scope` hat wieder seine Eingabe im Popover. Die 28 alten Standardbilder: gleiche Größe; 98,9 % der geänderten Pixel liegen höchstens 1 px neben Text (LCD-Farbsäume weg), außerhalb 2 px nur 1–2 Stufen an Rundungen. `visual.mjs` hängt je Lauf ein frisches Temp-Verzeichnis ein: ein fehlgeschlagener Lauf behält immer seinen Bericht. Alle 150 Bilder: 4,78 → 4,36 MB.

**Offen – geöffnete Datums-Picker:** `date-picker-open`, `date-time-picker-open`, `zoned-date-time-picker-open` sind wieder herausgenommen. Der Kalender landet je nach Timing auf `scrollTop` 3211 (Monatsüberschrift sichtbar) oder 3257 (46 px weiter): 6/6 ohne Last vs. 6/6 bei 4×/8× CPU-Drosselung, in Docker 11 von 72 Aufnahmen im anderen Zustand. Ursache in `CoarScrollableCalendar.vue` (Scroll per `setTimeout(0)` :536, erneuter Scroll beim Erscheinen des OverlayScrollbars-Viewports :526-532, `scrollTop = el.offsetTop` :259). Die geschlossenen Picker-Geschichten sind drin; die offenen kommen zurück, wenn der Kalender deterministisch positioniert.

### 3. Kalender

- [x] Geschichten mit fester Uhr und festen Terminen: Monat, Woche, Tag, Jahr, Agenda – die Grundlage für die Kalender-Tokens (Etappe 0 des Mobil-RFC)
- [x] Manifest-Option `width` (Breite der Story-Wurzel), weil die Wurzel fest 760 px breit war und der Kalender auf seine eigene Breite reagiert
- [x] zweimal `--repeat 10` aller Kalender-Geschichten grün, Gegenprobe Today-Farbe, Gate-Prüfung

**Umgesetzt (2026-11-13):** Neue Option `width` (`manifest.ts`, `VisualStoryView.vue`, README): Wurzelbreite in px, 760 bis Viewport-Breite − 16 (die 8 px Body-Rand des Browsers bleiben, wie in einer App ohne Reset); ohne `viewport` also höchstens 1008. Bestehende Einträge nutzen sie nicht, alle 150 Bilder byte-gleich. Zehn Kalender-Geschichten, alle `capture: "page"`, Uhr `2026-04-15T08:30:00Z` (Mi 15. April 10:30 Wien), Anzeigezone Europe/Vienna, `en-US`, Viewport 1280×900 (Jahr 1280×1080), Wurzel 1232 px: über beiden Container-Queries (42rem im Kopf, 720 px in der Monatsliste), ~160 px je Wochenspalte (über `timedEventDetailMinWidth` 112). Gemeinsame Termine in `stories/calendar-events.ts`. `calendar-month` (6×7, `CoarMonthView`), `-month-continuous`, `-month-list`, `-week` (Shell mit Kopf), `-work-week`, `-day`, `-week-rows` (Tage als Zeilen), `-year`, `-agenda`, `-timeline`; 40 Bilder. Zweimal `--repeat 10` (je 430 Aufnahmen) und ein voller Lauf (193) grün. Unter `.coar-mobile` unterscheidet sich nur `calendar-week`: die Knöpfe im Kopf der Shell werden mobil groß, das Raster rückt 14 px tiefer. Gegenprobe: Today-Zahl in `CoarMonthCell.vue` umgefärbt → genau die vier `calendar-month`-Bilder rot. Arbeitszeiten färben das Raster nicht (nur `timeRange`). Gefunden: `nv62` (Wochentagskopf des fortlaufenden Monats markiert bei Sonntag-Start Fr/Sa), `cvx7` (Gate schützt `stories/*.ts` nicht; inzwischen erledigt, `VISUAL_STORIES_DIR`).

**Nachbesserung nach der vierten Prüfung (2026-11-13):** Jede Ansicht, die „heute“ zeichnet, hat jetzt ein Bild mit einem nicht ausgewählten Heute und, wo die Ansicht eine Auswahl kennt, einem anderen ausgewählten Tag: Monatsliste mit Cursor auf dem 22. (Heute in Gefahrenrot), Agenda ab Di 14., Zeitleiste ab Mo 13., Arbeitswoche mit Cursor auf Fr; neu `calendar-day-agenda` (Wochenleiste: Heute unausgewählt, Do ausgewählt) und `calendar-multi-day` (Tag mehrtägig ab Di, Heute daneben). Zwei Termine ohne `meta.color` (ganztägig „Release freeze“ 15.–16., „Coffee chat“ heute 08:00, erster des Tages, also nicht im „+N“). Die frei stehenden Stundenraster bekommen wie in einer App einen scrollenden Rahmen (`overflow-y: auto`) und `pixelsPerHour(54)`, damit zwölf Stunden und zwei Ganztagsspuren ohne Scrollen passen. 40 Geschichten, 198 Bilder; zweimal `--repeat 10` (je 510) und ein voller Lauf (201, 221 s) grün. Gegenproben: Heute-Farbe der Monatsliste → genau ihre vier Bilder; Standard-Termin-Hintergrund (`CoarMonthView.vue:536`, `useTimeGridPresentation.ts:178`) → 28 Bilder (Monat, fortlaufender Monat, Woche, Arbeitswoche, Tag, mehrtägig, Tage als Zeilen); Agenda, Tagesagenda und Zeitleiste zeichnen Termine ohne Farbe mit eigenem Standard (Akzent-Punkt/-Balken).

## Nicht Teil dieser Arbeit

- Touch- und WebKit-Tests (Mobil-Vorstufe)
- Geräte-Badges `devices` in den Docs (Mobil-Vorstufe)
- Jede Änderung an Komponenten
