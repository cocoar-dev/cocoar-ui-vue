---
title: Logik-Kern des ZonedDateTimePicker – useZonedDateTimePicker()
status: done
created: 2026-11-14
summary: Zustand, Zeitzonen, Formatieren, Parsen, Begrenzen und Wertänderungen des `CoarZonedDateTimePicker` kommen aus der 879-Zeilen-Komponente in `date-time/_shared/use-zoned-date-time-picker.ts`. Die Ansicht bleibt Pixel für Pixel gleich, belegt durch die Vergleichsbilder. Kein neues öffentliches API; das kommt erst mit einer zweiten Ansicht (`presentation`).
---

# Logik-Kern des ZonedDateTimePicker

Vorarbeit aus dem Mobil-RFC (6.3, Übergabe 8.1 Punkt 3). Ziel ist eine zweite Ansicht, etwa ein Blatt fürs Handy, die dieselbe
Logik nutzt. Heute steckt die Logik in `CoarZonedDateTimePicker.vue` zwischen Maskito, Overlay und Template. Dieser Schritt löst
sie heraus und ändert nichts, was man sieht oder bedient.

```
CoarZonedDateTimePicker.vue  (Eingabefeld, Maskito, Overlay, FormField, Template)
        │ ruft
        ▼
_shared/use-zoned-date-time-picker.ts   ← neu: Zustand + Regeln, ohne DOM
        │ nutzt
        ▼
useDatePickerBase, date-/time-/timezone-helpers   (unverändert)
```

## Entwurf

- **Was in den Kern geht** (alles ohne DOM, testbar ohne Mount):
  - Zustand: `activeMonth`, `pendingTime`, `displayTimeZone`.
  - Zeitzonen: `userTimeZone`, `valueTimeZone`, `effectiveDisplayTimeZone`, `effectiveDefaultTimeZone`, `timeZonesDiffer`,
    `locationDiffersFromUser`, Zustand und Klickbarkeit des Zeitzonen-Symbols, die Beschriftungen.
  - Abgeleitete Werte: `effectiveUse24Hour`, `selectedDate`, `selectedTime`, `minDate`/`maxDate`, `effectiveMinTime`/
    `effectiveMaxTime`, Jahresgrenzen, `today`, Platzhalter-Text.
  - Formatieren und Parsen: `formatValue`, `formatValueInValueTz`, `parseValueFromInput`.
  - Aktionen: Datum wählen, Zeit setzen, Wert-Zeitzone ändern, Anzeige-Zeitzone wählen und umschalten, leeren, Monat/Jahr/Heute
    navigieren, Eingabe übernehmen (`onInputChange`/`onInputBlur` ohne das DOM-Ereignis).
  - Die doppelte Umrechnung „Datum + Zeit in der Anzeige-Zeitzone → Wert in der Wert-Zeitzone, begrenzt“ (heute zweimal kopiert
    in `onDateSelected` und `onTimeChanged`) wird **eine** Funktion – mit demselben Ergebnis.
- **Was in der Komponente bleibt:** Eingabefeld und Maskito, Overlay öffnen/schließen samt `panelInputs` und Watchern,
  FormField-Anbindung, IDs, `emit`, Template, CSS. Das Panel (`CoarZonedDateTimePickerPanel.vue`) bleibt unverändert: seine
  Zustände (Zeitzonen-Suche, Monatsliste, Heute-Knopf) gehören zur Ansicht.
- **Eingaben des Kerns:** `modelValue` als `Ref`, die Props als Getter/`Ref`s (`min`, `max`, `timeZone`, `minuteStep`,
  `defaultTime`, `use24Hour`, `locale`, `dateFormat`). Der Kern ruft `useDatePickerBase` selbst auf und gibt `pickerBase` mit
  heraus, damit Komponente und Panel dieselben Werte sehen.
- **Nicht öffentlich.** Kein Export aus `index.ts`, kein Eintrag in `_shared/index.ts`. Die Form des API kann sich mit der
  zweiten Ansicht noch ändern; öffentlich wird sie dort, mit Preview-Badge. Daher **keine Doku- und Skill-Änderung**.
- **Reine Umstellung:** gleiches Verhalten, auch für Eigenheiten, die man für Fehler halten könnte. Fällt dabei ein Fehler auf,
  wird er notiert (Folgeaufgabe), nicht mitbehoben.
- **Ein Pull Request**, Titel `refactor(ui): the zoned date-time picker's logic moves into a composable`.

## Schritte

- [x] **1. Kern anlegen:** `packages/ui/src/components/date-time/_shared/use-zoned-date-time-picker.ts` mit Zustand,
  Berechnungen und Aktionen wie oben; die Komponente nutzt ihn, ihr Script schrumpft entsprechend. Zeilenenden der Dateien
  beibehalten.
- [x] **2. Tests des Kerns:** `_shared/__tests__/use-zoned-date-time-picker.test.ts`, ohne Mount: Formatieren/Parsen in
  Anzeige- vs. Wert-Zeitzone, Datum wählen mit und ohne vorhandene Zeit (`defaultTime`, `minuteStep`-Rundung), Zeit ohne Datum
  (`pendingTime`), Begrenzung an `min`/`max` über Zeitzonen hinweg, `effectiveMinTime`/`MaxTime` nur am Grenztag,
  Wert-Zeitzone ändern (gleiche Wanduhrzeit), Umschalten home ↔ location, Symbolzustände home/location/world, ungültige
  Eingabe beim Blur. Die bestehenden Tests in `zoned-date-time-picker/__tests__` bleiben unverändert und grün.
- [x] **3. Prüfen:** `pnpm lint && pnpm typecheck && pnpm build`; `pnpm test` als Job; `node apps/playground/scripts/visual.mjs`
  – `zoned-date-time-picker` und `zoned-date-time-picker-open` (default und mobile) unverändert, kein Bild darf sich ändern,
  kein `--update`. Danach **eine** Gegenprüfung (GPT-6.1 Sol), ihre Befunde selbst nachprüfen, dann der Pull Request.

## Annahmekriterien

- Keine Änderung an Template, CSS, Props, Events, Slots und Exporten von `CoarZonedDateTimePicker`; Panel unverändert.
- Alle Vergleichsbilder unverändert; alle bestehenden Tests grün ohne Änderung.
- Der Kern hat keinen Zugriff auf DOM, Overlay oder Maskito und ist ohne Mount testbar.
- Das Script der Komponente ist deutlich kürzer; Logik steht nur noch an einer Stelle (keine doppelte Umrechnung).

## Stand der Umsetzung

- Die Kind-Session wurde vor der ersten Codeänderung durch das Monatslimit von `claude-code` gestoppt.
  Die Hauptsession hat die Umsetzung übernommen, ohne Limits oder Abrechnung zu ändern.
- Der Kern erhält die reaktiven Props direkt; `useDatePickerBase` bekommt wie vorher berechnete Locale-/Format-Refs.
- Die Komponente umfasst jetzt 583 statt 879 Zeilen. Template, CSS und öffentliche API sind bytegleich.
- Alle 1845 Pakettests laufen durch, darunter 23 neue Tests des Kerns. Die bestehenden Tests sind unverändert.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` und `pnpm test` sind grün, einschließlich aller 154 Playwright-Tests.
  Der volle Bildvergleich ist mit 217 Prüfungen grün; keine Geschichte oder Baseline wurde geändert.
- Die einmalige abschließende Gegenprüfung fand keine Extraktionsregression; 50 gezielte Tests wurden dort erneut ausgeführt.
- Pull Request #54 ist gegen `develop` geöffnet. Merge und Beta erfolgen nur auf ausdrücklichen Auftrag des Nutzers.

## Danach, nicht Teil dieses Plans

- Dasselbe Muster für `CoarPlainDateTimePicker` und `CoarPlainDatePicker`, wenn die zweite Ansicht es braucht.
- Die zweite Ansicht selbst (`presentation`), mit öffentlichem `useZonedDateTimePicker()` als Preview.
