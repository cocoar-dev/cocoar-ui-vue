# Changelog

All notable changes to the Cocoar Design System (Vue) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are calculated automatically by [GitVersion](https://gitversion.net/).

---

## 3.2.0

**A list for records that do not fit into columns.** `CoarDataList` is the
grid alternative for data with many fields on a notebook screen: the
application owns a free multi-line template per record, the list owns
everything a hand-rolled list keeps reinventing — measured virtual scrolling,
search, a sort menu, selection, grouping, tiles, nesting and drag & drop.
Along the way the shared drag & drop composable gained a pointer engine, so
touch-first surfaces can reorder without giving up HTML5 drops on the desktop.

**The calendar catches up — with its consumers and with iOS.** Every finding
timetodo, amZettel and the Event-Tree stress app reported against
`@cocoar/vue-calendar` since May is addressed, and every behaviour
`Cocoar.Calendar.iOS` 5.3.1 added after the two calendars were last aligned
lands on the web with the same contracts. Along the way Day, Multi-day, Week
and Work week became one time-grid model, the header became optional
(`hideHeader`, `api.rangeLabel`), and the builder's `locale` stopped
defaulting to `en-US`.

### Added

- **`CoarDataList` — virtualized record list with a free item template.** Every
  row is a slot; the list measures its height, virtualizes rows, and provides
  AND-term, diacritics-folding search with `::highlight` marks, an
  `Intl.Collator` sort menu (`sortOptions`, natural numbers, nulls last,
  stable), `groupBy` with headings, `gap`, `density`, `dividers`, `bordered`,
  `elevated`, an empty state, and key-based selection (`'none' | 'single' |
  'multiple'`) with click, `Ctrl`/`Shift` and full keyboard navigation.
  State flows through `v-model:search`, `v-model:sort` and
  `v-model:selected`; `item-click`, `item-dblclick`, `item-contextmenu` and
  `item-activate` report interactions. Rows carry `role="option"` /
  `listitem` semantics; the toolbar labels are translatable via the new
  `coar.ui.dataList.*` keys.
- **Fluent `useDataList<T>()` builder and `api`.** `{ builder, api }` follows
  the `useTree()` / `CalendarBuilder` pattern: one chain configures data,
  behaviour, appearance, handlers and declarative `itemMenu` / `viewportMenu`
  context menus (rendered by the list); every setter takes a value, a `Ref` or
  a getter. `api` offers selection, `scrollToKey`, `focusKey`,
  `invalidateMeasurements`, expansion and the live `items` / `count` / `total`
  refs. `useDataListModel()` exposes the headless pipeline
  (filter → search → sort → group → nesting plus selection and expansion) for
  custom renderers.
- **Grid layout.** `layout: 'grid'` with `tileMinWidth` flows the same records
  into equal-width tiles per row — always in exact data order — with rows still
  virtualized and measured. `tileCards` draws each tile as a card. Search,
  sort, grouping, selection, context menus and the `api` behave identically;
  arrows move by tile and by row. Masonry is deliberately not a layout of this
  component.
- **Nested lists.** `children(accessor, level => …)` turns the list into a tree
  of lists; each child level is configured on its own (`sortOptions`, `sort`,
  `layout`, `tileMinWidth`), so parents can be sorted by title while children
  keep a manual order. `v-model:expanded`, `maxDepth`, `nestingIndent`,
  `nestingStyle` (`'lines' | 'none'`), `hideExpandToggle` and `canNest`
  control it; search keeps matching parents and opens them while a query is
  active, selection stays flat, `→` / `←` and `+` / `-` expand and collapse.
  In the grid layout the children of an expanded tile open in a band under its
  row — no tile moves sideways — framed like a folder hanging from its tab
  (`bandElevated` adds a shadow); one expanded parent per row.
- **Drag & drop reordering.** Opt in with `reorderable`; the list shows an
  insertion line (or the "inside" band for nesting) and reports `reorder`,
  `items-add`, `items-remove` and `files-drop` events with `toIndex`,
  `afterKey`, `beforeKey`, `group` and `parentKey` — it never mutates the
  data. Lists sharing a `dragGroup` exchange items (a board is three lists),
  `canDrag`, `canDrop` and `dragAccept` veto, `acceptsFiles` takes OS files
  with either engine. Reordering is refused per level while that level is
  sorted. Keyboard: `Ctrl`+`X`, arrows / `Home` / `End`, `Ctrl`+`V` or
  `Enter`, `Escape`.
- **`unstyledItems` — the template owns the whole box.** The list then draws
  no padding, hover, selection, focus, divider or card and keeps only
  position, measurement, drop indicators and the row gap. State arrives via the
  slot props `selected`, `focused`, `dragging`, `expanded`, `hasChildren`,
  `depth`; actions via `select()`, `toggle()`, `toggleExpanded()`.
- **Pointer engine for `useDragDrop`.** New `engine: 'native' | 'pointer' |
  'auto'` option: `'pointer'` drives drags from Pointer Events (mouse, pen,
  touch with long-press, ghost element, text selection suppressed) between
  surfaces registered via `pointer.target`; `'auto'` picks it on
  coarse-pointer devices. Sources wire `onPointerDown()` next to the native
  handlers and the engine decides which one acts. Matching rules,
  `onDropAccept` / `onItemsRemove` and the registry are shared with the native
  engine. `CoarListbox` and `CoarDualListbox` expose it as the opt-in
  `dragEngine` prop; `CoarTree` stays native by design.
- **Measured rows in `useVirtualList`.** `measure` and `itemKey` options plus
  `measureElement(index, el)` and `invalidateMeasurements(key?)` replace the
  fixed-height estimate with observed heights (ResizeObserver, keyed by item),
  and `scrollToIndex` settles on the target after the surrounding rows have
  been measured.
- **Data List documentation.** A new "Data List" page under Display covers the
  builder, the item template contract (what the list owns, what the template
  owns), grid, nesting, reordering and engines, grouping, large lists, the
  headless model, sorting, search, keyboard, the full API and the i18n keys;
  the Drag & Drop page documents the engines.

- **Live topmost month while scrolling the Month view.** `api.topmostVisibleMonth`
  is the month of the topmost visible section, updated on every scroll
  frame (finger down, deceleration); `api.rangeLabel` and the header follow
  it immediately. The cursor (`state.date`) — and with it `onRangeChange`
  and the loaders — catches up only once the scroll settles (`scrollend`,
  or a 160 ms fallback). A month stays active until its section has
  scrolled out completely. Counterpart of iOS 3.6.
- **Compact card anatomy under overlap (Day / Week).** The built-in card now
  shows the location (`meta.location`) and the time span when it has the
  height, and lets the title wrap once on tall cards. When cards in front
  leave less than `timedEventDetailMinWidth(px)` (default `112`, iOS
  `timedEventDetailMinimumWidth`) unobscured, the card drops to one
  end-truncated title line with no rows — every card stays its own click
  and drag target. `0` disables the switch; custom `#event` slots and
  `eventRenderer` are never touched. Counterpart of iOS 4.0.

- **`--coar-calendar-scroll-inset-bottom`** — bottom content inset for
  every scrolling surface (Day / Week grids, Month, List, Agenda,
  Timeline, Year), the counterpart of the iOS calendar's content inset.
  Set it to the height of whatever overlays the bottom edge (tab bar,
  floating button, `env(safe-area-inset-bottom)`) and the last rows scroll
  clear of it; focus-driven scrolling honours it via `scroll-padding-bottom`.
  Default `0px`.

- **`@cocoar/vue-calendar` — all-day band lane cap.**
  `allDayMaxVisibleLanes(n | null)` (default `3`, like the system calendar)
  folds lanes beyond the cap into per-day "+N" markers; a click expands the
  band, a "Show fewer" control folds it back. `allDayBandMode('fitsContent' |
  'alwaysOneLane' | 'reservesCap')` decides how much height the band claims —
  `reservesCap` keeps the hour axis at the same place on every day. Pure
  `capAllDayBand` / `allDayBandLanes` are exported from the core subpath.
- **Agenda empty state.** `<CoarAgendaView>` gains an `empty` slot
  (`agendaEmpty` on the shell). It appears only when the list draws nothing
  and no load is in flight, never next to empty-day headers, and has no
  default rendering.
- **Contrast policy and per-event text colour.** `eventTextContrast('wcag' |
  'apca')` selects how the automatic black/white ink on event surfaces is
  chosen; APCA (the WCAG 3 draft method) picks white on saturated mid-tones
  such as `#e03131` where WCAG 2 narrowly picks black. `meta.textColor`
  overrides either policy for one event. `eventInkColor` joins
  `eventTextColor` on the core subpath.
- **One model for every time grid.** Day, Multi-day, Week and Work week now
  render on one surface and are presets of one range spec — `anchor`
  (`cursor` | `weekStart`), `span` (days | `responsive`), `filter` (`all` |
  `workDays`), `step` (days | `span`). `builder.timeGridRange(...)` lets the
  Day view use any other combination ("start Monday, show five days, page by
  a week"); Week and Work week stay fixed presets. `resolveTimeGridRange` and
  the presets are exported from the core subpath. Every grid feature — touch
  paging, empty-cell hooks, the all-day cap — therefore behaves identically
  across the four views by construction.
- **Shell chrome can be switched off.** `<CoarCalendar hide-header>` renders
  only the body for hosts that own navigation and view selection through
  the api; `hide-view-switcher` and `hide-mode-switcher` drop one control
  while keeping the header. Until now hosts hid these with `:deep()` CSS
  overrides, because an empty `#header` slot falls back to the built-in bar.
- **Swipe paging on week / work-week / day.** A horizontal pan on the columns
  (touch) or a drag across the day-name strip (any pointer, grab cursor)
  moves the grid with the pointer — header cells, all-day band and columns
  together, the hour axis stays put — and pages on release past a quarter of
  the width or on a fast flick. A touch that never moves is a tap and reaches
  `onTimeClick` on release, so a swipe never starts with a stray slot click.
  On the columns, mouse and pen keep their click-on-press semantics. While
  you drag, the previous and next page are drawn beside the current one —
  same columns, same events — and the builder pre-warms those two windows
  in loader mode (`prefetchNeighbours(false)` opts out;
  `api.getEventsForWindow(window)` is the read behind it).
  `swipeNavigation(false)` switches it off; `prefers-reduced-motion` skips
  the settle animation.
- **`@cocoar/vue-calendar/styles` subpath.** The package stylesheet
  (`dist/vue-calendar.css`) is now declared in the `exports` map, matching
  `@cocoar/vue-ui/styles`. Hosts drop the relative
  `node_modules/@cocoar/vue-calendar/dist/vue-calendar.css` import.
- **`onDateDoubleClick` / `onTimeDoubleClick` builder hooks.** Empty month
  cells, all-day cells and time-grid slots now report double-clicks
  separately from single clicks, so the desktop convention "click selects,
  double-click creates" needs no host-side click timer. `onTimeDoubleClick`
  snaps to the slot grid exactly like `onTimeClick`; a double-click on an
  event element still reaches `onEventDoubleClick` only.
- **Shipped translation catalogs.** `calendarMessages` (`en` / `de`, flat
  `coar.calendar.*` keys) and `createCalendarTranslationSource()` for
  `service.addTranslationSource(...)`. Regional tags resolve to their base
  language; a host source registered afterwards overrides per key. A test
  scans the source tree and fails when a component reads a key either
  catalog lacks.

- **`api.rangeLabel`** — the title of the visible window ("15.–21. Juni
  2026", "June 2026", "2026") as a readonly computed, formatted by the same
  `formatRangeLabel` (core) the built-in header uses. For hosts that set
  `hideHeader` and draw their own navigation. Correct before any view has
  mounted, too.

### Changed

- **Agenda and Month List show time spans.** Timed events with an end render
  `start – end` (en dash) in the time column; point events keep the start
  time; all-day events keep the all-day label. Mirrors the SwiftUI port's
  default.
- **`--coar-color-accent` follows the vue-ui accent ramp.** Every usage now
  falls back to `--coar-color-accent-500` before the historical blue, so a
  host that brands `--coar-accent` gets matching today markers and default
  event fills without a calendar-specific override. An explicit
  `--coar-color-accent` still wins.

### Removed

- **`onMoreClick`** and the `MoreClickHandler` type. The setter never
  fired: it was specified for a "+N more" overflow surface in the month
  view, and the month view deliberately has none (every event stays in
  the DOM, cells scroll, a row expands via its cell menu). Use
  `onDateClick` plus `api.getEventsForWindow(window)` for a day's events.

### Fixed

- **Date-time pickers no longer revert typed edits on blur.** Maskito's
  datetime mask defaulted to `', '` between date and time while the pickers
  format and parse with a plain space, so the first keystroke re-masked the
  value, parsing failed and the edit was discarded. The mask's
  `dateTimeSeparator` is now a space, and the masked 12-hour text uses
  Maskito's canonical form (two-digit hour, non-breaking space before the
  meridiem) so programmatic writes and the DOM agree. Round-trip tests cover
  all four date patterns in 24-hour and 12-hour mode.

- **Locale fallback to the host's localization service now works.** The
  builder's `locale` defaulted to `'en-US'`, so the documented fallback to
  the `@cocoar/vue-localization` language never applied in any view. The
  default is now `undefined`: an explicit `locale(...)` wins, then the
  host language, then `en-US`. Hosts with the localization plugin that
  never called `locale(...)` will see the calendar in their app language.

- **Cross-zone and UTC decorations no longer crash the agenda.** The
  decoration component called the localization service's `t` detached from
  its instance; the first event whose source zone differed from the display
  zone threw `Cannot read properties of undefined (reading '_language')` and
  left the agenda blank. The call is now bound to the service.
- **Clicking an event no longer also reports an empty-cell click.** A pill or
  card's `pointerdown` bubbled through its month cell / time-grid column, so
  `onDateClick` / `onTimeClick` fired alongside `onEventClick`. The
  empty-surface hooks now ignore pointer events that started inside an event
  element, matching their documented "empty cell / slot" contract.
- **Multi-day all-day events are announced with their inclusive last day.**
  The month-grid `aria-label` named the RFC-5545 exclusive end (a Fri–Sun stay
  read "Fri – Mon"); it now names the last covered day, and single-day
  all-day events get one date instead of "Fri – Fri".

---

## 3.1.0

**Fixed Markdown structure with focused, typed places to fill it in.** This
release introduces a template-driven Markdown form for protocols, meeting notes
and document-like forms whose headings and explanatory text must remain intact.
It also separates the Markdown editor toolbar from an individual editor, so one
stable toolbar can serve every editable Markdown section on a page.

### Added

- **New `@cocoar/vue-markdown-form` package.** `CoarMarkdownForm` renders an
  ordinary Markdown template as fixed document content and turns only explicit
  `:field{...}` / `:::field{...}` directives into editable controls. The
  reusable template and the filled values stay separate; applications receive
  one typed values object without rewriting the Markdown source.
- **Built-in text, number, date, date-time, boolean, select and Markdown
  fields.** Fields support required validation, placeholders, options and
  type-appropriate constraints. Empty Markdown sections remain reachable, so a
  user can delete all section content and still continue filling the document.
- **Fill and readonly document modes.** Fill mode keeps the authored structure
  immutable while exposing its controls. Readonly mode renders the completed
  document with configurable field decorations, making the same template useful
  for entry, review and presentation.
- **Typed renderer context and an open field registry.** Hosts can provide
  presentation context such as a basic or styled design, while consumer-defined
  field types plug into the same parser, value model and rendering contract as
  the built-ins.
- **Responsive field layout controls.** Templates can choose inline or stacked
  placement and semantic widths including compact presets, full width and
  `fill`, which consumes the remaining space beside a label.
- **One toolbar for multiple Markdown editors.** New
  `CoarMarkdownEditorGroup`, `CoarMarkdownToolbar` and
  `toolbar-mode="external"` route commands to the currently active editor. The
  toolbar remains mounted, changes its available tools without flicker and is
  disabled whenever no editor is active.
- **Complete template and integration documentation.** The docs include a
  copyable protocol template, the directive grammar, built-in field reference,
  typed values, validation, layouts, context, custom fields and the shared
  toolbar setup.

### Fixed

- **External Markdown values remain synchronized during editor startup.** Model
  updates that arrive before Milkdown is ready are buffered and applied once the
  editor initializes, while later host updates continue to flow normally.

---

## 3.0.0

**Page Builder: a complete authoring platform, fewer concepts, unambiguous names
— and back under Preview.** A major confined to `@cocoar/vue-page-builder` and
its immediate neighbours. Nothing has been published since 2.19, so this release
carries both the customer-authoring platform (isolated scripting, runtime
bindings, reusable compositions) and the consolidation that followed it: four
`PageConfig` concepts removed because they restricted a page author inside a
realm they own or duplicated something the host already passed, plus several
names disambiguated where one word covered two things.

The package shipped as GA in 2.17 by oversight; it now carries the Preview badge
until the authoring model settles, so expect the public API, `PageConfig` and the
document schema to keep moving in minor releases. Documents stay safe: every
schema change ships a migration that runs on ingest. See
[Migrating Page Builder to 3.0](https://docs.cocoar.dev/cocoar-ui-vue/guide/migration-page-builder-3).

### Added

- **`@cocoar/vue-page-builder` — isolated browser scripting.** Page State, Page Root Code, per-element compute/action code and async host calls run in one SES-hardened Web Worker session per rendered page. Tenant code has no ambient DOM, `window`, `fetch` or filesystem access; a host exposes explicit, structured-clone-safe capability facades with `definePageRuntimeHost()` and grants them per page and runtime definition. Reactive dependency tracking recalculates only definitions affected by changed fields, state, repeater context, viewport or host resources. Constrained Monaco templates keep function signatures and element identity locked while exposing element-specific IntelliSense.
- **`@cocoar/vue-page-builder` — generic runtime bindings and authored state.** Supported properties, action arguments and visibility rules can read allow-listed host context, Page State, named form fields/selections, repeater item/index or sandbox expressions. The page owns its initial mutable state; element code may use ordinary local variables without persisting them. The code path computes immutable property snapshots before applying the final result, so repeated assignments do not cause repeated DOM writes.
- **`@cocoar/vue-page-builder` — reusable, versioned compositions.** `PageCompositionRepository` is the host-owned persistence boundary for immutable subtree definitions. Repository summaries appear in a searchable **Compositions** library and can be dragged through the normal Tree/Canvas drop pipeline. Instances materialize as ordinary nodes, pin an exact version, support explicit version changes, update-to-latest, detach and host navigation through `open-composition`, and retain nested origin chains. `compilePageCompositions()` strips authoring metadata, so runtime documents need neither a repository nor a wrapper element. Separate Pages/Compositions applications use `composition-management="consume"`; compact tools may use inline definition management.
- **`@cocoar/vue-page-builder` — general action arguments.** Every action-capable registry element shares optional `actionValues`, `actionValueField` and `actionValue` properties. JSON-safe static values and per-key dynamic bindings reach the handler with deterministic precedence: form values, then `actionValues`, then the legacy dynamic `actionValue`. Buttons, links and consumer elements therefore use one action contract.
- **`@cocoar/vue-page-builder` — repeaters, selections and feedback zones.** The generic `repeat` element renders an allow-listed host array, exposes current item/index to descendants and can publish selected-key arrays under a configured name. The generic `feedback` element places form errors, status, loading or authored messages inside the visual layout. These primitives replace proprietary Auth provider/scope elements.
- **`@cocoar/vue-page-builder` — sandboxed visual markup.** The optional `visual-markup` element renders a bounded declarative document with host-owned values, font registrations and navigation/action policy; arbitrary HTML, DOM scripts and page-global CSS are not accepted.
- **`@cocoar/vue-page-builder` — responsive styling, translations and application theming.** Documents author mobile-first styles plus Phone, Tablet and Desktop overrides, safe modern viewport units (including `dvh`, `svh` and `lvh`), breakpoint visibility and centralized key-based translations. `CoarThemeScope` and the Builder's `previewTheme` apply the resolved application brand to runtime and canvas without restyling the administration chrome.
- **`@findings` event and exported `useAuthoringFindings()`.** The builder's authoring findings reach the host, so a save button can grey out on errors or a host can render its own issue list. Outside a mounted builder, the composable answers the same question.
- **`previewInitialValues`.** The embedded preview starts from host values, merged over the authored `defaultValue`s exactly as at runtime — the edit-form case, and the case where a default is computed per tenant.
- **`PageContextField.allowedValues`.** A context field with a closed value set is authored with a dropdown in the condition editor, which is what makes a host state, tier or status authorable without a second mechanism for it.
- **Authoring contract documentation.** Every field of the node grammar, the surface that writes it, every named exception with its cost, and the open gaps.

### Changed

- **`@cocoar/vue-page-builder` — editor layout and authoring flow.** Outline and compact Properties now share the resizable left inspector, the Canvas stays central, and a searchable, independently collapsible element library sits on the right. Contract **Fields** appear first, followed by Containers, Elements and Compositions. Common properties remain quick controls; Page/Element Code is the authoritative escape hatch for the complete registered property surface.
- **`@cocoar/vue-page-builder` — localization uses stable keys.** Localizable element properties reference a page translation catalogue edited in one Translations tab. Legacy embedded localized objects remain readable, while the properties inspector no longer displays them as `[object Object]`.
- **`@cocoar/vue-script-editor` — constrained authoring is visually quieter and more usable.** Locked scaffolding markers can be hidden, protected lines are deemphasized without a dominant background, editor sizing is stable, and PageBuilder code dialogs use a wide viewport-relative layout.
- **`@cocoar/vue-ui` — scoped application themes.** New `CoarThemeScope` applies typed theme primitives and light/dark/auto mode to a subtree, enabling an embedded preview and the production page to share the same brand contract.
- **`config.fields` → `config.dataContract`.** `fields` named both the DTO contract and the live values (`page.fields`). The contract takes the new name; the values keep the one that reads correctly in code.
- **`config.elements` → `config.elementTypes`, `PAGE_ELEMENTS_KEY` → `PAGE_ELEMENT_TYPES_KEY`.** The registry says which element *kinds* exist; `page.elements` is this page's nodes.
- **`useSchemaValidation()` → `useAuthoringFindings()`** (returning `{ findings, byNodeId }`), **`ValidationIssue` → `AuthoringFinding`**, **`IssueSeverity` → `FindingSeverity`**, **`@validation` → `@findings`**. "Validation" covered a node's field rules, the activation contract and the builder's authoring hints; the first two keep the word.
- **`repeat.props.source` → `props.contextPath`** and **`PageVisualFont.source` → `src`.** `source` was an enum, a context path and a data URL at once. `binding.source` keeps it.
- **Schema v6.** The repeat rename is applied by `migrateRepeatContextPath` on every ingest path — identity-preserving, idempotent, skipped when the new key is present. Stored documents open and render unchanged.
- **The page is exactly its host container.** Size values on the page root are dropped and the root offers no size fields; the host container owns the box and must have a determinable height. A document that set a root size is told so.
- **Quick Properties resolve per breakpoint.** They showed the base value while the canvas rendered the resolved one. An inherited value now also names the override it came from.

### Removed

- **`config.stylePresets`, `node.stylePreset`, `PageStylePreset`, `findStylePreset()`, `isSafeStylePreset()`.** Host-registered CSS classes the author picked by id. A page author owns the realm their page renders in, so the restriction protected nobody — and the Editor canvas never applied the class, so picking a preset changed nothing until you switched to the Preview tab. Styling remains `NodeStyle`, `CoarTheme` and the `visual-markup` element. A leftover `stylePreset` key is reported as an authoring warning, never stripped.
- **`config.requiredNodes`** (with `lockVisibility`, `lockStyle`, `parentId`, `maxIndex`). Besides the same ownership argument, it did not hold: a node carrying both locks still vanished when the container above it was hidden, with `validatePageDocument()` reporting the document as valid. Guarantees of this kind belong in the publication endpoint, where they cannot be bypassed from the browser.
- **`config.availableStates`, `<CoarPageRenderer>`'s `viewState`, `<CoarPageBuilder>`'s `previewState`, `visibleWhen.source: 'state'`, `page.viewState`.** The host's view state was a second mechanism for something `runtimeContext` already carried — and `source: 'state'` meant Page State in a binding but view state in a condition. Page State (`definePageState`, `page.state`, `source: 'state'` bindings) is untouched and now unambiguous.
- **`config.previewFixtures` and `PagePreviewFixture`.** A fixture bundled `{ context, state, locale, viewport }` plus a builder-drawn dropdown, but the host already owns `previewContext` and `previewLocale`. The preview now runs when the host supplies the inputs its own config declares, and says so when it cannot.
- **`createAuthPageConfig()` and `createAuthPageDocument()`.** The package ships nothing auth-specific; an IDP owns its own config and starting documents.

### Fixed

- **`@cocoar/vue-page-builder` — packaged Worker execution in real Vite consumers.** The runtime Worker is emitted through a dedicated package subpath, remains outside Vite dependency pre-bundling where required, resolves correctly below non-root base paths and works in development optimization and production builds. Release CI now installs the packed PageBuilder and its peers into a separate Vite consumer before publishing; the packed-consumer matrix covers Linux and Windows.
- **`@cocoar/vue-page-builder` — Auth integration correctness.** Runtime actions receive current form values plus explicit arguments, validation/errors/loading render in authored locations, conditional controls react without polling every expression, modern viewport lengths survive CSS sanitization, and generic external-provider/consent collections work without consumer-only element implementations.
- **Monaco JSON diagnostics are documented at the consumer boundary.** PageBuilder uses JavaScript and JSON language services; Vite hosts must route `json` to Monaco's `JsonWorker`. Routing it to the generic editor worker caused `Missing requestHandler or method: doValidation`, `findDocumentColors` and `getFoldingRanges` messages even though the sandbox itself was healthy.
- **`@cocoar/vue-page-builder` — the page root is a border box.** "The page is exactly its host container" only held while the page had no padding of its own: `.pb-page` was content-box, so an authored padding was added to `width: 100%` and the page came out wider than the container it fills. Invisible until the host is narrow, and then a horizontal scrollbar on a login page at 320px.

---

## 2.19.0

This release brings the Vue calendar's view hierarchy and interaction model in line with the newer Cocoar iOS calendar while keeping the web package deliberately presentation-agnostic. The flat `CalendarBuilder` remains the single integration surface: applications choose their own create/edit UI, persistence and recurring-series scope flows through callbacks and occurrence provenance.

### Added

- **`@cocoar/vue-calendar` — iOS-style Year / Month / Day / Agenda hierarchy.** New public `CoarYearView`, `CoarContinuousMonthView` and `CoarMonthListView` components join the existing time-grid and agenda surfaces. The shell groups Compact, Stacked, Details and List under Month, groups One day and Multi-day under Day, and retains fixed Week and Work week views as useful web additions. The old `legacyMonth` idea is intentionally absent.
- **Continuously scrolling Month.** Month sections render only their required four to six weeks, materialize and preload adjacent months, preserve the active month while density changes, and extend in either direction without an unbounded DOM. Compact, Stacked and Details use content-aware row heights; Month List places the selected-day list below the mini calendar in narrow containers and beside it when space allows.
- **Responsive Multi-day view.** New fluent setters `dayMode('single' | 'multiDay')`, `dayColumnCount(...)` and `dayColumnMinWidth(...)` derive one to seven complete day columns from the calendar's actual container width. `api.setDayMode(...)` and `api.setMonthDensity(...)` provide the imperative counterparts.
- **Calendar presentation controls.** `monthDensity(...)` selects Compact / Stacked / Details, `shadeWeekends(...)` controls the weekend tint, event metadata can render assignee avatars, and event foreground contrast is selected from the event colour. The default view set now follows the iOS hierarchy; Timeline remains opt-in.
- **Public layout helpers.** `responsiveDayColumnCount`, `contentAwareCascadeFrames` and `eventTextColor` are exported from the core subpath for consumers building compatible custom surfaces.

### Changed

- **Create and edit stay host-owned.** `onDateClick`, `onTimeClick`, `onEventClick`, `onEventDoubleClick`, hover handlers and the native DOM anchor form the complete Fluent API integration seam. The library does not force a modal or overlay, so consumers can choose a popover, dialog, side panel or routed editor. Recurring occurrences retain series id, recurrence id and source provenance for This occurrence / This and following / Entire series persistence flows.
- **Month and time-grid overlaps follow the available content.** Same-day items no longer disappear after two entries in Details mode; every item remains reachable. Timed overlaps use content-aware cascading and width allocation, while responsive headers and view controls wrap against the calendar container instead of overflowing narrow host layouts.
- **Month-cell drops preserve timed-event intent.** Dropping a timed event onto a month date moves it by the display-date delta while retaining its local time, duration and per-endpoint source zones.

### Fixed

- **Selected-day hover contrast and shape.** Month List and Agenda keep the selected day on its accent background while hovering, so the white label remains readable. The Year view applies the same rule to its current-day marker. Month List now also derives its day-cell radius from the Cocoar button-radius token instead of using an out-of-scale hardcoded radius.
- **Continuous-month separators and today marker.** Every month begins with a consistent top separator even when the previous section has no rendered day above it, and the current-day marker is no longer clipped at the section edge.
- **Subpath declaration packaging.** The `recurrence` and `recurrence-rrule-temporal` exports now point at the declaration files Vite actually emits, so TypeScript consumers resolve both subpaths from the packed npm artifact.

## 2.18.0

### Added

- **`@cocoar/vue-ui` — `CoarNotice` for compact status messages and application banners.** The new component supports `info`, `success`, `warning`, `error`, `neutral` and `accent` variants with matching default icons, plus `placement="inline" | "banner"`. Inline notices render as compact bordered callouts; banners sit flush below an application header without making themselves sticky. Optional `label`, icon override, single-line inline `truncate`, long-form `#details` popover and right-aligned `#cta` slot cover short operational messages without turning the entire notice into a link. Banners always wrap, and actions remain independently interactive. New documentation compares `CoarNotice` with the richer, page-content-oriented `CoarNote`.
- **`@cocoar/vue-ui` — `CoarCheckboxGroup` with real collection models.** Child `CoarCheckbox value="…"` controls can now project into either an ordered `string[]` or an explicit `Record<string, boolean>` via `v-model`; `modelType` selects the empty-model shape and otherwise follows the supplied model. Array output follows checkbox registration order, object output includes every registered key with a true/false value, and external model changes update the children. The group owns `name`, orientation, size, disabled and error state, provides `role="group"` semantics, and integrates with `CoarFormField` labels and messages.
- **Semantic `subtlest` status backgrounds.** Success, error, warning and info now expose `--coar-background-semantic-*-subtlest` tokens for lightweight status surfaces in light, dark and theme-less modes. The theme editor exposes the new tokens as first-class semantic overrides.

### Changed

- **`@cocoar/vue-ui` — `CoarFormField` controls label layout consistently.** New `layout="stacked" | "inline"` and `labelPosition="before" | "after"` props support all four combinations for every child control. The label and status indicator move as one cluster, while the status popover trigger remains outside the native `<label>` so opening help never toggles a checkbox. Form-field context now exposes `labelId`; unlabeled `CoarCheckbox` and `CoarSwitch` controls adopt the field input id so an external form-field label is associated correctly.
- **Checkbox rows use compact control-native density.** Standalone and grouped checkboxes no longer reserve text-input height. Size-specific touch rows remain usable while consecutive checkboxes sit closer together; labels use natural line height and wrap with the box aligned to the first text line. `CoarCheckbox` keeps its existing standalone `label` API.

### Fixed

- **Info semantic text remains legible on subtle surfaces.** `--coar-text-semantic-info-bold` now resolves to a dark slate in light mode and a light slate in dark mode instead of white/dark inverted values that disappeared against low-emphasis info backgrounds.
- **Form-field label and status alignment.** The status icon is optically aligned with the label baseline in both stacked and inline layouts.

## 2.17.1

### Fixed

- **`@cocoar/vue-page-builder` — the palette splits Inputs from Elements, and `hideElementPicker` hides only the Inputs.** The free offering now has three groups — **Containers**, **Inputs** (value elements: text/password/number inputs, checkboxes, selects, …) and **Elements** (content and actions: headings, paragraphs, notes, buttons, links, images), split registry-derived by value-spec presence (consumer elements sort themselves). Fields-only authoring (`config.hideElementPicker`) now removes only the **Inputs** group (palette + the input entries of the outline's add-child menu) — exactly what the field contract replaces; containers and content/action elements stay, because a contract-authored form still needs layout, headings and a submit button. Empty palette/menu groups (e.g. everything excluded via `allowedElements`) are no longer rendered as bare labels. New i18n key `coar.pageBuilder.palette.inputs`.

## 2.17.0

**Page Builder goes GA — on an open element registry.** `@cocoar/vue-page-builder` sheds its Preview badge after a full readiness audit (correctness & data-safety fixes, npm packaging, touch-first pointer drag & drop, builder table-stakes, i18n, 8 new element types) **and** a pre-GA rework onto a consumer-facing **element registry**: built-ins and consumer elements now ride one contract and one unified wire format. Register a component via `config.elements` and it becomes a first-class element — palette entry, canvas preview, props panel, runtime rendering and form-value participation included. On top of the registry sits a config-level **field contract** (`config.fields`): pages usually project a DTO, so field binding becomes DTO-driven picking — compatible-field selects, a draggable Fields palette group, and one-click representation switching. A production **submit lifecycle** rounds it off: async actions with busy state and a form-level error channel, Enter-to-submit, a built-in email check, a host form API (`update:values` / `isDirty` / `reset`), conditional visibility (`visibleWhen`) and API-backed option lists (`optionsSource`). The wire format changes (schema v2, see Breaking) — pre-v2 documents are migrated transparently on every ingest path.

### Breaking

- **`@cocoar/vue-page-builder` — schema v2: element props move into a `props` bag.** The unified node grammar is `{ id, type, props: { …element fields }, style?, name?, defaultValue?, validation?, children? }` — `type` is an open registry key, everything element-specific lives in `props`, the host vocabulary (`id`, `style`, the value-model trio, `children`) stays at node level, and the `page` root carries `schemaVersion: 2`. **v1 documents keep working**: a self-detecting, idempotent migration (`migrateV1PropsBag`, exported) runs inside `normalizePageSchema` *and* on the fly in the renderer, so existing JSON loads, renders and submits identically — but anything *you* persist or generate from now on is v2, and code that reads node fields directly must switch `node.text` → `node.props.text` etc.
- **`@cocoar/vue-page-builder` — type surface follows the format.** Built-in node interfaces (`HeadingNode`, `TextInputNode`, …) are now bag-shaped aliases over the new `ElementNode<K, P>`; the `PageNode` union gains an **open** `ElementNode` member (so exhaustive `switch`es over it no longer narrow — dispatch goes through the registry), `ElementType` stays the closed built-in set, `allowedElements` accepts consumer keys (`(ElementType | string)[]`), and `FieldValidation` is uniform at node level. Inspector components patch element fields *through the bag* — `patch({ props: { … } })` merges one level deep with delete-on-empty semantics per bag key, while host fields stay node-level.
- **`@cocoar/vue-page-builder` — GA behaviour contract (changed within the Preview period).** Validating buttons are no longer disabled-until-valid: an invalid click marks all fields touched, **reveals every error**, focuses the first invalid control, and aborts the action (buttons only disable while a trigger is genuinely in flight — an async `onValidate` or an async action — as a double-submit guard). `onValidate` is genuinely async and runs at **submit time** after the declarative rules, its result mapping to per-field errors. `validation.pattern` is anchored to the documented full-string semantics and compiled crash-safe (an invalid tenant regex no longer crashes the page). Node ids are crypto UUIDs (no more session-counter ids).
- **`@cocoar/vue-page-builder` — new peer dependency `@cocoar/vue-localization`.** All builder chrome and the renderer's validation messages resolve through `t('coar.pageBuilder.*', …, englishFallback)` — English-only apps need no i18n setup, but the peer must be installed.

### Added

- **`@cocoar/vue-page-builder` — consumer-facing element registry.** `definePageElement<P>({ renderer, value?, container?, inline?, normalizeProps?, builder? })` packages everything the renderer *and* the builder need to know about one element type; built-ins are pre-registered on the same contract. Registrations merge **additively** over the built-ins via `config.elements` (per instance) or the app-wide `PAGE_ELEMENTS_KEY` provide (config wins; shadowing a built-in key warns in DEV; key grammar `^[a-z][a-z0-9-]*$`, vendor prefix recommended — `acme-rating`). One registration serves palette + add-menu (label/icon/group), canvas (a `preview` component, or a neutral icon+label chip), props panel (`inspector` receives `{ node, patch }`), authoring diagnostics (`lint`), and the runtime renderer. The **value model is registry-driven**: a definition with a `value` spec plus a `node.name` makes the element a managed field — defaults seeding (`defaultValue`), `required` gating (`isEmpty`), custom `validate` hooks (run crash-guarded after the declarative rules), and inclusion in action payloads. New public API: `definePageElement`, `usePageElement()` (the curated element runtime context: `getValue`/`setValue`/`getError`/`markTouched`/`triggerAction`/`isValidating`/`isSubmitting`/`pendingAction`/`formError`/`resolveAsset`/`config`), `mergeElementRegistries`, `PAGE_ELEMENTS_KEY`, `ELEMENT_KEY_PATTERN`, the contract types (`PageElementDefinition`, `PageElementBuilderDefinition`, `PageElementRegistry`, `ElementValueSpec`, `ElementLintIssue`, `I18nText`, `ElementNode`, `ElementProps`), and the shared `OptionsEditor` for consumer inspectors. Host-owned **Field section** in the props panel (name / required / default value, with an optional per-definition `defaultValueInput` editor) — consumer elements get the full field UX for free. `normalizePageSchema(value, { elements })` is registry-aware: registered types count as known and each definition's `normalizeProps` runs as a crash-guarded ingest-healing pass over the props bag.
- **`@cocoar/vue-page-builder` — lossless degradation for unknown element types.** A node whose `type` isn't registered is *kept*: builder validation flags it as a warning (not an error), the canvas shows a distinct blocked treatment, the JSON tab still round-trips it (Apply now rejects only on structural **errors** — `NormalizeIssue` gained `severity: 'error' | 'warning'`), and the runtime renderer skips it with a one-time warning. Unregistered valued nodes are excluded from the value model, so they can never veto submission.
- **`@cocoar/vue-page-builder` — 8 new element types**: `number-input`, `switch`, `radio-group`, `multi-select`, `otp-input` (required = complete code), `date-input` / `datetime-input` (ISO-string wire values, converted to/from Temporal at the picker boundary, crash-safe parse), and `note`; `text-input` gains `rows` (multiline textarea). Every form/content primitive of `@cocoar/vue-ui` is now a first-class element. Option-based inputs share a value/label options editor with add/remove/reorder.
- **`@cocoar/vue-page-builder` — `password-input` as a standalone element.** Masked passwords are no longer a `text-input` variant: `password-input` is its own registered element (renders a masked `CoarPasswordInput`; props `label` / `placeholder` / `disabled`; the host-enforced string rules `minLength` / `maxLength` / `pattern` apply), directly pickable in the palette and as a representation for `string` contract fields. `text-input`'s `inputType` narrows to `text | email | url` — **legacy documents keep working**: `text-input` nodes with `inputType: 'password'` migrate to `password-input` transparently on every ingest path (builder/`normalizePageSchema` persistently, the renderer on the fly), chained after the v1 props-bag migration.
- **`@cocoar/vue-page-builder` — field contract: DTO-driven field binding.** Pages are usually projections of a DTO — the fields and their types are known up front, and authors should pick from them instead of inventing names. New `PageConfig.fields: PageFieldSpec[]` (`{ name, valueType, label?, required?, defaultElement? }`) + `allowCustomFields` (default `false`). With a contract, the props panel's **Field name** becomes a select over the fields the selected element can edit (clear = unbind; out-of-contract bindings stay visible as `(custom)`); binding carries the contract label along (never overwriting an author's label) and sets `validation.required` for contract-required fields. Compatibility is **registry-driven**: `ElementValueSpec.types: PageValueType[]` declares which value types an element can edit (open token union — `string` / `number` / `boolean` / `string[]` / `date` / `datetime` plus consumer tokens; omitted = unconstrained), so a consumer rating declaring `number` becomes a representation for number fields; its sibling `ElementValueSpec.textRules` opts string elements into the host-enforced string rules (set by `text-input` / `password-input`). The palette gains a **Fields** group — one draggable card per contract field (type icon, `*` for required, greyed once bound); dropping one creates the field's default element (`field.defaultElement`, else the first compatible value element) pre-bound. The Field section gains an **Element** select — the representation switch: the new builder op `convertTo(path, type)` swaps a node onto another element that can edit the same value type, keeping `id` (selection follows), `name`, `defaultValue`, `validation`, `style` and the label while the rest of the props bag restarts from the target's defaults (one undoable step). Contract lint: a bound name outside the contract = **error** (unless `allowCustomFields`), a type-incompatible binding = **error**, a required contract field missing from the page = **warning** on the root; under a strict contract, fresh value elements start **unbound** instead of minting a `field_*` name. The contract constrains **authoring only** — binding is plain `node.name`, persisted schemas stay self-contained and render without it. `allowedElements` governs every seam of it: field default elements and the representation switcher only ever offer **allowed** elements. New `PageConfig.hideElementPicker` (default `false`) removes the free element picker (Containers/Elements palette groups + outline add-child menu) for fields-only authoring. `convertTo` refuses conversions that would drop children, and a definition combining `container: true` with `builder.preview` DEV-warns (the canvas renders the children body, not the preview). New exports: `isFieldCompatible`, `compatibleFields`, `compatibleElementTypes`, `defaultElementForField` (all allow-list aware via their optional `config` parameter), the `PageFieldSpec` / `PageValueType` types, and `defineFields<TDto>()` — an opt-in, zero-runtime-cost typed field list for static DTOs (names must be DTO properties, value types must fit the property types); it returns a plain `PageFieldSpec[]`, so dynamically extended DTOs keep using the array directly or mix both.
- **`@cocoar/vue-page-builder` — touch-first pointer drag & drop.** Native HTML5 DnD (which never fires from touch on Android tablets) is replaced by a pointer-events engine: 5 px movement threshold for mouse, 300 ms long-press for touch/pen (early movement = scroll intent), ghost clone, nearest-zone hit-testing, edge auto-scroll, Escape/pointercancel abort. The outline's drag grip actually reorders now (drop bars between rows + drop-*into* highlighting on containers) — it was a false affordance before.
- **`@cocoar/vue-page-builder` — builder table-stakes.** Duplicate (deep copy with fresh ids, in outline row actions and canvas chrome), default-value editors, outline keyboard/ARIA (`role="tree"`, roving tabindex, Arrow/Home/End, Enter/Space), and **scoped shortcuts**: the undo/redo/delete listener acts only while focus is inside *this* builder instance and never inside editable targets — native text undo works again in the JSON textarea and host-app inputs.
- **`@cocoar/vue-page-builder` — `<CoarPageRenderer>` `initialValues` prop.** Host-supplied values (edit-form prefill) merged over the schema defaults, filtered to named inputs in the allowed tree. Replacing the object with **different values** re-initializes the form; a value-identical replacement (the inline-object-literal footgun — a new reference on every parent render) is ignored, so in-progress user input survives. Compared over the keys the form actually consumes (irrelevant-key changes can't wipe input) and over **raw** values (reactive-proxy-safe, arrays by content).
- **`@cocoar/vue-page-builder` — submit lifecycle: async actions, busy state, form-level error channel.** An `ActionHandler` may return a Promise: the renderer awaits it, the triggering button spins (`pendingAction`), every other action button and link disables (`isSubmitting`), and repeated clicks are ignored — the double-submit guard now covers non-validating buttons too. Failures have a home: an action rejection surfaces its `Error.message` (the consumer's user-facing channel) in a **form-level error banner** (`CoarNote`, `role="alert"`, above the page; `#form-error` slot to replace it; `usePageElement().formError` to render it in-page), non-`Error` rejections and `onValidate` throws show a localized generic message, and the reserved **`_form` key** (`FORM_ERROR_KEY`, exported) in `onValidate` results routes there instead of to a field. The banner clears on any field edit and at the start of each trigger. Handlers and `onValidate` receive a **snapshot**, not the live reactive values object — and the action ships **the exact snapshot `onValidate` approved**, so edits made while an async validation was in flight never ship unvalidated. `onValidate` errors keyed to fields that cannot display (hidden by `visibleWhen`, renamed, never on the page) route to the banner instead of blocking the submit invisibly. A failed validating click focuses and scrolls the first invalid control into view.
- **`@cocoar/vue-page-builder` — Enter-to-submit (double opt-in).** The page root's new `enterSubmits` (checkbox in the host-owned **Page** section of the props panel) + per-element eligibility declared in the definition (`ElementValueSpec.submitOnEnter`, boolean or per-props predicate — single-line `text-input`, `password-input` and `number-input` declare it; textarea/OTP/selects, the date inputs (their picker panel uses Enter) and undeclared consumer elements never submit). A plain Enter fires the page's **default button** — the first `button` with the new `default: true` prop (checkbox in the button inspector; lint warns when several buttons claim it), else the first `validates: true` button in tree order — through the full submit pipeline. The input is blurred first so commit-on-blur controls (number input) flush the value the user sees; modified, already-consumed (`preventDefault`) and IME composition-commit Enters never submit.
- **`@cocoar/vue-page-builder` — built-in email format check.** `text-input` with `inputType: 'email'` validates against the WHATWG email pattern (full string, skips empty, localized `coar.pageBuilder.validation.email` message) — the most common format rule needs no hand-written `pattern` anymore. Rides the `textRules` opt-in, so consumer elements with an `inputType` prop participate by declaration.
- **`@cocoar/vue-page-builder` — complete action payloads.** Every value built-in declares a `value.defaultValue` factory, so **untouched named fields are present** in `ActionValues` as documented: `''` for text/password/OTP, `false` for checkbox/switch, `[]` for multi-select, `null` for number/select/radio-group/date/datetime ("nothing entered/picked").
- **`@cocoar/vue-page-builder` — host form API on `<CoarPageRenderer>`.** New `update:values` emit (snapshot copy on init, every edit and reset) plus exposed `values` / `isDirty` / `isFormValid` / `reset()` — unlocks autosave, drafts, unsaved-changes guards and host-driven resets without abusing actions as the only exit.
- **`@cocoar/vue-page-builder` — `visibleWhen`: conditional visibility as host vocabulary.** Any node can declare `visibleWhen: { field, equals | in }` against the live value model (arrays compare by content; malformed conditions fail open). The condition gates the node **and its subtree** in rendering *and* in the value model — in the same walk as `allowedElements` — so hidden `required` fields neither veto validating buttons nor ship values; payloads, `onValidate` input, `update:values` and the exposed `values` carry only the allowed and **visible** tree, while values typed before hiding are kept internally and return on re-show. A condition on the page root is ignored — a page can never blank itself. Builder: host-owned **Visibility** section (controlling-field select + `equals` editor authored in the **controller's value type** — checked/unchecked for booleans, option lists for choice inputs, numbers coerced; array-valued controllers are not offered, `in` is JSON-authorable), an eye marker on conditional canvas nodes, `convertTo` carries the condition, and lint warns on malformed conditions, unknown controlling fields and **circular chains** (self-references included — hidden controllers can't be edited, so loops could lock each other hidden).
- **`@cocoar/vue-page-builder` — hardening against tampered documents and stale context.** The renderer heals a missing/non-object `props` bag for **any** element type on the fly (a hand-written consumer-element node without a bag used to crash the whole page on its first `node.props` access). Reserved field names (`__proto__`, `constructor`, `prototype`) are excluded from the value model end to end — they neither veto nor ship, reads/writes are guarded against prototype pollution, the builder lint flags them as errors, and `onValidate` results keyed to them route to the form banner (they block visibly instead of being dropped). `usePageElement().config` is now a live getter, so a config supplied or replaced after an element mounted (late-arriving `optionsSource`, swapped allow-list) reaches it reactively. Value comparison (`isDirty`, the `initialValues` guard, `visibleWhen.equals`) is by **content** for JSON-safe values — nested objects and arrays included, reactive-proxy-safe. Fields revealed by `visibleWhen` *during* an async `onValidate` are auto-touched when the result maps errors onto them, so a blocked submit stays visible. The circular-`visibleWhen` lint models **ancestor-container** gating too (a field controlling its own ancestor card is the easiest self-lock to author), and `equals` conditions on multi-value (`string[]`) controllers get their own lint + a panel hint instead of a silently unsatisfiable condition. Enter-to-submit ignores Safari's post-`compositionend` IME commit (keyCode 229) and, while the form is busy, ignores Enter *without* blurring the focused input.
- **`@cocoar/vue-page-builder` — `optionsSource`: API-backed option lists.** New `PageConfig.optionsSource?: (sourceId) => Promise<OptionItem[]>` (the async sibling of `assetResolver`) + `optionsSourceId` prop on `select` / `multi-select` / `radio-group` (inspector text input): a set source id resolves through the callback at render time and wins over the static `options`; static stays the default and the fallback when the callback is absent (lint warns). Loading/failed lists stay empty (one warning per component), malformed entries are filtered, stale responses are discarded. The `useResolvedOptions` composable is exported so consumer elements get the same behavior.
- **`@cocoar/vue-ui` — `CoarTextInput` `type` prop** (`text | email | url | tel | search`, single-line only, additive) — so the page builder's `inputType` actually reaches the DOM (only `password` worked before).

### Fixed

- **`@cocoar/vue-page-builder` — P0 correctness & data-safety.** Dragging a node into a *later sibling* container silently deleted it (`moveNode` now rebases the target path into post-removal coordinates; selection follows). The JSON tab gates Apply through structural normalize + validate with healing instead of trusting pasted JSON. Heading levels are clamped 1–6 (a tampered level crashed rendering). The Required toggle no longer wipes the other validation rules. `allowedElements` now gates the **value model** too — a disallowed (invisible) required field could previously veto every submit. Legacy `column`/`row` schemas migrate on the fly in the renderer, and `normalizePageSchema` / `migrateLegacyTypes` / `KNOWN_ELEMENT_TYPES` are exported from the package root. The renderer's `assetResolver` falls back to `config.assetResolver` (the documented "same config to both" contract).
- **`@cocoar/vue-page-builder` — npm packaging.** New `./styles` subpath export — the stylesheet (all builder chrome **and** the renderer's core layout, e.g. stack flex) was emitted but unreachable from the published package, so every non-workspace consumer got a layout-broken component. The npm page also gains README + LICENSE. Import once: `import '@cocoar/vue-page-builder/styles'`.
- **`@cocoar/vue-page-builder` — library build no longer bundles `@cocoar/vue-localization` and `@js-temporal/polyfill`.** Both are external now; the bundled Temporal copy guaranteed the dual-instance `instanceof` trap at the date-picker boundary, and the bundled localization copy would have split the translation registry in two.

---

## 2.16.0

**Point events, visually honest.** A timed event without `end` (a "point event" — think *call at 14:00*) previously rendered over the +30-minute layout default in the exact same card as a real 30-minute meeting, so *call at 14:00* and *standup 14:00–14:30* were indistinguishable in Day / Week. The card now says what it knows: the start time — and nothing more.

### Added

- **`@cocoar/vue-calendar` — distinguishable rendering for point events in the time grid.** A timed event without `end` keeps its +30-minute slot geometry (layout math untouched — the card geometry of the web and SwiftUI ports stays identical) but renders with a solid start edge in the event color exactly on the start time, a semi-transparent card body (fill and leading bar mixed toward transparent; the **title stays fully opaque** — the body is tap target + label carrier, not a duration statement), and **no resize handles** (there is no `end` to grab; moving still works). The start edge is suppressed when the card is clipped at the top of the visible window, since the top edge then isn't the start time. Month and Agenda render point events unchanged — they draw no duration geometry. Two new scheme-invariant theme tokens: `--coar-calendar-point-edge-height` (default `3px`) and `--coar-calendar-point-body-opacity` (default `0.38`), value-matched to the SwiftUI port (`Cocoar.Calendar.iOS` `0eef2e0`), so web and iOS point events look alike. See the updated [Day](/components/calendar/day-view) / [Week](/components/calendar/week-view) pages.

---

## 2.15.0

**Calendar dark mode, out of the box** — plus a ghost-card layout fix. The calendar grid previously stayed white in a dark app shell because the `--coar-calendar-*` tokens only existed as hardcoded light fallbacks; the package now ships a full dark palette, value-identical to the SwiftUI port (`Cocoar.Calendar.iOS`), so web and iOS render the same dark calendar.

### Added

- **`@cocoar/vue-calendar` — dark-mode values for the grid tokens.** The package stylesheet now defines every `--coar-calendar-*` token for dark mode, activating on the `.dark-mode` class (the Cocoar convention, same as `@cocoar/vue-ui`) **or** the `[data-theme="dark"]` attribute. The values mirror the SwiftUI port's `CalendarTheme.dark` (derived from the vue-ui dark primitives): surfaces `#18181b` / weekend `#212125` / other-month `#131316`, today-tint lifted to ~14% accent (4% is invisible on dark), grid lines `#2c2c30`, borders `#3f3f46`. Two new tokens join the set — `--coar-calendar-agenda-divider` (agenda row separator, near-invisible `#27272a` in dark; falls back to `--coar-calendar-border` in light) and `--coar-calendar-event-default-bg` (fill of events without a `meta.color`: dark accent `#1e3a8a` so the light title text stays readable; falls back to `--coar-color-accent-soft`). The calendar-local text tokens `--coar-text-base` / `--coar-text-subtle` (names not defined by `@cocoar/vue-ui`) get dark values too, so labels flip with the surfaces. Event colors from `meta.color` are intentionally **not** remapped — they render raw in both modes. Light mode is byte-identical to before (light values remain per-usage fallbacks). See the updated [Theming section](/components/calendar/#theming).

### Fixed

- **`@cocoar/vue-calendar` — timed events without `end` no longer render ghost cards on following days.** `layoutDayEvents` applied the default 30-minute duration **after** projecting the start onto the day, so on any day after the event's start day the "before this day" sentinel (−1) yielded a visible 0:00–0:29 interval — a phantom card on **every** later day of the visible window in Week / Day views. The default now only applies when the start actually falls on the laid-out day; end-less events are visible on their start day only. _Heads-up for the SwiftUI port: `TimeGridLayout.swift` replicates the old behaviour fixture-true — regenerate the layout fixtures and port the fix._

---

## 2.14.0

**Diagrams in Markdown.** A ` ```mermaid ` fenced code block now renders as a diagram, via a new pluggable fence-renderer seam, a standalone `@cocoar/vue-mermaid` renderer and the thin `@cocoar/vue-markdown-mermaid` adapter. The Markdown packages carry **zero** dependency on Mermaid — installing and registering the adapter is the opt-in, and a fence with no registered renderer stays a readable code block, so the Markdown stays portable.

### Added

- **`@cocoar/vue-markdown` — fenced-code-block renderer registry.** A new open, language-keyed `FenceRegistry` (`MARKDOWN_FENCE_RENDERERS_KEY`, `resolveFenceRenderer`) lets a consumer render a specific fence language (e.g. `mermaid`) with a rich component instead of a plain code block. `<CoarMarkdown>` gains a `fenceRenderers` prop (provide/inject, like `embeds`); an unregistered language still renders as a normal, syntax-highlighted code block. Additive — existing behaviour is unchanged.
- **`@cocoar/vue-mermaid` — new standalone diagram component.** `<CoarMermaidDiagram :code>` renders a Mermaid diagram from a source string — **markdown-agnostic**, usable anywhere. Lazy-loaded Mermaid (its own chunk), client-only, `securityLevel: 'strict'` (author diagram text is sanitized), waits for `document.fonts.ready` (so labels aren't clipped by pre-font-load measurements), and an error-with-source fallback for invalid diagrams. **Cocoar-themed** — design tokens map onto Mermaid's `themeVariables`, colors normalized to sRGB. **Zoom & pan** (`zoomable`): fixed-height viewport with +/−/⤢ controls, Ctrl/⌘+wheel zoom, drag-to-pan and double-click reset — plain wheel and one-finger touch still scroll the page, so a diagram never traps scrolling. Import styles via `@cocoar/vue-mermaid/styles`.
- **`@cocoar/vue-markdown-mermaid` — new opt-in fence adapter.** Registers `@cocoar/vue-mermaid` as the `mermaid` fence renderer for `@cocoar/vue-markdown`. Ships `mermaidFenceRenderers` (ready-to-spread) and `createMermaidFenceRenderers({ zoomable })`.

### Fixed

- **`@cocoar/vue-map` — the package now exposes its stylesheet.** `@cocoar/vue-map/styles` (`./styles` export) ships the ~5 KB of `.coar-map*` component styles (pins, legend, layout). Previously there was no way to import them from the published package, and they are **not** part of `@cocoar/vue-ui`'s stylesheet — so a consumer using the built package got an unstyled map. Leaflet's own CSS is still loaded lazily by the component.

---

## 2.13.0

Optional-time date pickers: a small **clock toggle beside the field** lets one input be *either* a plain date *or* a date with time — no more separate "add time" checkbox.

### Added

- **`@cocoar/vue-ui` — `<CoarZonedDateTimeOrDatePicker>` + `<CoarPlainDateTimeOrDatePicker>`.** A date picker whose time is **optional**. A clock toggle sits **beside** the field (left or right via `togglePosition`); off enters a `Temporal.PlainDate`, on enters a date with time — a `Temporal.ZonedDateTime` (zoned variant) or `Temporal.PlainDateTime` (plain variant). One `v-model` carries the union value and `v-model:withTime` is the toggle; the two stay in sync (a non-null value's own type *is* the mode), so you read the result straight off its Temporal type. Flipping the clock converts the current value rather than clearing it — adding a time keeps the date (and, zoned, attaches the `timeZone` or the user's zone); removing it drops back to the date. They're thin **compositions** over the existing `CoarPlainDatePicker` / `CoarPlainDateTimePicker` / `CoarZonedDateTimePicker` (all common props pass through: size, disabled, readonly, required, error, clearable, locale, min/max, minuteStep, and the zoned timezone props). The toggle icon switches between a clock and a struck-through clock with a state-aware tooltip + `aria-pressed`; its roundness tracks `--coar-input-radius` so it always matches the adjacent field. See the new **[Date · optional time](/components/date-or-time-picker)** page.
- **`@cocoar/vue-ui` — new built-in `clock-off` icon** (a clock with a diagonal strike), available to the icon system like any other built-in.

---

## 2.12.0

Custom **embeds** for the markdown stack, plus a new standalone **map** package — viewer and **visual editor**. Authors write a `:::key{props}` directive and the shared stack renders a consumer-registered Vue component — read-only in the [`<CoarMarkdown>`](/components/markdown) viewer, **live and editable** in [`<CoarMarkdownEditor>`](/components/markdown-editor) — with a lossless round-trip to plain Markdown. The embedded component has **zero dependency on markdown**: it's a plain component with normal props that a consumer registers from the outside, so the markdown packages never depend on it. To place those inserts, the editor's sidebar `tools` becomes an **ordered, groupable layout**. The new `@cocoar/vue-map` ships both [`<CoarMap>`](/components/map/) (display) and [`<CoarMapEditor>`](/components/map/editor) (author points/routes via `v-model:data`), each markdown-agnostic by design. See the new **[Custom Embeds](/components/markdown-embeds)** page. Everything is opt-in behind the `cocoar` flavor.

### Added

- **`@cocoar/vue-map` — new package: standalone interactive map (`<CoarMap>`).** A data-driven Leaflet map for Vue 3 that's **completely independent of markdown** (and of any embedding layer) — it takes resolved `MapData` + `MapConfig` and knows nothing about ids, fetching, or `:::` directives. Renders category-colored stop pins, named shape-point dots and a route polyline; hover tooltips, click popups, an opt-in legend (`show-legend`, then shown when ≥ 2 categories are present), caption, and `viewport`/auto-fit. An interactive bridge lets a consumer-built list drive the map and stay in sync: `v-model:selected`, a `point-click` event, and exposed `focusPoint(index)` / `highlightPoint(index)` methods (`fallbackEntries(...)` rows carry the matching point `index`). Leaflet (JS + CSS) is imported **lazily** on mount, with a crawlable no-JS `<ol>` fallback until it hydrates. Untrusted point text is escaped (popups built from DOM text nodes). A consumer can register it as a markdown embed (`{ map: { viewer: MapEmbedWrapper } }`) where the wrapper resolves its id → `MapData` — but that wiring lives entirely in the consumer. _(Google basemaps are out of scope for now; a Google basemap is skipped in favour of the default.)_
- **`@cocoar/vue-map` — visual map editor (`<CoarMapEditor>`).** The write counterpart of `<CoarMap>`, controlled via `v-model:data` (it never mutates the prop — every edit emits a fresh `MapData`). Click an empty spot to add a point (type-aware: `route`/`multi` append a stop, `single` moves the one point), drag any marker to move it with the route polyline following **live**, click a marker to edit its `label`/`note`/`category`/`icon` and toggle `stop`↔`shape` in a popup (anchored over the marker, flips below near the top edge, closable via **×** / `Esc` / click-away, fully overridable via the **`#point-form`** slot), reorder route waypoints, delete, and **click the route line to insert a waypoint exactly there** (snapped to the nearest segment). Adding a point does **not** auto-open the popup, and clicking empty space while a point is selected **dismisses** it rather than adding — so rapid placement stays fluid and "click away to close" works as expected. `readonly` freezes editing. A consumer toolbar can drive the same edits through exposed `addPoint` / `updatePoint` / `removePoint` / `reorder` / `captureViewport` (+ `focusPoint` / `highlightPoint`) methods. The immutable, Leaflet-free editing ops (`addPointForType`, `movePoint`, `updatePoint`, `removePoint`, `reorderPoint`, `insertOnSegment`, `setViewport`, `nearestSegment`, `normalizeLatLng`) are exported too. Built on the same lazy-Leaflet, markdown-agnostic, XSS-safe foundation as `<CoarMap>`; tree-shakeable so viewer-only consumers don't pull in the editing weight. The editor's built-in property popup is rendered with the **Cocoar UI** form controls (`CoarTextInput` / `CoarSelect` / `CoarButton`); `@cocoar/vue-ui` is an **optional `peerDependency`** of `@cocoar/vue-map`, so the editor opts into the design system while viewer-only `<CoarMap>` consumers aren't required to install it. See the new **[Map Editor](/components/map/editor)** page.
- **`@cocoar/vue-map` — ready-made point list (`<CoarMapPointList>`).** A drop-anywhere companion list so apps don't rebuild it. Controlled (`v-model:data` / `v-model:selected`) and decoupled from the map — it emits `focus` / `highlight` events you wire to the map's `focusPoint` / `highlightPoint`. Opt-in `reorderable` adds **drag-and-drop sorting** (a per-row handle, built on Cocoar UI's `useDragDrop`) and `removable` adds a per-row delete; both keep the selection on the same logical point through the change. Lists every point (including unnamed `shape` vertices), with a `#row` slot to override row content. Works next to `<CoarMapEditor>` (full editing) or a read-only `<CoarMap>` (pure navigator). New exports `selectionAfterReorder` / `selectionAfterRemove` keep custom lists consistent.
- **`@cocoar/vue-markdown-core` — `:::key{props}` custom-embed directive.** A standalone directive line parses to a generic `embed` node (`{ key, props }`) and serializes back losslessly (`parse → serialize → parse` is a fixed point; canonical forms like `:::map{id=<guid>}` are byte-stable). Exposes `parseEmbedDirective`, `serializeEmbedDirective` and `toEmbedProps`. The parser is registry-agnostic — any key round-trips, registered or not. Vue-free, like the rest of the core.
- **`@cocoar/vue-markdown` — embed registry + viewer rendering.** New `embeds` prop on `<CoarMarkdown>` (and an app-wide `MARKDOWN_EMBEDS_KEY` provide) maps a directive key to a component via `EmbedRegistry` / `EmbedDefinition` (`{ viewer, editor?, insert? }`). A registered key renders through your component (props passed straight through); an unregistered key degrades to a labelled placeholder instead of vanishing. XSS-safe by construction — attribute values are bound as Vue props/text, never `innerHTML`.
- **`@cocoar/vue-markdown-editor` — live, editable embeds.** Pass the same `embeds` registry and the editor folds `:::key{props}` into an atomic block whose NodeView mounts the registered component **live**. When the entry supplies an `editor` component it's mounted editable via a single typed `controller` prop (`EmbedEditorProps` / `EmbedEditorController` — `controller.patch(...)` writes attribute changes back to the Markdown); otherwise the read-only `viewer` is shown. Gated behind a new `embeds` flavor capability (on in `cocoar`, the default).
- **`@cocoar/vue-markdown-editor` — groupable, ordered toolbar layout.** `tools` now accepts `CoarMarkdownEditorToolEntry[]`: built-in tool ids, custom-embed inserts addressed as `embed:<key>` (icon/label from the registry's `insert`), `{ flyout }` submenu groups (mixing built-in and embed items), and `'divider'`s. Array order is the toolbar order, so embeds and built-ins can be placed and grouped anywhere.

### Changed

- **`@cocoar/vue-markdown-editor` — `tools` is now an ordered layout (breaking).** A `tools` array previously acted as an order-insensitive whitelist that filtered a fixed sequence; it is now an ordered layout (array order = toolbar order). Flat built-in arrays remain valid and the default (omit `tools`) is unchanged, so apps passing tools in canonical order are unaffected — list tools in the order you want otherwise. `tools` is typed `CoarMarkdownEditorToolEntry[]` (a superset of `CoarMarkdownEditorTool[]`).
- **`@cocoar/vue-markdown-editor` — the default `cocoar` flavor now recognises `:::key{props}` embeds.** A standalone `:::word{…}` line folds to an embed node (rendered as a placeholder when its key isn't registered) instead of staying literal text. Use a stricter `flavor` (`'commonmark'` / `'gfm'`, or a capability object without `embeds`) to keep such lines as plain text.

---

## 2.11.0

A library-wide consistency pass for the input & form-control family. The whole field family — text / number / password / select / multi-select / tag-select and the three date-time pickers — now sits on one internal shell (`CoarInputFrame`), so box, border, radius, surface, states and field padding all come from a single place. The non-typing form controls (checkbox, switch, radio, listbox, dual-listbox, segmented control) are aligned to the same input + semantic-error tokens, and the Theme Editor is rebuilt around the new token model.

It is **mostly visual-neutral** — padding and sizing values were preserved. The breaking changes are narrow and concentrated: the date/time pickers move their label & validation onto `CoarFormField` (a consistency fix), `clearable` now defaults to `false`, and a few design tokens are renamed/removed. See the **[Migrating to 2.11 guide](/guide/migration)** — most apps need a one-line change or nothing at all.

Underpinning it is a spacing-scale cleanup and a dedicated field-padding token. The spacing scale had drifted: two dead steps, a duplicate, and an off-scale value (`12px`) faked with `calc(--spacing-s + --spacing-xs)` — which implicitly coupled input padding to two scale steps, so tuning `--coar-spacing-s` silently shifted every text field. A usage census (workhorses `s`/`xs` ≈ 70% of all references; `xxl`/`xxxl` unused; `2xs` a duplicate of `xxs`) drove the change.

### Removed

- **`@cocoar/vue-ui` — dead / duplicate spacing tokens (breaking).** `--coar-spacing-2xs` (a duplicate of `--coar-spacing-xxs`, both `2px`), `--coar-spacing-xxl` (`48px`) and `--coar-spacing-xxxl` (`64px`) are removed — the latter two had zero usages across the library. The scale is now `3xs 1 · xxs 2 · xs 4 · s 8 · m 16 · l 24 · xl 32`. Consumers referencing the removed tokens should switch `2xs → xxs` and pick a remaining step for `xxl`/`xxxl`.
- **`@cocoar/vue-ui` — `--coar-input-padding-x` (breaking, renamed).** Replaced by `--coar-field-padding-x` (see below).
- **`@cocoar/vue-ui` — date-picker `label` / `hint` props + own label/message rendering (breaking).** `CoarPlainDatePicker`, `CoarPlainDateTimePicker` and `CoarZonedDateTimePicker` no longer render their own label, required-asterisk or below-field error/hint message. Wrap them in [`CoarFormField`](/components/form-field) for a label, the required `*`, validation messages and the inline status icon — exactly like every other input. The pickers now `inject` the field contract (id / error / `aria-describedby`), which also **fixes** a latent bug where a `CoarFormField`-wrapped picker didn't pick up the error border. See the `error` prop change below.

### Added

- **`@cocoar/vue-ui` — `--coar-field-padding-x` (`12px`) + `--coar-field-padding-x-tight` (`calc(--coar-field-padding-x / 2)`).** A dedicated component token for form-field horizontal padding, intentionally **off** the spacing scale (`12px` sits in the scale's `8→16` gap) and **decoupled** from it — tuning `--coar-spacing-*` no longer moves field padding. Single source of truth for text / password / number / select fields (the consumer multiplies by `--coar-component-density`). The Theme Editor's "Inputs → Field padding" control (with its opt-in override switch) now drives this token.
- **`@cocoar/vue-ui` — `xs` size for `CoarSwitch` and `CoarRadioGroup`.** Both gain an extra-small `size="xs"` to match `CoarCheckbox` (which already had one): a `24×14` track with a `10px` thumb for the switch, a `14px` control with a `5px` dot for the radio, both labelled at `--coar-component-xs-font-size`. Adds `--coar-switch-xs-track-width` / `-track-height` / `-thumb-size` tokens. Additive — `s` / `m` / `l` are unchanged.

### Changed

- **`@cocoar/vue-ui` — `CoarTextInput` / `CoarPasswordInput` field padding.** Now read `--coar-field-padding-x` (value unchanged at `12px`). `CoarPasswordInput` no longer re-derives the same value inline with `calc(--spacing-s + --spacing-xs)` (which had drifted from the shared token) and its size-variant toggle paddings use `--coar-field-padding-x` / `-tight` instead of off-scale `calc()` sums.
- **`@cocoar/vue-ui` — field horizontal padding now scales per control size.** The whole field family (text / password / number / select / multi-select / tag-select) derives its horizontal padding as `--coar-field-padding-x × per-size-scale × density`, so xs/s/m/l no longer share a single flat value (e.g. at base `12px`: xs `8.1` · s `9.6` · m `12` · l `14.4`). You still tune **one** knob (`--coar-field-padding-x`, the `m` base) and every size scales proportionally — e.g. bump it for pill-shaped inputs and the smaller sizes follow. Adds `--coar-component-{xs,s,m,l}-scale` (unitless, height-derived: `0.675 / 0.8 / 1 / 1.2`) as a reusable per-size multiplier. Also unifies select/number field padding onto `--coar-field-padding-x` (they previously used a flat `--coar-spacing-s`, so the Theme Editor's Field-padding control now affects them too).
- **`@cocoar/vue-ui` — Theme Editor.** Dropped the dead `XXL` spacing slider; renamed the "Horizontal padding" control to "Field padding" (writes `--coar-field-padding-x`).
- **`@cocoar/vue-ui` — date-picker `error` prop is now `boolean` (breaking).** `CoarPlainDatePicker` / `CoarPlainDateTimePicker` / `CoarZonedDateTimePicker` `error` changed from `string` (an error message rendered below the field) to `boolean` (flips the red border + `aria-invalid`), matching `CoarTextInput` & the rest of the field family. The message itself moves to the wrapping `CoarFormField`. To migrate: `<CoarPlainDatePicker error="Required" />` → `<CoarFormField label="…" error="Required"><CoarPlainDatePicker /></CoarFormField>`. New `id` prop (explicit input id; else taken from `CoarFormField`, else auto) for parity with the other inputs.
- **`@cocoar/vue-ui` — list-selection controls aligned to the input token contract.** `CoarListbox` and `CoarDualListbox` now render their list panels with the input border + radius tokens (`--coar-border-input`, `--coar-input-radius`, capped at the field pill-end via `min(…, --coar-component-m-height / 2)` so a tall list doesn't bow into a stadium at full radius — the same cap the select dropdown panels use) and gain a distinct disabled surface (`--coar-surface-input-disabled`), matching the field family. `CoarDualListbox`'s transfer buttons are rebuilt on `CoarButton` (`secondary`, icon-only) instead of hand-rolled buttons, so they inherit the shared focus ring, sizing and disabled state (dropping an off-spec `opacity: 0.35` and hardcoded `32×28` dimensions). Visual refinement only — no API change.
- **`@cocoar/vue-ui` — toggle controls aligned to the input + semantic-error token contract.** `CoarCheckbox`, `CoarSwitch` and `CoarRadioGroup` now key their box / track / control chrome off the shared input tokens and the correct semantic-error layers: the checkbox box radius uses `--coar-input-radius` (was `--coar-radius-xs`); checkbox + switch error states use `--coar-border-semantic-error-bold` / `--coar-background-semantic-error-bold` instead of the text-layer token (which fixes a too-dark error tint in dark mode); the radio control adopts `--coar-border-input` / `--coar-surface-input` / `--coar-border-input-hover` (was the `neutral-primary` tokens plus an accent hover) and `--coar-component-{size}-font-size` labels, and its disabled opacity is unified to `0.6` to match the rest of the toggle family. Action controls (`CoarButton` / `CoarSegmentedControl`) intentionally keep their `0.5` disabled look. Visual refinement only — no API change.
- **`@cocoar/vue-ui` — `clearable` now defaults to `false` (breaking).** `CoarTextInput`, `CoarPasswordInput`, `CoarNumberInput`, `CoarPlainDatePicker`, `CoarPlainDateTimePicker` and `CoarZonedDateTimePicker` previously defaulted `clearable` to `true`; it's now `false`, in line with the library rule that every boolean prop defaults `false` (and matching `CoarSelect` / `CoarMultiSelect`, which were already `false`). Add `clearable` where you want the inline clear ✕. Also fixed: the right-aligned controls (number + the 3 date-pickers) used to render a hidden clear button unconditionally, reserving an empty slot on the **left**; the clear affix is now omitted entirely when not clearable, so a non-clearable control has no reserved gap. `@cocoar/vue-data-grid` is unaffected — its cell editors pass `clearable` explicitly.

---

## 2.10.0

A batch of improvements from the Tellify (CityDiary) build. For the media-library: inline node **creation** and an app-internal **drop target** for `CoarTree`, plus a programmatic **move**, optimistic **create**, and a **browse-only** mode for `@cocoar/vue-file-explorer-core` — so consumers can drop the workarounds they had built around the gaps. For the blog editor: `@cocoar/vue-markdown-editor` gains real **image** support (URL / paste / drag-drop upload / custom picker), full **table** editing (create, align, delete, and Notion-style hover handles with **drag-to-reorder**), and a **`flavor`** portability switch. Everything is additive and opt-in.

### Added

- **`@cocoar/vue-ui` — `CoarTree` inline node creation.** Opt in with `creatable` (mirrors `renamable`) and call `api.startCreate(parentId, { kind?, initialName?, position? })` to insert a transient, focused **draft row** at its target position — `parentId: null` for the root, otherwise the parent auto-expands and the draft renders nested under it. Commit (Enter / blur) fires `@create` with `{ parentId, name, kind }`; Escape or an empty name fires `@create-cancel`. Same input + 200 ms blur-grace timer as inline rename, so it survives the context-menu-close focus race. The draft lives outside the visible-row model (selection / keyboard / DnD never see it) and works virtualized and at the empty-tree root. Optional `#draft` slot overrides the default folder/file icon. For async validation (e.g. a duplicate-name 409), a builder `onCreate` may return a `Promise` — the tree keeps the draft open + focused (name intact) until it settles, dropping it on success and reopening on reject; prop/event-form consumers get the same retry by re-calling `startCreate(parentId, { initialName })`. Everything works in prop-mode too (`startCreate` is on the component template ref). Removes the consumer workaround of a floating `<input>` rendered outside the tree.
- **`@cocoar/vue-ui` — `CoarTree` app-internal drop target (`acceptsData` / `@data-drop`).** Accept a non-OS, in-app drag — a card dragged out of a grid, a palette chip — by listing the MIME type(s) it carries in `acceptsData` (prop or builder `.acceptsData([...])`). A drop fires `@data-drop` / `onDataDrop` with `{ node: T | null, position, dataTransfer }` (`node: null` = the background), reusing the existing drop highlight, auto-expand-on-hover and `before`/`inside`/`after` position logic. Internal node drags (`@node-move`) are never re-delivered as data drops. Lets consumers drop hand-rolled `dragover`/`drop` listeners on the row slot for grid-card → folder moves.
- **`@cocoar/vue-file-explorer-core` — programmatic `move(id, newParentId, position?)`.** `useFileExplorer` now exposes a plain move (same optimistic-update + rollback as a tree drag) for sources that aren't a `CoarTreeNodeMoveEvent` — a "move to folder" `<select>`, a grid card dropped on a folder row, an undo command. `newParentId: null` moves to the root; `position` is honored only in `'manual'` sort mode. `moveNode` (the tree-drag translator) now delegates to it.
- **`@cocoar/vue-file-explorer-core` — optimistic `addFolder`.** A temp node is inserted immediately and reconciled to the backend's real id on resolve (rolled back on error), so an inline-create flow has no round-trip lag. Pairs with `CoarTree`'s `startCreate` for a flicker-free draft → real-node handoff. Stores that surface their own reactive `_assets` skip the temp node (their own mutation is the source).
- **`@cocoar/vue-file-explorer-core` — browse-only stores.** `loadContent`, `save` and `createFile` are now **optional** on `AssetStore<T>` / `AssetStoreConfig<T>`. A consumer that only browses + edits metadata (e.g. an image library) can omit them: the composable skips the post-upload `save`, treats `openFile` as a no-op (no editor tabs, no single-click-preview), and `saveTab` reports failure cleanly — instead of forcing dead stub methods that throw a spurious "saving not supported" error toast. `createAssetStore` attaches optional methods only when supplied, so `'save' in store`-style capability probes stay reliable.
- **`@cocoar/vue-markdown-editor` — image support (insert by URL + paste / drag-drop upload + custom picker).** A new **Insert Image** sidebar button opens a dialog for `url` / `alt` / `title` and inserts at the cursor. A new **`uploadImage`** prop — `(file: File) => Promise<{ url: string; alt?: string }>` — enables **pasting** (e.g. a screenshot) and **dragging / dropping** image files: a spinner placeholder is shown at the insertion point until the upload resolves, then it's replaced by the image. A new **`pickImage`** prop — `(ctx: ImagePickContext) => void` — **overrides** the Insert Image button so consumers can plug in their own asset library / gallery: it's called with an `insertImage(...)` bound to the cursor plus the `selectedText`, can stay open and insert several, and keeps all ProseMirror handling inside the editor. `pickImage` (button) and `uploadImage` (paste / drop) are orthogonal and compose. Without either, image files fall through to the browser's default handling. Everything round-trips as standard Markdown `![alt](url "title")`, so content from another CMS (a WordPress export) renders unchanged. Resize / alignment / captions are intentionally out of scope (a future image-block slice).
- **`@cocoar/vue-markdown-editor` — `flavor` prop (portability contract).** Picks which features the editor offers and **hard-enforces** them — it only registers the matching Milkdown plugins, so a non-flavor construct can't be typed or pasted (it degrades to plain text) and its toolbar buttons are hidden. `'commonmark'` (portable floor) / `'gfm'` (+ tables, task lists, strikethrough) / `'cocoar'` (default; + inline text color, which is non-portable raw HTML), or a partial capability object `{ gfm?, textColor? }` (opt-in; unspecified = off). For consumers whose Markdown is also rendered somewhere stricter than the web (e.g. a native SwiftUI Markdown view), this guarantees authored content stays within the target renderer's capabilities. Orthogonal to and composes with the soft `tools` toolbar whitelist. Defaults to `'cocoar'`, so existing editors are unchanged.
- **`@cocoar/vue-markdown-editor` — table create / align / delete (GFM).** The **Insert Table** button now opens a **grid size picker** (hover/tap `cols × rows`) instead of a fixed 3×3, and typing **`|3x4|`**+space creates a table anywhere (a GFM input rule — works in `floating` mode without a toolbar). The in-table toolbar gains **column alignment** (left / center / right, applied to the whole column so it round-trips as GFM `:--` / `:-:` / `--:`, with the active alignment highlighted) and **Delete table** (alongside the existing row/column insert + delete-cell). The row/column insert buttons get **purpose-built icons** (a table with the target row/column highlighted + a plus) replacing the confusing, semantically-swapped `between-*` lucide icons (vertical-bar icons had been used for *row* ops and vice-versa). Adds three alignment + four table-op icons to `@cocoar/vue-ui`.
- **`@cocoar/vue-markdown-editor` — table hover edge-handles.** Notion/Word-style grips appear along all four edges of a table on hover (a segment per column on the top & bottom edges, per row on the left & right). Hovering a grip highlights the whole column/row; **clicking** it opens a menu (the library's `CoarContextMenu`) to insert before/after or delete that column/row, and **dragging** it reorders the column/row (with a live drop indicator). Geometry-driven (it measures cell rectangles rather than reacting to ProseMirror's `CellSelection`, which doesn't fire `selectionchange`), so it works on any table without a cursor inside it; the floating toolbar is suppressed while the handle menu is open. Only active in flavors with GFM tables.
- **`@cocoar/vue-page-builder` — flex layout model** *(retroactive note: this shipped in 2.10.0 but was missing from the changelog)*. `NodeStyle` gained the guided flex model — container `justify` / `align`, per-node `alignSelf`, `size` (`fit` · `fill` · `fixed`, direction-aware `fill`) with `width`, and `minHeight` — plus the Style-panel controls for all of them and a shared `styleMapping` so the editor canvas matches the rendered preview 1:1. Schemas using these fields are valid from 2.10.0 onward.

### Fixed

- **`@cocoar/vue-ui` — `CoarToastContainer` no longer crashes without `:service`.** The `service` prop now defaults to the `getToastService()` singleton that `CoarOverlayPlugin` registers (the same one `useToast()` wraps), so `<CoarToastContainer />` is zero-config. Previously, rendering it without `:service` threw `Cannot read properties of undefined (reading 'position')` on every render — which stalled the reactive flush and silently broke unrelated reactive UI on the page (and meant toasts were never shown in apps that followed the service-less example). An explicit `:service` still wins; a missing plugin now throws a clear "install `CoarOverlayPlugin`" error instead of the cryptic undefined read.
- **`@cocoar/vue-file-explorer-core` — uploads are stamped with the target `parentId`.** After `addFiles(parentId, …)` the merged node now carries the target `parentId` even when the store's returned asset omits it, so a parent-filtered consumer (e.g. a folder-scoped thumbnail grid) shows the new item immediately without a full `refresh()`.
- **`@cocoar/vue-ui` — `CoarTree` create/data-drop payload types are exported from the package root.** `CoarTreeCreateEvent`, `CoarTreeCreateKind`, `CoarTreeDataDropEvent`, `CoarTreeDraftSlotProps` and `CoarTreeStartCreateOptions` are now re-exported from `@cocoar/vue-ui` alongside the other `CoarTree*` event types (they were only reachable via the deep `./components/tree` path). Consumers can drop the locally-redeclared payload types they had as a workaround.
- **`@cocoar/vue-ui` — `CoarTree` inline-create input is localizable.** The draft row's `aria-label` was a hard-coded English `'New folder name'` / `'New file name'`; it now reads the new `draftFolderName` / `draftFileName` `labels` keys (English defaults), so a non-English consumer (e.g. running on `de`) can localize it via `labels` / builder `.labels({ … })` like every other built-in string.

---

## 2.9.0

A fully redesigned **Theme Editor** with a three-layer semantic token system.

### Added

- **`@cocoar/vue-ui` — Theme Editor redesign + semantic token layer.** `CoarThemeEditor` (exported at `@cocoar/vue-ui/theme-editor`) is overhauled to match the library's design language — SVG icons throughout, lighter borders, no rotate animation on the FAB. The editor now exposes three token layers: **Brand** (base hue + per-step L/C palette editor), **Semantic** (new tab — maps each semantic role such as `--coar-background-semantic-error-bold` to any palette + step via a live-preview select row), and **Corners / Type / Spacing / Depth / Motion** tabs unchanged. The **Danger button** is wired directly to `--coar-background-semantic-error-bold` — it no longer has its own formula controls; reassigning the semantic token in the Semantic tab changes the button (and every other error surface) simultaneously.
- **`@cocoar/vue-ui` — Class-based theme system.** Live overrides are scoped to a `.coar-theme-editor` class (injected via `<style>` tag into `<head>`) instead of inline styles on `:root`. The **Download** button exports a named `.coar-theme--{name}` block (name entered in the editor footer); the class is meant to be applied to `<html>` or any ancestor element. Multiple named themes can coexist and be switched by swapping the class. New **`.coar-theme-none`** reset class (in `@cocoar/vue-ui/styles`) re-declares all themeable tokens to light-mode defaults — apply to any element to escape an ancestor theme class, exactly like `.light-mode` / `.dark-mode`.

### Changed

- **`@cocoar/vue-ui` — `new-components.css` danger button tokens.** `--coar-button-danger-bg` / `-hover` / `-active` now reference the semantic error tokens (`--coar-background-semantic-error-bold` / `-hover` / `-active`) instead of the old oklch formula variables (`--coar-button-danger-l` / `-c`). The removed formula vars were internal-only; visual output is unchanged at default settings.

---

## 2.8.0

`@cocoar/vue-markdown-editor` grows from a plain WYSIWYG box into a proper authoring surface: a Markdown **placeholder**, first-class YAML **frontmatter** (parsed, rendered, and round-tripped across the viewer / core / editor), and a **Source view** toggle for editing the raw Markdown — frontmatter included. Plus a new **`CoarWizard`** (Preview) for multi-step flows in modals. Everything is additive and opt-in; existing editors are unchanged.

### Added

- **`@cocoar/vue-markdown-editor` — `placeholder` prop.** A Markdown hint shown while the editor is empty, rendered as a muted, click-through overlay of the shared `<CoarMarkdown>` viewer (so `**bold**`, lists, headings look like real content) and **never written to `modelValue`** — an untouched editor still emits an empty string. Lets consumers drop the antipattern of pre-filling the value just to show a placeholder (which then got persisted as content).
- **`@cocoar/vue-markdown-editor` — `sourceToggle` prop (raw-Markdown Source view).** Opt-in (default `false`) Rendered ↔ Source switch. In Source mode the whole document — body **and** the frontmatter YAML — is editable as raw Markdown in a `<textarea>`; switching back re-parses and re-renders. The toggle lives in the toolbar (the first sidebar item with a `fixed`/`both` toolbar; a corner button with the default `floating` toolbar). The rich editor stays mounted (hidden) so switching is cheap, and `readonly` / `disabled` + the `CoarFormField` wiring carry over to the textarea.
- **`@cocoar/vue-markdown` + `@cocoar/vue-markdown-core` + `@cocoar/vue-markdown-editor` — YAML frontmatter.** A leading `---…---` block is parsed (via `remark-frontmatter`) into a single `frontmatter` node instead of being mis-read as a thematic break + setext heading (which collapsed the whole YAML onto one line), and it round-trips through `serialize()`. It renders as muted (gray-400), italic `key: value` lines in both the viewer (new `DefaultFrontmatter` renderer) and the editor — there as an inert, read-only atom node (not selectable or draggable; edit the values via the Source view). Adds a shared `parseFrontmatter` helper and a `frontmatter` slot in the renderer registry.
- **`@cocoar/vue-ui` — `CoarWizard` (Preview).** A multi-step flow shell built to live **inside a modal** (it renders no modal of its own). Only the active step is mounted and the body **animates its height** between steps — so a wrapping modal grows / shrinks to fit each page. The step indicator **scrolls and auto-centers** the active step, and `indicatorPosition` places it on any of the four edges (`top`/`bottom` scroll horizontally, `left`/`right` vertically). Content goes in a slot per step `id`; built-in Back / Next / Finish footer (overridable via `#footer`), per-step `canAdvance` gate, optional `freeNavigation`, and `v-model:step`.

---

## 2.7.0

A major expansion of `@cocoar/vue-ui`'s `CoarTree` (shipped in 2.4.0) into a tree that holds up as a core, data-management component: multi-select + checkbox tri-state selection, scaling to tens of thousands of nodes, hardened lazy loading, a full imperative API, accessible drag-and-drop, disabled nodes, search/filter, density/theming and i18n. Purely additive — `selectionMode` defaults to `single`, every new prop defaults to the previous behavior, and `api.focusNode` keeps its 2.4.0 select+focus behavior (the new `api.selectNode` is just a clearer alias).

### Added

- **`@cocoar/vue-ui` — `CoarTree` multi-select + checkbox tri-state selection.** New `selectionMode: 'single' (default) | 'multiple' | 'checkbox'`. `multiple` binds `v-model:selectedIds` (a `Set`) with Ctrl/Cmd-click toggle, Shift-click range, `Ctrl/Cmd+A`, and Shift+Arrow extend. `checkbox` adds a per-row tri-state checkbox bound to an **independent** `v-model:checkedIds` (AntD-style — separate from the highlight selection) with parent⇄child cascade + indeterminate, **lazy inheritance** (a checked but unloaded folder propagates the check to its children once they load), and `checkStrictly` for independent parent/child checks. Sets `aria-multiselectable` on the tree and `aria-checked` (`true`/`false`/`mixed`) on rows; new `isChecked` / `isIndeterminate` slot props. Single-select stays the default, so existing `v-model:selected` consumers are unaffected.
- **`@cocoar/vue-ui` — `CoarTree` scales to tens of thousands of nodes.** Drag cycle-guard is now O(depth) off a live `parentId` walk (was O(n)), an `id → index` map makes keyboard nav / type-ahead / rename O(1), and per-row reactivity (injected row-state) means a selection / focus / drag-over change re-renders only the rows whose flag actually flips. A from-scratch fixed-size virtualizer (`virtualize` prop / `.virtualize()`) with an O(1) constant-size fast-path keeps ~30 rows mounted at 50k+ nodes. Browser-verified at 51,200 nodes.
- **`@cocoar/vue-ui` — `CoarTree` lazy / async children.** `loadChildren(node, { signal })` fetches a folder's children on first expand — built-in chevron spinner while pending and a red retry affordance on failure, `isLoading` / `hasError` slot props, `@load-error`, and `api.reloadChildren(id)`. The `AbortSignal` fires when the folder collapses or leaves the tree (a settled-after-abort load is suppressed — no phantom error), and `maxConcurrentLoads` bounds simultaneous loads for rate-limited backends. `hideLoadingSpinner` suppresses the built-in spinner + retry so you can render your own from the slot props.
- **`@cocoar/vue-ui` — `CoarTree` full imperative API (generic `TreeApi<T>`).** `useTree().api` gains `selectNode(id)` (select + focus — the clear name for the selection era), `expandAll()` / `collapseAll()` / `expandTo(id)` (drives lazy reveal along the path) / `revealNode(id)` (scroll into view without stealing focus) / `getNode(id)` / `moveNode(sourceId, targetId, position)` (the a11y/programmatic equivalent of a drop — runs the same cycle + `canDrop` guards), plus readonly `selectedIds` / `checkedIds` refs. `focusNode` keeps its 2.4.0 select+focus behavior as a back-compat alias of `selectNode`. `TreeApi` is now generic but **defaults its type to `unknown`**, so a bare `TreeApi` reference stays valid. The same surface is mirrored on the component's template ref.
- **`@cocoar/vue-ui` — `CoarTree` accessible drag-and-drop.** Keyboard cut/paste move — `Ctrl/Cmd+X` grabs the focused row, `Ctrl/Cmd+V` drops it relative to the focused target, `Escape` cancels — closing the keyboard-operability gap when `draggable` is on. A polite `aria-live` region announces pick-up / moved / cancelled for both pointer and keyboard moves. `getDragImage(node)` supplies a custom drag ghost (element or HTML string).
- **`@cocoar/vue-ui` — `CoarTree` disabled nodes + search / filter.** `isDisabled(node)` marks rows non-interactive (no select / activate / check / keyboard-focus, `aria-disabled`, dimmed, skipped by type-ahead, `Ctrl+A` and drag; `isDisabled` slot prop). `matchedIds` drives `isMatch` / `isMatchAncestor` slot props and auto-expands the ancestors of every match; the opt-in `filter` prop then hides non-matches while keeping the ancestor path ("virtual parents") visible, with `filterMode: 'strict' (default) | 'lenient'` (mirrors PrimeVue) choosing whether a matched folder reveals its whole subtree.
- **`@cocoar/vue-ui` — `CoarTree` density, theming + i18n.** `density: 'xs' | 's' | 'm' (default) | 'l'` scales the whole row — font, padding, indent **and** the built-in chevron + checkbox + their glyphs — via CSS variables (`--coar-tree-indent`, `--coar-tree-control-size`, `--coar-tree-icon-size`, `--coar-tree-row-pad-y` …) you can also override directly (and `--coar-tree-icon-size` cascades into the slot so your own icons can match). `ariaLabel` / `ariaLabelledby` name the tree; `labels` (`CoarTreeLabels` + `DEFAULT_TREE_LABELS`) makes the chevron / spinner / retry / drag-and-load announcements overridable for localization. APG keyboard polish: `*` expands siblings, PageUp/PageDown page by viewport, ArrowLeft/Right invert under RTL; focus re-seeds to a neighbor (not the top) when the focused row is deleted; an empty tree stays Tab-reachable. New `@select` event (`{ node, ids, via }`), `activateOnClick`, and builder setters for everything (`renamable()` / `onRename()` / `filter()` / `filterMode()` / `density()` / `labels()` …) so the fluent builder drives every feature.

### Fixed

- **`@cocoar/vue-ui` — `CoarTree` inline rename is now reachable via the recommended builder path.** `api.startRename(id)` is now an actual method on `TreeApi` (its 2.4.0 JSDoc pointed at it, but it lived only on the template ref), and the builder gains `renamable()` / `onRename()` / `onRenameCancel()` setters — so the documented builder idiom works without a template ref. (The whole rename feature was also previously undocumented and untested; both are now addressed.)

---

## 2.6.0

### Added

- **`@cocoar/vue-ui` — `CoarSplitPane` + `CoarPanelLayout` (resizable panel layout).** A VS-Code-style workbench primitive: `CoarPanelLayout` arranges `top` / `left` / content / `right` / `bottom` / `status` regions (an empty slot renders no region), each sidebar/panel resizable by drag or arrow keys and collapsible via `*-open` props; sizes are two-way (`v-model:left-width` …) for easy persistence. `CoarSplitPane` is the nestable two-pane primitive underneath (`direction`, `side`, `v-model:size`, `min`/`max`) — nest it to stack views inside a region (e.g. a tree above a details panel). Dividers are focusable `role="separator"` window-splitters (Arrow / Home / End). The content region has a guaranteed minimum (`contentMinWidth` / `contentMinHeight`, default 120 × 80) so sidebars/panels can never be dragged — or squeezed by a shrinking window — to crush it to 0. Drag-to-rearrange / docking is intentionally out of scope.
- **`@cocoar/vue-file-explorer-core` — `selectedAsset` + `describeAsset()`.** `useFileExplorer` now exposes the selected node (resolved reactively from `selectedId`) and its framework-known property rows — Name / Type / Language (script files) / Extension / Path — for details panels. The pure helper `buildAssetProperties` (+ `AssetProperty` / `DescribeAssetContext` types) is exported too. Append your own `payload`-derived rows; render the panel wherever your layout puts it (e.g. a nested `CoarSplitPane`).

### Changed

- **Renamed `@cocoar/vue-file-explorer` → `@cocoar/vue-file-explorer-core`** (folder `packages/file-explorer-core/`). It is the headless data + coordination engine (composable + `AssetStore<T>` contract, no layout); the bare `@cocoar/vue-file-explorer` name is now reserved for a future batteries-included, layouted component built on `-core` + the panel-layout primitives. Pre-release (`0.0.1`, Preview) — no published consumers are affected.

### Fixed

- **`@cocoar/vue-ui` — `vue-router` peer range widened to `^4.5.0 || ^5.0.0`** (was `^4.0.0`). Consumers on `vue-router@5` got an "unmet peer dependency" warning on install even though the integration is runtime-detected and optional. Aligns the range with `@cocoar/vue-fragment-parser`, which already accepted v5. No runtime change — `vue-router` stays an optional peer.

---

## 2.5.2

Patch release that fixes an outside-click dismissal bug in the `@cocoar/vue-ui` overlay-service: an anchored panel (date picker, select, popover, menu) opened from inside a modal/dialog would not close when the user clicked elsewhere in the dialog body — it only closed when its own trigger was clicked again. Outside a modal the same panels dismissed correctly, so the bug only surfaced for overlays stacked above another containing overlay. Root cause: `onDocumentPointerDown` treated "click landed inside overlay X" as "collapse X's tree-children and stop", which silently ignored unrelated dismissable overlays stacked above X. A picker opened via the overlay-service is teleported to `<body>` and stacked above the dialog but is not a tree-child of it, so it was skipped. Reported against the date pickers, but the same code path affects every anchored overlay (all three date pickers, `CoarSelect` / `CoarMultiSelect` / `CoarTagSelect`, `CoarPopover`, menus) when used inside a modal.

### Fixed

- **`@cocoar/vue-ui` — overlay-service outside-click dismissal inside modals.** When a click lands inside an overlay, `onDocumentPointerDown` now also closes any dismissable overlay stacked _above_ it whose own subtree doesn't contain the click — instead of only collapsing the clicked overlay's tree-children. Fixes anchored panels (date pickers, selects, popovers, menus) staying open after an outside click when opened from inside a `useDialog()` / modal overlay; previously they only closed when the trigger was re-clicked. Sub-menu collapse and modal backdrop behaviour are unchanged.

---

## 2.5.1

Patch release that fixes a pdf.js styling leak in `@cocoar/vue-document-viewer`. `pdfjs-dist` appends an internal working canvas (`canvas.hiddenCanvasElement`) directly to `<body>` and relies on its own `pdf_viewer.css` to keep it invisible. The viewer didn't ship that stylesheet, so the canvas surfaced as a 300×150 black rectangle and inflated `document.body.scrollHeight` by 150 px the moment any PDF source mounted in a non-modal layout. Modal contexts hid the symptom (overlay above, `overflow: hidden` chrome) but full-routed views surfaced it immediately. Reported from Finoxl's BookingView; same pattern would hit any consumer embedding the viewer in a full-page layout. Fix inlines the minimum subset of pdf.js's body-level rules into the viewer's own stylesheet — `import '@cocoar/vue-document-viewer/styles'` stays the complete styling import.

### Fixed

- **`@cocoar/vue-document-viewer` — body-level `.hiddenCanvasElement` + `#hiddenCopyElement`** now hidden via the package's own CSS. Adds an unscoped global rule (`position: absolute; top: 0; left: 0; width: 0; height: 0; visibility: hidden; overflow: hidden`) to `vue-document-viewer.css`, mirroring the minimum subset of `pdfjs-dist/web/pdf_viewer.css` needed for the body-mounted helpers. No API change, no consumer action needed. The block sits next to the existing pdfjs textLayer subset already mirrored in `CoarDocumentViewer.vue` for the same reason.

---

## 2.5.0

Polish release that lands integration-feedback from the first wave of consumers using `@cocoar/vue-file-explorer` v2.4.0 (Atlas — backend-backed Knowledge editor) and Finoxl (Booking modal — `CoarFormField`), and reworks `CoarFormField` from a label-plus-message-row wrapper into a per-field status indicator with a popover-driven severity model that handles hints, warnings, errors, live-validation rules, and X-of-Y aggregate constraints with a single mechanism. Most of the file-explorer changes fix a contract gap where the documented `loadTree()` method was never actually called by the composable — only the in-memory store's undocumented `_assets` ref was. Now both paths work: composables that supply a reactive `_assets` get the zero-overhead live-mirror as before; composables that only implement the typed `AssetStore<T>` get an internal projection seeded by `loadTree()` on mount and patched after every CRUD op. `CoarTabGroup` gains a `fill` opt-in so editor / viewer / file-explorer tabs no longer need `:deep()` workarounds to propagate height. `CoarTree` warns in dev when rendered empty without an `#empty` slot. `CoarFormField` is a meaningful visual change for every consumer: the message-below-input row is gone, replaced by an icon in the label row with a popover that groups everything by severity section (hint → checklist → errors → warnings); form-labels bumped from 12 px to 14 px (caption-size to medium-input-label-size — the caption token kept its 12 px for tags / badges / dropdowns). No breaking API changes — `error: string` stays valid (now sugar for a one-item array), `hint` keeps the same prop shape (only its render location moved).

### Added

- **`@cocoar/vue-file-explorer` — `loading: Ref<boolean>` + `refresh(folderId?)`** on `UseFileExplorerReturn`. `loading` is the initial-`loadTree()` signal (stays `false` for `_assets`-backed stores); `refresh()` re-runs `loadTree()` or per-folder `loadChildren()` for SignalR / multi-tab / retention-sweep scenarios.
- **`@cocoar/vue-ui` — `CoarTabGroup.fill: boolean`** (default `false`). When true, the active tab panel + content wrapper flip from `display: block` to `flex: 1; min-height: 0; display: flex; flex-direction: column`, propagating the root's height down. The root itself stays untouched (consumer's parent layout decides whether the tab-group stretches). Removes the `:deep(.coar-tab-panel)` workaround consumers had to write for Monaco / PDF / file-explorer tabs.
- **`@cocoar/vue-ui` — `CoarFormField.warning`** (`string | readonly string[]`): non-blocking warnings, drives an orange `triangle-alert` icon when no error is also set. Input stays valid (`aria-invalid="false"`); SR announcements are non-urgent (no `role="alert"`). Errors continue to win severity for icon + invalid state.
- **`@cocoar/vue-ui` — `CoarFormField.rules`** + **`CoarFormFieldRule`** type: live-validation rules with two-axis display modes. Each rule has `label`, `fulfilled: boolean`, and optional `whenPass: 'success' | 'hide'` (default `'success'`) + `whenFail: 'pending' | 'warning' | 'error' | 'hide'` (default `'pending'`). The defaults give you the password-checklist UX (✓ green when fulfilled, ○ grey when not). `whenFail: 'error'` promotes the rule to the popover's Errors section and drives `aria-invalid="true"` on the child input — that's the validity signal. `whenPass: 'hide'` + `whenFail: 'error'` gives the live-validation pattern (disappears when ok, red error when not — e.g. "Max 20 chars"). `whenFail: 'warning'` is the live-advisory pattern. Rules are reactive via Vue's template eval — write `text.length <= 20` inline; no `() => boolean` needed. Named types `CoarFormFieldRule`, `CoarFormFieldRulePassMode`, `CoarFormFieldRuleFailMode` exported for IntelliSense in `computed<CoarFormFieldRule[]>(...)` consumer code. Aggregate "X of Y must be satisfied" patterns compose by adding a 5th rule with `whenFail: 'error'` that checks the count — the 4 individual rules stay as progress, the aggregate is the validity gate.
- **`@cocoar/vue-ui` — `CoarFormField` per-section icons in popover**: hint section gets a grey `info` icon, error section a red `circle-alert`, warning section an orange `triangle-alert`. Section icon only renders on the first line of each section; subsequent items in a section flow left-aligned under the first message's text. Per-rule icons (✓ green `check`, ○ grey `circle`) in the rules checklist section.
- **`@cocoar/vue-ui` — `CoarFormFieldStatusPanel.vue`** internal sub-component carrying the popover content. Lifted out of `CoarFormField` so the section layout is testable without spinning up the overlay service.
- **`@cocoar/vue-ui` — `circle` icon** added to core-icons (used by the rules-checklist for unfulfilled `○` state). `check-circle-2` was already present; it's now also used as the trigger icon when the rule severity is `success`.

### Changed

- **`@cocoar/vue-file-explorer` — `useFileExplorer` now calls `store.loadTree()` on mount** and patches its internal projection after each successful CRUD op (`createFolder`, `createFile`, `uploadFile`, `delete`, `rename`, `move`). Stores that surface a reactive `_assets` ref keep their previous zero-overhead path (the in-memory reference impl is unchanged). Before this release, the composable read `store._assets` directly and never invoked `loadTree()` — any store that implemented the typed `AssetStore<T>` contract without the undocumented `_assets` escape hatch rendered an empty tree silently.
- **`@cocoar/vue-ui` — `CoarFormField` error rendering** rebuilt as a per-field status indicator. Replaces the message-below-input row with a single severity-driven icon in the label row that opens a popover listing every applicable message grouped into sections: hint → rules checklist → errors → warnings. The icon is conditionally rendered so its appearance shifts the label-text right by `icon-width + gap` — that small horizontal nudge is the attention signal. Form's vertical geometry stays stable (no row appears below the input, no Submit button moves). Hover the icon for a peek, click to pin (load-bearing for a planned form-wide error-summary panel where each item will scroll to its field + open its popover).
- **`@cocoar/vue-ui` — `CoarFormField` trigger-icon severity model** is "highest severity visible in the popover": ≥1 error item → red; else ≥1 warning item → orange; else ≥1 success item (a fulfilled `whenPass: 'success'` rule, e.g. a green ✓) → green; else ≥1 pending item or hint → grey info; else no icon. Success **wins over** pending — once the user has fulfilled any rule, the icon flips green for positive reinforcement (the popover still shows unfulfilled rules as ○ for "could do more" detail). Validity-gate rules with `whenFail: 'error'` keep ownership of the red/error path; pending is reserved for genuinely optional progress.
- **`@cocoar/vue-ui` — `CoarFormField.error` widened** to `string | readonly string[]` — pass multiple validation errors as an array, single-string form still works as sugar for a one-item array.
- **`@cocoar/vue-ui` — `CoarFormField.hint` moved fully into the popover** — the always-visible help row below the input is gone. Hint sits at the top of the popover (grey, info icon).
- **`@cocoar/vue-ui` — `CoarFormField` label font-size** bumped from `--coar-body-caption-size` (12 px) to `--coar-component-m-label-font-size` (14 px). The caption token kept its 12 px and is still used by tags, badges, dropdowns, and other decoration text — only form labels moved to the medium-input-label-size tier, which is what they were always meant to be. Every `CoarFormField` consumer sees a small visual bump on every label.

### Fixed

- **`@cocoar/vue-file-explorer` — `resolveFileMeta`** now defaults `language` to `'plaintext'` when the resolved editor is `'script'` but no language was supplied (e.g. `Dockerfile`, `Makefile`, `LICENSE`, or any `asset.editor === 'script'` without `asset.language`). Saves every consumer the `?? 'plaintext'` dance when binding to `<CoarScriptEditor :language>`.
- **`@cocoar/vue-ui` — `CoarTree` DEV-only warn when rendered empty without an `#empty` slot**, with a 500-ms grace so async loaders (a store's `loadTree()`) don't trigger false positives. Stripped from production builds via `import.meta.env.DEV`. Catches silent blank-pane regressions.
- **`@cocoar/vue-ui` — `CoarOtpInput.transform` + `accept` props** now have explicit `undefined` defaults to satisfy `vue/require-default-prop` (pre-existing lint warning, not a runtime change).

### Docs

- **`@cocoar/vue-file-explorer` — `AssetStore<T>`** docs spell out that `loadTree()` is called on mount, document the patch-after-CRUD model, and add a "Reacting to out-of-band updates" section covering both patterns: `api.refresh()` on signal (default) and surfacing `_assets` directly (Pinia / live-query escape hatch).
- **`@cocoar/vue-file-explorer` — `useFileExplorer`** `loading` + `refresh` added to the return-surface and imperative-ops tables.
- **`@cocoar/vue-ui` — `CoarTabGroup`** new "Fill-Height Tabs" section with `TabsFill` demo + opt-in rationale tip.
- **`@cocoar/vue-ui` — `CoarFormField`** docs rewritten for the new status indicator + rules system: tip box at the top, new "Status Indicator", "Live Rules", "On-Submit Validation" sections with live demos. Rules section covers the four common patterns table (progress / live-validation / live-advisory / required-with-progress-tick), trigger-icon severity priority list, and the X-of-Y aggregate-rule pattern with a dedicated demo. Refreshed accessibility section explaining the per-message SR-only spans + space-separated `aria-describedby` aggregation.

---

## 2.4.0

Introduces a new package — `@cocoar/vue-file-explorer` — a VSCode-style file/asset explorer for Vue 3 built as a single composable over a pluggable `AssetStore<T>` backend (no wrapper component for v1 — consumers compose the shell themselves; the worked example is the 1280-LoC playground POC, the docs ship five live demos). Composable-only is a deliberate v1 scope decision: the file-explorer's shell varies wildly per consumer (tab styling, editor dispatch, simulator panels, context-menu shape), but the bits that are hard to get right — placeholder-then-fill open with optimistic rollback, conflict pipeline, blob-URL lease tracking, beforeunload-while-dirty, drag-to-reorder tabs, 3-stage file-meta fallback — all live in `useFileExplorer`. Ships alongside a new generic tree primitive in `@cocoar/vue-ui`, `CoarTree`, with full drag-and-drop (reorder + OS file drop), keyboard navigation, declarative per-target context menus via the builder API, inline rename, and virtualisation. The two were designed together — file-explorer composes `CoarTree`'s drop event into `store.move()` and the inline rename UI lives entirely on the tree side — but `CoarTree` stands on its own for any navigable hierarchy. Also lands a `size` prop on `CoarBreadcrumb`, an `onlyOnOverflow` gate on the `v-tooltip` directive, and broader language support on `CoarScriptEditor` (~40 Monaco grammars + plaintext fallback for extension-less files). Purely additive — no breaking changes.

### Added

- **`@cocoar/vue-file-explorer` — new package** (Preview tier): `useFileExplorer<T>({store, ...})` is the entire public surface besides the `AssetStore<T>` types and the `createInMemoryAssetStore` reference impl. The composable owns the data plane (`store._assets` projection with sort-mode + parentId filter, CRUD ops with optimistic rollback, error funnel through a single `onError(op, err, ctx)` callback), the tree state (`selectedId`, `expanded`), the tab state machine (preview vs pinned with VSCode auto-pin-on-edit semantics, dirty tracking via `content !== savedContent`, save-flow with `savingNodes`-blocked close, drag-to-reorder via `reorderTab`), the async state (`loadingNodes: Set<id>` for content fetch + lazy load, `savingNodes: Set<id>` for in-flight mutations), the blob-URL leases (revoked on delete + `onScopeDispose`), and the `beforeunload` warning while any tab is dirty. Returns refs to bind into `<CoarTree>` (`rootNodes`, `getId`, `getChildren`, `getLabel`, `isExpandable`, `expanded`, `selectedId`) + imperative ops for everything else (`openFile`, `saveTab`, `closeTab` / `closeOthers` / `closeToRight` / `closeAll`, `pinTab` / `unpinTab` / `reorderTab`, `addFolder`, `addFiles` for OS drops, `deleteNode`, `moveNode`, `rename`, `revealInTree`, `pathOf`, `fileMeta`). The placeholder-then-fill `openFile` flow pushes the tab + activates immediately so the editor-area overlay shows on the right pane while `store.loadContent` is awaited; on rejection the placeholder rolls back so the user isn't stranded on an empty editor for a file that never loaded. Editors only mount when `!loadingNodes.has(activeTab.id)` — otherwise heavy viewers (CoarDocumentViewer, Monaco, Milkdown) render their own error UI with empty content before the overlay can take over.
- **`@cocoar/vue-file-explorer` — `AssetStore<T>` contract**: flat interface with `Asset<T>` shape (`{ id, name, kind, parentId, hasChildren?, editor?, language?, payload? }`) — hierarchy is filesystem-style flat with `parentId` links, NOT nested `children[]`, so move/delete/rename operate on single objects and the composable projects to tree via filter. Read methods (`loadTree`, optional `loadChildren` for lazy mode, `loadContent`), write methods (`createFolder`, `createFile`, separate `uploadFile` so backends can pick multipart/signed-URL transports, `save`, `rename`, `delete`, `move` with optional `position`). `createAssetStore(config)` is the recommended factory — thin passthrough today, future home for cross-cutting wrappers (request dedup, retry, telemetry). Lazy mode opt-in via the presence of `loadChildren` on the store (capability probe is `'loadChildren' in store`) — the composable defaults `initialExpandedIds = []` in lazy mode for canonical click-to-expand UX, watches `expanded` with `immediate: true` so seeded ids preload, sets `loadingNodes` per folder during fetch. Eager stores leave `loadChildren` undefined and the watcher is dead code.
- **`@cocoar/vue-file-explorer` — `createInMemoryAssetStore` reference implementation**: browser-only backend backed by `ref<Asset<T>[]>` + an `id → content` Map. Reactive knobs (`latencyMs` + `failureRate` are `MaybeRefOrGetter<number>` read per-op via `toValue`; `onConflict` is `MaybeRefOrGetter<ConflictPolicy<T>>`; `sortMode` lives on the composable for the same reactivity). Conflict policy resolution runs BEFORE simulated latency so `'prompt'` UIs aren't blocked behind it. Lazy mode (`lazy: true`) switches `_assets` to a `ComputedRef` filtered by an internal `_publishedIds` Set; only published subtrees are visible to the composable, the complete dataset still lives in the store's internal bookkeeping for move / delete / cycle-guard. The store exposes `_assets` and `_contents` escape hatches for tests + devtools (underscore-prefixed to mark them as non-portable — a real-backend store won't have them).
- **`@cocoar/vue-file-explorer` — conflict policy**: `ConflictPolicy<T> = 'rename' | 'overwrite' | 'prompt' | 'error' | ((info) => ConflictResolution | Promise<…>)`. Default `'rename'` mirrors Finder / VSCode auto-suffixing (`foo.txt` → `foo (2).txt` → `foo (3).txt`, capped at 999 iterations with UUID-tagged fallback). `'overwrite'` recursively deletes the existing entry before proceeding. `'prompt'` opens `window.prompt` with the auto-suggested name as default; cancel → throws conflict error. Function form receives a `ConflictInfo<T>` with `existing` asset, `incoming` (name + kind), `parentId`, and `suggestedRename`. Applies to `createFolder` / `createFile` / `uploadFile` ONLY — `move` and `rename` deliberately bypass the policy because they're explicit user intent (silently changing the requested name would be surprising). Resolution runs BEFORE `settle()` so prompt UIs aren't latency-blocked.
- **`@cocoar/vue-file-explorer` — sort modes**: `SortMode<T> = 'manual' | 'folders-first' | 'alphabetical' | AssetComparator<T>`, default `'folders-first'` (VSCode pattern — folders alphabetical, then files alphabetical). `'alphabetical'` = Finder-style mixed. `'manual'` preserves the store's array order so drag-reorder between siblings sticks. Reactive via `MaybeRefOrGetter` so a toolbar can swap modes live. `api.reorderable: Ref<boolean>` is `true` only in `'manual'` mode; in other modes the composable silently drops the `position` arg on `move` (the comparator decides where the moved node lands). Lives on `FileExplorerConfig`, NOT on the store, because filesystem backends can't persist per-entry order (filesystems have no such concept) — that's why VSCode's explorer doesn't support drag-reorder between siblings, only move-into-folder.
- **`@cocoar/vue-file-explorer` — 3-stage `FileMeta` fallback**: `asset.editor` (explicit on the asset) → `config.getFileMeta(asset)` (consumer override returning `null` to fall through) → `defaultFileMetaFromName(asset.name)` (extension heuristic recognising markdown + PDF + common image formats + the ~40 Monaco script-editor languages). `resolveFileMeta(asset, {getFileMeta})` is exported for use outside the composable. Unrecognised extensions return `null` and the caller skips with a `console.warn` (same as the POC's behaviour).
- **`@cocoar/vue-file-explorer` — error funnel**: single `onError(op, err, ctx)` callback in `UseFileExplorerOptions`. By the time it fires the composable has already rolled back the optimistic mutation — failed `loadContent` removes the placeholder tab, failed `uploadFile` skips the follow-up `save`, failed `move` reverts the parent change. `AssetOp` is one of `'loadTree' | 'loadChildren' | 'loadContent' | 'createFolder' | 'createFile' | 'uploadFile' | 'save' | 'rename' | 'delete' | 'move'`; `AssetOpContext` carries `id`, `parentId`, `name`, and `file` (for `uploadFile`) so consumers can format toast / dialog / inline messages with file context.
- **`@cocoar/vue-document-viewer` — `v-model:sidebar-open` + `v-model:annotations-panel-open`**: the left rail (thumbnails / outline) and right rail (info + annotations list) now expose their open/closed state as `defineModel` props with `default: false`. Without `v-model` the behavior is unchanged (state lives internally, no breaking change). With `v-model`, the state is held by the consumer's parent component — useful inside a file-explorer shell where the user toggles a rail open, switches to a different editor (Markdown / Monaco), and switches back: with `v-model` the panel state survives the remount; without it, the rail comes back closed because the viewer instance is fresh. New emits: `update:sidebarOpen`, `update:annotationsPanelOpen`. No new internal state — the existing `ref(false)` declarations are replaced by `defineModel` which falls back to the same uncontrolled local-ref behavior when the prop isn't bound. Surfaces the "persistent viewer config across file swaps" pattern documented under `/components/file-explorer/use-file-explorer#persistent-viewer-config-across-file-swaps`.
- **`@cocoar/vue-ui` — `CoarTree` component**: generic, keyboard-navigable, drag-drop-aware tree primitive. Identity, children, and label are extracted via prop functions — render any node shape without forcing a common base type. Two APIs that compose but should not be mixed on the same instance: **props-mode** (`nodes`, `getId`, `getChildren`, `getLabel`, `isExpandable`, manual `<CoarContextMenu>` wiring) for simple cases; **builder-mode** (`useTree<T>()` returns `{ builder, api }`, the builder configures data / behavior / handlers / `folderMenu` / `leafMenu` / `viewportMenu` in a fluent chain, the tree renders its `<CoarContextMenu>` itself, the imperative `api` exposes `focusNode` / `startRename`). Features: drag-and-drop reorder with `before` / `after` / `inside` semantics (rejects self-onto-descendant drops, draws a 2-pixel indicator line for siblings + dashed outline for inside, auto-expands collapsed folders after hover dwell); OS file drop via `accepts-files` with `@files-drop` emitting raw `FileList` + target folder (or `null` for background drop); hover-revealed `⋮` button per row that opens the same context menu as right-click (keyboard + left-click parity with right-click); keyboard nav (arrows, Home/End, Enter/Space, type-to-jump); flat-rendering virtualisation under the hood — handles thousands of nodes without DOM bloat; tooltip on truncated labels via the new `vTooltip.onlyOnOverflow` gate; drop zone fills its container (`min-height: 100%`) so OS drops onto the empty area of sparse trees register. Desktop-first by explicit design — right-click context menus and hover-revealed row affordances are part of the intended UX (exception to the library's tablet-first principle, documented inline). Full docs at `/components/tree/` with six live demos (basic, drag-reorder, file-drop, context-menu, builder API, virtualisation).
- **`@cocoar/vue-ui` — `CoarTree.renamable` API**: opt-in inline rename. New `<CoarTreeNodeLabel :label>` drops into the consumer's default slot and swaps `<span>` ↔ `<input>` via inject — the consumer never wires `renamingId` / buffer / blur handlers manually. The tree owns F2-on-focused-row, Enter / Escape / blur with a 200-ms grace timer for menu-overlay focus-restore (so renaming from a context-menu item doesn't immediately blur the input when the menu closes). New events: `@rename({ node, newName })`, `@rename-cancel(node)`. New exposed: `api.startRename(id)`. New types: `CoarTreeRenameContext`, `CoarTreeRenameEvent<T>`, `CoarTreeNodeSlotProps.isRenaming`. File-explorer composable consumes this directly — the consumer just listens to `@rename` and calls `fe.rename(node.id, newName)`; ~80 LoC of inline rename machinery dropped from the POC.
- **`@cocoar/vue-ui` — `CoarBreadcrumb.size` prop** (`'m' | 's'`): `'s'` produces the slim secondary-chrome variant used by the file-explorer's path strip and any "file path under a tab bar" layout. The token cascades to children so links + separators all scale together. Default `'m'` unchanged.
- **`@cocoar/vue-ui` — `vTooltip.onlyOnOverflow` gate** (`boolean | selector | (el) => boolean`): when set, the tooltip only shows if the target element is overflowing — or, with a selector / function, if a specified descendant is. Eliminates the "tooltip-on-everything" anti-pattern for truncated lists. Used by `CoarTree`'s row labels.
- **`@cocoar/vue-ui` — `ellipsis-vertical` icon**: new core icon for `⋮` overflow menus. Used by `CoarTree`'s hover-revealed row menu and available for general consumer use via `<CoarIcon name="ellipsis-vertical" />`.
- **`@cocoar/vue-script-editor` — broader language support**: `LANGUAGE_EXTENSIONS` extended to ~40 Monaco grammars — TypeScript, JavaScript, JSON, YAML, CSS / SCSS / LESS, HTML, XML, SQL, Shell (bash / zsh / fish), Dockerfile, INI / TOML, C#, C / C++ / Objective-C, Java, Python, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, Lua, Perl, Dart, F#, VB, R, PowerShell, Solidity, Protobuf, GraphQL, Razor / cshtml, Pug, Handlebars, Twig — plus plaintext fallback for `.txt` / `.log` / `.env` / `.csv` / `.tsv` / extension-less files. `LANGUAGE_EXTENSIONS` is now `Partial<Record<CoarScriptEditorLanguage, string[]>>` with an `extensionFor` fallback to the language name itself when no explicit mapping exists. Drives the file-explorer's editor dispatch — `defaultFileMetaFromName` recognises every extension in the table and returns the matching `{ editor: 'script', language: '…' }`.

### Fixed

- **`@cocoar/vue-ui` — `CoarTree` right-click no longer disturbs selection**: opening a context menu on an unselected row leaves the existing selection in place (matches Finder / VSCode behaviour). The previous behaviour swapped the selection on the right-click target, which made multi-action menus (e.g. "Delete selected items") behave inconsistently when the right-clicked row wasn't part of the selection.
- **`@cocoar/vue-ui` — `CoarTree` drop area fills its container**: `min-height: 100%` on the drop surface so OS file drops onto the empty area of a sparsely-populated tree register correctly. Previously drops below the last row sometimes missed the tree entirely.

### Internal

- **Docs site sidebar**: new `File Explorer (Preview)` group with four entries (Overview, useFileExplorer, AssetStore contract, In-memory store). The Overview embeds five live demos (FullDispatch with real editor dispatch across `CoarScriptEditor` / `CoarMarkdownEditor` / `CoarDocumentViewer`; BasicUsage minimal shell; LazyMode; ConflictPolicies; SortModes). Demos use the dynamic-import + `<ClientOnly>` pattern (heavy impl in `_internal/*.vue`, thin SSR-safe shell in `demos/*.vue`) — same shape as the document-viewer demos. Two scoped CSS workarounds for `.vp-doc` cascade interactions: VitePress applies `margin-top: 8px` to consecutive `<li>` elements in prose lists, which inflated the breadcrumb `<ol>` height (`.bc :deep(.coar-breadcrumb-list li) { margin: 0 }`); and `CoarScriptEditor`'s root carries its own 1 px border, which doubled with the demo's outer border in the script-editor branch only (`.editor :deep(.coar-script-editor) { border: 0 }`).
- **VitePress alias for `@cocoar/vue-file-explorer`**: dev-mode resolves to `packages/file-explorer/src/index.ts`; added to `ssr.noExternal` so SSR rendering picks up the workspace package without requiring a prebuild.
- **Playground POC**: `apps/playground/src/views/FileExplorerPocView.vue` — the 1280-LoC worked example. Every feature of the package exercised in one file: tab bar with drag-to-reorder + context menus + middle-click close, simulator panel with localStorage-persisted knobs for latency / failure / sort / conflict / lazy, OS file drop, reveal-in-tree, `Ctrl+P` quick-open with substring match over `pathOf(id)`, editor dispatch across Monaco / Milkdown / `CoarDocumentViewer`. The POC consumes the package via its workspace dep — there's no `apps/playground/src/file-explorer/` folder any more.
- **POC simulator state persists across reloads**: `Latency`, `Failure`, `Sort`, `Conflict`, and `Lazy` all sync to `localStorage`. `Lazy` is a construction-time switch (changing it would require recreating the store and losing state), so the POC reloads the page when it changes; the others are reactive and retune live. Lets a developer dial in `lazy=true, latency=1000` and reload to see the lazy initial-load spinners with the same configuration they had before.

---

## 2.3.0

Introduces a new package — `@cocoar/vue-document-viewer` — for rendering PDFs, single images, and multi-page image galleries through one source-agnostic Vue 3 component. The internal seam (`PageProvider`) keeps the public surface identical across formats: same toolbar, same panels, same annotation layer. Source kind is picked via a small factory (`pdfSource()`, `imageSource()`, `imageGallerySource()`); the toolbar reads `capabilities` flags off the source to disable (never hide) tools that don't apply, so switching between a PDF and an image never causes button layout shift. `pdfjs-dist` is an optional peer dep — only required when rendering PDFs, image-only consumers skip it entirely. The release also lands horizontal-orientation support on `CoarSidebarDivider` + a `splitTrigger` mode on `CoarSidebarGroup`, both needed by the new document-viewer toolbar (which is built on the same `CoarSidebar` primitives as the markdown-editor toolbar). Purely additive — no breaking changes.

### Added

- **`@cocoar/vue-document-viewer` — new package** (Preview tier): `<CoarDocumentViewer :source>` is the entire public surface. One required prop; everything else (toolbar position, sidebars, annotations panel, info section, search, print, position memory, custom toolbar layout, annotation modes, labels for i18n) is optional. Switching `source` keeps the chrome mounted — only the inner page renderer rebinds. The render pipeline is source-agnostic via a `PageProvider` interface (`render(canvas, opts)` / `cancel()` / optional `getTextLayer()`); PDF pages wrap a `PDFPageProxy`, image pages wrap an `HTMLImageElement`, future kinds can plug in by providing the same shape. `usePageRenderer` no longer imports `pdfjs-dist` at all. The internal `useDocumentLoader` dispatcher watches `source.kind` and routes to one of three always-mounted adapters with filtered source slices (composables can't be conditionally instantiated within one render tree, but mounting all three and letting each watch its own filtered source keeps dispatch reactive without component-level remounting). 58 unit tests across 5 files cover the dispatcher, the `PageProvider` per-canvas render tracking (incl. the black-thumbnail-with-DevTools-open regression), the toolbar's `computeEffectiveTools` separator/capability filtering, and the pure-function helpers (`parsePdfDate`, `inferImageFormat`). Full VitePress documentation at `/components/document-viewer/` (overview, component reference, toolbar customization, annotations lifecycle).
- **`@cocoar/vue-document-viewer` — three source factories**: `pdfSource({ url, headers?, withCredentials? })` from the `/pdf` subpath (pdfjs-dist is an optional peer dep, only PDF consumers pay the bundle cost); `imageSource({ url })` accepts anything `<img src>` accepts (JPG, PNG, SVG, WebP, AVIF, GIF, `blob:`, `data:`); `imageGallerySource({ urls })` for multi-page image documents with possibly-mixed orientations. Each factory returns a frozen `DocumentSource` with the appropriate `capabilities` flags pre-populated. Build inside a `computed` so the viewer rebinds only on real source changes.
- **`@cocoar/vue-document-viewer` — capability-driven toolbar**: every `DocumentSource` advertises `{ multiPage, textLayer, search, outline, print }` capability flags; the toolbar reads them to mark unsupported tools as `disabled` with a `notAvailableForSource` tooltip suffix, rather than removing them from the layout. This is the **stable-position rule** — switching from a 14-page PDF to a single-page SVG never makes buttons jump around, just dims the ones that don't apply. Layer 3 of the toolbar filtering pipeline (after section toggles and separator normalization).
- **`@cocoar/vue-document-viewer` — order-driven `tools` prop**: typed `CoarDocumentViewerTool[]`, drives BOTH visible set AND order. A new `'separator'` pseudo-tool renders a `CoarSidebarDivider` at its position. Leading + trailing separators auto-trim, consecutive separators collapse to one, so section-toggle filtering never leaves orphan dividers. Default is `COAR_DOCUMENT_VIEWER_ALL_TOOLS` — an 8-group canonical layout with separators at group boundaries (panels / nav / zoom / view / rotation / pointer-modes / drawing / actions). The trim+collapse logic lives in pure-function form at `internal/effective-tools.ts` (`computeEffectiveTools`), extracted from the toolbar SFC for testability without component mount. Layer 1 and 2 of the toolbar filtering pipeline.
- **`@cocoar/vue-document-viewer` — built-in annotations**: four types — `marker` (multiply-blend highlighter), `comment` (pin + popover), `ink` (freehand), `freetext` (text box). Coordinates are page-relative and normalized to `[0..1]` so annotations render correctly across zoom + rotation, and stay portable across rendering contexts (a normalized stroke renders identically at 50 % zoom and 300 % zoom, on a different screen, in a different document with matching page geometry). Controlled-component pattern: viewer emits `annotation:create` / `annotation:update` / `annotation:delete`, consumer owns the `annotations` array. Pointer modifier conventions for drawing: Shift → 15°-snapped line, Ctrl/Cmd → free-angle line, Alt → append to previous stroke. Mode is `v-model:annotation-mode`-bindable (`'view' | 'select' | 'eraser' | 'marker' | 'comment' | 'ink' | 'freetext'`). Custom color palette via `:annotation-colors`; default is 7 colors (5 pastels + 2 brights). Eraser is destructive — clicking a stroke on a marker/ink annotation deletes that stroke, deleting the last stroke fires `annotation:delete` for the whole annotation. Annotations panel on the right rail with filter chips per type, sort (by page / chronological), substring search over comments and freetext bodies.
- **`@cocoar/vue-document-viewer` — info panel**: a collapsible **Info** section at the top of the annotations panel surfaces source metadata — format string (`"PDF · v1.7"`, `"Image · PNG"`, `"Image gallery · SVG"`), total page count, current-page dimensions (live, updates as the user flips pages), and PDF metadata (title / author / subject / keywords / creator / producer / created / modified / PDF version) parsed from the pdfjs `info` bag with `D:YYYYMMDDHHmmSS±HH'mm'` dates converted to `YYYY-MM-DD HH:mm:ss`. Empty fields are skipped (no "Author:" row for PDFs without an author). File size in bytes is surfaced for PDFs (from pdfjs's `contentLength`); image / gallery sources omit it. Disable with `:show-info-section="false"` for a minimal annotations-only panel.
- **`@cocoar/vue-document-viewer` — position memory**: `storageKey: string` opts into automatic localStorage persistence of `{ page, pageOffset, zoom, rotation }`; alternatively `v-model:position` for consumer-owned persistence (server, IndexedDB, existing state manager). Both compatible — when both are present, the bound `position` wins on mount and afterwards both stay in sync.
- **`@cocoar/vue-ui` — `CoarSidebarDivider` orientation-aware**: detects the parent sidebar's `side` via `SIDEBAR_SIDE_KEY` and renders a 1 px vertical line in horizontal sidebars (top / bottom) instead of the previous border-bottom which only worked in vertical rails. Symmetric along/across margin policy across both orientations + collapsed state. Required by the new document-viewer toolbar (which uses `CoarSidebar` horizontally) and by future horizontal-toolbar consumers.
- **`@cocoar/vue-ui` — `CoarSidebarGroup.splitTrigger` prop**: when combined with `mode='flyout'`, the trigger click emits a new `triggerClick` event instead of toggling the flyout. The flyout still opens via hover (`openOnHover`) or programmatic `v-model:open`. Lets a tool toggle act as the primary action with a separate hover-revealed config panel — the canonical use case is the document-viewer's marker tool with a hover-only width/color picker, mirrored from the markdown-editor's heading dropdown.
- **`@cocoar/vue-ui` — `CoarSidebarGroup.active` prop**: selected-state styling matching `CoarSidebarItem` (side-keyed indicator border, accent color + background). Used by the document-viewer toolbar to highlight the currently-active drawing tool's flyout group.
- **`@cocoar/vue-ui` — seven new core icons** regenerated from `/assets/icons` via `pnpm build:icons`: `highlighter`, `type`, `hand`, `rotate-cw`, `rotate-ccw`, `move-horizontal`, `mouse-pointer-2`. All used by the document-viewer toolbar; available for general consumer use via `<CoarIcon name="..." />`.

### Internal

- **Docs site widening**: `--vp-layout-max-width` bumped from 1440 to 2200 px; `.VPDoc.has-aside .content-container` max-width override removed (was 688 px, now fills the layout). Kitchen Sink coupled to the same `--vp-layout-max-width` so it scales together. On wide monitors the doc content area grows from ~688 to ~1530 px instead of leaving ~30 % side gutter; small screens (under 1440 px viewport) are unchanged. The right "On this page" outline stays in place. `pdfjs-dist` is aliased to a no-op SSR stub in the docs vite config — `DOMMatrix` at module-evaluation time would otherwise break VitePress's SSR pass, and the docs demos don't render real PDFs (the live PDF demo lives in the playground), so the stub is never actually called. If a docs demo ever needs to render a real PDF, remove the alias and lazy-import the adapter inside `onMounted`.
- **Playground demo route**: `/pdf-viewer` (apps/playground) — exercises all three sources, custom toolbar layouts, annotation modes, position memory, and the per-canvas render tracking fix (open DevTools while a PDF is loaded — thumbnails should NOT go black).

---

## 2.2.1

Closes an inconsistency in the v2.2.0 router-link rollout: `CoarMenuItem` shipped without an `active` prop or `RouterLink.isActive` wiring, while `CoarSidebarItem` had both. Consumers who wanted to mark a menu item as "currently selected" (view-mode toggles, settings sub-menus with a ✓ marker, sort-direction indicators) had no built-in way to do so. This release mirrors the sidebar's pattern onto the menu so both components have parity.

### Added

- **`@cocoar/vue-ui` — `CoarMenuItem.active` prop**: typed `boolean | undefined`. Marks the item as the current selection — applies the `coar-menu-item--active` class and `aria-current="page"` attribute. When `to` is set and `active` is omitted, the state follows `<RouterLink>`'s `isActive` slot prop automatically, so consumer-computed `route.path === '/x'` checks aren't needed. Explicit `active` wins over the router-derived value, for non-route selections (e.g. "current view mode is List" — not a route, just app state). The menu still auto-closes when an active item is clicked: the active styling is meaningful while the menu is open (user sees "✓ List view"), then the menu closes and reopens later with the new selection active. Mirrors the `CoarSidebarItem.active` implementation exactly — same `props.active ?? routerIsActive` resolution, same precedence rules, same CSS-token shape. New CSS tokens `--coar-menu-item-active-color` (default `var(--coar-text-accent-primary)`) and `--coar-menu-item-active-bg` (default `var(--coar-background-accent-tertiary)`) match the sidebar's accent-treatment palette so visually the two components stay in sync. 7 new tests across the three render branches (router-installed auto-active, explicit overrides, active-still-closes-menu, no-router explicit-only, `<div>` non-route selection state). Total `CoarMenuItem.test.ts` suite: 28 (was 21).

---

## 2.2.0

This release closes a long-standing usability gap reported from the `cocoarappbase` (Multi-Tenant ASP.NET + Vue + Marten) template: the three component families that consumers most often wire to Vue Router (sidebar navigation, dropdown menu items, and call-to-action buttons) all rendered as `<div role="menuitem">` or `<button>`, so right-click → "Open in new tab", middle-click, and Ctrl/Cmd-click all silently did nothing. Apps had to fall back to `@click="router.push(...)"` and lose every native browser-link affordance. This release adds an optional `to: RouteLocationRaw | string` prop to all three families AND a new `<CoarLink>` SFC wrapper that brings the same router-aware behaviour to inline links, on top of the long-standing CSS-only `.coar-link` pattern. `vue-router` is declared as an **optional `peerDependenciesMeta`** entry — install it for SPA routing, omit it for click-emit-only / external-URL use, and the type-only import keeps consumer apps without a router type-checking cleanly under `skipLibCheck: true` (vue-tsc default). Also lands a 3-line overlay panel CSS fix that closes an `<application-base>` workaround where modals opened with `size: { width: '42rem' }` rendered ~12% narrower than configured.

### Added

- **`@cocoar/vue-ui` — `CoarSidebarItem.to` prop**: optional Vue Router target typed `RouteLocationRaw | string` (type-only import from `vue-router`, runtime-erased). When set, the item renders as `<a href>` instead of `<div role="menuitem">`, so middle-click + Ctrl/Cmd-click open the destination in a new tab via the browser's native handling, right-click exposes "Open in new tab" / "Copy link address", and screenreaders announce "link" instead of "menuitem". Routing is delegated to `<RouterLink>` when `vue-router` is installed and its plugin registered globally; otherwise falls back to a plain `<a href={String(to)}>` that uses the browser's native navigation (works for absolute URLs). The router presence check uses `resolveDynamicComponent('RouterLink')` (centralised in the new `_internal/use-router-link.ts` helper) — no hard import of `vue-router`. Active state inference is automatic: when `to` is set and `active` is left undefined, the `coar-sidebar-item--active` class and `aria-current="page"` attribute follow `RouterLink`'s internal `isActive` — drift between consumer-computed `route.path === '/x'` checks and the router's own matching is eliminated. Setting `active` explicitly still wins. Disabled handling preserved: `aria-disabled="true"`, `tabindex="-1"`, and `preventDefault` on click block navigation and emit alike. The `<a>` branch intentionally drops `role="menuitem"` since the parent `CoarSidebar` is `role="navigation"` and a native link inside `nav` is semantically complete without the role override (documented inline on the prop JSDoc); the legacy `<div>` path (no `to`) keeps `role="menuitem"` for back-compat. Consumer migration is a one-line swap. 24 integration tests across the three branches (router-installed, no-router fallback, no-`to` regression).
- **`@cocoar/vue-ui` — `CoarMenuItem.to` prop**: same shape as `CoarSidebarItem.to` — optional Vue Router target that switches the rendered tag to `<a href>` so menu items can be opened in new tabs and copy-link-addressed. `role="menuitem"` is RETAINED on the `<a>` branch (parent is `role="menu"`, the role pairing is WAI-ARIA-correct). **Modifier-click does NOT auto-close the menu** — explicit `!isModifier` guard in the close logic (refactored for clarity in this release after the original implementation accidentally conflated "don't navigate" and "don't close" in a single early-return) — when the user Ctrl/Cmd/Middle-clicks a link item, the browser handles the new-tab open natively and the menu stays open so the user can open several links in a row (matches macOS Finder + Chrome bookmarks bar behaviour). Plain click still triggers SPA navigation AND auto-closes the menu. `keepMenuOpen()` inside the `@clicked` handler continues to suppress auto-close on the link path. **Space-key navigates on link-rendered items** — Space does NOT natively activate `<a>` elements in any browser, so the keydown handler synthesizes a click on the item's `<a>` ref when `to` is set, unifying Space with the Enter / mouse-click pathway (without this, Space on a link-menu-item closed the menu without ever navigating — silent UX bug, caught in independent review). Roving-tabindex (arrow-key navigation inside the menu) works on the `<a>` branch too — registration with the menu's `MENU_NAV_KEY` happens regardless of tag. 21 integration tests cover all branches, the modifier-click / `keepMenuOpen` matrix, the Space-key regression, and the slot fallback for the `<div>` path.
- **`@cocoar/vue-ui` — `CoarButton.to` prop**: optional Vue Router target that turns the button into a real `<a href>` link so right-click / middle-click / Ctrl-click all work as expected. `CoarButton` uses `RouterLink` in **non-custom mode** (single-template `<component :is>` root, no slot wrapper) — the button has no `active` prop or `aria-current` concern, so RouterLink's built-in click handler and `guardEvent` modifier-click pass-through are sufficient. `type` and `disabled` HTML attributes are intentionally dropped on the `<a>` branch (invalid on anchors); disabled / loading state is enforced via `aria-disabled`, `tabindex="-1"`, `pointer-events: none` from CSS, and a `@click.capture` JavaScript guard that runs BEFORE RouterLink's bubble-phase `onClick` so `preventDefault` actually blocks navigation in test environments. `stopPropagation` (not `stopImmediatePropagation`) is used so capture-phase listeners on the same element — `v-tooltip` directives, consumer analytics handlers — still fire. Object-shaped `to` values (e.g. `{ name: 'docs' }`) work with router installed; without router they degrade to `String(to)` which produces `[object Object]` — a DEV-only `console.warn` (via `_internal/use-router-link.ts`) fires once per component instance to make this footgun loud at dev-time, silent in production. 24 integration tests across the three render branches.
- **`@cocoar/vue-ui` — `CoarBreadcrumbItem` `to` / `href` / `icon` / `active` props**: the breadcrumb item used to be a pure `<slot />` wrapper that forced consumers to write `<CoarBreadcrumbItem><a href="/x">Foo</a></CoarBreadcrumbItem>` for every link — the 90% case. Now picks its render strategy automatically from props: (1) `active=true` → `<span aria-current="page">` (current page is not a link to itself, WAI-ARIA convention; **`active` wins over `to`** so consumers can pass `to` on every crumb in a `.map()` loop without filtering the last item); (2) `to` + router → `<RouterLink>` custom-slot → `<a>` with SPA navigation; (3) `to` without router or `href` → plain `<a href>`; (4) none of the above → bare `<slot />` for the escape-hatch case (inline dropdowns, custom pickers, the original CSS-only API). Icon goes via either the `icon` prop (Lucide name) or the `#icon` slot (avatar, badge, coloured icon — slot overrides prop). Icon renders INSIDE the `<a>` / `<span>` so it shares the link's hit-area and hover/focus/disabled styling. Legacy `<CoarBreadcrumbItem><a href>…</a></CoarBreadcrumbItem>` slot pattern still works — it falls into mode 4. 19 new tests across the four modes + icon-precedence + composition with `<CoarBreadcrumb>`. Total breadcrumb suite 40 tests.
- **`@cocoar/vue-ui` — `<CoarLink>` SFC**: new component wrapping the long-standing `.coar-link` CSS pattern with the same router-aware ergonomics as the other three. Four render branches: (1) `to` + RouterLink available → SPA-routed `<a>` with `aria-current="page"` on match; (2) `to` set, no router → plain `<a href={String(to)}>` fallback; (3) `href` set (external link) → plain `<a>` with auto `rel="noopener"` when `target="_blank"` is set and no explicit `rel` is provided (tab-nabbing defence); (4) neither → styled `<a role="button">` for click-emit-only "fake-link" UI (Enter + Space activate). Props: `to` (router target), `href` (external URL), `variant: 'accent' | 'subtle'` (default `accent`), `size: 's' | 'm' | 'l'` (default `m`), `disabled`, `target`, `rel`. The CSS-only pattern (`<a class="coar-link">` with hand-written `href` / `<RouterLink>`) is unchanged and stays supported indefinitely — the SFC is purely additive, the styles in `packages/ui/styles/link.css` remain the source of truth so both layers share appearance. 23 tests across the four branches plus the legacy CSS-class tests.

### Changed

- **`@cocoar/vue-ui` — `to` prop typing tightened from `unknown` to `RouteLocationRaw | string`**: type-only import of `RouteLocationRaw` from `vue-router` (erased at runtime, no bundling impact). Consumers passing object route literals (`:to="{ name: 'docs', params: { id: 42 } }"`) now get full IntelliSense and structural type-checking instead of silently accepting any value. Non-router consumers reading the emitted `.d.ts` are unaffected because `skipLibCheck: true` (the modern tsconfig default, and the vue-tsc default) skips the unresolvable `vue-router` reference.

### Fixed

- **`@cocoar/vue-ui` — `CoarOverlayOutlet` panel fills its host width**: the `.coar-overlay-panel` had `display: flex` but was missing `flex: 1` and `min-width: 0`, so as a flex child of `.coar-overlay-host` it shrank to its content's intrinsic width and ignored the host width that `overlay-service.applySize` writes from `size: { width: '...' }`. Symptom: a modal opened with `overlayOptions.size: { width: '42rem' }` in a 2560 × 893 viewport rendered as `panel.width = 588px` instead of the configured 672px (an 84px / ~12% deficit), and the modal sat 42px left of the viewport center despite `position: { placement: 'center' }` because the host stayed correctly-positioned but the inner panel was content-sized. Consumer apps worked around this with a global `.coar-overlay-panel { flex: 1; min-width: 0 }` rule in their root component. Three-line patch in the SFC style block (`flex: 1` for fill, `min-width: 0` to override the default `min-width: auto` for flex children — without it a long unbreakable string in the panel content would push the panel past the host's configured width). Five new tests pin both the SFC source declarations (regression doc — anyone editing the style block must keep both rules) and the runtime cascade (`getComputedStyle()` against an injected stylesheet + service-integration test that the host receives the right inline width while the panel stays inline-width-free).

### Internal

- **`@cocoar/vue-ui` — `_internal/use-router-link.ts` shared composable**: extracted after the round-2 review flagged the soft-router-dep pattern as duplicated across components. Centralises `resolveDynamicComponent('RouterLink')` detection AND the DEV-only `console.warn` for non-string `to` without a router (silent footgun was: object `to` + no router → `href="[object Object]"` → broken link). Used by `CoarSidebarItem`, `CoarMenuItem`, `CoarButton`, `CoarLink`. The warn fires at most once per component instance, gated on `import.meta.env.DEV` so production bundles tree-shake the branch.
- **`@cocoar/vue-ui` — `vue-router` declared as optional `peerDependenciesMeta`**: previously declared as devDep only, which forced consumer-app type-checking to break unless they also installed `vue-router` (defeating the "optional" intent). Now consumers explicitly opt-in by installing `vue-router`; type-only import resolution works for both cases thanks to `skipLibCheck: true`. Still NOT a hard runtime dependency — `resolveDynamicComponent` detection is the runtime gate.
- **`@cocoar/vue-ui` — `env.d.ts` ambient module for `?raw` imports**: Vite's `import sfcSource from './Foo.vue?raw'` returns the file's source text as a string, used by SFC-source regression tests (e.g. the panel-CSS pin in `CoarOverlayOutlet.test.ts`) to assert that declarations stay in the style block without needing `@types/node` for `fs/path/url`. Single `declare module '*?raw'` line.

### Docs

- **`docs(button|sidebar|menu)` — `to` prop added to API tables + usage prose**: each of the three component pages gains a "Router Integration" / "Router-aware navigation" section with a before/after code snippet showing the migration from `@click="router.push(...)"` to `to="/path"`. New `to` row in each props table with the `RouteLocationRaw | string` type and the soft-router-dep behaviour described. Includes a "Common Pitfall" warning callout about object `to` without a router. The docs site doesn't ship a router, so the examples are static code snippets rather than `<preview>` live demos — the integration tests in `packages/ui/src/components/{sidebar,menu,button,link}/*.test.ts` are the executable spec.
- **`docs(menu)` — keyboard support section for link items**: explicitly documents the Enter / Space / Modifier+Enter behaviour difference between action items and link items.
- **`docs(link)` — rewritten to cover both the SFC and the CSS-only pattern side-by-side**: SFC examples for router-aware nav, external links with `target="_blank"` auto-rel, fake-link buttons; CSS-only escape hatch retained for advanced consumers.

---

## 2.1.0

This release introduces `@cocoar/vue-page-builder` in Preview status — a generic, headless visual page composition framework. Two components ship from the same package, sharing one `PageConfig`. Built primarily for the IDP tenant login-customisation use case, but the schema is generic enough to cover most form-style use cases (login, registration, contact) by narrowing `config.allowedElements`.

### Added

- **`@cocoar/vue-page-builder` — Preview release**: generic, headless visual page composition framework. Users drag UI primitives onto a canvas, configure them, and the result is a portable JSON schema that a companion renderer turns back into live Cocoar components. Two components ship from the same package: `<CoarPageBuilder>` (the 3-panel visual editor with outline / canvas / props panel, drag-and-drop, undo-redo, JSON paste-and-apply, responsive preview, validation) and `<CoarPageRenderer>` (the runtime renderer that maps JSON nodes to live Cocoar components and wires action IDs to consumer-provided handler functions). The JSON schema is the single artifact that flows between them — plain JSON with no library dependency, any renderer (including a custom one) can interpret it. Schema root is always a `type: 'page'` marker (cannot be added or deleted). Layout containers: `stack` (with toggleable `direction: 'column' | 'row'` — change direction in the props panel without re-creating; children stay put), `card` (CoarCard with optional title), `section` (semantic section with optional title heading), `divider`, `spacer`. Typography: `heading` (level 1-6), `paragraph`. Inputs: `text-input` (with `inputType: 'text' | 'email' | 'password' | 'url'`), `checkbox`, `select`. Actions: `button` (with `variant` / `size` / `icon` / `validates`), `link`. Media: `image` (stores `assetId`, never raw URL). All inputs support `name` (wires the value into the action payload), `disabled`, and rich `validation` (`required` / `minLength` / `maxLength` / `pattern` / `matchField` / custom `message`). Per-element architecture: each element type ships its own props component in `src/builder/props/` registered in a single map (`registry.ts`); the main `BuilderPropsPanel.vue` is a thin shell that does `<component :is="entry.component" :node :patch />`. Adding a new element type requires one new `<Type>Props.vue` file and one registry line — no central files are touched. Validation is consumer-defined (the renderer's `onValidate` prop accepts a cross-field validator that fires before action triggers; the builder runs schema-level validation reactively and surfaces issues via outline warning icons + colored banners in the props panel for missing actions, duplicate field names, and missing asset IDs). Three-panel CSS Grid shell with resizable + collapsible outline and props pane. Drop zones collapse to zero size when not dragging (gap setting accurately reflects what shows) and expand on drag start with proximity-based fade. Responsive preview toggle in the Preview tab (Desktop / Tablet · 768 / Mobile · 375) with a capped, centered frame. Keyboard shortcuts: `Ctrl+Z` / `Ctrl+Y` undo/redo, `Delete` / `Backspace` removes the selected node when focus is not in an input. Three docs pages at `/components/page-builder/` (Overview), `/components/page-builder/coar-page-builder`, `/components/page-builder/coar-page-renderer`, plus a complete IDP integration walkthrough on the overview page covering shared config helper + admin builder mount + runtime login renderer.
- **`@cocoar/vue-page-builder` — `PageConfig` consumer contract**: a single config object passed to BOTH the builder and the renderer. `allowedElements?: ElementType[]` is enforced at both layers — the builder hides disallowed types from the palette and add-child menu; the renderer skips them at render time (with one console warning per type) even if they appear in hand-written or tampered JSON. This is the hard security boundary. `availableActions?: { id, label }[]` turns the Action ID input on Button/Link from free text into a labeled dropdown; stored IDs that aren't in the list surface as `auth:something (not configured)` so orphans don't silently disappear. `assetResolver?: (id) => string` resolves asset IDs to URLs — same contract as the renderer's `:asset-resolver` prop, used by the builder for thumbnails (canvas preview, props panel, Preview-tab renderer) and by the runtime renderer for `<img src>`. `pickAsset?: (currentId?) => Promise<string | null>` opens the consumer's own asset picker UI and resolves to the chosen asset id or `null` on cancel — **the library does NOT ship a picker dialog**, the consumer owns the entire picker UX (browse, upload, search, delete, categorisation, …) and the page-builder just gets the id back. A reference picker implementation lives in `apps/playground/src/components/PlaygroundAssetPicker.vue`. The renderer's `actions` map is the real security boundary for buttons / links — only handlers present there fire; everything else is a silent no-op. Arbitrary JavaScript is never stored in the schema.

### Internal

- **`@cocoar/vue-page-builder` — `useSchemaValidation` composable**: reactive `Map<nodeId, issues[]>` computed once over the entire schema. Built-in rules: button/link without action, action not in `availableActions`, image without assetId, duplicate field names across `text-input` / `checkbox` / `select` nodes. The result is provided via the `BUILDER_VALIDATION` inject key and consumed by `BuilderOutlineNode.vue` (warning icon + tooltip per affected row) and `BuilderPropsPanel.vue` (colored banner stack at the top of the selected node's properties). Validation is purely a UX scaffold — the renderer ignores it entirely; renderer enforcement happens via `allowedElements` and the `actions` map.

### Docs

- **`docs(page-builder)` — three new docs pages**: `/components/page-builder/` (overview with Quick start + Architecture + PageConfig contract + Security Model + complete IDP integration walkthrough + Roadmap), `/components/page-builder/coar-page-builder` (builder API + features + validation + per-element architecture), `/components/page-builder/coar-page-renderer` (renderer API + Schema reference + Built-in Elements reference + Security boundary). Page Builder marked Preview in sidebar and on every page heading. The integration walkthrough on the overview page contains three numbered steps with full Vue file contents — shared `buildLoginConfig(tenantId)` helper, admin app builder mount with save-to-backend, runtime login page renderer wiring.

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

- **`@cocoar/vue-data-grid` — popup cell editors survive nested-overlay interaction (zone-select inside date-picker panel)**: clicking a body-teleported overlay inside an already-open editor overlay (e.g. the timezone-`CoarSelect` inside the `<CoarZonedDateTimePicker>` panel, which itself lives in an AG Grid cell editor) closed the outer panel mid-interaction. Root cause: `focusout` events fired on the editor root with `relatedTarget` pointing to the nested overlay element, bubbled up through the cell DOM, and triggered AG Grid's `stopEditingWhenCellsLoseFocus` commit → editor unmounted → both overlays destroyed. The existing `mousedown` capture-phase guard (`preventDefault` for `.coar-overlay-host` targets) was insufficient because some element types still emit a focus shift despite the prevented default. New shared composable `usePopupEditorFocusGuard(rootRef)` installs a second guard: a `focusout` listener on the editor root that calls `stopPropagation` when the `relatedTarget` is inside `.coar-overlay-host`. AG Grid never sees the cell-focus-loss for focus shifts into body-teleported overlay panels. Applied to all six popup-style cell editors: `CoarSelectCellEditor`, `CoarMultiSelectCellEditor`, `CoarTagSelectCellEditor`, `CoarPlainDateCellEditor`, `CoarPlainDateTimeCellEditor`, `CoarZonedDateTimeCellEditor`. The text + number editors don't use the guard — their inputs are in-cell, no body teleport.
- **`@cocoar/vue-data-grid` — date-column renderers refactored as thin wrappers around `@cocoar/vue-ui` viewer components**: the three renderers (`CoarPlainDateCellRenderer`, `CoarPlainDateTimeCellRenderer`, `CoarZonedDateTimeCellRenderer`) previously did all formatting inline using `toLocaleString` + `instanceof Temporal.X` checks against their own polyfill copy. Two symptoms surfaced from real-world use: (1) **editing a `zonedDateTime` cell wouldn't update the renderer's display** — the picker (in `@cocoar/vue-ui`) constructed `Temporal.ZonedDateTime` instances against its own polyfill copy, the renderer's `instanceof Temporal.ZonedDateTime` from its own copy rejected them, and the renderer fell through to empty string. (2) **Locale changes only partially propagated** — `toLocaleString` reacts to the BCP-47 language tag, but the pickers (and the rest of the date-time family) format via a locale-resolved date-format pattern from `useDatePickerBase`, so consumer locale switches that updated the format pattern bypassed the renderer's BCP-47-only formatter. Both bugs fixed at the source: renderers now embed the matching `<CoarPlainDateView>` / `<CoarPlainDateTimeView>` / `<CoarZonedDateTimeView>`, which use cross-realm-safe `Symbol.toStringTag` checks and the same `useDatePickerBase` reactive resolution as the pickers. Cell editors got the same toStringTag fix for their initial-value type-check (same potential cross-polyfill failure mode on edit-mode entry). New renderer-only `displayTimeZone` config on `col.zonedDateTime()` (`.displayTimeZone('Europe/Vienna')`) projects every row into a single zone for cross-zone coordination views.
- **`@cocoar/vue-ui` — overlay-preset export gap closed**: `popoverPreset`, `datepickerPreset`, `subFlyoutPreset`, `contextMenuPreset`, and `sidebarFlyoutPreset` were declared in `components/overlay/overlay-presets.ts` and re-exported by the internal `components/overlay/index.ts`, but missing from the public package barrel — only 7 of the 12 presets were reachable. Consumer code calling `import { popoverPreset } from '@cocoar/vue-ui'` crashed with `SyntaxError: The requested module does not provide an export named 'popoverPreset'`. Caught when wiring the calendar popover demo. Five exports added to the public barrel; existing preset exports unchanged.
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
- **`docs(calendar)` — live popover + timeline demos mirrored from playground into VitePress**: the playground app (`apps/playground/`) isn't deployed publicly, so the popover-anchoring and timeline interaction patterns were invisible to consumers reading the docs. New `<preview>`-embedded demos in `apps/docs/components/calendar/coar-calendar.md` ("Popovers and tooltips" section, `demos/CalendarPopover.vue`) and `apps/docs/components/calendar/timeline-view.md` ("Live example" section, `demos/CalendarTimeline.vue`).
- **`docs(data-grid)` — new "Multi-Select & Tag-Select Columns" page** at `/components/data-grid/multi-select`: documents `col.multiSelect()` and `col.tagSelect()` side-by-side (when-to-use comparison, edit-mode flow, rendering modes, row-aware options, separate API tables, layered-overrides escape-hatch). Single live demo shows both variants in one grid (checkbox-list multi-select with chips display + tag-style trigger with allow-create). Sidebar entry under Data Grid.
- **`docs(data-grid)` — new "Date Columns" page** at `/components/data-grid/date-columns`: documents `col.plainDate()`, `col.plainDateTime()`, `col.zonedDateTime()` with a Temporal-only contract callout, edit-mode flow, per-shortcut API tables, row-aware markers example, and three live demos (PlainDate task scheduling with weekend highlights, PlainDateTime reminders, ZonedDateTime cross-zone meetings with `timezoneFilter`).
- **`docs(ui)` — new "Date Views" page** at `/components/date-views`: documents `CoarPlainDateView`, `CoarPlainDateTimeView`, `CoarZonedDateTimeView` — the read-only display siblings of the picker family. Single page covers all three with a head-to-head feature table, live demos (basic display, locale switching, 12h/24h, cross-zone projection, placeholder for null), and the cross-realm `Symbol.toStringTag` safety note.
- **`docs(ui)` — new "OTP Input" page** at `/components/otp-input`: documents `CoarOtpInput` with five live demos (Basic Usage, Length, Type & Mask, Custom filtering with `transform`/`accept`, Validation, Sizes), behavior table covering every keyboard interaction (auto-advance, Backspace-jump-back, Delete clear, paste-spread), full API table, accessibility notes, and the mobile SMS-autofill chip behavior. Sidebar entry under Form Controls.

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
