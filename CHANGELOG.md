# Changelog

All notable changes to the Cocoar Design System (Vue) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are calculated automatically by [GitVersion](https://gitversion.net/).

---

## 2.0.0

This release lands the calendar package's largest feature push since it shipped in 1.16.0 — the C8 recurrence pipeline is wired end-to-end, three previously-reserved or missing view IDs (`workWeek`, `timeline`) become real working components, and the event-interaction surface picks up hover handlers so consumers can wire their own popovers / tooltips via `@cocoar/vue-ui`'s overlay system. None of the changes are strictly breaking — the new shapes are additive — but the surface delta is large enough that a major bump is the honest signal. `@cocoar/vue-data-grid`, `@cocoar/vue-script-editor`, `@cocoar/vue-markdown-editor`, `@cocoar/vue-fragment-parser`, and `@cocoar/vue-ui` ride along on the same monorepo cadence; only one user-visible UI fix in this release (popover-preset export gap).

### Added

- **`@cocoar/vue-ui` — `CoarPlainDateView` / `CoarPlainDateTimeView` / `CoarZonedDateTimeView` display components**: read-only Temporal-typed date / date-time / zoned-date-time displays paired with the existing picker family. Each viewer mirrors its picker's `formatValue` logic exactly (same `useDatePickerBase` for locale + date-format resolution, same `coarFormatPlainDate` + `coarFormatTime` + `coarFormatTimezoneLabel` helpers) so a read-only display and the editor's resting state look identical. Props: `value`, `locale?`, `dateFormat?`, `placeholder?`, `size?`; `CoarPlainDateTimeView` adds `use24Hour?: boolean | 'auto'` (defaults to locale detection); `CoarZonedDateTimeView` adds `displayTimeZone?: string` (project all values into a single zone), `showTimeZone?: boolean` (toggle the trailing `GMT+1`-style label), and `use24Hour?`. **Cross-realm-safe type checks**: each viewer uses `Symbol.toStringTag` instead of `instanceof Temporal.X`, so a Temporal value created against one polyfill copy (e.g. inside `@cocoar/vue-ui`) still renders correctly when read by another package that resolves a different `@js-temporal/polyfill` path under pnpm's isolated dependency tree. **Reactive locale**: `useDatePickerBase` already tracks the consumer-app `useL10n().language` ref, so display updates on language change without consumer wiring. Use these anywhere you'd show a date without an editor — cards, dialogs, list rows, data-grid cells. 18 new unit tests across the three viewer components (rendering, format resolution, null handling, cross-realm duck-type acceptance, displayTimeZone projection). Total `@cocoar/vue-ui` suite 1211 tests across 60 files.
- **`@cocoar/vue-data-grid` — `col.plainDate()` / `col.plainDateTime()` / `col.zonedDateTime()` column shortcuts**: three new Temporal-typed column factories for date / date-time / zoned-date-time cells. Each pairs a locale-aware renderer (formats via `toLocaleString` with date-style: medium; `plainDateTime` adds time-style: short; `zonedDateTime` adds short zone-name suffix so cross-zone columns stay unambiguous at a glance) with an editor that wraps the matching picker from `@cocoar/vue-ui` (`CoarPlainDatePicker` / `CoarPlainDateTimePicker` / `CoarZonedDateTimePicker`). Cell values are `Temporal.PlainDate | null` / `Temporal.PlainDateTime | null` / `Temporal.ZonedDateTime | null` — strict typing, matching `@cocoar/vue-calendar`'s contract so dates round-trip between the grid and the calendar without conversion shims. Configurators expose the middle-tier picker surface: `.size()`, `.clearable()`, `.min()`, `.max()`, `.showWeekNumbers()`, `.highlightWeekends()`, `.markers()` (static or per-row function), `.locale()`. `col.zonedDateTime()` additionally exposes `.timeZone()` (default IANA zone for newly-created values; existing values keep their own zone) and `.timezoneFilter()` (wildcard patterns like `['Europe/*', 'America/*']`). Editor lifecycle matches the other Coar cell editors: `afterGuiAttached` focuses the trigger so the picker's keyboard handlers fire (arrow-key scrolls-page bug fixed at the source), focus-preservation prevents AG Grid from committing prematurely while the user navigates the body-teleported panel, commit happens via `getValue()` on Tab / Enter / click-outside. The legacy `col.date(field, config?)` shortcut (display-only, accepts `Date | string`) is unchanged for back-compat. `@js-temporal/polyfill` is now a peer dependency of `@cocoar/vue-data-grid`. 11 new factory tests; total data-grid suite 258 tests across 8 files. Docs page at `/components/data-grid/date-columns` with three live demos (PlainDate task scheduling, PlainDateTime reminders, ZonedDateTime cross-zone meetings).
- **`@cocoar/vue-data-grid` — `col.multiSelect(field, s => …)` and `col.tagSelect(field, s => …)` column shortcuts**: two new factory methods for multi-value cells. Both store the cell value as `T[]` and share one renderer (`CoarMultiSelectCellRenderer`) — comma-separated label lookup by default, `.display('chips')` opts into one `<CoarTag>` per value. `col.multiSelect()` editor wraps `<CoarMultiSelect>` (checkbox-list dropdown, `.searchable()` / `.showSelectAll()` / `.clearable()` available); `col.tagSelect()` editor wraps `<CoarTagSelect>` (chip-style trigger, dropdown shows only not-yet-selected, `.allowCreate()` accepts free-form values that round-trip into the array verbatim — the renderer falls back to `String(value)` for unknown labels). Both editors auto-open via `afterGuiAttached` and use focus-preservation (capture-phase `mousedown` listener that `preventDefault`s on `.coar-overlay-host` targets) so the dropdown stays open while the user toggles options; unlike `col.select()`'s auto-commit-per-pick, AG Grid only commits when the user finishes (click outside / Tab / Enter — `getValue()` returns the final array). Row-aware options work via `s.options(row => …)`. Configurators (`MultiSelectColumnConfigurator`, `TagSelectColumnConfigurator`) export from the package root; `MultiSelectCellEditorConfig` is the shared editor params type. 11 new factory tests; total data-grid suite 247 tests across 8 files. Docs page at `/components/data-grid/multi-select` with live demo (both variants side-by-side).
- **`@cocoar/vue-ui` — `CoarOtpInput` component**: N-cell input for 2FA / TOTP / SMS verification codes — the pattern where each digit lives in its own box, focus auto-advances on type, jumps back on Backspace-empty, and pastes spread across cells. Replaces the long-standing pain of using a regular `CoarTextInput` for 6-digit codes (typing fast, then Enter or mouse-to-OK). Fires a `complete(value)` event the moment the last cell fills so consumers can auto-submit without an OK button. `length` prop (default `6`) covers 4-digit PINs and 8-digit backup codes alike; `type: 'numeric' | 'alphanumeric' | 'text'` (default `'numeric'`) drives both keystroke filtering and the mobile keyboard hint via `inputmode`; `mask` renders cells as `<input type="password">` for shared-screen contexts. Sizes match the form-input family (`xs` / `s` / `m` / `l`) and the component picks up `error` + `required` automatically when wrapped in `CoarFormField` via the existing FORM_FIELD_INJECTION_KEY pattern. First cell carries `autocomplete="one-time-code"` so iOS / Android offer the SMS-autofill chip on the right cell. Keyboard model: Type → fill + advance, Backspace on empty → jump-back-and-clear, Backspace on filled → clear, Delete → clear in place, Arrows + Home/End → navigate, Tab → exits the group (the OTP input is effectively one tab-stop). Paste handler accepts a multi-character clipboard payload starting at any cell and spreads it forward, stripping characters that don't match `type` first. Two optional hooks fine-tune per-character behaviour beyond the built-in classes: `transform: (char) => string` rewrites or drops a character before commit (e.g. `c => c.toUpperCase()` so users can type lowercase claim codes), and `accept: (char) => boolean` adds a per-char reject predicate that ANDs with `type` (e.g. `c => !/[O0lI1]/.test(c)` to block visually-ambiguous chars in printed claim codes). Both hooks fire on single-char input AND on every char of paste-spread — paste runs through the same sanitizer. ARIA: `role="group"` with `aria-label="Verification code, N digits"`, each cell has `aria-label="Digit i of N"`, `aria-invalid` propagates from the error state. 24 unit tests cover the full surface (cell rendering, v-model in/out, numeric filtering, Backspace jump-back, Delete clear, paste spread, complete event, disabled / readonly / error states). Lives at `packages/ui/src/components/otp-input/`; types `CoarOtpInputProps`, `CoarOtpInputSize`, `CoarOtpInputType` exported from the package root. Docs page at `/components/otp-input` with five live demos.
- **`@cocoar/vue-calendar` — `onEventHover` / `onEventHoverLeave` handlers**: fire on `pointerenter` / `pointerleave` over any event element in any view (day / week / workWeek / month / agenda / timeline). Payload mirrors `onEventClick`: `{ event, native: PointerEvent }`. `native.currentTarget` is the event-element DOM node — pass it directly to `useOverlay({ anchor: { kind: 'element', element: native.currentTarget } })` from `@cocoar/vue-ui` to anchor a popover. The library deliberately does NOT ship a built-in popover (consumers want different shape: title-only tooltip vs full action menu vs edit-in-place panel) and does NOT apply hover delay (wrap with `setTimeout(..., 200)` if needed). Companion playground demo at `/calendar-popover` wires the pattern end-to-end.
- **`@cocoar/vue-calendar` — `'timeline'` view (Gantt-lite)**: one-row-per-logical-event horizontal time-axis layout for project-plan rendering. Date-axis and day-grid cells use `box-sizing: border-box` so the 1px right border doesn't add to the cell's flex width — bars (absolutely positioned at `left = days × pixelsPerDay`) stay aligned with their date columns indefinitely (without the fix, bars drifted left by 1px per day, accumulating to 21px after three weeks). Default bar render is a coloured rectangle without inline text — the row label on the left is the title source-of-truth; bars are pure timeline geometry. Consumers wanting inline bar text use the `#bar` slot. **Row virtualization built in** — labels and bars only render for rows in the viewport + 8-row buffer; a 1000-task project plan costs ~30-40 DOM rows regardless of total count. Uniform `rowHeight` makes the visible-range math `O(1)` (no per-row measurement); slot renderers only fire for visible rows. Companion playground page at `/calendar-timeline-perf` benches the workload at 100 / 500 / 1 000 / 2 500 tasks. **Recurring series collapse to one row** with N bars (one per occurrence in the window) instead of N separate rows — a weekly standup with 26 occurrences renders as ONE "Standup ×26" row, not 26 stacked "Standup" entries. Grouping key is `meta.__recurrence.seriesId` for recurring events, `event.id` for standalone — automatic, consumer code unchanged. New `<CoarTimelineView>` component, `useTimelineView()` composable, and the previously-reserved `'timeline'` value in `CalendarView` is now live. Left pane lists event labels (`meta.title ?? event.id`); right pane renders each event as a bar positioned by `[start, end)` against the visible window. **Excel-style frozen-pane layout** — date axis sticks at top during vertical scroll, label column sticks at left during horizontal scroll, top-left corner sticks at both. Single scroll container with pure CSS `position: sticky` + CSS Grid; no JavaScript scroll-sync. **Click-and-drag pan mode** — drag anywhere on non-interactive area to scroll both axes at once (`cursor: grab` / `grabbing` affordance, pointer-capture so pan continues when cursor leaves the element, `touch-action: none` for matching tablet behavior). Bar clicks bypass the pan handler via interactive-element detection. Configurable density via four setters: `timelineRangeDays(n)` (default 60 days — also the prev/next step), `timelinePixelsPerDay(p)` (default 56 — sized so a localized "DD. Mon" label fits on one line), `timelineRowHeight(h)` (default 32), `timelineLabelWidth(w)` (default 200). Pure layout math at `layoutTimeline(events, options)` exported from the package root for custom implementations and tests; one row per event sorted by start asc + id-asc tie-break, bars clamped to `[windowStart, windowEnd)` with `clippedStart` / `clippedEnd` flags. Cross-zone timed events project into the display zone for visual layout (a meeting at 23:00 Tokyo viewed in Vienna lands on the correct visual day). Three slots (`label`, `bar`, `dateHeader`) override the defaults with the full row geometry available. Scope-bounded — task hierarchy, dependencies, critical-path computation, milestones, and resource lanes are out of scope here; those land in a future `@cocoar/vue-gantt` package that builds on the same primitive. New i18n key `coar.calendar.view.timeline` (default label "Timeline"). Added to the default `availableViews` so the shell's view-switcher exposes it. Dedicated docs page at `/components/calendar/timeline-view`.
- **`@cocoar/vue-calendar` — `'workWeek'` view**: working-days subset of the week view. New `<CoarWorkWeekView>` component, `useWorkWeekView()` composable, and the `'workWeek'` value joins `CalendarView` after `'week'`. Configure the working-day set via `builder.workDays(MaybeRefOrGetter<readonly DayOfWeek[]>)` — default Mon–Fri (`[1, 2, 3, 4, 5]` using the 0 = Sun … 6 = Sat convention), overridable for 6-day operations (Mon–Sat), 4-day weeks (Mon–Thu), or Middle-East Sun–Thu work weeks. The visible-range `ViewWindow` stays the full Mon–Sun span (so `eventsLoader` / `seriesLoader` see weekend events the same way they do for the week view); only the rendered columns differ. Navigation steps by 7 days (the workday filter is purely a render concern, not a navigation one — stepping by 5 would leave the cursor on a weekend on alternate clicks). Added to the default `availableViews` list so the shell's view-switcher gets a "Work week" button automatically (consumers hide it by setting their own `availableViews`). New i18n key `coar.calendar.view.workWeek` (default label "Work week"). Pure helper `workWeekDates(date, firstDayOfWeek, workDays)` exposed from `core/index.ts` for consumer-side use. Dedicated docs page at `/components/calendar/work-week-view` documents the working-day conventions, navigation semantics, and the window-vs-render-set distinction (loaders see weekends, columns don't render them); matches the per-view doc-page pattern established by Day / Week / Month / Agenda.
- **`@cocoar/vue-calendar` — recurring events end-to-end (Phase 4 of the C1–C8 architecture)**: the C8 typed-throwing-stub `expandSeries` that shipped with the package in 1.16.0 is now a working engine. Two new builder setters mirror the non-recurring event pipeline: `builder.series(MaybeRefOrGetter<RecurringSeries<TMeta>[]>)` binds a reactive in-memory series source (mutating the array re-expands), and `builder.seriesLoader((window: ViewWindow) => RecurringSeries[] | Promise<RecurringSeries[]>)` binds a calendar-managed per-window async loader (cached by `${view}|${timezone}|${start}|${end}` like `eventsLoader`). Both compose with `events()` / `eventsLoader()` — `api.getVisibleEvents()` returns the merged set. `series()` and `seriesLoader()` are mutually exclusive (calling one clears the other), independent of the events pair. Expansion happens lazily per visible window, never speculatively — a series with `FREQ=DAILY` from year 2000 doesn't pay 25 years of expansion to render today's calendar.
- **`@cocoar/vue-calendar/recurrence` — public subpath**: standalone `expandSeries(series, window, dstPolicy, engine?)` function for non-builder use (server-side pre-expansion, custom views, deterministic tests). Async — engines are async by contract so worker-backed implementations fit the same shape. Lives at a subpath so apps that don't use recurrence don't pull the engine into their main bundle (the subpath chunk is ~7 KB; the bundled `rrule-temporal` adapter ~4 KB; both lazy-loaded on first call). Re-exports `RecurringSeries`, `RecurrenceExpansionWindow`, `RecurrencePattern` types and the `getRecurrenceMeta(event)` provenance accessor.
- **`@cocoar/vue-calendar/recurrence-rrule-temporal` — bundled engine adapter**: pure-JS, Temporal-native, wraps `rrule-temporal` (~1.5K LOC) for the canonical RFC-5545 RRULE feature set. No WASM, no worker, SSR-clean. Construction is cheap; dynamic-imported by the lazy default in `recurrence/`. Apps with extreme volume or specialized needs (alternative parsers, backend-delegated expansion) implement the `RecurrenceEngine` interface in consumer code and register via `builder.recurrenceEngine(custom)` — no library change required.
- **`@cocoar/vue-calendar` — `builder.recurrenceEngine(engineOrFactory)`**: override the bundled engine per builder. Accepts a `RecurrenceEngine` instance or a `() => RecurrenceEngine` factory (the factory form is the SSR escape — engines are constructed only on first client-side use). Intentionally NOT C7-reactive (mid-session swap has no sensible semantics — in-flight requests, worker lifecycle, cache coherency). Replacing the engine clears the resolved-engine cache and the series cache so the next visible-range read re-expands through the new engine.
- **`@cocoar/vue-calendar` — `RecurringSeries<TMeta>` public type**: Temporal-typed `dtstart` (`ZonedDateTime` for timed, `PlainDate` for all-day), RFC-5545 `rrule` string, optional `duration` (`{ minutes?, hours? }` for timed; `{ days? }` for all-day — D2 day-count semantics, no `Period`), optional `rdate` / `exdate` arrays of the matching Temporal type. ISO strings, native `Date`, floating `Temporal.PlainDateTime` rejected at the boundary; mixed `ZonedDateTime` / `PlainDate` in `rdate`/`exdate` against the series' `dtstart` shape throws with the series id named.
- **`@cocoar/vue-calendar` — `SeriesLoader<TMeta>` type**: mirrors `EventsLoader`. Re-exported from the package root for ergonomic single-import.
- **`@cocoar/vue-calendar` — per-occurrence provenance**: every expanded `CalendarEvent` carries `meta.__recurrence: { seriesId, recurrenceId, source: 'rrule' | 'rdate' }`, read via the new public `getRecurrenceMeta(event)` accessor exported from `@cocoar/vue-calendar/recurrence`. Returns `null` for non-recurring events. `recurrenceId` matches RFC-5545 `RECURRENCE-ID` semantics — the original wallclock slot — so future single-instance edits (override or cancel one occurrence) are addressable without changing the `CalendarEvent` shape. The `__` prefix marks the key as library-managed; consumer code reads it through the accessor, not directly.
- **`@cocoar/vue-calendar` — `DstPolicy` enforced uniformly across every recurring occurrence**: the same `'compatible' | 'reject' | 'earlier' | 'later'` union the drag pipeline uses (C4). After the engine returns instants, every timed rule-generated occurrence is re-resolved via `Temporal.PlainDateTime.toZonedDateTime` with the configured disambiguation, using the series' source zone — engine-swap invariance is structural, not advisory. Observable output depends only on `(intended wallclock, source zone, dstPolicy)`, never on which engine ran underneath. `'reject'` throws `DstResolutionError` on the first gap/overlap with the series id and offending wallclock in the message. All-day series and RDATE-originated occurrences pass through (no DST involvement, no library-imposed override of consumer intent). The `detectDstSituation` primitive moved from private to `core/index.ts` export so the drag pipeline and the recurrence pipeline share one source of truth.

### Fixed

- **`@cocoar/vue-data-grid` — date-column renderers refactored as thin wrappers around `@cocoar/vue-ui` viewer components**: the three renderers (`CoarPlainDateCellRenderer`, `CoarPlainDateTimeCellRenderer`, `CoarZonedDateTimeCellRenderer`) previously did all formatting inline using `toLocaleString` + `instanceof Temporal.X` checks against their own polyfill copy. Two symptoms surfaced from real-world use: (1) **editing a `zonedDateTime` cell wouldn't update the renderer's display** — the picker (in `@cocoar/vue-ui`) constructed `Temporal.ZonedDateTime` instances against its own polyfill copy, the renderer's `instanceof Temporal.ZonedDateTime` from its own copy rejected them, and the renderer fell through to empty string. (2) **Locale changes only partially propagated** — `toLocaleString` reacts to the BCP-47 language tag, but the pickers (and the rest of the date-time family) format via a locale-resolved date-format pattern from `useDatePickerBase`, so consumer locale switches that updated the format pattern bypassed the renderer's BCP-47-only formatter. Both bugs fixed at the source: renderers now embed the matching `<CoarPlainDateView>` / `<CoarPlainDateTimeView>` / `<CoarZonedDateTimeView>`, which use cross-realm-safe `Symbol.toStringTag` checks and the same `useDatePickerBase` reactive resolution as the pickers. Cell editors got the same toStringTag fix for their initial-value type-check (same potential cross-polyfill failure mode on edit-mode entry). New renderer-only `displayTimeZone` config on `col.zonedDateTime()` (`.displayTimeZone('Europe/Vienna')`) projects every row into a single zone for cross-zone coordination views.
- **`@cocoar/vue-data-grid` — select cell editors focus the trigger on edit-mode entry**: `CoarSelectCellEditor`, `CoarMultiSelectCellEditor`, and `CoarTagSelectCellEditor` previously only `click()`-ed the trigger in `afterGuiAttached` to auto-open the dropdown — focus stayed on the AG Grid cell wrapper. The trigger's `@keydown` handler (Arrow Up / Arrow Down navigation, Enter commit) therefore never fired; arrow keys bubbled to the document and **scrolled the page** instead of moving through the option list. All three editors now call `trigger.focus()` after the click. `tabindex="0"` on the trigger (already present) makes the focus call valid. For `.searchable()`, `CoarSelect.onTriggerClick` schedules a `nextTick` focus on the inline `<input>` — that input's own `@keydown` delegates to the same handler, so search-mode keyboard navigation continues to work.
- **`@cocoar/vue-calendar` — views read the merged event source** (was: only `state.events`): `<CoarMonthView>`, `<CoarTimeGrid>`, `<CoarAgendaView>` previously read `state.events ? toValue(state.events) : []` directly, bypassing the loader cache (silent for `eventsLoader`-mode consumers) and — once Phase 4 landed — the series cache (recurring events counted in `getVisibleEvents()` but never rendered). All three views now read via `props.builder.api.getVisibleEvents()`. Caught during browser hand-test via chrome-devtools on the `/calendar-recurrence` playground page: stats panel said 22 events visible, only 1 (the one-off) rendered as a pill.
- **`@cocoar/vue-calendar` — recurring occurrences no longer collapse to one pill in the month view**: `layoutMonthGrid` dedupes events by `event.id` — multiple expanded occurrences sharing the series id collapsed to a single rendered pill (12 of 13 weekly standups silently dropped). Each occurrence now carries a unique synthetic `${seriesId}__${recurrenceId}` id; series identity moved to `getRecurrenceMeta(event).seriesId`. Public contract reflects the unique-id shape; tests assert no duplicates in expansion output.

### Internal

- **`@cocoar/vue-calendar` — adapter-pattern topology with one bundled engine**: the `RecurrenceEngine` interface lives at `src/recurrence/types.ts` with structured wire types (`EngineRequest` / `EngineResponse` use plain numeric components + per-endpoint `tzid`, no string round-trips). The bundled adapter at `src/recurrence-rrule-temporal/` is the only place that imports `rrule-temporal`. ESLint `no-restricted-imports` rule enforces the topology: `rrule-temporal` outside `recurrence-rrule-temporal/**` is a lint error. The decision to ship one engine (not the planned rrule-rust + rrule-temporal pair) follows from the engine-baseline divergence found during cross-engine bake-off: rrule-rust's DST and per-RDATE-zone semantics differed from rrule-temporal's in ways that couldn't be hidden behind the post-processing normalizer without losing information. Apps that need rrule-rust performance plug their own adapter via `builder.recurrenceEngine(...)`.
- **`@cocoar/vue-calendar` — race-safe series expansion**: `_inFlightSeriesKeys: Set<string>` keyed by `windowKey` blocks duplicate dispatches when `[SET_VISIBLE_RANGE]` and the post-flush series watcher both trigger expansion for the same window in close succession. Generation counter (`_seriesGeneration`) discards stale results on cache invalidation (`refresh()`, engine swap, dstPolicy change, source replacement). The initial-set watcher guard (skip when `state.series` transitions from `null` to a value, since `[SET_VISIBLE_RANGE]` is the canonical trigger for that case) prevents a self-DoS where setting series before setVisibleRange would leak in-flight chains.
- **`@cocoar/vue-calendar` — `expandSeries` lazy-imported by the builder**: dynamic `import('../recurrence/index')` in `_runSeriesExpansion` keeps the recurrence chunk out of the main bundle for apps that never use series. `dist/index.js` stays at ~133 KB (was 128 KB before Phase 4 — +5 KB for the new builder methods, no engine code).
- **`@cocoar/vue-calendar` — 32 new unit tests across 4 files**: `recurrence-public.test.ts` (expansion correctness for timed + all-day, source-zone preservation, EXDATE / RDATE behavior, provenance), `dst-resolve.test.ts` (all four `DstPolicy` values against spring-forward + fall-back in `Europe/Vienna`, RDATE pass-through, all-day pass-through, cross-zone Tokyo-in-Vienna), `recurrence-engine-setter.test.ts` (builder API + factory form), `series-pipeline.test.ts` (reactive series source, seriesLoader caching, mutual exclusivity, composition with `events()`, recurrence-engine swap invalidation, dstPolicy change invalidation, `refresh()` / `refreshRange()`, loading flag accounting). Total calendar suite: 634 unit tests across 44 files (was 602 baseline).

### Docs

- **`docs(calendar)` — new "Recurring events" section** in `apps/docs/components/calendar/coar-calendar.md`: covers the `RecurringSeries` shape and Temporal-only contract, the two source modes (`series()` reactive and `seriesLoader()` cached), `getRecurrenceMeta()` provenance access, the standalone `expandSeries(series, window, dstPolicy, engine?)` entry, the `RecurrenceEngine` interface for custom engines (with SSR factory form), and the `Quartz.NET 3.18.0` interop note — since Quartz now ships native RFC-5545 RRULE triggers (`WithRecurrenceSchedule`), the same `rrule` string + `dtstart` + IANA zone round-trips between Cocoar's frontend display and a Quartz backend job scheduler without a translation layer. Companion live demo `demos/CalendarRecurrence.vue` (DST-policy switcher, reactive add-series button, provenance click-inspect).
- **`playground(calendar)` — new `/calendar-recurrence` demo page**: same shape as the docs demo but with a larger surface area (multiple visible weeks, all-day yearly holiday, dynamic series mutation, "Jump to DST day" navigation shortcut). Used for chrome-devtools regression testing; landed both browser-only bugs in this release.
- **`docs(calendar)` — API reference table extended**: `series`, `seriesLoader`, `recurrenceEngine` setters added with full type signatures and mutual-exclusivity notes.

---

## 1.18.0

### Added

- **`@cocoar/vue-data-grid` — cell-editing primitives**: three new chainable methods on the column / grid builders form the foundation for in-cell editing. `column.editable(value | row-predicate)` gates whether a cell enters edit-mode (boolean or `(row) => boolean`; predicate auto-handles missing row data). `column.cellEditorConfig(component, config)` mirrors the existing `cellRendererConfig` for swapping in custom editors — the config is wrapped under `cellEditorParams.config` so every editor gets the same access shape. `gridBuilder.onCellValueChanged(handler)` provides a single grid-level commit hook fired for both editor commits and renderer-driven mutations (e.g. checkbox toggles via `node.setDataValue`). New "Editing" doc page documents the AG-Grid edit-mode flow + Tab-through-edit-mode navigation.
- **`@cocoar/vue-data-grid` — `col.text(field, t => …)`**: text column whose editor is `<CoarTextInput>`, fitted into the cell with form chrome stripped (no nested border, no extra focus ring — the AG Grid cell is the edit-mode frame). Replace-on-type via AG Grid's `eventKey` (printable key seeds the input), value pre-selected via `afterGuiAttached` so typing replaces. Configurator: `placeholder`, `maxLength`, `size`, `prefix`, `suffix`. Renderer uses AG Grid's default text rendering.
- **`@cocoar/vue-data-grid` — `col.number(field, n => …)`** *(overload)*: existing `col.number(field, config?)` keeps the legacy config-object form (renderer only). New callback form bundles `CoarNumberCellEditor` automatically — Maskito-driven locale-aware parsing means `1.234,56` in `de-AT` and `1,234.56` in `en-US` both yield the same numeric value. Configurator: `decimals` (renderer + editor), `min`/`max`/`step`/`stepperButtons`/`placeholder`/`size` (editor). Replace-on-type seeded via the digit / `.` / `,` / `-` key that started the edit.
- **`@cocoar/vue-data-grid` — `col.select(field, s => …)`**: select column with two cooperating components — `CoarSelectCellRenderer` (label-lookup; displays the label of the option matching the cell value) and `CoarSelectCellEditor` (auto-opens the dropdown via `afterGuiAttached`). Selection auto-commits — picking an option *is* the edit, no separate Tab/Enter needed. Configurator: `options` (static array OR `(row) => CoarSelectOption<T>[]` for row-aware menus), `clearable`, `searchable`, `placeholder`, `searchPlaceholder`, `size`. Dropdown teleports to `<body>` via Coar's overlay-host so it can extend past cell / grid boundaries without clipping.
- **`@cocoar/vue-data-grid` — `col.checkbox(field, c => …)`**: checkbox column with a read-only `<CoarCheckbox>` renderer + interactive `<CoarCheckboxCellEditor>`. Renderer is always read-only by design (matches text/number/select); interactivity comes from edit-mode entered via double-click / Enter / F2, exactly like other editable column types. Inside edit-mode Space toggles, Tab commits and moves to the next editable cell (AG Grid's standard keyboard navigation), Escape cancels. Configurator: `label` (static or per-row), `indeterminate` (per-row tri-state), `size`. Vertical-centering CSS shim corrects CoarCheckbox's form-context layout (`align-items: flex-start`, fixed `min-height`, `margin-top` hack) inside the grid cell.
- **Configurator-callback pattern**: new `CheckboxColumnConfigurator`, `TextColumnConfigurator`, `NumberColumnConfigurator`, `SelectColumnConfigurator` classes provide the `s => s.options(...).clearable()`-style fluent API. Layered overrides via `.cellRenderer(MyOwn)` / `.cellEditorConfig(MyEditor, …)` continue to work as escape hatches (last-write-wins on the chain).

### Fixed

- **`@cocoar/vue-ui` — `CoarNumberInput` clear button no longer surfaces on focus when `clearable={false}`**: the `.coar-number-input-clear--hidden` modifier (`opacity: 0`) was outranked by the focused / hover overrides (`opacity: 1`, same selector specificity but defined later in the cascade), so the X appeared even on focused inputs explicitly opted out of clearing. Fix scopes the focused / hover rules with `:not(.coar-number-input-clear--hidden)` so they explicitly skip hidden buttons. Keeps the opacity-based hiding strategy (rather than switching to `v-if` like `CoarTextInput`) because the clear button sits to the LEFT of the input — a `display: none` hide would shift the input on appear/disappear, hurting layout stability.
- **`@cocoar/vue-data-grid` — `CoarSelectCellEditor` commits the selected option** (was: silently dropped under real user clicks): mousedown on a body-teleported dropdown option shifted focus away from the editor → AG Grid's `stopEditingWhenCellsLoseFocus` fired *before* CoarSelect's option-click handler could update the model → `getValue()` returned the OLD value. Caught by the user during hand-testing; the original verification used synthetic `HTMLElement.click()` which bypasses focus/blur flow. Fix is a capture-phase document `mousedown` listener installed while the editor is mounted: when the click target sits inside a Coar `overlay-host`, `preventDefault()` blocks the focus shift. The click event still fires, CoarSelect updates the model, the watch picks it up and triggers `stopEditing` — `getValue()` then returns the new value. Outside-clicks (everywhere else) still cause focus loss → AG Grid commits/cancels normally.

### Internal

- **`@cocoar/vue-data-grid` — new `configurators/` directory**: holds the per-column-type fluent configurator classes. Re-exported from the package root for consumers writing custom helpers.
- **Docs reorganisation**: dedicated "Data Grid" sidebar section replaces the single-item "Data" section. Currently five sub-pages (Overview, Editing, Text Column, Number Column, Select Column, Checkbox Column) with one live demo per page.
- **`docs(calendar)`**: marked the Calendar package as **Preview** in the sidebar to set expectations until v1.0 of `@cocoar/vue-calendar`.
- **`ci`**: docs-only changes now skip the full CI matrix (`paths-ignore` filter on `apps/docs/**` and `**/*.md`). Saves ~3 min per docs-only PR; full CI still runs whenever non-docs files are touched.

---

## 1.17.0

### Added

- **`@cocoar/vue-calendar` — DnD composables generic over `TMeta`**: `useCalendarDnd`, `useMonthDnd`, `useTimeGridDnd` now accept a `TMeta extends Record<string, unknown>` type parameter, propagating event meta types through `CalendarEvent<TMeta>`, `EventDropPayload<TMeta>`, snapshot types, and the keyboard-drag state. Default stays `Record<string, unknown>` so existing JS consumers are unaffected; TypeScript consumers writing custom DnD wiring can now keep their meta types end-to-end through the drop pipeline.
- **`@cocoar/vue-calendar` — `useViewWindow` accepts a `{ view }` override**: standalone sub-views (`<CoarMonthView />`, `<CoarDayView />`, `<CoarWeekView />`, `<CoarAgendaView />`) pass their intended view via the new optional 2nd argument, which sets `builder.state.view` so the same builder composed via `useDayView()` / `useMonthView()` etc. (which never set `view`) renders correctly when handed to a sub-view component. Replaces the parallel `onMounted` hacks DayView and WeekView each carried; MonthView and AgendaView never had them and were silently broken in standalone mode (window computed for the wrong view, loader fetched the wrong range).
- **`@cocoar/vue-calendar` — `canDrop` validators receive `displayZone`**: the `CanDropTarget` shape advertised `displayZone: string` but both DnD composables silently dropped the field before invoking the validator. Now passed through. Article-5 / C5 conformance — consumers writing rules like "no drops in business hours of the user's local zone" can read `target.displayZone` directly instead of closing over `state.timezone` separately.

### Changed

- **`@cocoar/vue-calendar` — `EventLayoutCtx.kind` discriminator values aligned with templates**: type values are now `'positioned' | 'allDayBar' | 'monthPill' | 'monthBar'` (matching the layout-class names used by the views and the values templates have always emitted). The previous `'timed' | 'allDay' | 'monthBar' | 'monthPill'` was a documentation lie: templates never sent `'timed'` or `'allDay'`, so consumer event-renderers branching on those values were dead code at runtime. Renderers using the universal `state.eventRenderer` keep working unchanged; renderers that explicitly switched on `ctx.layout.kind` should now match the corrected values.

### Fixed

- **`@cocoar/vue-fragment-parser` — `vue-router` peer range widened to `^4.5.0 || ^5.0.0`**: consumer apps already on `vue-router@5.x` got a peer-dependency warning because the published range was still capped at `^4.5.0`. The package only uses `useRoute` / `useRouter` — both stable across vue-router 4 and 5 — so widening is safe. The monorepo itself runs on 5.x (playground + fragment-parser dev dep), the peer range was just lagging behind.
- **`@cocoar/vue-markdown-editor` — external `v-model` updates no longer dropped during Milkdown init**: a parent that initialised `v-model` synchronously to a placeholder and then assigned the real value asynchronously inside `onMounted` (typical store-load pattern) saw the editor stay locked on the placeholder. The watcher in `EditorImpl` bailed silently when `getInstance()` returned `null` during Milkdown's async init window, and the missed update was never replayed — so saving without further edits round-tripped the placeholder back to the API and overwrote the real document body. The watcher now buffers the latest external value while the editor isn't ready and a second watcher on Milkdown's `loading` ref flushes it via `replaceAll` once init completes. Found while migrating `cocoar-policy` knowledge docs to event sourcing.
- **`@cocoar/vue-calendar` — `<CoarCalendar>` honors `prefers-reduced-motion`**: `smoothScrollBodyTo` was reading `window.value.matchMedia(...)` where the local `window` const shadowed the global by binding to a `ViewWindow` computed (a `{ start, end, timezone }` POJO). The match-media check therefore always returned `undefined` and the animated scroll always fired, ignoring the user's reduced-motion preference. Reaches the browser's `window` via `globalThis` now; users with `prefers-reduced-motion: reduce` get instant scroll on `scrollToTime` / `scrollToDate`.
- **`@cocoar/vue-calendar` — phantom-event stubs use real Temporal objects**: the placeholder events passed to `phantom` and `invalid` variants of `<CoarTimeGridEvent>` / `<CoarTimeGridAllDayBar>` / `<CoarMonthPill>` / `<CoarMonthBar>` were typed as `CalendarEvent` but constructed with string `start` (`'1970-01-01'` / `'1970-01-01T00:00:00Z'`) — direct C1 violation in internal code. Now constructed with `Temporal.PlainDate.from(...)` / `Temporal.ZonedDateTime.from(...)`. Stubs are still "plumbing only, never observed at runtime" (the variants don't invoke their slots), so the change is purely a type-correctness fix.

### Internal

- **Workspace-wide TypeScript hygiene + CI hardening**: the `vite-plugin-dts` build emits TS errors to stdout but does not fail the build, so 144 silent type errors had accumulated across `@cocoar/vue-script-editor` (8), `@cocoar/vue-ui` (10), and `@cocoar/vue-calendar` (126) — all green CI runs were green-with-errors-in-the-log. Every error is fixed (Monaco 0.55 namespace migration, `useSlots()` typing in renderless wrappers, generic propagation through TMeta, `EventLayoutCtx.kind` alignment, `Props` interface inlining to bypass vue-tsc's TS4025 on script-setup-generic SFCs, slot signatures marked optional so `v-if="$slots.foo"` no longer trips TS2774, etc.). New `pnpm typecheck` script per package wired through a turbo task (`vue-tsc --noEmit`) and added as a CI step between Lint and Test in both `ci-develop` and `ci-pr-validation` workflows. Future TS regressions now fail the build instead of being logged and ignored.
- **`@cocoar/vue-markdown-editor` — first component-level test**: `CoarMarkdownEditor.test.ts` mounts the editor with `@vue/test-utils` + happy-dom + `CoarOverlayPlugin` and pins both the v-model race (external update before Milkdown ready) and the post-init external-update path. Test 1 fails deterministically without the v-model buffer fix.
- **`monaco-editor` deduplicated to `^0.55.1` across the workspace**: `apps/docs` and `apps/playground` were still on `^0.54.0` while `@cocoar/vue-script-editor`'s peer-range demanded `^0.55.1` — for `0.x` versions a caret pins the minor, so the two ranges did not overlap and the lockfile carried both `monaco-editor@0.54.0` and `@0.55.1` side-by-side. Apps bumped to `^0.55.1`; the duplicate is gone.
- **Lint cleanup — zero workspace-wide warnings**: `vue/one-component-per-file` and `vue/require-prop-types` disabled in `*.test.{ts,js}` / `**/__tests__/**` (multi-component test harnesses are the standard Vue test pattern, not a smell); `vue/attribute-hyphenation` disabled at the Vue-file level (Vue's `aria-*` / `data-*` fall-through-attribute treatment skips kebab→camel coercion, so binding `:ariaRowIndex` on a child must use camelCase to actually wire the prop). Two file-level disables for the deliberate multi-component layouts: `default-renderers.ts` (the entire markdown default registry in one place per the file-header comment) and `CoarMarkdownEditor.vue` (inner `EditorImpl` + `Toolbar` share the `MilkdownProvider` context).

---

## 1.16.0

### Added

- **`@cocoar/vue-calendar` — new package**: Vue 3 calendar component built around `Temporal`. Day / Week / Month / Agenda views, a top-level `<CoarCalendar>` shell with prev / today / next navigation and a segmented-control view switcher, and standalone composables (`useDayView()` / `useWeekView()` / `useMonthView()` / `useAgendaView()`) for embedding a single view without the shell. Public surface is `Temporal.ZonedDateTime` (timed events) or `Temporal.PlainDate` (all-day events) — never strings, `Date`, `PlainDateTime`, or `Instant`. Eight architecture invariants (C1–C8) drawn from the ["Time in Software, Done Right" article series](https://dev.to/bwi/why-a-date-is-not-a-point-in-time-ad8) are enforced structurally: Temporal-only public surface (C1), single drop pipeline through `applyMoveToEvent` (C2), per-endpoint source zones preserved across every drag mode including cross-zone events (C3), explicit `DstPolicy` argument on every wall-time → instant conversion (C4), display zone vs source zone surfaced separately on drop payloads (C5), independent `locale` / `dateStyle` / `timeStyle` / `hour12` decisions merged through a single `buildFormatOptions` (C6), reactivity-by-reads not setup-capture (C7), and `RecurringSeries` as a first-class type with a typed throwing-stub `expandSeries` until the recurrence engine lands (C8). Flat `CalendarBuilder` — every setter (`timeRange`, `slotDuration`, `maxEventsPerCell`, `agendaLengthDays`, …) lives on the same builder. Universal `eventRenderer((ctx) => ...)` with `ctx.layout.kind` discriminator (`'positioned' | 'allDayBar' | 'monthPill' | 'monthBar'`) covers every variant. Drag-and-drop with mouse / touch / keyboard, cluster-aware lane sizing, virtualized agenda surface, multi-day bars across month rows, "+ N more" overflow expansion via per-cell kebab menu. Wire helpers `parseScheduledTime` / `formatScheduledTime` / `parsePlainDate` mirror the Article-8 `{ local, timeZoneId }` shape that .NET / NodaTime backends and PostgreSQL `local_start text + time_zone_id text` storage natively speak.
- **`@cocoar/vue-calendar` — `Temporal` re-export**: `import { Temporal } from '@cocoar/vue-calendar'` for consumers that don't want a direct `@js-temporal/polyfill` dependency.
- **`@cocoar/vue-calendar` — default event renderers surface C3 / C5 zone semantics**: a shared decoration layer (`<CoarEventDecorations>`, internal) inserts a small globe icon + tooltip + sr-only announcement on the default time-grid event card, month pill, month multi-day bar, and agenda event row. Two semantics, mutually exclusive: (1) `start.timeZoneId === 'UTC'` → globe + tooltip "Global event — same instant worldwide" (Article 5 — UTC-anchored events render the same instant for everyone, regardless of display zone); (2) `start.timeZoneId !== displayZone` (and is not UTC) → globe + accent dot + tooltip "Source zone: \<iana>" (Article 3 — render the user's clock without hiding the source). Suppressed on multi-day bars when `clippedStart` so only the visible head decorates. The same logic ships as a public helper `getEventZoneHints(event, displayZone) → { isUtcAnchored, sourceZone }` for custom renderers. Three i18n keys: `coar.calendar.event.utcLabel`, `coar.calendar.event.utcGlobalHint`, `coar.calendar.event.crossZoneHint`.
- **`<CoarDisplayZoneSwitcher>` — drop-in display-zone selector** exported from `@cocoar/vue-calendar`: wraps `<CoarSelect>` with a curated 7-zone default list (Vienna / Berlin / London / New York / Los Angeles / Tokyo / UTC), automatically prepends the browser-detected zone if it isn't in the list, accepts an `:options` override for full IANA / domain-specific lists. `v-model` is the IANA id string the consumer passes into `builder.timezone(tz)`. Two i18n keys: `coar.calendar.zoneSwitcher.label`, `coar.calendar.zoneSwitcher.browserSuffix`.

### Internal

- **`@cocoar/vue-calendar` — 602 unit tests across 43 files**: timezone conformance suite at `src/core/__tests__/timezone/` pins every C1–C8 invariant; component tests cover the shell + each sub-view + the drop pipeline integration; `useViewWindow` tests pin the C5 single-writer invariant; zone-hint helper covered by 7 dedicated tests.

### Docs

- **New "Calendar" sidebar group** under Components — overview page, `<CoarCalendar>` (composer) reference with full builder API, per-view pages (Day, Week, Month, Agenda) with standalone-usage examples, and a manual performance bench in the playground (`/calendar-perf-bench`) for eyeballing wheel-scroll smoothness, view-switch latency, and drag-frame stability against documented Tier-A targets.

---

## 1.15.0

### Added

- **`@cocoar/vue-markdown-editor` — text color**: new `textColor` tool exposes a palette + native color-input picker in the floating toolbar and the sidebar (fixed mode). Selection-based `text_color` ProseMirror mark, full markdown round-trip as `<span style="color: …">…</span>`. Picker uses the shared overlay service (`menuPreset`): anchor-relative positioning, viewport flip, scroll-reposition, outside-click + escape dismissal — no bespoke layout. Active color shows as a thin indicator bar under the trigger icon. New exports: `COAR_TEXT_COLOR_PALETTE` (8 swatches), `textColor` plugin bundle, `textColorMark` and `textColorRemark` for advanced setups.
- **`@cocoar/vue-markdown-core` — color-span sanitizer + parser fold**: shared `sanitizeColor` / `sanitizeColorStyle` / `parseColorSpanOpen` / `isColorSpanClose` / `serializeColorSpanOpen` / `serializeColorSpanClose` helpers. Whitelist accepts hex (`#rgb`/`#rrggbb`/+alpha), `rgb()` / `rgba()` / `hsl()` / `hsla()` (legacy + modern syntax), and a small set of named CSS colors (`red`, `blue`, …, `transparent`, `currentcolor`); rejects `var(--token)`, `url(…)`, `expression(…)`, multi-declaration styles, foreign attributes, control characters. New `colorSpan` `MarkdownNodeType` with `attrs.color`; the parser folds matched `<span>` open/close pairs in inline children into a single node (depth-aware nesting). Serializer flat-maps colorSpan back to `html` opener + children + closer.
- **`@cocoar/vue-markdown` — `colorSpan` renderer**: `DefaultColorSpan` registered in `defaultMarkdownRenderers`. Re-validates the color attribute via `sanitizeColor` at render time (defence in depth) — invalid values strip the inline style and fall through to plain text. New `colorSpanColor` helper exported from `helpers.ts`.

### Changed

- **`@cocoar/vue-markdown` shared stylesheet — editor↔viewer parity**: rendering rules now cover both the viewer's class-based DOM (`<div class="coar-markdown-list-item">…`) *and* the editor's PM-managed bare-element DOM (`<li>` no class). Block-spacing and typography selectors extended with `.coar-markdown .ProseMirror > :where(…)` so the editor's `.ProseMirror`-wrapped blocks pick up the same vertical rhythm. New bare-element fallbacks for `:where(blockquote, ul, ol, li, code:not(pre code), a)`. User-agent margin on `<p>` inside `<li>` / `<td>` / `<th>` zeroed (PM wraps cell/list content in `<p>` — without the reset every editor row was one line taller than its viewer pendant). Table zebra rule rewritten with `:nth-child(<n> of :not([data-is-header]))` so Milkdown's `tr[data-is-header]` (which lives inside `<tbody>`, unlike the viewer's `<thead>`) is excluded from the alternation index — the first data row reads as "row 1" in both panes. Bare `<blockquote>` margin reset to `0` so the browser's user-agent `40px` margin doesn't indent editor blockquotes deeper than viewer blockquotes.
- **`@cocoar/vue-markdown` task-list rendering**: `DefaultListItem` no longer emits a native `<input type="checkbox">` + wrapping `<div class="coar-markdown-list-item-content">`. It now mirrors the editor's PM-emitted attributes — `data-item-type="task"` + `data-checked="true|false"` on the `<li>` directly — and the visual checkbox is a `::before` pseudo-element on the `<li>` (cocoar-style filled square + check). Strikethrough on completed items moved to the shared stylesheet so editor and viewer render identically.
- **`@cocoar/vue-markdown` shared stylesheet — `--coar-markdown-heading-block-start`** lowered from `var(--coar-spacing-xxxl, 4rem)` to `var(--coar-spacing-xl, 2rem)`. The previous 4rem/64px gap before every heading read as "blank lines" in both viewer and editor; 2rem/32px still marks sections clearly without pushing four lines of whitespace into view.
- **`@cocoar/vue-markdown-editor` styles trimmed**: deleted local typography overrides (`h1` / `h2` / `h3` / `p` / `ul` / `ol` / `li` / `blockquote` / `code` / `table` / `th` / `td` / `a` / `strong`) plus the task-list checkbox CSS — all now live in `@cocoar/vue-markdown/styles` and apply uniformly. Editor `<strong>` was rendering at `font-weight: 600` while the viewer used the browser's `bolder` (700); both now read 700.

### Fixed

- **`@cocoar/vue-markdown-editor` — color picker no longer flashes at (0,0)**: the previous manual `Teleport` + `getBoundingClientRect` positioning rendered the popover at the initial `{ left: '0px', top: '0px' }` style ref before reactivity flushed the measured anchor coordinates. Replaced with `useOverlay().open({ spec: menuPreset, anchor: { kind: 'element', element: trigger } })` so the overlay service measures + positions atomically before paint.
- **`@cocoar/vue-markdown-editor` — color picker now closes on outside click**: the previous custom `mousedown` handler exempted only `.coar-md-color-picker`, so clicks anywhere on the page outside that selector closed the picker via the floating-toolbar hide path — but the picker had no escape-key dismissal, no scroll-close, and was inconsistent with other Cocoar overlays. Now driven by `menuPreset` which gives `outsideClick: true` + `escapeKey: true` + `scroll.strategy: 'close'` for free.

---

## 1.14.0

### Added

- **`@cocoar/vue-ui` — `CoarSidebar` supports all four edges**: new `side` prop accepts `'left' | 'right' | 'top' | 'bottom'` (default `'left'`); `top` / `bottom` switch the layout to a horizontal toolbar (items in a row, scrolls horizontally) while `left` / `right` keep the classic vertical column. Tooltip placement, flyout direction, the active-state indicator border edge, and the collapsed dimension (width vs. height) all derive from `side` automatically. `CoarSidebarItem` and `CoarSidebarGroup` inject the side via a new `SIDEBAR_SIDE_KEY` to adapt their own internals — child group flyouts open right (left side), left (right), down (top), or up (bottom). Items inside a horizontal sidebar are `flex-shrink: 0` so the row genuinely overflows rather than squishing, which is what triggers the OverlayScrollbars horizontal scrollbar. The deprecated `position` prop still works for backwards compatibility but maps internally to `side`.
- **`@cocoar/vue-ui` — collapsed sidebar dimensions auto-scale with `size`**: previous `4rem` default for `--coar-sidebar-collapsed-width` was generous for nav rails but too wide for icon-only formatting toolbars. Per-size fallbacks now resolve to `2.25rem` (s), `2.75rem` (m), `3.25rem` (l) for both the collapsed width (vertical) and the new collapsed height (horizontal). Setting `--coar-sidebar-collapsed-width` / `--coar-sidebar-collapsed-height` explicitly still overrides the fallback — the variable becomes defined in the cascade and `var()` returns the inherited value instead of the per-size literal, so app-level / wrapper-level overrides keep working unchanged (the `@cocoar/vue-markdown-editor` wrapper relied on this and continues to win at `2.25rem`).
- **`@cocoar/vue-ui` — expanded-group children render as visually nested**: items inside a `<CoarSidebarGroup>`'s expand panel get tighter padding, smaller font, a `scale(0.85)` icon with reduced opacity, and an explicit opacity fade on the label. Rule applies in **all four** orientation × collapsed combinations, so children read as nested whether the sidebar is vertical or horizontal, collapsed or expanded — important for horizontal expand mode where children sit inline with their parents on the same row and indent alone is no longer a cue. Hover background stays at full strength because the opacity is on the icon and label individually, not the item.
- **`@cocoar/vue-markdown-editor` — `toolbarPosition` extended to all four edges**: type widened from `'left' | 'right'` to `'left' | 'right' | 'top' | 'bottom'`, so the formatting toolbar can sit above or below the editor as a horizontal strip. Editor root's `flex-direction` flips between `row` (left/right) and `column` (top/bottom), and the toolbar/editor border edge follows the chosen side. The wrap now sets both `--coar-sidebar-collapsed-width` and `--coar-sidebar-collapsed-height` so the toolbar stays at `2.25rem` in either orientation. Existing `'left'` / `'right'` consumers are unaffected — same default, same visuals.

### Fixed

- **`@cocoar/vue-ui` — `vTooltip` directive value type now allows `false` / `null` / `undefined`**: every collapsed-aware component (`CoarSidebarItem`, `CoarSidebarGroup`, `CoarMultiSelect`, …) returned a falsy value from its `tooltipConfig` computed to mean "do not render a tooltip" — which the directive's runtime already handled correctly but its TypeScript signature did not (`string | TooltipOptions` only). `vue-tsc` flagged the call sites, even though the runtime was fine. Type widened to `string | TooltipOptions | false | null | undefined` and `getOptions` now returns `{ content: '', disabled: true }` for falsy bindings instead of casting `false` to `TooltipOptions` (was a latent runtime smell — primitive-boolean property reads happened to return `undefined`, but `state.opts` was lying about its type).

---

## 1.13.1

### Fixed

- **`@cocoar/vue-data-grid` — wrapper column inner renderer config was shadowed by the wrapper config**: factory-created column renderers (`col.tag()`, `col.tree()`, `col.date()`, `col.number()`, `col.currency()`, `col.icon()`) all read their own configuration via `params.colDef.cellRendererParams.config`, but AG Grid hands the *outer* (wrapped) colDef to the renderer — so wrapped inner renderers were receiving the wrapper's config instead of their own, dropping `variantMap`, `showChildCount`, `decimals`, `currencyCode`, `includeTime`, and every other inner-renderer option. Tree columns stayed mostly functional (expand/collapse + indentation come from `grid.context.coarTree`, not `cellRendererParams`), but `showChildCount` was lost; tag, date, number, currency, and icon columns fell back to their defaults entirely when wrapped. `WrapperCellRenderer` now rebuilds the inner's `params.colDef.cellRendererParams` so nested factory columns see exactly what they would see unwrapped. New probe test replicates the factory renderers' read path to prevent regression.

---

## 1.13.0

### Added

- **`@cocoar/vue-markdown-editor` — new package**: WYSIWYG Markdown editor for Vue 3 based on Milkdown (Kit approach), styled with the Cocoar Design System. Markdown-first round-trip (lossless) — `v-model` is the persistence format, no JSON intermediate. Shares the same remark stack as `@cocoar/vue-markdown-core` and `<CoarMarkdown>`. Three toolbar modes: `floating` (default, appears on text selection, teleported to `<body>`), `fixed` (`CoarSidebar` collapsed strip with flyout submenus), and `both`. `toolbarPosition` (`'left'` | `'right'`) controls sidebar side. Reactive active-state highlights on every button (Bold lights up when the cursor is in `**bold**`, Bullet List when inside a list, etc.) — driven by Milkdown's `selectionUpdated` plugin hook with a `queueMicrotask` defer so the listener reads the freshly-committed `view.state` instead of the pre-apply snapshot.
- **`@cocoar/vue-markdown-editor` — 18 toolbar tools, configurable via `tools` whitelist**: `bold`, `italic`, `strikethrough`, `inlineCode`, `headings` (flyout H1–H6 + paragraph), `bulletList`, `orderedList`, `taskList`, `indent`, `outdent`, `blockquote`, `horizontalRule`, `codeBlock`, `table`, `tableOps`, `clearFormatting`, `undo`, `redo`. `tools` undefined → all 18 render; `tools` set → only the listed in canonical order, with auto-cleanup of orphan dividers. Constant `COAR_MARKDOWN_EDITOR_ALL_TOOLS` exported for consumer-side filtering. Migration mapping from richtext editors that exposed `font-size` / `align` / `font` / `color` / `underline` is documented in the docs page (those have no Markdown representation and are intentionally not exposed; `font-size` maps to `headings` for typographic hierarchy).
- **`@cocoar/vue-markdown-editor` — list & task semantics**: list-toggle button cycles "in same → lift / in other → switch / outside → wrap" (clicking Bullet inside a Bullet item un-lists it; clicking Ordered inside a Bullet swaps the type). Task list items render with proper checkboxes via CSS `::before` (filled accent + strikethrough text when checked, hollow box when open); clicking the checkbox toggles the `checked` attribute round-tripping through Markdown as `- [x]` / `- [ ]`. Indent (`sinkListItem`) is disabled outside any list; Outdent (`liftListItem`) is disabled at the top list level — leaving the list is the list-button's job.
- **`@cocoar/vue-markdown-editor` — sidebar context-aware table operations**: when the cursor lands inside a table cell, the sidebar grows by 5 items (Insert Row Above/Below, Insert Column Left/Right, Delete Cell). Lets users edit table structure in `fixed` toolbar mode without falling back to the floating toolbar.
- **`@cocoar/vue-markdown-editor` — `CoarFormField` integration**: `disabled`, `error`, `id`, `aria-describedby` propagate automatically when the editor is wrapped in `<CoarFormField>` (same `FORM_FIELD_INJECTION_KEY` injection used by `CoarTextInput` / `CoarScriptEditor`). Direct props win over the injected context. Editor wrapper carries `aria-invalid`, `aria-disabled`, `aria-readonly`, `aria-required`, `data-name` so screen readers and form tooling see the right state.
- **`@cocoar/vue-markdown-editor` — code-block view/edit toggle (NodeView)**: code blocks render as `CoarCodeBlock` (Prism-highlighted, language label, same look as the viewer) when the cursor sits elsewhere; switching to plain editable mode + `CoarSelect` for the language when the cursor moves inside. Toggle is driven by a custom ProseMirror NodeView + a small companion plugin that watches `selectionUpdated` so `TextSelection` (the natural cursor placement) flips the mode — PM's own `selectNode`/`deselectNode` only fire for `NodeSelection`. Header dimensions / background / border-radius mirror `CoarCodeBlock` so the toggle is visually flush.
- **`@cocoar/vue-markdown-editor` — `./styles` subpath export** (mirrors `@cocoar/vue-data-grid`): consumers `@import "@cocoar/vue-markdown-editor/styles"` to pull the bundled CSS. Same fix applied to **`@cocoar/vue-script-editor`**, which was missing the subpath export since 1.9.0.
- **`@cocoar/vue-markdown` — shared rendering registry**: the viewer (`<CoarMarkdown>`) and the editor (`@cocoar/vue-markdown-editor`) consume the **same** Vue component map for every node type, so a code block, table, blockquote, etc. looks identical whether the user is reading or writing. The registry is exposed as `MarkdownViewerRenderers` (a typed map of `MarkdownNodeType → Component`), with the Cocoar defaults available as `defaultMarkdownRenderers`. Apps override slots per-instance via `<CoarMarkdown :renderers="{...}" />` or app-wide via `app.provide(MARKDOWN_RENDERERS_KEY, ...)`. Resolution order: prop > inject > default. The recursive `<RenderNode>` dispatcher and the `renderMarkdownNodes` helper are exported for consumers writing custom complex renderers.
- **`@cocoar/vue-markdown` — shared block stylesheet** at `@cocoar/vue-markdown/styles`. Headings, paragraphs, lists, blockquotes, tables, inline code, links, etc. all live in one CSS file that both the viewer and the editor pull in via the `coar-markdown` outer class. The editor adds a deeper-specificity layer for compactness (smaller heading sizes for an editing surface) on top of the shared baseline.
- **Markdown table styling alignment**: Markdown tables in the editor inherit the same shared stylesheet rules as the viewer's tables — zebra rows, header surface, padding, border. The viewer's `DefaultTable` no longer wraps in `<CoarTable>` (was relying on `:deep()` scoped CSS that wouldn't reach the editor's contenteditable); both viewer and editor now emit a plain `<table class="coar-markdown-table">` that the shared stylesheet drives. Visual parity without a NodeView wrapper for tables.
- **`@cocoar/vue-data-grid` — Wrapper Column**: new `.wrap(inner)` factory on the column builder that decorates any column with left and/or right cell-body slots, ideal for status indicators, action icons, and inline badges without writing a custom `cellRenderer`. The inner builder stays a real `CoarGridColumnBuilder` — sort, filter, quickFilter, `valueFormatter`, `valueGetter`, comparator, `editable`, and even existing `cellRenderer`s (tag, date, number, currency, tree) all continue to work untouched; only the `cellRenderer` gets wrapped. Example: `col.wrap(col.field('name').header('Name').flex(1).sortable().option('editable', true)).left({ icon: (r) => r.starred ? 'star' : null, onClick: toggleStar }).right({ component: UnreadBadge, params: (r) => ({ count: r.unread }), show: (r) => r.unread > 0 })`. Slots accept three shapes: **icon shorthand** (`{ icon, source, size, color, tooltip, onClick, show }`), **component** (any Vue component; automatically receives `row: TData` as a prop, with optional `params(row)` to add/override props), and **text** (`{ text, tooltip }`). Each accessor (icon/color/text/tooltip) can be a static value or a per-row function. Pass an **array** to stack multiple items in the same slot — each with its own `show()` gate, `onClick`, and tooltip — e.g. two right-side icons for `isCritical` + `awaitingFeedback` plus a third component slot that renders a tag or icon based on a `priority` field. Slot `onClick` handlers call `event.stopPropagation()` automatically so they don't trigger row-click / cell-click. Edit mode is untouched: AG Grid swaps the renderer for the editor on double-click (wrapper disappears during editing, reappears on Escape/commit). Wrapper slots are intentionally not in the tab order — they're visual hints, Tab navigates cell-to-cell. Ships with `WrapperCellRenderer`, `CoarGridWrapperColumnBuilder`, and fully typed `WrapperSlotConfig` / `WrapperIconSlotConfig` / `WrapperComponentSlotConfig` / `WrapperTextSlotConfig` / `WrapperCellRendererConfig` exports.
- **17 new Lucide icons in the core registry**: `bold`, `italic`, `strikethrough`, `heading`, `pilcrow`, `list-ordered`, `text-quote`, `square-code`, `table`, `table-cells-merge`, `table-cells-split`, `columns`, `rows`, `between-horizontal-start`, `between-horizontal-end`, `between-vertical-start`, `between-vertical-end`, `indent-increase`, `indent-decrease`, `eraser`. Available to all consumers via the standard icon name lookup.

### Changed

- **`@cocoar/vue-markdown` package surface**: the viewer is no longer a thin wrapper. The package now hosts the registry, the default renderers, the recursive dispatcher, the helpers, and the shared CSS — all next to `<CoarMarkdown>`. Consumer-facing imports are unchanged (`CoarMarkdown` is still the top-level export); new exports (`defaultMarkdownRenderers`, `MARKDOWN_RENDERERS_KEY`, `MarkdownViewerRenderers`, `RenderNode`, …) sit alongside it. Internal-only `MarkdownBlockNode.vue` / `MarkdownInlineNode.vue` / `helpers.ts` were removed — their logic moved into the per-type default renderers in `default-renderers.ts`.

### Fixed

- **Playground — markdown editor body font fell back to bare `sans-serif`**: `App.vue` referenced a non-existent design token `var(--coar-font-family, sans-serif)` (the actual token is `--coar-body-base-family`). The fallback chain bottomed out at the bare keyword for everything inside the playground's `.app` wrapper, including the markdown editor's body text. Updated to use the correct token; Poppins now inherits cleanly through the editor area.

### Docs

- **New "Markdown Editor" component page** marked as **Preview**, with three live demos (basic `v-model`, sidebar mode, in-form integration with `CoarFormField`), Architecture Notes section explaining why Milkdown over TipTap/Crepe and why `@milkdown/components/table-block` is intentionally not used (CellSelection is ProseMirror-internal and doesn't fire `selectionchange`), Restricting the Toolbar section with the migration mapping table, "Code blocks — view / edit toggle" section documenting the toggle UX and supported languages, full Props/Events reference, and a TODO list for the deferred work (link-insert UI, image upload, placeholder, custom table edge-handles).
- **`/components/markdown` — Custom renderers section** with worked examples (per-instance override, app-wide `provide`, registry contract, why the registry matters cross-package).

### Internal

- **`@cocoar/vue-markdown-editor` test coverage**: 12 Vitest unit tests for the pure helpers (`isToolEnabled`, `decideListToggleAction`) extracted to `toolbar-helpers.ts`, plus 23 Playwright E2E tests against the playground covering mounting, floating-toolbar visibility, mark commands via sidebar, full-set / minimal / no-tables tool whitelisting, indent + outdent (including the disabled-state gating), bullet-list wrap on plain text, clear-formatting (mark stripping + heading→paragraph), task-checkbox toggle in both directions, readonly mode, and the code-block view/edit toggle including language-selector → markdown-source round-trip.
- **`@cocoar/vue-markdown` test coverage**: 9 viewer unit tests (7 existing for rendering + 2 new for the `renderers` prop override path).
- **Dependabot — 10 of 13 alerts cleared**. `pnpm update` + `pnpm dedupe` lifted `happy-dom`, `flatted`, `picomatch`, `minimatch`, and `brace-expansion` to patched versions. The remaining 3 alerts are `vite 5` issues that come in transitively via `vitepress 1.6.4` (which pins `vite 5` as a peer). An attempt to globally override `vite` to `^8` was reverted because vitepress 1 is incompatible with rolldown-vite (the engine vite 8 ships with). The remaining alerts are dev-tooling only — no production runtime impact for consumers — and will close out when vitepress 2 (currently alpha-only) ships stable.

---

## 1.12.2

### Fixed

- **`@cocoar/vue-script-editor` — `extraLibs` were invisible to the TypeScript worker, silently resolving to `any` on hover**: `useMonacoEditor` configured the shared TS/JS compiler options with `noResolve: true` (added in 1.11.0 alongside the `lib: ['es2024']` fix). With `noResolve` set, the TS language worker skips pulling `addExtraLib`-registered `.d.ts` files into compilation — so an identifier declared exclusively in an extraLib was accepted syntactically but resolved to `any`. `noResolve` is now removed from the shared options; library targeting stays constrained to `['es2024']`, so the original reason for the flag (keep the default DOM / WebWorker / WSH libs out of IntelliSense) is unaffected. Consumers using `extraLibs` immediately see correct hover types and IntelliSense with no code change.
- **`@cocoar/vue-script-editor` — `script-mode` swallowed legitimate `Cannot find name` errors**: `SCRIPT_MODE_DIAGNOSTIC_CODES` added TS code `2304` to Monaco's `diagnosticCodesToIgnore` alongside the structural wrapper artefacts (`1375` top-level await, `2695` unused comma-LHS, `1108` top-level return, `7027` unreachable code, `1208` isolatedModules). `2304` is a genuine semantic error — not a wrapper artefact — and suppressing it masked the `noResolve` bug above: undeclared identifiers rendered as `any` with no squiggle. Code `2304` is now removed from the suppression set; the other five codes remain. **Possible visible change for consumers:** code that previously compiled silently under `script-mode` with unresolved identifiers now shows red squiggles. Register the missing names via `extraLibs`, or extend `diagnosticCodesToIgnore` directly on `monaco.languages.typescript.*Defaults` to restore the old behavior.

---

## 1.12.1

### Fixed

- **`CoarDataGrid` — flex columns collapsed to ~36px when tree-mode grid started with empty `rowData`**: the flex-recalc workaround that re-applies `columnDefs` after first data arrives (introduced in 1.5.3 for the flat-data codepath) was missing from `#setTreeRowDataOnGrid`, and the one-shot flag `#flexApplied` was consumed prematurely in both codepaths by the initial empty set that Vue's `{ immediate: true }` watcher fires on mount. Net effect: a `treeDataRef(ref([]))` grid mounted with zero rows, and by the time real rows arrived the workaround had already fired (against an empty grid) and no further re-flex ever happened. Flex columns kept whatever width AG Grid had assigned at mount — in narrow-at-mount scenarios that bottoms out around 36px, clipping cell content and breaking Playwright `toBeVisible()` checks. The workaround is now applied in the tree codepath too, and the flag only flips once `result.length > 0`, so the one-shot is reserved for the actual 0→N transition. Consumers with `treeData(...)` + `flex(1)` columns + initially-empty row refs get the correct flex layout without a manual resize.

---

## 1.12.0

### Fixed

- **Overlay widgets inside modals — stacking + tree-aware dismissal**: `CoarSubFlyout`, `CoarContextMenu`, the Select family (`CoarSelect` / `CoarMultiSelect` / `CoarTagSelect`), and `CoarSidebarGroup` (in `mode="flyout"`) used to mount their panels via their own `<Teleport to="body">` with a hardcoded `z-index: var(--coar-z-overlay)` = 1000. Inside a dialog rendered through the overlay-service at `z-index: 1002`, those panels landed behind the dialog and clicks on them were treated as outside-the-dialog → the dialog closed. Each widget now opens its panel via `overlay.open({ parent: useOverlayParent() })`, so the service stacks it above the ancestor dialog (`1000 + instance.id * 2`) and treats clicks inside it as clicks inside the parent tree. All public APIs are unchanged — the migration is purely internal.
- **Overlay-service parent linking was a no-op when called from a descendant overlay**: `useOverlayParent()` returned an `OverlayInstance`, but `OverlayOpenOptions.parent` was typed `OverlayRef`; the service looked up `__instanceId` only, silently failing for every instance-shaped value. The widened lookup now resolves either shape. Before the fix, `instance.parent` stayed `null` and the tree-aware click-outside never closed child branches — clicks outside a popover in a dialog used to leave the popover lingering until a hover-out timer fired. After the fix, one outside click cascades through the entire branch.
- **Select dropdown `transform: translate3d()` containing-block trap**: the dropdowns used to position themselves with a transform, which CSS-spec-wise creates a containing block for every `position: fixed` descendant. Floating widgets rendered from inside a dropdown landed at the dropdown's offset instead of the viewport. The service's overlay host uses plain `top`/`left`, so the trap is no longer reachable through a select.
- **Select dropdown scroll behavior**: `selectPreset.scroll.strategy` changed from `'close'` to `'reposition'` — dropdowns now follow the trigger on scroll instead of closing abruptly, matching the pre-migration (`useSelectDropdown`) behavior.

### Changed

- **Overlay service — parent type widened**: `OverlayOpenOptions.parent` now accepts `OverlayRef | OverlayInstance`. Existing callers that passed an `OverlayRef` continue to work; descendants using `useOverlayParent()` no longer have to cast.
- **`selectPreset.a11y` dropped** (was `{ role: 'listbox' }`): the select panels already render an inner `role="listbox"` element that carries the referenced id and `aria-multiselectable`. Declaring the role on the outlet host duplicated the semantic element and misplaced the aria attribute.

### Internal

- **6 new panel components**: `CoarPopoverPanel` (pre-existing), `CoarTooltipPanel` (pre-existing), `CoarSubFlyoutPanel`, `CoarContextMenuPanel`, `CoarSelectDropdownPanel`, `CoarMultiSelectDropdownPanel`, `CoarTagSelectDropdownPanel`, `CoarSidebarFlyoutPanel`. Each is the lean visual shell the overlay-service mounts; the owning component keeps its state machine (hover/click/keyboard/cascade) and forwards reactive state via props or closures.
- **3 new overlay presets**: `subFlyoutPreset`, `contextMenuPreset`, `sidebarFlyoutPreset`.
- **Legacy helper removed**: `packages/ui/src/components/select/useSelectDropdown.ts` (dead after all three select variants migrated).
- **Playground diagnostic view extended**: `/overlay-stacking` now covers 8 scenarios (popover, tooltip, submenu, context menu, nested popover→tooltip, nested popover→popover, all three selects, sidebar flyout with nested groups). Used for chrome-devtools-driven verification of every migration.

---

## 1.11.0

### Added

- **`CoarListbox` — new component**: single-column list primitive with multi-select highlight (Ctrl/Shift/Keyboard), search (three layers of control — `searchFields`, `searchBy`, `filterWith`), grouping with sticky or non-sticky headings, custom item rendering via `itemComponents` (kind → component) or `#item` / `#item-<kind>` slots, per-item imperative API for inline actions, `displayOnly` mode for static rosters with ARIA `role="list"`, and both native keyboard nav (arrows, `Home`/`End`, `Space`, `Ctrl+A`, `Enter`) and `item-click` / `item-dblclick` / `item-activate` events. Fully generic over `T` (`CoarListboxOption<T>`); ships its own Kitchen-Sink-grade prop/event/slot surface.
- **`CoarDualListbox` — new component**: composes two `CoarListbox` instances + move buttons for the classic "available ↔ selected" pattern. Manages `v-model: T[]` (right column), forwards search / sort / grouping / custom-render / drag-drop / virtual props to both sides, exposes `moveRight` / `moveLeft` / `moveAllRight` / `moveAllLeft` / `clearHighlight` via template ref, and bubbles `item-remove` / `item-action` from custom renderers with a `side: 'available' \| 'selected'` annotation. Drag-drop between the two columns via one prop (`drag-drop`).
- **`CoarListboxItemApi<T>` — imperative handle for custom item renderers**: every component registered via `itemComponents` and every `#item` / `#item-<kind>` slot now receives an `api` prop with `highlight()` / `unhighlight()` / `toggleHighlight()` / `activate()` / `remove()` / `action(name, payload?)`. `remove` and `action` bubble up as `item-remove` and `item-action` events on the listbox — consumers update their own `options` array. Powers inline trash buttons, ×-to-remove in the selected column of a DualListbox, per-row context-menu actions.
- **Drag & drop — first-class feature** on `CoarListbox` and `CoarDualListbox`. Three layers of permission: `drag-group` (coarse name matching), `drag-id` + `drag-accept` (directional whitelists for asymmetric flows like box1→box2→box3 with no back-edges), and `can-drag` / `can-drop` callbacks for per-item source control and runtime target validation. Selection-aware: dragging a highlighted item carries the whole highlighted set. Visual feedback via `isDragOver` with `dropEffect='none'` cursor when a drop is refused. `items-add` / `items-remove` events fire synchronously on drop so there's no "duplicated items" frame between source and target re-renders. `CoarDualListbox` auto-wires an internal drag group when `drag-drop` is set.
- **Virtual scrolling** on `CoarListbox` and `CoarDualListbox` (`virtual` prop): renders only the rows inside the viewport + overscan. Supports mixed per-row heights (items vs. group headings), search/filter, custom components, drag-drop, and keyboard nav (`scrollToIndex` follows the focus). Tested with a 10,000-entry IPrincipal directory demo.
- **`useVirtualList` — new exported composable** (`@cocoar/vue-ui`): the framework-agnostic primitive behind virtual mode. Fixed or per-index `itemSize`, configurable `overscan`, `scrollToIndex(i, align?)`. Cumulative-offset table (O(log n) per scroll), reactive on count / size changes, `ResizeObserver` fallback for environments without one. Usable standalone in any Vue component that scrolls — not tied to the listbox.
- **`useDragDrop` — new exported composable** (`@cocoar/vue-ui`): the generic primitive behind listbox drag-drop. Same group / accept / canDrop / canDrag semantics, same cross-surface registry that carries live object identity through DataTransfer. Ships a module-level registry (`registerDrag` / `getDrag` / `getActiveDrag` / `deleteDrag` + `DRAG_MIME` constant) for advanced integrations. Reach for it when building any other Vue component that needs the same drag semantics — no need to reimplement.
- **Boolean-prop convention**: `displayOnly`, `hideSearch`, `hideMoveAll`, `hideCounts`, `sortSelectedBySource` — all new boolean props default `false`, matching the library-wide "features are opt-in" rule. Where a feature should feel on-by-default (e.g. search on `CoarDualListbox`), the prop name is inverted so the default can stay `false`.

### Fixed

- **Monaco `lib` configuration for Jint-backed runtimes** (`@cocoar/vue-script-editor`): `useMonacoEditor` now calls `setCompilerOptions({ lib: ['es2024'], target: ES2024, allowNonTsExtensions: true, noResolve: true })` on both TS and JS defaults on first mount. Previously Monaco fell back to its default `lib = ['es5', 'dom', 'webworker.importscripts', 'scripthost']`, autocompleting ~5485 browser / WSH / WebWorker APIs that don't exist in Jint — `fetch`, `document`, `localStorage`, `WScript`, `importScripts`, etc. — luring users into code that crashes at runtime. After the fix IntelliSense only surfaces standard ECMAScript APIs Jint actually runs; host-specific globals are layered back in explicitly via `extraLibs`. The enum value for the script target is resolved with fallback (`ES2024 ?? ES2023 ?? … ?? ES2020`) so the fix works across Monaco versions.

### Docs

- **New component pages**: Listbox, Dual Listbox — each with 5–7 live demos (basic, display-only, grouped, custom item component, directional DnD, virtual 10k, inline remove button, drag-drop columns) plus full API tables for props, events, slots, exposed methods.
- **New Utilities pages**: `useVirtualList` (with a standalone 50k-log-line demo built from plain `<div>`s — no listbox in sight) and `useDragDrop` (with a 3-column custom Kanban board, no listbox). Cross-linked from the component pages so consumers can discover the primitives.
- **Script Editor — "Runtime lib configuration" section**: explains the default Monaco lib set vs. what Jint provides, documents the applied override, and explains how to provide a different lib set for non-Jint scenarios.

### Internal

- **`@cocoar/vue-ui/composables` module**: new home for reusable composables. Currently `useVirtualList`, `useDragDrop`, and the `dragRegistry` primitives; wired into `CoarListbox` internally so there is one source of truth for virtual-scrolling math and DnD semantics across the library.
- **Test coverage**: +79 unit tests for the new surface (CoarListbox: 38, CoarDualListbox: 17, useVirtualList: 13, useDragDrop: 10, CoarScriptEditor: 1 for the Monaco fix). Full UI suite 1142/1142; script-editor 92/92.

---

## 1.9.0

### Added

- **`@cocoar/vue-script-editor` — new package**: Monaco-based code editor for Vue 3 with TypeScript, JavaScript, and JSON support. Peer-deps on `monaco-editor`. `v-model` is the persistence format, `extraLibs` for TypeScript type injection (IntelliSense on domain types), Cocoar light/dark Monaco themes with reactive `auto` detection that tracks `.dark-mode` class on `<html>`/`<body>` (Cocoar convention), `data-theme` attribute, or OS `prefers-color-scheme`. `getEditor()` / `getModel()` escape hatches for Monaco APIs not covered by props.
- **Constrained mode (`// @locked` line protection)**: any line of the source containing `// @locked` is protected against edits, deletion, and line-merging. Users can't touch the marker or its line; everything else is freely editable — including the file top, so TypeScript's Auto-Import quickfix works naturally. Markers stay in `v-model`, so the editor value round-trips through persistence with no extra schema. Powered by `ChangeGuard` (inclusive overlap check + multi-cursor atomic rollback via `editor.trigger('undo')`), `CursorGuard` (snap away from locked interiors), `DiagnosticsFilter` (hides TS error markers that fall on locked lines caused by in-progress bodies), and per-mount auto-feature policy (`formatOnType`, `formatOnPaste`, `linkedEditing` disabled to prevent cross-boundary reformats).
- **Authoring mode (`authoring` prop)**: suspends enforcement so template authors can edit locked lines and markers themselves. Markers render at full size with a warm accent colour to signal enforcement is off. Toggle back to resume enforcement with the current marker state.
- **`@reject` event**: emits `{ reason, range? }` when a guard rolls back an illegal edit — hookable for toast / shake / line-highlight feedback.
- **Pure helpers** (no editor mount required): `scanLockedLines`, `computeProtectedRanges`, `hasLockedMarkers`, `getEditableSegments`, `getSlots`, `getSlot`, `editIsProtected`, `snapOffsetAwayFromLocked`, `countLockedLines`, `isEverySegmentNonEmpty`, `validateSource`. Use for submit-gating, server-side validation, or tests. `SLOT_MARKER_PATTERN` is exported as a regex source string so server-side parsers (e.g. a C# Jint host) can mirror the same matching.
- **Named slots (`@slot:NAME`)**: attribute placed on a `// @locked` line that names the editable segment which follows. `getSlots(source)` returns a `{ slotName: bodyContent }` dictionary, `getSlot(source, name)` returns a single body (or `undefined` when the template does not declare it). Lets a consumer identify per-region fill state without knowing segment positions — ideal for templates where the user may fill in 0..N of several named function bodies and the runtime needs to decide which ones to invoke. Slot markers survive line shifts (e.g. auto-import at file top) because they're anchored to their locked line, not a fixed line number. First-wins on duplicate names; `LockedLine.slotName` exposes the parsed name for custom tooling.
- **Form integration (`CoarFormField`)**: `CoarScriptEditor` now auto-inherits `id`, `error`, `describedBy`, and `disabled` from `CoarFormField` the same way `CoarTextInput` does. New props: `disabled`, `error`, `placeholder`, `required`, `autofocus`, `id`, `name`, `height` (CSS string or number). New events: `focused`, `blurred`. New exposed method: `focus()`.
- **`variant: 'editor' \| 'inline'`**: compact form-field preset that turns off line numbers, gutter, folding, glyph margin, and context menu, and switches to tight padding + word-wrap + hover/focus ring matching `CoarTextInput`. `'editor'` (default) keeps the existing full-chrome IDE look.
- **`lineNumbers: boolean`**: explicit toggle that overrides the variant default (`'editor'` → on, `'inline'` → off). When line numbers are off a small decoration column stays visible so the text is not flush with the border.
- **`scriptMode: boolean`**: suppresses the diagnostic codes Monaco emits for "script body" code — top-level `return`/`await`/`export`, implicit any on injected globals, and unreachable-code warnings. Global side-effect on `typescriptDefaults`/`javascriptDefaults`; documented in the form-integration section of the Script Editor docs.
- **`preamble: string`**: hidden + auto-locked prefix providing per-editor type context (e.g. `"declare const query: TodoQuery;"`). Rendered invisibly above the user script via `setHiddenAreas`, protected from cursor/paste/edit by an internal preamble guard, and stripped from the emitted `modelValue` so it never round-trips through persistence.
- **Bundled `Cascadia Code` font**: `@cocoar/vue-ui/fonts` now also loads Cascadia Code (weights 400, 600, 700). Both `CoarCodeBlock` and `CoarScriptEditor` now prefer it over the previous Consolas/Monaco stack, with the same stack as fallback. Monaco gets `fontLigatures: true` so `!=`, `=>`, `===`, and friends render as combined glyphs. Consumers who import `@cocoar/vue-ui/fonts` get the upgrade for free; consumers who do not (or who ship their own font stylesheet) fall back to Consolas/Monaco as before.

### Docs

- **New "Script Editor" component page**: full guide with 6 live demos (basic TS, extraLibs, JSON, read-only + minimap, constrained mode with authoring toggle, and a form-integration demo with `CoarFormField` + preamble + extraLibs). Covers worker setup for SPA and SSR (VitePress / Nuxt / Astro), `theme="auto"` signal priority, JSON-schema configuration via Monaco escape hatch, security notes on untrusted `extraLibs.content`, and the full API reference with events and exposed methods.
- **Form-integration section** in the Script Editor page: explains `preamble` vs `extraLibs` with a decision table, documents the diagnostic codes `scriptMode` suppresses, and walks through the `variant="inline"` form-field look.

### Fixed

- **Overlay system — fixed-positioned descendants inside modals**: the `.coar-overlay-host` positioned itself via `transform: translate3d(...)`, which CSS spec-wise creates a containing block for every `position: fixed` descendant. Any component inside a dialog/menu/popover that relies on `position: fixed` for its own popups (Monaco's IntelliSense, floating tooltips, portal-style widgets) rendered at the overlay's offset instead of the viewport. Switched overlay positioning to plain `top`/`left` — stacking isolation is still provided by `position: fixed` + numeric `z-index`, and fixed descendants now resolve against the viewport as expected. Transparent to all existing Cocoar components.

### Internal

- **Playwright E2E infrastructure**: first end-to-end test suite in the repo, wired into `apps/playground`. Covers constrained-mode guards (`executeEdits` + keyboard flows), undo/redo granularity, paste-across-boundary, multi-cursor mixed-zone edits, authoring toggle, diagnostics filter, language switching, and editor-in-modal IntelliSense positioning. 54 unit tests + 31 E2E tests total for the new package.

---

## 1.8.0

### Added

- **Select sorting** (`sortGroups`, `sortOptions`): Two new props on `CoarSelect`, `CoarMultiSelect`, and `CoarTagSelect` to control the display order of groups and options. Both accept presets (`'asc'`, `'desc'`, `'none'`) or a custom comparator function. `sortOptions` works with and without groups — it sorts all options when ungrouped, or within each group when grouped. Defaults are backwards-compatible: `sortGroups='asc'` (alphabetical, as before), `sortOptions='none'` (input order, as before). New types: `CoarSelectSortGroups`, `CoarSelectSortOptions<T>`.

### Fixed

- **SubFlyout menu close chain**: Clicking a `CoarMenuItem` inside a `CoarSubFlyout` now closes the entire menu hierarchy (submenu + parent context menu). Previously, only the immediate submenu panel closed — the root `CoarContextMenu` stayed open, requiring consumers to manually call `menu.close()` in every handler.

### Docs

- **Select sorting section**: New "Sorting" section on the Select docs page with interactive `SortingDemo` (side-by-side grouped vs. ungrouped). All three playground demos (Select, MultiSelect, TagSelect) now include `sortGroups` and `sortOptions` controls. Props table updated with the new props.

---

## 1.7.0

### Added

- **CoarSelect / CoarMultiSelect — inline search**: When `searchable` is set, the trigger becomes an inline text input while the dropdown is open. Type to filter options in real-time. Space, Home, and End keys work correctly inside the search field.
- **CoarMultiSelect — selection tooltip**: When 2+ values are selected, hovering the trigger shows a tooltip listing all selected labels.
- **Select option grouping**: Options with a `group` property are now rendered under sticky group headers. Groups are sorted alphabetically; ungrouped options appear first. Works in all three variants (CoarSelect, CoarMultiSelect, CoarTagSelect).
- **CoarMenu — `#header` / `#footer` slots**: Fixed header and footer areas that stay in place while the menu content scrolls. Render only when the slot is provided.
- **CoarMenuHeading — `sticky` prop**: Opt-in sticky positioning so section headings stay visible while scrolling through long menus.

### Fixed

- **Tooltip not closing in collapsed sidebar**: Pointer-initiated focus (click/tap) no longer pins tooltips open via the `focus` reason. Only keyboard focus (Tab) keeps tooltips open until focus moves away. This fixes tooltips staying visible in the collapsed sidebar until clicking elsewhere.
- **CoarTagSelect — Space key in search**: Space now types a space character in the tag input instead of triggering option selection.

### Changed

- **Select search UX**: Replaced the dropdown search box with an inline search input in the trigger for CoarSelect and CoarMultiSelect, matching the pattern already used by CoarTagSelect. All three variants now use a consistent search approach.

### Docs

- **Select playground demos**: Interactive playgrounds for CoarSelect, CoarMultiSelect, and CoarTagSelect with toggleable props (searchable, clearable, grouped, disabled, readonly, error, size, appearance).
- **Select API table**: Documented missing props (searchable, clearable, readonly, appearance, compareWith, dropdownPosition).
- **Menu scrollable demo**: Updated with header (filter input), footer ("New project" action), and sticky headings toggle.

---

## 1.6.6

### Changed

- **`resetPersistedState(bucket?)`**: Now accepts an optional bucket parameter to reset only a specific width bucket (defaults to the current bucket). Previously reset all buckets.
- **`resetPersistedStates()`**: New method that resets all persisted column states across all buckets for a grid (the previous `resetPersistedState()` behavior).

---

## 1.6.5

### Added

- **Column state persistence** (`persistColumnState`): New builder method to persist column widths, order, visibility, and sort in IndexedDB. Grid width is rounded to configurable buckets (default: 100px) so different container sizes (monitor switch, sidebar collapse) each keep their own column layout. When no exact bucket exists, the nearest saved state is applied.
- **Live column sync**: Multiple grids sharing the same persistence key synchronize column changes instantly — resize, reorder, or hide a column in one grid and all others update immediately. Useful for comparison views with different filters on the same data structure.
- **`cleanupColumnStates(maxAgeDays)`**: Removes stale column state entries from IndexedDB that haven't been read or written within the specified number of days. Call once at application startup to prevent unbounded growth of persisted data.

### Changed

- **Dependency upgrades**: Vite 7→8, vue 3.5.32, vue-router 4→5, vitest 4.1, lucide-static 0.x→1.x, @vitejs/plugin-vue 6.0.5, eslint 10.2, typescript-eslint 8.58, maskito 5.2, turbo 2.9, overlayscrollbars 2.15, happy-dom 20.8, prettier 3.8.2, vitepress 1.6.4, mermaid 11.14, @js-temporal/polyfill 0.5.1, path-to-regexp 8.4.

---

## 1.6.4

### Changed

- **Form field label styling**: Labels now use `body-caption` tokens (`family`, `size`, `weight`) instead of `body-small-bold` / `component-m-label-font-size` for a more compact, consistent appearance across all form controls.
- **Tab padding**: Reduced tab button padding from `spacing-m / spacing-l` to `spacing-s / spacing-m` for tighter layout.

### Fixed

- **Date picker height mismatch**: `CoarPlainDatePicker`, `CoarPlainDateTimePicker`, and `CoarZonedDateTimePicker` reserved space for the hint/error message even when none was set, making them taller than other form controls (e.g. `CoarTextInput`). The message element is now conditionally rendered via `v-if`, and the fixed `height` / `min-height` + `visibility: hidden` workaround has been removed.

### Removed

- **`CoarLabel` component**: Removed the standalone `CoarLabel` component, its tests, exports, and documentation page. The component was unused by any input control or consumer app — labels are rendered directly by `CoarFormField` and the individual picker components.

---

## 1.6.3

### Added

- **Tag custom colors** (`variantFn`): New `variantFn` option on `TagCellRendererConfig` for dynamic tag styling. The function receives the raw cell value and can return:
  - A `TagVariant` string (`'success'`, `'error'`, …) for predefined variants
  - A CSS color string (`'#dc2626'`) — used as text+border color, background auto-calculated via `color-mix(in oklch)` for consistent light/dark mode appearance
  - A `TagColor` object (`{ bg, border?, text? }`) for full control
  - `undefined` to fall back to `variantMap`

### Fixed

- **Empty tag rendering**: `TagCellRenderer` no longer renders empty tags when a label is `""`, `undefined`, or `null`.

---

## 1.6.2

### Added

- **Locale-aware column renderers**: `date()`, `number()`, and `currency()` column factory methods now use cell renderer components with the localization system (`useL10n()`), updating reactively on locale change. Replaces the previous `valueFormatter`-based approach.
  - `date(field, config?)` — formats via `fmtDate()`, supports `{ includeTime: true }`
  - `number(field, config?)` — formats via `fmtNumber()`, supports `{ decimals: number }`
  - `currency(field, config?)` — formats via `fmtCurrency()`, supports `{ currencyCode: string }`
- **Locale switcher in docs**: VitePress nav bar now includes a `CoarSelect`-based locale switcher (`en-US`, `en-GB`, `de-DE`, `de-AT`, `fr-FR`, `ja-JP`) for live-testing locale-dependent rendering.

### Changed

- **`date()` replaces `localDate()`**: The `date()` factory method now uses the `DateCellRenderer` component (previously only available via `localDate()`). `localDate()` has been removed.
- **`number()` signature**: Changed from `number(field, decimals)` to `number(field, config?)` with `NumberCellRendererConfig`.
- **`currency()` signature**: Changed from `currency(field, currencyCode)` to `currency(field, config?)` with `CurrencyCellRendererConfig`.

### Fixed

- **TagCellRenderer variant matching**: `variantMap` now matches against the raw cell value instead of the formatted value, so `valueFormatter` no longer breaks variant resolution.
- **IconCellRenderer valueFormatter support**: Icon name now uses `valueFormatted` when available, keeping the raw value for sorting/filtering.
- **Currency symbol resolution**: `formatCurrency()` now resolves unknown currency symbols via `Intl.NumberFormat` instead of falling back to the raw currency code (e.g. `€` instead of `EUR`).
- **ja-JP date format**: Added `yyyy/mm/dd` date pattern and `zeroPad` flag to `CoarDateFormatData`. Japanese dates now correctly render as `2022/3/15` instead of `2022-03-15`.
- **Localization plugin init**: `setLanguage()` is now called on plugin install, so locale data is available immediately without requiring a manual language switch.

---

## 1.6.1

### Fixed

- **Data Grid dark mode**: Custom grid header (`CoarGridHeader`) now inherits `--ag-header-foreground-color` so text and sort icons render correctly in dark mode instead of staying black.

---

## 1.6.0

### Added

- **Sidebar navigation components**: New dedicated components for sidebar navigation, replacing the pattern of using `CoarMenu`/`CoarMenuItem` inside `CoarSidebar`:
  - **`CoarSidebarItem`**: Navigation item with `icon`, `label`, `active` state, and automatic tooltip in collapsed mode. No menu cascade/close logic — designed purely for persistent navigation.
  - **`CoarSidebarGroup`**: Expandable/flyout section with two modes:
    - `mode="expand"` (default): Animated inline panel (grid-based 0fr→1fr). Plus/minus icon indicator.
    - `mode="flyout"`: Floating panel positioned next to the sidebar via `Teleport`. Chevron icon indicator. Supports nested flyouts with parent-child cascade (hovering child keeps parent open).
  - **`CoarSidebarHeading`**: Section title that becomes a small spacer when collapsed (visual separation preserved without text).
  - **`CoarSidebarDivider`**: Simple visual separator line.
  - **`CoarSidebarSpacer`**: Vertical spacing component with `height` and `grow` props.
- **Flyout mode** (`mode="flyout"`) on `CoarSidebarGroup`: Opens a floating panel next to the sidebar instead of expanding inline. Flyout panels are teleported to `<body>` and positioned via `computeOverlayCoordinates`. Click-to-open by default, with optional `open-on-hover` prop for hover-triggered opening (200ms delay). Close-on-leave has a 300ms grace period so users can move to the panel without it closing.
- **Icon-only flyout** (`icon-only` prop on `CoarSidebarGroup`): Flyout items show as a vertical column of icons without labels, with tooltips on hover. Useful for compact action palettes. Nested flyout and expand groups inside icon-only flyouts automatically inherit the icon-only display.
- **Open on hover** (`open-on-hover` prop on `CoarSidebarGroup`): Opt-in hover-to-open behavior for flyout groups. Opens after 200ms hover delay, closes after 300ms leave delay. Touch-friendly default remains click-to-open.
- **Nested flyouts**: Flyout groups can be nested inside other flyouts. Parent-child cascade via `provide`/`inject` keeps parent panels open while interacting with children. Click-outside detection checks all flyout panels to prevent premature closing.
- **Expand in flyout**: Expand groups work inside flyout panels, including icon-only flyouts where children render as centered icons without labels or indentation.
- **Sidebar `size` prop**: Controls icon size — `'s'` (16px), `'m'` (20px, default), `'l'` (24px). Propagated to children via injection.
- **Sidebar collapsed UX**: `CoarSidebar` now provides its collapsed state to children via `inject`. Sidebar items automatically show right-aligned tooltips when collapsed. Smooth width transition on collapse/expand. Group triggers show icon badge (plus for expand, chevron for flyout) in collapsed mode.
- **Sidebar scoped slots**: `#header`, `#footer`, and the default slot now receive `{ collapsed }` so parent components can adapt their content (e.g. full logo vs. icon-only).
- **Sidebar CSS tokens**: New design tokens for sidebar items — `--coar-sidebar-item-padding`, `--coar-sidebar-item-hover`, `--coar-sidebar-item-active-color`, `--coar-sidebar-item-active-bg`, `--coar-sidebar-group-indent`, etc.
- **Force expand tree** (Data Grid): New `builder.forceExpanded(ref)` method. When the ref is `true`, all tree parents are expanded and chevron toggle is disabled. When it switches back to `false`, the previous open-state is restored.

### Changed

- **`CoarSidebar` collapsed prop**: Now emits `update:collapsed` for optional `v-model:collapsed` two-way binding. One-way `collapsed` prop still works as before.
- **Sidebar footer padding**: `--coar-sidebar-footer-padding` changed from `var(--coar-spacing-m)` to `0` so footer items stretch to full width like content items.

### Fixed

- **Tooltip empty rectangle**: `vTooltip` directive's `updated` hook now handles falsy values (`false`, `''`). Previously, switching tooltip config from an object to `false` left a visible empty rectangle.
- **Tooltip z-index**: Tooltip z-index increased to `calc(var(--coar-z-overlay,1000) + 1)` so tooltips render above flyout panels.

---

## 1.5.5

### Added

- **Custom data filter**: New `builder.customFilter((data, searchText) => filteredData | null)` method on `CoarGridBuilder`. Filters the **entire data array** before passing it to AG Grid, replacing the per-row quick filter. This enables filter logic that depends on related rows — e.g. keeping all siblings in a tree when any one matches the search. Returning `null` from the callback falls back to the default quick filter for that evaluation, allowing dynamic switching between custom and standard filtering.
- **Pipeline update triggers**: New `builder.updateOn(...sources)` method. Re-runs the data pipeline (filtering, tree flattening) when the given reactive sources change. Works with all pipeline modes (tree, flat+search, flat reactive) — useful when `customFilter` or `quickFilterFn` depends on external state like toggle flags.

---

## 1.5.4

### Fixed

- **Modal/Dialog centering**: Overlays now stay centered when their content grows after initial render (e.g. async data loading). Previously, `modalPreset` and `dialogPreset` skipped installing a `ResizeObserver` because their scroll strategy is `noop` — the overlay kept its initial position even as content changed size, resulting in more space above than below.

---

## 1.5.3

### Added

- **Scrollable Menu**: `CoarMenu` now uses overlay scrollbars (`v-scrollbar`) and scrolls automatically when content exceeds available height
- **`CoarSubFlyout`**: Renamed from `CoarSubmenuItem` for consistency with `CoarSubExpand`. Old name remains as deprecated alias for backwards compatibility.
- **Context Menu flyout demo**: New docs example showing flyout submenus inside context menus (status, priority selectors)

### Fixed

- **Context Menu flyout click**: Clicking a menu item inside a flyout submenu now correctly triggers the click handler. Previously the context menu closed before the handler fired because the teleported flyout panel was treated as "outside" the menu.
- **Cell text overflow**: Removed `display: flex` from `.ag-cell` — flex containers don't clip plain text children with `overflow: hidden`, causing text to bleed into adjacent cells. AG Grid handles vertical centering internally.
- **Scroll position reset**: Grid no longer jumps to top when data updates. Column definitions are now re-applied only once (on first data set) instead of on every update.
- **Toolbar padding**: Toolbar only has padding when `bordered` or `elevated` is set. Without those, only a gap between toolbar and grid is shown.
- **Empty toolbar visibility**: Toolbar is hidden when no slots have content and search is disabled (CSS `:has()` selector).

---

## 1.5.2

### Added

- **Unified toolbar**: `CoarDataGrid` now has built-in toolbar with `#toolbar-left`, `#toolbar-right` slots and `show-search` prop — replaces the need for `CoarDataGridPanel`. Toolbar appears automatically when search is enabled or any slot is used. Search input fills available space (`flex: 1`), actions are pushed to the right.
- **Appearance props**: `bordered` and `elevated` props on `CoarDataGrid` for border and elevation shadow. When toolbar is active, it gets padding while the grid sits flush.
- **Data Grid styles export**: `@cocoar/vue-data-grid/styles` now works without a Vite alias — added `./styles` to the package exports map.

### Changed

- **`CoarDataGridPanel` deprecated**: Use `CoarDataGrid` with `show-search` and `#toolbar-right` slot instead. `CoarDataGridPanel` remains as a thin wrapper for backwards compatibility.
- **Event handler composition**: `onRowClicked`, `onRowDoubleClicked`, `onCellClicked`, `onCellDoubleClicked` now use `#composeHandler` (multiple handlers are chained, not overwritten).
- **`onGridReady` isolation**: User's `builder.onGridReady()` handler no longer conflicts with internal grid initialization. `_bind()` always runs first, then the user handler.

### Fixed

- **Grid render flicker**: Fixed visible Layout Shift where columns animated from left to right on initial render. Root cause: AG Grid animates the `left` CSS property. Fix: `suppressColumnMoveAnimation` and `transition: none` on cells.
- **Flex columns with `rowDataRef`**: Fixed `flex()` and `autoSize('fitGridWidth')` not filling available width when using `rowDataRef()`. Column definitions are re-applied after data arrives to force a fresh flex layout pass.
- **Empty toolbar-right gap**: Fixed gap visible on the right side when no `#toolbar-right` slot content is provided.

---

## 1.5.1

### Fixed

- **Fragment parser bundle**: `vue`, `vue-router`, and `@cocoar/vue-ui` were embedded in the bundle instead of externalized, causing `injection "Symbol(route location)" not found` at runtime. Now correctly listed as rollup externals (bundle: 245 KB → 3.5 KB)

---

## 1.5.0

### Added

- **Quick Filter (Search)**: New `CoarDataGridSearch` and `CoarDataGridPanel` components for adding a search bar above the grid. `CoarDataGridPanel` combines search + grid in one component with a `#actions` slot for buttons. Search text filters row data before AG Grid using per-column configuration via `.quickFilter()`
- **Search highlighting**: `.searchHighlight()` on the builder enables the CSS Custom Highlight API to underline matching text in grid cells — no DOM manipulation, works with AG Grid virtualization
- **Tree Data**: `.treeData({ children, rowId })` enables hierarchical data with expand/collapse. New `col.tree()` column type renders indentation, animated chevron toggle, and child count. Search automatically expands matching branches
- **Row Drag & Drop**: `.rowDragManaged()` for flat list reordering with `.getDisplayedRowData()` to read the new order. `.onRowDragEnd()` callback for persisting changes
- **Tree Drag & Drop**: Drag rows between parents for reparenting. `.rowDragHighlight({ canDrop })` provides visual feedback — blue outline on valid targets, red dashed outline on invalid targets. Drop on empty area moves to root level
- **Tree meta access**: `builder.getTreeMeta(rowId)` exposes depth, hasChildren, isExpanded, and childCount — useful for custom `canDrop` validation (e.g., limiting nesting depth)
- **I18n column headers**: `.header('Name', 'i18n.key')` supports runtime language switching via `@cocoar/vue-localization` with automatic fallback when the package is not installed
- **Auto size**: `.autoSize('fitGridWidth')` and `.autoSize('fitCellContents')` for convenient column sizing
- **Fragment modal routing**: `@cocoar/vue-fragment-parser` now includes Vue composables for deep-linkable modals via URL fragments — `useFragmentNavigation()` (open/close modals by changing URL hash, `append` option for multi-modal), `useRoutedFragments()` (reactive fragment parsing), and `useRoutedModals()` (auto-open/close from URL). Two fragment types: `type: 'dialog'` (CoarDialog shell with header/title) and `type: 'modal'` (raw overlay, full control). Supports browser back/forward and deep-linking. `vue-router` and `@cocoar/vue-ui` are optional peer dependencies

### Fixed

- **Grid render flicker**: Fixed visible Layout Shift where columns animated from left to right on initial render. Root cause: AG Grid animates the `left` CSS property when positioning cells. Fix: `suppressColumnMoveAnimation` and `transition: none` on cells
- **Flex columns with `rowDataRef`**: Fixed `flex()` and `autoSize('fitGridWidth')` not filling available width when using `rowDataRef()`. Column definitions are re-applied after data arrives to force a fresh flex layout pass
- **Cell renderer scoped CSS**: Removed `scoped` from all AG Grid cell renderers (Tag, Icon, Date, Tree) — AG Grid doesn't apply Vue's `data-v-*` attributes, so scoped styles never matched
- **Cyclic dependency**: Removed unused `@cocoar/vue-fragment-parser` dependency from `@cocoar/vue-ui`
- **Turbo telemetry**: Disabled Turborepo telemetry in all CI workflows

### Docs

- **Data Grid**: Added interactive demos for Search, Tree Data, Row Drag & Drop, and Tree Drag & Drop with full API documentation including search highlighting, i18n headers, and auto size
- **Icons**: Added documentation for custom icon sources (SVG Map, HTTP Source, built-in overrides)
- **Fragment Parser & Modal Routing**: New documentation page with parser API, modal routing guide (composables, deep-linking, browser back), and step-by-step integration example
- **Playground app**: New `apps/playground/` for testing features that require Vue Router (fragment routing, etc.)
- **Markdown**: New documentation page for markdown parsing (`@cocoar/vue-markdown-core`) and rendering (`@cocoar/vue-markdown`)

---

## 1.3.0

### Added

- **Label position**: `CoarCheckbox` and `CoarRadioGroup` now support `labelPosition="before" | "after"` — place the label text before or after the control, matching the existing `CoarSwitch` API
- **Placeholder token**: New `--coar-text-placeholder` design token for consistent, clearly distinguishable placeholder styling across all input components

### Fixed

- **Placeholder color**: Placeholder text in all input components (TextInput, PasswordInput, NumberInput, Select, MultiSelect, TagSelect, PlainDatePicker, PlainDateTimePicker) was too dark and looked like actual input — now uses `--coar-text-placeholder` (`gray-400`) instead of `--coar-text-neutral-tertiary` (`gray-700`)

### Docs

- **Label Position demos**: New interactive examples for Checkbox, RadioGroup, and Switch showing `labelPosition="before"` vs `"after"`
- **API tables**: Updated props documentation for Checkbox and RadioGroup with the new `labelPosition` prop

---

## 1.2.0

### Added

- **Context Menu**: New `useContextMenu()` composable and `<CoarContextMenu>` component for right-click menus — handles positioning at cursor, viewport clamping, click-outside / Escape / scroll dismissal, and auto-close on item click
- **Data Grid context menu**: Works with `onCellContextMenu` and `onViewportContextMenu` — use separate `useContextMenu()` instances for cell vs. viewport right-clicks
- **Docs**: Context Menu documentation page with interactive demos (standalone, submenus, data grid integration)

---

## 1.1.0

### Added

- **Theming**: oklch-based color system — set `--coar-accent`, `--coar-success`, `--coar-error`, `--coar-warning`, `--coar-info` and all 10-step shade scales (50–900) auto-calculate for both light and dark mode
- **CoarSidebar**: New `variant` (`'primary' | 'secondary'`), `elevated`, and `borderless` props for visual customization
- **Kitchen Sink**: Full-page component showcase at `/foundations/kitchen-sink` for evaluating visual coherence
- **Theming guide**: New docs page at `/guide/theming` explaining color customization

### Fixed

- **Packaging**: `import '@cocoar/vue-ui/styles'` no longer crashes in consumer apps — moved OverlayScrollbars CSS import from `styles/all.css` (bare-specifier, unresolvable by PostCSS in consumer context) into `vScrollbar.ts` (bundled by Vite into `dist/index.css`)
- **Fonts export**: `@cocoar/vue-ui/fonts` now correctly points to compiled `dist/fonts.js` instead of unpublished `src/fonts.ts`
- **sideEffects**: Fixed `./src/fonts.ts` reference to `./dist/fonts.js` for correct tree-shaking

### Changed

- **Color primitives**: Replaced hand-picked hex values with oklch-based calculations — colors are now perceptually uniform across lightness levels, eliminating washed-out shades in dark mode and "baby blue" tints in light mode
- **Primary button**: Now uses `accent-500` (= exact brand color) instead of `accent-700` (darker shade) — `--coar-accent: #1183CD` means the primary button IS `#1183CD`
- **Build**: Added `fonts.ts` as second entry point, externalized `@fontsource/*` packages, removed `vite-plugin-css-injected-by-js` (not needed — hash mismatch was a misdiagnosis)
- **Sidebar variants**: `primary` = visually distinct from content (secondary background), `secondary` = same as content background

---

## 1.0.1

### Fixed

- **Temporal polyfill**: Moved `@js-temporal/polyfill` from optional peer dependency to regular dependency — fixes `Could not resolve "@js-temporal/polyfill"` errors in consuming apps using Vite

---

## 1.0.0

Initial release of the Cocoar Design System for Vue 3.

### Components

- **Form Controls**: Button, TextInput, PasswordInput, NumberInput, Select, MultiSelect, TagSelect, Checkbox, RadioGroup, Switch
- **Date & Time**: PlainDatePicker, PlainDateTimePicker, ZonedDateTimePicker, TimePicker, ScrollableCalendar
- **Navigation**: Menu, Sidebar, Navbar, Breadcrumb, Tabs, Pagination
- **Overlays**: Dialog, Popover, Popconfirm, Toast, Tooltip
- **Display**: Avatar, Badge, Card, CodeBlock, Divider, Label, Link, Note, ProgressBar, Spinner, Table, Tag
- **Utilities**: Icon, Scrollbar
- **Layout**: FormField — wrapper for label, hint, and validation around any form control
- **Transitions**: Fade, Slide, Scale, Collapse — pre-built Vue `<Transition>` wrappers using motion tokens
- **Data Grid**: AG Grid wrapper (`@cocoar/vue-data-grid`, separate package)
- **Markdown**: Markdown viewer (`@cocoar/vue-markdown`, separate package)

### Design System

- Two-layer token system: primitives referenced by semantic tokens
- 6 token categories: Color, Typography, Spacing, Radius, Shadow, Motion
- Light and dark mode via `.dark-mode` class (no JS at render time)
- CSS `@layer` cascade for predictable specificity
- Tablet-first design: touch interaction with desktop information density

### Localization

- All 57 built-in component strings (aria-labels, button text, placeholders) translatable via `useI18n()` from `@cocoar/vue-localization`
- English defaults — works without any configuration
- Locale-aware `firstDayOfWeek` detection via `Intl.Locale.getWeekInfo()`
- Date format pattern auto-detection from browser `Intl` API

### Responsive

- Date picker panels: viewport-clamped widths via CSS `min()`, stacked layout below 540px
- Overlay system: `shift` + `flip` positioning, `maxWidth: 'viewport'` constraint
- Typography scales across 3 breakpoints (1024px+, 768–1023px, <768px)

### Architecture

- Monorepo: pnpm workspaces + Turborepo
- 8 packages: `vue-ui`, `vue-data-grid`, `vue-markdown`, `vue-markdown-core`, `vue-localization`, `vue-fragment-parser`, docs, icons
- Self-hosted fonts via `@fontsource` (Poppins + Inter) — `import '@cocoar/vue-ui/fonts'`
- Overlay service with plugin architecture (`CoarOverlayPlugin` + `CoarOverlayHost`)
- Overlay companion detection for teleported dropdowns (Select inside overlays)
- Temporal API for date/time components — native in Chrome/Firefox/Edge, optional polyfill for Safari

### Accessibility

- ARIA attributes across all interactive components
- Keyboard navigation: roving tabindex in menus/tabs, arrow keys, Escape to close
- Focus management: focus trap in dialogs, focus restoration on close
- `prefers-reduced-motion` respected — all motion tokens collapse to 0ms
- Screen reader support: live regions for toasts, semantic roles, `aria-describedby` chains

### Documentation

- VitePress docs with 47 pages, deployed to docs.cocoar.dev via Shelf
- Interactive demos with source code preview
- i18n keys documented on each component page
- Design principles, typography, colors, spacing, motion foundations
- Localization guide: l10n formatting, i18n translations, timezone providers
- Form validation examples with vee-validate + Zod
- Error handling guide

### Bundle

- `@cocoar/vue-ui`: 378 KB JS (86 KB gzip), 167 KB CSS (17 KB gzip)
- Tree-shakeable: all dependencies externalized
- `@js-temporal/polyfill` included as dependency (Temporal API for date/time components)
