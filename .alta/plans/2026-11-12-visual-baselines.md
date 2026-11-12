---
title: Vergleichsbilder – Beleg, dass sich die Standard-Darstellung nicht ändert
status: in-progress
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

- [ ] Geschichten mit geöffnetem Overlay (`capture: 'page'`): `select`, `multi-select`, `menu`, `popover`, `tooltip`, `dialog`, `date-picker`, `date-time-picker`, `zoned-date-time-picker`
- [ ] `form-field`, `segmented-control`, `tabs`, `tag`, `badge`
- [ ] lokaler Bereich: Mobil-Container neben Desktop-Geschwister, Overlay aus dem lokalen Bereich (hält die heutige Grenze fest, bis der Overlay-Vertrag kommt)
- [ ] Fokus-Bilder für Controls (`focus` im Manifest)

### 3. Kalender

- [ ] Geschichten mit fester Uhr und festen Terminen: Monat, Woche, Tag, Jahr, Agenda – die Grundlage für die Kalender-Tokens (Etappe 0 des Mobil-RFC)

## Nicht Teil dieser Arbeit

- Touch- und WebKit-Tests (Mobil-Vorstufe)
- Geräte-Badges `devices` in den Docs (Mobil-Vorstufe)
- Jede Änderung an Komponenten
