# Compact profile — calendar audit (`packages/calendar/**`, calendar docs)

Review record, not a claim of complete verification. Scope: every source surface of
`@cocoar/vue-calendar` (37 `.vue` files, styles, script that emits colours/geometry), its docs pages and demos.

## Mechanism (applies to every row below)

- New file `packages/calendar/src/styles/compact.css`, imported by `src/index.ts` right after `tokens-dark.css`
  (so it lands in `dist/vue-calendar.css`; checked with `vite build`, selector survives minification).
- Package-specific `--coar-calendar-*` roles, the 13 existing calendar colour tokens and the package-only
  `--coar-text-base` / `--coar-text-subtle` are declared **only** under `.coar-compact`, on the **outermost
  calendar root** (`.coar-calendar`, `.coar-time-grid-surface`, `.coar-time-grid`, `.coar-time-rows`,
  `.coar-month-view`, `.coar-continuous-month-view`, `.coar-month-list-view`, `.coar-agenda-view`,
  `.coar-timeline-view`, `.coar-year-view`; nested roots excluded via `:not(:where(roots) *)`).
  Reason: they are derived from vue-ui semantic tokens and shared compact roles; declared on `.coar-compact`
  itself they would freeze that element's scheme/mobile values. Specificity `(0,1,0)`, after tokens-dark.
- Every touched declaration reads `var(--coar-calendar-<role>, <exact previous expression>)`.
  Proven twice: a script strips every new role wrapper from the working tree and compares with `HEAD` →
  initially byte-identical except one whitespace-only multi-line wrapper (`CoarMonthDayOverlay.vue` box-shadow).
  Later measured-geometry and drag fixes are described below;
  `src/styles/__tests__/compactProfile.test.ts` pins each role's fallback set.
- Shared roles consumed (with literal desktop fallbacks): `--coar-ui-font-size` (13), `--coar-caption-font-size`
  (12), `--coar-label-font-weight` (500), `--coar-interactive-row-height` (36), `--coar-panel-padding` (16),
  `--coar-content-gap` (8), `--coar-control-radius` (6), `--coar-panel-radius` (8). Mobile values come from the
  shared definitions of these roles, now integrated and exercised in the mobile-class browser cases.
  Not consumed: `--coar-field-font-size` (calendar has no text input of its own), `--coar-ui-line-height`
  (calendar line boxes are fixed px coupled to script geometry, see below).
- Colours consumed: `--coar-background-neutral-primary/secondary`, `--coar-border-neutral-tertiary`,
  `--coar-text-neutral-primary/tertiary`, `--coar-background-accent-primary/secondary`,
  `--coar-text-accent-primary`, `--coar-background-semantic-error-bold`, `--coar-border-semantic-error`,
  `--coar-background-semantic-warning-bold`, `--coar-background-brand-primary` (slate), `--coar-shadow-m/xl`,
  `--coar-text-on-accent` (not defined by vue-ui → `#fff`).
- Never touched (consumer data): `meta.color` → `--event-bg/--event-border`, `meta.textColor` → `--event-ink`,
  authored assignee colours, band `color` → `--coar-calendar-band-color`, selection/draft colour tokens set by
  hosts. Compact generated avatars use the accent surface; authored fills retain their colour and receive
  contrast-selected initials only in Compact.
- Never touched (geometry computed in script; CSS-only change would break hit tests / budgets):
  `pixelsPerHour`, all-day gap 2, time-rows `HEADER 28 / CHIP 18 / LABEL_LINE 20`, month pill
  line box 16 px (`useMonthMetrics` measures, defaults 24/18/18/2/3/4),
  continuous day-number row 31 px / 27 px marker, timeline `timelineRowHeight`, `--coar-time-grid-axis-width`
  (80, public), `--coar-time-grid-header-height` (36), `--coar-calendar-scroll-inset-bottom` (host contract),
  point-event tokens.
- Measured geometry: all-day lanes/actions follow independent roles (24 px desktop, 44 px mobile); the day
  overlay measures its real header and 32/44 px close control. Month overflow actions use 24/44 px targets.
  Timed resize targets use a side rail bounded by half the card in each dimension, without overlapping each
  other or stealing the entire move area. Short/crowded cards therefore retain smaller targets.
- Fixed week spans keep 128 px day columns and native horizontal scrolling inside the shell when narrow.
  Paging is suppressed while the grid overflows and restored when it fits. Responsive day-span selection
  is unchanged. Repeated keyboard moves retain the original event ID; pointer release flushes the final
  pending move before committing. These shared correctness fixes do not alter default pixels.

### Finding: inherited aliases that do not resolve as their fallbacks suggest (default mode, unchanged)

| Usage | Comment / fallback says | Actually resolves to (vue-ui loaded) |
| --- | --- | --- |
| `var(--coar-font-size-xs, 11px)` (20 uses) | 11 px | **14 px** (`type-primitives.css`) — events, pills, hour labels, weekday captions are 14 px today |
| `--coar-font-size-sm` / `-base` / `--coar-body-s-size` | 13 / 14 / 13 | undefined → fallbacks |
| `--coar-color-accent`, `--coar-color-accent-soft` | accent | undefined → accent-500 / `#93c5fd` |
| `--coar-color-focus`, `--coar-border-accent`, `--coar-text-accent` | focus/accent | undefined → fixed `#2563eb`, ignores the host accent |
| `--coar-color-danger`, `--coar-text-danger` | danger | undefined → `#dc2626` / `#ff3b30` / `#d70015` |
| `--coar-surface-subtle`, `--coar-surface-muted` | surfaces | undefined → light greys **also in dark mode** (agenda row hover, year hover stay `#f6f7f9`/`#f3f4f6` on the dark surface) |
| `--coar-background-accent-soft` | timeline today | undefined → `#eff6ff` also in dark |
| `--coar-radius-md` | 8 px | undefined → 8 px |
| `--coar-calendar-bg` dark `#18181b` vs shell `--coar-background-neutral-primary` dark `#3f3f46` | — | header and grid differ in dark |

All of these keep their behaviour outside the profile (changing them would alter default baselines). Inside the
profile each one is replaced by a resolving semantic role. Proposed as a follow-up for the default look.

## Per file

Legend — **D/M**: desktop/mobile assessment. "Role" = consumed through a new role in compact.

### Shell and views

| File | Changed (compact only) | Unchanged, why | D/M | Scenes |
| --- | --- | --- | --- | --- |
| `components/CoarCalendar.vue` | header padding/gap → content-gap/panel-padding; range label size → 16 px (weight 600 kept: view title) | nav buttons and segmented controls are vue-ui (`CoarButton`/`CoarSegmentedControl`, parent); container-query wrap, `--coar-button-radius` segments (parent role); shell bg already semantic | D ok; M: header wraps at container width (phone scene); control heights are parent's | compact-calendar-week, -phone |
| `CoarDayView.vue`, `CoarWeekView.vue`, `CoarWorkWeekView.vue` | — | no template visuals or styles: thin wrappers around `CoarTimeGridSurface` | n/a | week, day, multi-day, week-rows |
| `CoarDisplayZoneSwitcher.vue` | — | renders only `CoarSelect` (parent's field/select roles); no own CSS | follows CoarSelect | none (parent's select scenes) |
| `CoarTimeGrid.vue` | hour labels → caption 12; fallback titles weight → 500; measured all-day lane geometry; native scrolling instead of paging while overflowing | sticky stack, swipe painting when the grid fits, hover line, a11y region, axis width | Browser: narrow light/dark and mobile-class states pass; native calendar gestures pending | week, day, multi-day, phone |
| `CoarMonthView.vue` | segment focus colour; slot-fallback titles weight; JS default event border → role | capsule/stacked heights (6/12 px geometry, hit targets identical), segment separators (white mix on event colours) | D ok; M: capsules unchanged | month, month-modes |
| `CoarContinuousMonthView.vue` | section title clamp(1.55–2rem)/750 → 18 px/600; today circle red `#ff3b30` → accent, text → on-accent | 31 px day row, 27 px circle (geometry), separator mix (derives from `--coar-calendar-border` on its own root → follows profile) | D ok; M: today marker now accent like every other view (deliberate harmonisation) | month-continuous |
| `CoarMonthListView.vue` | title 1.35rem → 18 px (+ weight 600 via compact.css rule, UA `<h2>`); weekday caption 11/650 → 12/500; day min-height 42/50 → row 36(+4) / mobile 44(+4); day radius → control radius; selected text → on-accent; today red → accent, 750 → 600; selected-day title size → UI size (+600); JS default marker colour → role | markers 4 px (geometry); 720 px container switch | D ok; M: day buttons reach 44/48 with parent's row role | month-list |
| `CoarAgendaView.vue` | week-strip day min-height 48 → row+4 (40 / 48); name caption size/weight; number → UI size, 700 → 600; selected text → on-accent; today red → accent; JS default dot colour → role | empty state (`--coar-spacing-l`, subtle text), strip padding/bg (semantic already), virtualization (rows measured, `estimatedItemSize` 64) | D ok; M: 48 px strip targets with parent's 44 row role | agenda, day-agenda |
| `CoarTimelineView.vue` | root size → UI size; corner/date-cell/count captions → 12/500; today cell bg → today tint, text → accent, weight → 500; bar radius → 4; bar focus colour; JS default bar colour → role | bar 12 px/500 white label only in custom slots; row geometry (`timelineRowHeight`), weekend tint (semantic) | D ok; M: pan by pointer, no touch scroll change | timeline |
| `CoarYearView.vue` | month title radius → control radius, 700 → 600; weekday + day numbers → caption 12; hover → resolving role; today text → on-accent, 700 → 600 | grid gaps 24/28, padding 20 (pinned by `scrollInsetToken.test.ts` regex) | D ok; M: day cells are small taps (pre-existing, not a compact change) | year |
| `VirtualizedSurface1DY.vue`, `VirtualizedSurface2D.vue` | — | no visuals: scroll containers, containment, inset token | n/a | agenda (1DY) |

### Internal: time grid

| File | Changed | Unchanged, why | D/M | Scenes |
| --- | --- | --- | --- | --- |
| `time-grid/CoarTimeGridSurface.vue` | publishes actual day count for Compact's width floor | ghost page placement, responsive span selection | narrow week reachability tested | week, day |
| `time-grid/CoarTimeGridHeader.vue` | cell padding 8/12 → 8; size → UI 13/14; weight 600 → 500; today → `--coar-text-accent-primary`; dense header size → caption | sticky/swipe paint, min-height 36 | D ok; M ok | week, day (dense) |
| `time-grid/CoarTimeGridAllDayBand.vue` | band text → caption; collapse link → accent text role + caption and separate target size | axis label uppercase 0.04em; lanes measured by parent | expanded/capped cases pass | week |
| `time-grid/CoarTimeGridAllDayBar.vue` | radius 3 → 4; size 14 → 12; title 600 → 500; dense 10 → 11; focus / drag outline / drag shadow / invalid outline, stripes, shadow → roles | resize handles 6 px (touch limitation pre-existing, see docs `devicesNote`), clipping radii, snap-back | D ok; M: 6 px handles unchanged | week, day |
| `time-grid/CoarTimeGridAllDayOverflow.vue` | radius → 4; size → 12; weight → 500; hover bg role | dashed border (calendar border role) | D ok | week ("+1"/"+2") |
| `time-grid/CoarTimeGridColumn.vue` | — | colours are existing calendar tokens (profile redefines them); slot gradient reads `--coar-calendar-grid-line` (profile: quieter mix) | ok | all grid scenes |
| `time-grid/CoarTimeGridEvent.vue` | radius 4; caption 12, title 500; metadata 11 without a second opacity reduction; focus/drag/invalid roles; bounded resize side rail | consumer colours, point-event tokens, anatomy thresholds, legacy 6 px handles | pointer move/resize/invalid/Escape/keyboard pass in four class/scheme variants; short/crowded touch targets remain limited | week, day (dense), multi-day |
| `time-grid/CoarTimeGridNowMarker.vue` | line/dot → semantic error | 8 px dot, 1 px line | ok | week, day |
| `time-grid/CoarTimeSelectionLayer.vue` | separate selection fill/border and draft border roles | host selection/draft overrides, 4 px radius, draft shadow | selection and clipped drafts, text and edge contrast pass | day, week-rows (draft) |
| `time-grid/CoarCalendarBands.vue` | label 10 → 11 | band default colours via existing tokens (profile: accent / neutral / warning / error); consumer band colours raw; line label weight 600 kept (sits on the line) | ok | week, day, week-rows |
| `time-grid/CoarTimeAxisMarker.vue` | pill/duration 10 → 11; pill text → on-accent; independent readable duration-text role | pill radius 9, weight 600 on accent fill, positions | draft/selection contrast tested; legacy placement unchanged | day, week-rows |

### Internal: time rows, month, agenda, shared

| File | Changed | Unchanged, why | D/M | Scenes |
| --- | --- | --- | --- | --- |
| `time-rows/CoarTimeRows.vue` | hour labels → caption; day label → UI size/500, today accent text; chips radius 4, size 12, weight 500, focus role; dense label → caption | header 28 / chip 18 / label line 20 (script geometry), track gradients (calendar tokens) | D ok; M: pan both axes native | week-rows |
| `time-rows/CoarTimeRowsEvent.vue` | radius, size, title weight, time 10 → 11, dense, focus/drag/invalid roles | consumer colours, point edge, handles | ok | week-rows |
| `month/CoarMonthGrid.vue` | weekday padding 8/12 → 6/8; caption 12/500 | sticky row | ok | month, month-modes |
| `month/CoarMonthRow.vue` | — | only borders (calendar token) + height transition | ok | month |
| `month/CoarMonthCell.vue` | day number UI/500; today accent; "+N" typography, hover/focus roles and separate 24/44 px target size | day row 24 px, selection circle 20 px, measured pill/marker budgets | narrow mobile "+N" and reopen/close checks pass | month |
| `month/CoarMonthPill.vue` | radius 4, size 12 (line box 16 kept), title 500, dense 11, focus/drag/invalid roles | consumer colours | ok | month |
| `month/CoarMonthBar.vue` | as pill | consumer colours, handles | ok | month |
| `month/CoarMonthDayOverlay.vue` | panel 8, overlay shadow, focus/typography/scrollbar roles; 32/44 px close target and measured header budget | legacy 20 px close fallback | real close/reopen/Escape and total-height checks pass | month (sheet opened by the story) |
| `agenda/CoarAgendaDayHeader.vue` | padding 8/16 → 6/panel; size UI, 600 → 500; today accent text; badge caption 12, 700 → 600, bg accent role, text on-accent | floating header geometry (measured) | ok | agenda |
| `agenda/CoarAgendaEvent.vue` | row padding → (row − 20)/2 · panel → 36 desktop / 44 mobile rows; gap 12 → 10; time UI size; title 14 → UI size (500 kept); continuation caption; hover role | dot 8 px (consumer colour), time min-width 80 | D ok; M: 44 px rows with parent's role | agenda, day-agenda, month-list |
| `internal/CoarEventAssignees.vue` | generated fallback accent surface; contrast-selected ink for authored fills in Compact; overflow Slate surface | authored colours, legacy generated hues/white ink; sizes 14/18/22 with 7/8/9 px initials at 750 | initials remain a hint, not primary event text; fill/ink units pass | week, multi-day, agenda |
| `internal/CoarEventDecorations.vue` | cross-zone dot → accent role | icon 12/14 px (script), subtle text colour (calendar token) | ok | week, multi-day, agenda |
| `internal/RenderEventFallback.ts` | — | no visuals (renderer resolution) | n/a | — |
| `composables/useTimeGridPresentation.ts` | default event border → role | default fill (existing token), ink policy (var() fill → `--coar-text-base`) | ok | week, day |

### Styles

| File | Notes |
| --- | --- |
| `styles/tokens-dark.css` | unchanged; every value it defines is re-declared by the profile (test), so package dark values never leak into the profile |
| `styles/compact.css` | only Compact-scoped rules; semantic roles, bounded targets, narrow-week overflow, readable adjacent-month dates, date-based weekend tint |

### Docs (`apps/docs/components/calendar`)

- `index.md`: new "Compact presentation (Preview)" subsection under Theming. Parent runs `pnpm skill:sync`.
- Device frontmatter keeps the partial/planned limits and distinguishes legacy 6 px handles from bounded Compact targets.
- Demos (`demos/*.vue`, 20 files) inspected: none sets calendar visuals that the profile would contradict; no
  change. They show no `.coar-compact` toggle — the parent's gallery is the comparison place.

## Verification

- Current package run `calendar-unit-verified.log`: **83 files / 1092 tests passed**; package lint and typecheck
  passed. This includes the final release-before-frame, resize grab-offset, native-scroll/paging and repeated
  point-event keyboard-resize regressions. The horizontal resize fixture supplies the handle geometry that
  happy-dom cannot measure; no product fallback was added to mask that test limitation.
- `compactProfile.test.ts` pins Compact scoping, dark-role coverage and exact legacy fallbacks.
- The previously temporary calendar state draft is now the regular
  `apps/playground/e2e/compact-calendar-states.spec.ts`, with a portable HTML/Vue host under
  `e2e/fixtures/calendar/`. It uses real components, fonts, overlays and fixed data, not an intercepted visual
  entrypoint or absolute machine paths. It passes **93/93** in isolation and is included in the full suite:
  **779 passed, seven existing skips, 786 cases, all 34 test tasks successful**. The clipped-scene check now
  includes event time/location contrast rather than excluding those text runs. A separate fixture/spec
  typecheck passes. This covers real mouse move/resize/invalid/Escape, repeated keyboard identity,
  selection/clipped drafts, expanded all-day controls, work-week/date semantics and narrow views.
- `compact-advanced-interactions.spec.ts`: **12/12 passed**, retaining sheet-budget/focus and Builder ghost
  checks and adding narrow-week width/reachability plus CDP touch scrolling without range changes.
- Existing legacy images have not been updated. The current full Docker comparison passes **448/448**,
  with **60/60** renderer/zone-list repeats; no calendar reference or recipe changed in this follow-up.
  Full lint/typecheck/build and both complete WebKit sequences pass without timeout, retry or OS overrides.
  Ten specifically evidenced calendar states are marked reviewed in the inventory; other states and all
  aggregate matrix checks remain pending. Mouse/CDP and mobile classes do not prove native event gestures.

### Earlier verification history

- The previous mixed visual run passed 431 cases and failed four
  calendar readiness checks; it was not a green aggregate. Both current Compact-only calendar image updates
  passed without readiness/harness changes. The subsequent mixed comparison (`job-285fc767`) passed all calendar
  cases but ended **429 passed / 6 failed** elsewhere: four zoned-picker timeouts and two stale Compact date-edge
  images. The next full run (`job-e7f94879`) again passed every calendar case and ended **434 passed / 1 failed**
  in the zone-list story's delayed scrollbar state. Full repository lint/typecheck/build passed; full tests retain
  two WebKit navigation failures outside these calendar cases. Those historical failures are not the result
  of the current green runs above; no calendar performance or OS-level fix is claimed.

## Pending / honest gaps

- Month/Timeline/Time-rows/all-day drag-and-resize paths beyond the tested cases, long-press/touch event drag,
  `DisplayZoneSwitcher` and authored renderer contents still need their own evidence.
- No native calendar gesture acceptance on iOS/Android/Windows; mobile classes and CDP are browser emulation.
  Tiny month pills, all-day handles and short/crowded timed-event targets remain device limitations.
- Current Inter/Slate browser contrast checks do not cover every authored colour or custom slot.
- Final inventory matrix and the untested states above remain open. The unchanged zone-list recipe now
  passes both repeats and the full comparison; this does not prove every delayed scrollbar state is captured.
