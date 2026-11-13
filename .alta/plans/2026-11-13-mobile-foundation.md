---
title: Mobil-Vorstufe – Doku sagt, was auf welchem Gerät gilt
status: in-progress
created: 2026-11-13
summary: Die Doku bekommt die Zusage für reine Web-Apps, einen ehrlichen Mobil-Leitfaden und je Komponentenseite eine Geräte-Angabe (`devices`), aus der Badges, eine Übersichtstabelle und derselbe Stand im Agent-Skill entstehen. Danach laufen die Verhaltens-Tests des Playgrounds auch mit Touch und in WebKit.
---

# Mobil-Vorstufe

Dritter Schritt der vereinbarten Reihenfolge (Release & CI → Vergleichsbilder → **Mobil-Vorstufe**), aus dem Mobil-RFC
(Abschnitte 7, 8 und 11). Danach weiß jeder Leser der Doku – Mensch oder Agent –, was die Bibliothek auf Desktop, Tablet und
Handy zusagt und was nicht:

```
# Button                                   devices: { desktop: ready, tablet: ready, phone: partial }
[Desktop ready] [Tablet ready] [Phone partial]   Mobile sizes under .coar-mobile; no touch tests yet
```

## Entwurf

- **Zwei Pull Requests.** (1) `docs`: Texte und `devices`-Mechanismus, ändert weder Pakete-Code noch `ci.yml`.
  (2) `test(playground)`: Touch- und WebKit-Projekte; braucht eine Zeile in `ci.yml` (WebKit installieren) und damit die
  Freigabe des Maintainers für eine Datei des Bildvergleichs.
- **Nur beschreiben, was es gibt.** `presentation`, `useInputCapabilities`, Host-Adapter und der Overlay-Vertrag kommen mit
  ihren eigenen Pull Requests in die Doku, nicht jetzt.
- **Frontmatter einzeilig**, damit `sync-skill.mjs` es ohne YAML-Bibliothek liest und VitePress es als YAML versteht:
  `devices: { desktop: ready, tablet: ready, phone: partial }`, optional `devicesNote: "…"` (ein Satz, Pflicht bei
  `partial` oder `no`).
- **Bedeutung der Werte** (steht im Leitfaden): `ready` – alles Dokumentierte ist mit der Eingabe dieses Geräts erreichbar und
  passt in seine Breite; `partial` – der Hauptzweck geht, die Notiz nennt die Grenze; `planned` – noch nicht angepasst,
  Anpassung ist vorgesehen; `no` – nicht für dieses Gerät gedacht. Tablet = Touch ohne Hover in der Standard-Darstellung;
  Handy = Touch, schmal, mit `.coar-mobile`.
- **Eine Quelle, drei Ausgaben:** Badges unter dem Titel jeder Komponentenseite (markdown-it-Regel, kein Handeintrag),
  Übersichtstabelle `<DeviceMatrix />` im Mobil-Leitfaden (VitePress-Data-Loader), dieselbe Tabelle und eine Zeile je Seite im
  Agent-Skill.
- **Die Prüfung** sitzt in `sync-skill.mjs` (läuft in der CI als „Agent Skill matches the docs“): jede Seite unter
  `components/` hat `devices` oder steht mit Grund in der Ausnahmeliste; unbekannte Schlüssel und Werte, fehlende Notiz und
  mehrzeilige Form sind Fehler.
- **Die Einschätzung je Seite** kommt aus dem Code (Hover-only-Bedienung, Rechtsklick, feste Breiten, `.coar-mobile`-Regeln,
  Zeiger-Engine), nicht aus dem Gefühl; der Maintainer sieht die Tabelle im Pull Request und korrigiert.

## Schritte

### 1 · Doku-Texte und `devices` (Pull Request `docs`)

- [x] Einschätzung aller Komponentenseiten aus dem Code (Tabelle mit Begründung und Fundstelle)
- [x] `apps/docs/scripts/devices.mjs` (Regeln, Ausnahmeliste) mit Tests; `sections.mjs` aus `sync-skill.mjs` herausgelöst
- [x] `sync-skill.mjs`: Prüfung, Zeile „Devices“ in jeder Referenzseite, `<DeviceMatrix />` als Markdown-Tabelle
- [x] Badges unter dem Titel (`DeviceBadges.vue`, markdown-it-Regel) und `DeviceMatrix.vue` mit Data-Loader
- [x] `devices` in allen Komponentenseiten
- [x] `foundations/design-principles.md`: 44-px-Aussage richtiggestellt, Handy als Opt-in, „Aussehen folgt der Klasse,
      Verhalten der Eingabe“, Abschnitt „Stability promise for web apps“
- [x] `guide/mobile.md`: Achsen, Modus statt Theme, Grenzen (Overlays, Altbestand), Geräte-Übersicht; Satz „entry point for
      future presentations“ ersetzt
- [x] „touch-first“ in `packages/ui/package.json`, `packages/ui/README.md`, `apps/docs/skill/SKILL.header.md` richtiggestellt;
      `CONTRIBUTING.md`: Abschnitt „Mobile Contributions“ (der Hinweis in `components/tree.md` bleibt, die Badges stehen darüber)
- [x] `pnpm skill:sync`, Docs-Build, Lint, Typecheck, Tests; Gegenprüfung
- [ ] Pull Request gemergt

**Abnahme:** `pnpm skill:check` schlägt fehl, wenn einer Komponentenseite `devices` fehlt oder ein Wert unbekannt ist; der
Docs-Build zeigt die Badges auf `components/button` und die Tabelle auf `guide/mobile`; `skills/cocoar-vue-ui` enthält
dieselben Angaben; kein Vergleichsbild ändert sich.

**Stand 2026-11-13:** 80 Seiten tragen `devices` (72 eigene Angaben, 8 Unterseiten mit der Angabe ihrer Hauptseite über
`SAME_DEVICES_AS`), 13 stehen mit Grund in `NO_DEVICES`. Abweichungen vom Entwurf, alle aus der Gegenprüfung: Die Prüfung
liest das Frontmatter zusätzlich mit `gray-matter` (dem Parser von VitePress) und vergleicht beide Lesarten – eine
YAML-Bibliothek ist also doch dabei, als devDependency der Doku; die Seitenregeln sind eine getestete Funktion
(`checkDevicePages`); die Notiz steht in der Tabelle der Seite unter dem Seitennamen; `ready` am Handy verlangt bei
bedienbaren Komponenten eine Mobil-Darstellung, die nicht mehr Preview ist. Die Docs werden in jedem Pull Request gebaut
(`pnpm build` der CI), nicht erst beim Tag.

### 2 · Touch und WebKit im Playground (Pull Request `test(playground)`)

- [ ] Playwright-Projekte `chromium-touch` und `webkit-tablet` für die mit `@touch` markierten Verhaltens-Specs
- [ ] `mobile-controls.spec.ts` und die Kalender-Specs, die Zeiger-Verhalten prüfen, laufen dort mit
- [ ] `ci.yml`: WebKit installieren (Freigabe des Maintainers nötig: Datei des Bildvergleichs)

**Abnahme:** `pnpm test` läuft lokal und in der CI mit den neuen Projekten grün; ein absichtlich eingebauter Hover-only-Weg
lässt einen `@touch`-Test rot werden.
