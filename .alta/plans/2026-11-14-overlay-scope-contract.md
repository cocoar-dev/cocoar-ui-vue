---
title: Overlay-Scope-Vertrag – Overlays behalten den lokalen Mobil-Modus
status: in-progress
created: 2026-11-14
summary: Overlays, die aus einem lokalen `.coar-mobile`-Bereich geöffnet werden (Popover, Select, Menü, Picker, Dialog, Kontextmenü, verschachtelt), bekommen im Overlay-Host die Klasse `coar-mobile` und die dort berechneten `--coar-control-*`-Werte. Dialoge und Kontextmenüs ohne Element-Anker finden ihren Bereich über eine neue Option `context`. Ohne `.coar-mobile` ändert sich nichts.
---

# Overlay-Scope-Vertrag

Erster Schritt der Vorarbeiten nach der Mobil-Vorstufe (Mobil-RFC 6.1 und 11, Übergabe 8.1). Heute verlässt jedes
teleportierte Overlay einen lokalen `.coar-mobile`-Bereich: im Bild `local-scope--mobile-*` hat der Trigger Mobil-Maße, das
Popover darin Desktop-Maße.

```
<div class="coar-mobile">          body
  <CoarPopover> ──open──►            └ .coar-overlay-host.coar-mobile  style="--coar-control-m-height: 52px; …"
</div>                                    └ Panel: Button 52 px, Feld ≥ 16 px Schrift
```

## Entwurf

- **Eigene Suche, unabhängig vom ThemeScope.** Der Outlet sucht `context.closest('.coar-mobile')`. Gefunden und der Host liegt
  **nicht** schon darin (`html`/`body` mit `.coar-mobile`: der Host erbt ohnehin) → Host bekommt die Klasse `coar-mobile` und
  inline die **berechneten** Werte einer festen Liste. Nicht gefunden → nichts passiert (Standard-Bilder bleiben gleich).
- **Feste Liste statt aller Werte:** genau die Tokens aus `packages/ui/styles/tokens/mobile.css` (heute 9 `--coar-control-*`),
  als Konstante neben dem Outlet. Ein Test liest `mobile.css` und vergleicht, damit die Liste nicht veraltet.
- **Gelesen am `.coar-mobile`-Element, nicht am Anker:** dort wirken Marken-Regeln (`.marke .coar-mobile`) und lokale
  Overrides (`.my-form.coar-mobile { … }`), aber keine komponenteninternen Werte rund um den Trigger. Die Klasse braucht es
  zusätzlich wegen der Regeln `.coar-mobile .coar-input-frame--mobile-sizing` (`CoarInputFrame.vue`).
- **Ein gemeinsamer Abgleich:** Theme- und Mobil-Abgleich laufen in einer Funktion `syncContext()` in dieser Reihenfolge, auch
  bei jedem Auslösen eines Observers (sonst löscht der Theme-Abgleich gleichnamige Mobil-Werte wieder). Der Mobil-Bereich wird
  wie die Theme-Quelle auf `class`/`style` beobachtet; verschwindet die Klasse dort, verschwindet sie am Host. Wird
  `.coar-mobile` erst **nach** dem Öffnen irgendwo hinzugefügt, merkt das Overlay es nicht (Grenze, steht in der Doku).
  Der Abgleich läuft **vor** `service.onPanelMounted`, damit die Position mit den Mobil-Maßen gemessen wird.
- **Woher der Kontext kommt** (`instance.contextEl`, im Service beim `open()` bestimmt):
  `options.context` → Element-Anker → `parent.panelEl` (verschachteltes Overlay) → keiner.
  Verschachtelte Overlays mit Element-Anker finden den Host des Eltern-Overlays von selbst (er trägt die Klasse).
- **Neue Option `context?: Element`** (Preview) in `OverlayOpenOptions` und `DialogConfig`. `useDialog()` merkt sich beim Aufruf
  in `setup()` die Komponente (`getCurrentInstance()`) und setzt beim `open`/`confirm`/`alert` deren Element als Kontext, wenn
  keiner angegeben ist (Fragment-Wurzel: `parentElement` des Anfangs-Knotens; nach dem Unmount: keiner). Außerhalb von
  `setup()` bleibt es beim Rückfall – wie heute.
- **Kontextmenü:** `useContextMenu().open(event)` merkt sich `event.target` (wenn Element), `CoarContextMenu` gibt es als
  `context` weiter.
- **Nicht über den Service** und bewusst nicht umgestellt, als Liste in die Doku: `CoarThemeEditor`/`CoarPaletteEditor`
  (Entwicklerwerkzeuge), `markdown-editor/TableHandles.vue` und `document-viewer/AnnotationPopover.vue` (eigene Buttons/Textarea,
  keine Controls mit Mobil-Tokens), dazu Toasts (global, ohne Anker).
- **Ein Pull Request:** `feat(ui): overlays opened in a local .coar-mobile area keep the mobile presentation`.

## Schritte

- [x] **1. Service:** `context` in `OverlayOpenOptions`, `contextEl` in `OverlayInstance` (Reihenfolge wie oben); Tests in
  `overlay-service.test.ts`.
- [x] **2. Outlet:** Token-Liste, `syncContext()` (Theme + Mobil), Observer, Abgleich vor `onPanelMounted`; Tests in
  `CoarOverlayOutlet.test.ts`: kein `.coar-mobile` → Host unverändert (keine Klasse, kein Inline-Token); lokal → Klasse + Werte
  vom Bereich (auch Override per Inline-Style am Bereich); `body.coar-mobile` → keine Kopie; verschachtelt; Klasse entfernt →
  Host folgt; Theme-Scope und Mobil zusammen; Liste = `mobile.css`.
- [x] **3. Dialog und Kontextmenü:** `DialogConfig.context`, Erfassung in `useDialog()`, `useContextMenu`/`CoarContextMenu`;
  Tests in `useDialog.test.ts` und den Menü-Tests.
- [x] **4. Doku:** `apps/docs/guide/mobile.md` (Grenze „Portaled content …“ ersetzen durch den Vertrag: was übertragen wird,
  woher der Kontext kommt, die Liste der Ausnahmen, `context` für Aufrufe außerhalb von `setup()`), Overlay- und Dialog-Seite
  (`context`, Preview-Badge); `devicesNote` der Overlay-Seiten prüfen; `pnpm skill:sync`.
- [x] **5. Playground:** neue Geschichten `local-scope-dialog` (Dialog per `useDialog` aus einem lokalen Bereich) und
  `local-scope-nested` (Select in einem Popover im lokalen Bereich), je mit Eintrag in `stories.json` (`scope: "local"`);
  Bilder `local-scope--mobile-*` neu (sollen sich ändern), Vergleich aller Bilder: kein `--default-` ändert sich. E2E in
  `e2e/mobile-controls.spec.ts`: Button im Popover aus dem lokalen Bereich ≥ 44 px hoch, im Desktop-Nachbarn unverändert.
- [x] **6. Prüfen:** `pnpm lint && pnpm typecheck && pnpm build`, `pnpm test` als Job, `visual.mjs` allein; Gegenprüfung;
  Pull Request.

### Abweichungen und Befunde

- Gegenprüfung 1+2: Mobil-Abgleich löschte gleichnamige Theme-Werte; frühe verschachtelte Kinder mit Punkt-Anker blieben ohne
  Kontext. Beides korrigiert (`syncContext()` leert beide Kopien vorher; Rückfall auf das Eltern-Panel beim Mount).
- Gegenprüfung 3: Config-Getter gingen durch Kopieren verloren, deaktivierte KeepAlive-Owner lieferten Kontext, SSR-Absturz in
  `useContextMenu().open()` – korrigiert. Verworfen: erneutes Öffnen des offenen Kontextmenüs, im selben Ereignis entferntes Ziel.
- Ein lokales Theme folgt weiter nur dem Element-Anker, nicht `context` (sonst änderten sich Dialoge auch ohne `.coar-mobile`).
- `local-scope-nested` zeigt ein Popover im Popover statt eines Selects: die Optionsliste hat keine Mobil-Tokens und bewies nichts.
- `pnpm test`: einziger roter Test `auth-customization-lab` wackelt auch auf `develop` (Aufgabe `9drz`).

## Annahmekriterien

- Ohne `.coar-mobile` auf der Seite: kein Overlay-Host bekommt Klasse oder Inline-Token; alle `--default-`-Bilder unverändert.
- Popover, Select, Menü/Untermenü, Datums-Picker, Dialog (`useDialog` in `setup()`), Kontextmenü aus einem lokalen Bereich: der
  Host trägt `coar-mobile` und die Werte des Bereichs; ein Desktop-Nachbar daneben bleibt Desktop.
- `html`/`body` mit `.coar-mobile`: Verhalten wie heute (nur Vererbung).
- Override per Klasse am Bereich (`.my-form.coar-mobile { --coar-control-m-height: 60px }`) kommt im Overlay an.

## Offen, nicht Teil dieses Plans

- Der Text der bestehenden Geschichte `local-scope` sagt noch „Today's limit …“. Die Geschichte ist geschützt (`pr.mjs`).
  **Freigabe des Maintainers erteilt (2026-11-14)**: eigener kleiner Pull Request nach diesem, ohne Komponenten-Änderung,
  gemergt mit `--accept-visual-harness-change`.
- `data-coar-density` (RFC 6.1, „später“) – erst wenn es die Dichte gibt.
