---
description: "@cocoar/vue-calendar — Temporal-based Vue 3 calendar with Year, Month, Week, Day and Agenda views, iOS-style display variations, recurrence and standalone sub-views"
---

# Calendar <Badge type="warning" text="Preview" />

A Vue 3 calendar whose visible hierarchy follows the iOS calendar: **Year**, **Month**, **Day** and **Agenda**, plus fixed **Week** and **Work week** time grids for web applications. Month and Day expose their display choices as nested variations instead of flattening every renderer into the primary view switcher.

Events on the public surface use **`Temporal`** values directly (`PlainDate` for all-day, `ZonedDateTime` for timed) — there's no string parsing or implicit-zone guessing. Consumers convert their wire format (ISO strings, epoch ms, etc.) at the boundary; the calendar receives unambiguous values and runs all date math on them across DST boundaries.

```ts
import {
  // Top-level shell + composer
  CoarCalendar,
  useCalendar,
  // Sub-views — each usable standalone via a matching composable
  CoarYearView,
  CoarContinuousMonthView,
  CoarMonthListView,
  CoarMonthView,  useMonthView,
  CoarDayView,    useDayView,
  CoarWeekView,   useWeekView,
  CoarAgendaView, useAgendaView,
  // Drop-in display-zone selector (writes to a string ref consumed by `builder.timezone(ref)`)
  CoarDisplayZoneSwitcher,
  // Helper for surfacing C3 / C5 zone semantics in custom renderers
  getEventZoneHints,
  // Public types
  type CalendarEvent,
  type CalendarView,
  type ViewWindow,
  type EventZoneHints,
} from '@cocoar/vue-calendar';
```

## Install

```bash
pnpm add @cocoar/vue-calendar
```

The component styles ship as one stylesheet on the `./styles` subpath. Import it once, next to the design-system styles:

```ts
import '@cocoar/vue-ui/styles';
import '@cocoar/vue-calendar/styles';
```

### Localization

Every visible label (`Today`, `Month`, `All day`, the a11y announcements, …) is looked up as a `coar.calendar.*` key through the host's `@cocoar/vue-localization` service, with English fallbacks inline. The package ships German and English catalogs plus a translation source, so a host registers them instead of maintaining the key list by hand:

```ts
import { createCoarLocalization } from '@cocoar/vue-localization';
import { createCalendarTranslationSource, calendarMessages } from '@cocoar/vue-calendar';

const localization = createCoarLocalization({ defaultLanguage: 'de-AT' });
localization.service.addTranslationSource(createCalendarTranslationSource());
app.use(localization);
```

Regional tags resolve to their base language (`de-AT` → `de`). A host source registered **after** the calendar's overrides per key, so app-specific wording still wins. `calendarMessages.en` / `.de` are the flat key → text maps for hosts that bundle one catalog file themselves. Date, time and weekday names are never in the catalog — they come from `Intl` (C6).

## Two ways to use the calendar

### As a single shell

[`<CoarCalendar>`](/components/calendar/coar-calendar) is the all-in-one component: header with prev / today / next, a primary view switcher, nested Month / Day display controls, and the body that dispatches to whichever view is active. **One** `useCalendar()` builder feeds it; switching views is just `api.setView('agenda')`.

```ts
const { builder, api } = useCalendar();
builder.events(events).date(date).timezone('Europe/Vienna');
```

```html
<CoarCalendar :builder="builder" />
```

::: tip Use the shell when…
You want the complete view hierarchy, navigation chrome, and a consistent feel without writing custom layout. This is the path 90 % of consumers want.
:::

### As a single sub-view

Each sub-view is exported and consumes its OWN `:builder` produced by a matching composable:

| View | Component | Composable | Builder |
|---|---|---|---|
| Year | [`<CoarYearView>`](/components/calendar/year-view) | `useCalendar()` + `.view('year')` | `CalendarBuilder` |
| Continuous Month | [`<CoarContinuousMonthView>`](/components/calendar/month-view) | `useCalendar()` + `.view('month')` | `CalendarBuilder` |
| Month List | [`<CoarMonthListView>`](/components/calendar/month-view#month-list) | `useCalendar()` + `.view('monthList')` | `CalendarBuilder` |
| Day | [`<CoarDayView>`](/components/calendar/day-view) | `useDayView()` | `CalendarBuilder` |
| Week | [`<CoarWeekView>`](/components/calendar/week-view) | `useWeekView()` | `CalendarBuilder` |
| Single Month Section | [`<CoarMonthView>`](/components/calendar/month-view#single-month-section) | `useMonthView()` | `CalendarBuilder` |
| Agenda | [`<CoarAgendaView>`](/components/calendar/agenda-view) | `useAgendaView()` | `CalendarBuilder` |

```ts
const { builder } = useMonthView();
builder.events(events).date(cursor).timezone('Europe/Vienna');
```

```html
<CoarMonthView :builder="builder" />
```

::: tip Use a sub-view directly when…
You're building your own header / chrome, embedding the calendar in a larger layout, or only need one view forever. Sub-views skip the navigation header + view switcher entirely.
:::

The standalone composables and the shell composer share the same universal config surface (events / locale / timezone / density / handlers / renderers), so a renderer or handler written once works in either context. The flat `CalendarBuilder` carries every view's config — there are no per-view sub-builders to reach into.

## Architecture invariants (C1–C8) {#invariants}

Eight non-negotiable invariants drawn from the ["Time in Software, Done Right"][articles] article series. They're enforced **structurally** — by the type surface, by the test suite, by the single drop pipeline — not by convention. Other docs pages reference them by id (e.g. "Article 3 / C5"); this is the canonical reference.

[articles]: https://dev.to/bwi/why-a-date-is-not-a-point-in-time-ad8

| Article | Invariant | What it means |
|---|---|---|
| 1, 2, 4, 8 | **C1** Temporal-only public surface | Strings, `Date`, `PlainDateTime`, `Instant` rejected at the events-watcher boundary by `validateCalendarEvent`. Only `Temporal.ZonedDateTime` (timed) or `Temporal.PlainDate` (all-day) cross the wire. |
| 4, 5 | **C2** Single drop pipeline | Exactly one function (`applyMoveToEvent`) converts a UI drop → new endpoints. Mouse, keyboard, touch all reach it once — same code path, same DST resolution, same payload shape. |
| 4 | **C3** Source zone preserved per-endpoint | Cross-zone events are first-class. A Tokyo→Vienna flight keeps both endpoints in their source zones across every drag mode; the library never collapses both ends to one zone. |
| 5 | **C4** DST disambiguation explicit | `DstPolicy` (`'compatible' \| 'reject' \| 'earlier' \| 'later'`) is a **required** parameter of every wall-time → instant conversion. No silent default — gap / overlap behaviour is always opted into. |
| 3, 4 | **C5** Display zone vs source zone separated | `EventDropPayload.target.displayZone` (the zone the user's eyes saw) and `next.start.timeZoneId` (where the event actually lives) are distinct fields. Switching display zone never destroys event intent. |
| 9 | **C6** Three independent display decisions | `locale`, `dateStyle`, `timeStyle`, `hour12` are independent setters, none derived from another. `buildFormatOptions(base, overrides)` is the only `Intl.DateTimeFormat` merge point. |
| spirit | **C7** Reactivity by reads, not setup-captures | Every consumer function (`canDrop`, `eventsLoader`, `eventRenderer`, `dayHeaderRenderer`) is read on every invocation — never captured at setup. Mutating the builder mid-session always takes effect on the next call. |
| 5 | **C8** Recurrence is a first-class type | `RecurringSeries` lives separately from `CalendarEvent`. RRULE / RDATE / EXDATE expand only for the visible window through the lazy bundled `rrule-temporal` engine, with occurrence provenance preserved for consumer-side series editing. |

The conformance test suite at `src/core/__tests__/timezone/` pins every invariant; CI fails if any of them slips.

## CalendarEvent shape

The library reads the layout-relevant fields (`start`, `end`, `id`); anything you put in `meta` is opaque to the engine and forwarded back to your renderer / slot. Use the generic `CalendarEvent<TMeta>` to keep your meta strongly typed.

```ts
import { Temporal } from '@js-temporal/polyfill';

interface CalendarEvent<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  /** Stable id. For occurrences of a recurring event, this is the SERIES id. */
  id: string;
  /**
   * `ZonedDateTime` for timed events, `PlainDate` for all-day events.
   * The shape of `start` discriminates the event type — there is no
   * separate `allDay` flag.
   */
  start: Temporal.ZonedDateTime | Temporal.PlainDate;
  /** Exclusive end. Must match `start`'s shape. Defaults to start + slot duration (timed) / start + 1 day (all-day). */
  end?: Temporal.ZonedDateTime | Temporal.PlainDate;
  /** Anything the consumer needs in their renderer. */
  meta?: TMeta;
}
```

Construct events directly from `Temporal`:

```ts
import { Temporal } from '@js-temporal/polyfill';

// All-day event:
{ id: 'devconf', start: Temporal.PlainDate.from('2026-04-13'), end: Temporal.PlainDate.from('2026-04-16') }

// Timed event in UTC:
{
  id: 'standup',
  start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[Europe/Vienna]'),
  end:   Temporal.ZonedDateTime.from('2026-04-15T09:30:00[Europe/Vienna]'),
}

// Timed event in a specific zone:
{
  id: 'vienna-call',
  start: Temporal.ZonedDateTime.from('2026-06-15T10:00:00[Europe/Vienna]'),
  end:   Temporal.ZonedDateTime.from('2026-06-15T11:00:00[Europe/Vienna]'),
}
```

The default event renderer reads `meta.title` and `meta.color` if present. Drop those in `meta` to skip writing a custom renderer for simple cases. Text on the coloured surface is black or white by contrast policy (`builder.eventTextContrast('wcag' | 'apca')`); `meta.textColor` (any CSS colour) overrides that choice for one event — tones on the fence are a design decision, not a computation.

## Display zone — switcher + on-card hints

Every event keeps its **source** zone (`start.timeZoneId`); the calendar renders it in whatever **display** zone the builder is configured with (`.timezone(ref)`). The two are kept separate by design — invariant C5 — so switching the display zone never destroys event intent. Two pieces of UI surface this distinction without writing any custom renderer:

```ts
import { CoarDisplayZoneSwitcher, getEventZoneHints } from '@cocoar/vue-calendar';

const tz = ref(Intl.DateTimeFormat().resolvedOptions().timeZone);
const { builder } = useCalendar();
builder.timezone(tz);
```

```html
<CoarDisplayZoneSwitcher v-model="tz" />
<CoarCalendar :builder="builder" />
```

`<CoarDisplayZoneSwitcher>` is a `<CoarSelect>` pre-populated with a curated short-list of common zones plus the browser-detected zone — pass `:options="..."` to swap in a domain-specific list (or `Intl.supportedValuesOf('timeZone')` for the full IANA roster).

The default event renderers also surface two zone semantics inline on every card:

- **Globe icon** when `start.timeZoneId === 'UTC'` — Article 5's "global event, same instant worldwide" (product launches, livestreams).
- **Cross-zone tag** (globe + accent dot) + tooltip when `start.timeZoneId` differs from the display zone — Article 3's fairness contract: we render the user's clock but don't hide where the event actually lives.

Both are rendered with `title=""` tooltips and an inline sr-only span for screen readers. The two are mutually exclusive — a UTC-anchored event in a non-UTC display gets only the global icon. Custom renderers can re-use the same logic via `getEventZoneHints(event, displayZone)`:

```ts
import { getEventZoneHints } from '@cocoar/vue-calendar';

builder.eventRenderer((ctx) => {
  const { isUtcAnchored, sourceZone } = getEventZoneHints(ctx.event, displayZone.value);
  // …draw whatever icon / chip / accent suits your design.
});
```

## Reactive configuration

Every config setter accepts `MaybeRefOrGetter<T>` — pass a static value, a `ref()`, or a `() => …` getter and Vue tracks whatever shape you give it.

```ts
const { builder } = useCalendar();

builder.timezone('Europe/Vienna');               // static
builder.timezone(timezoneRef);                   // ref
builder.density(() => narrow.value ? 'compact' : 'comfortable');  // getter / computed
```

This applies to the one flat builder shared by the shell and to every standalone sub-view builder.

## Theming

The calendar reads CSS custom properties at runtime, so themes apply the moment you set them on any ancestor — typically `:root`, the calendar's wrapper, or a per-instance class.

Two layers of tokens. **Calendar-specific** tokens are unique to this component and override only what would otherwise inherit from the design system. **Inherited DS tokens** are the shared `--coar-*` palette / type / radius scale every Cocoar component uses; they're listed here for completeness so consumers know what to set if they're embedding the calendar in a non-Cocoar host.

### Calendar-specific

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--coar-color-accent` | → `--coar-color-accent-500`, then `#2563eb` | same | Today markers (day number, column header, agenda badge), default event fill in list surfaces, cross-zone hint dot. Never defined by the package: it follows the vue-ui accent ramp (so `--coar-accent` rebrands it) unless the host sets it explicitly. |
| `--coar-calendar-bg` | `#fff` | `#18181b` | Background of every cell, header, and band. |
| `--coar-calendar-bg-today` | `rgba(37, 99, 235, 0.04)` | `#2563eb24` | Today highlight on month cells + day-column tint. |
| `--coar-calendar-bg-weekend` | `#f6f7f9` | `#212125` | Weekend tint (Sat/Sun) on month cells + day-columns. |
| `--coar-calendar-bg-other-month` | `#fafafb` | `#131316` | Leading / trailing days outside the active month. |
| `--coar-calendar-border` | `#d1d5db` | `#3f3f46` | Cell borders, header underlines, axis dividers. |
| `--coar-calendar-grid-line` | `#e3e5e9` | `#2c2c30` | The slot-line gradient inside time-grid columns. |
| `--coar-calendar-agenda-divider` | → `--coar-calendar-border`, then `#f3f4f6` | `#27272a` | Row separator between agenda entries. |
| `--coar-calendar-event-default-bg` | → `--coar-color-accent-soft`, then `#93c5fd` | `#1e3a8a` | Fill of events without a `meta.color`. |
| `--coar-calendar-point-edge-height` | `3px` | — | Start-edge bar on point events (timed, no `end`) in Day / Week. |
| `--coar-calendar-point-body-opacity` | `0.38` | — | Body fill opacity of point events (title stays fully opaque). |
| `--coar-calendar-scroll-inset-bottom` | `0px` | — | Extra scroll room at the bottom of every scrolling surface (Day / Week grids, Month, List, Agenda, Timeline, Year), so the last rows can clear host chrome that overlays the bottom edge. See [Host chrome over the bottom edge](#host-chrome-over-the-bottom-edge). |
| `--coar-time-grid-axis-width` | `80px` | — | Width of the hour-axis on the left of Day / Week. |
| `--coar-time-grid-header-height` | _auto_ | — | Sticky day-of-week header min-height. |

Light values are per-usage `var()` fallbacks — the tokens are undefined in light mode, so a single override anywhere wins. Dark values ship with the package stylesheet (see below).

### Host chrome over the bottom edge

On phones something almost always sits over the bottom of the viewport — a tab bar, a floating action button, the home-indicator safe area. Padding *around* the calendar doesn't help: the scroll container is inside the component, and outer padding shrinks the surface instead of letting the content scroll past the overlay. `--coar-calendar-scroll-inset-bottom` adds that room *inside* every scrolling surface (the same content inset the iOS calendar applies), and keyboard / focus scrolling honours it through `scroll-padding-bottom`.

```css
/* A 56 px bottom bar plus the device's safe area. */
.my-app .coar-calendar {
  --coar-calendar-scroll-inset-bottom: calc(56px + env(safe-area-inset-bottom));
}
```

The token is read at runtime, so it can change with the host's layout (a bar that hides while scrolling, a sheet that opens). Standalone sub-views read it the same way.
### Inherited from the design system

Used as direct `var()` references. Override at the design-system level rather than per-calendar-instance unless you need a calendar-only variant.

| Group | Tokens |
|---|---|
| Palette | `--coar-color-accent`, `--coar-color-accent-soft`, `--coar-color-danger`, `--coar-background-accent-primary`, `--coar-background-neutral-primary`, `--coar-background-neutral-tertiary`, `--coar-surface-subtle` |
| Text | `--coar-text-base`, `--coar-text-subtle` (calendar-local names — not defined by `@cocoar/vue-ui`; dark values ship with this package), `--coar-text-neutral-primary` |
| Type | `--coar-font-size-base`, `--coar-font-size-sm`, `--coar-font-size-xs`, `--coar-body-base-family` |
| Shape | `--coar-radius-md`, `--coar-radius-xs`, `--coar-border-neutral-tertiary` |

### Dark mode

Dark values for every calendar token ship with the package stylesheet — no consumer CSS needed. They activate on either trigger:

- `.dark-mode` class on `<html>` or any ancestor (the Cocoar convention, same as `@cocoar/vue-ui`)
- `[data-theme="dark"]` attribute

The values mirror the SwiftUI port (`Cocoar.Calendar.iOS`, `CalendarTheme.dark`), so web and iOS render identically dark. Accent and danger stay scheme-invariant, and event colors provided via `meta.color` are **not** remapped in either mode — dark-safe event palettes are the consumer's responsibility.

To customize, redefine any token under the same trigger after the package styles:

```css
.dark-mode,
[data-theme='dark'] {
  --coar-calendar-bg: #101014;
}
```

::: tip RTL
Layout-mirroring for `direction: rtl` is **not yet** wired (multi-day bars, resize handles, sticky-header positioning all assume LTR). If you need RTL support, open an issue — the math is mostly localised to the bar / handle inset calc()s, but it deserves a deliberate pass with proper test coverage rather than a one-shot patch.
:::

## Performance notes

- **Variable-size virtualization.** The agenda surface uses a Fenwick-tree-backed measurement cache so every day-row keeps its natural height (header ~37 px, event ~42 px) without breaking anchor-restoration when the user scrolls.
- **No recycling pool.** Vue's keyed v-for diff turned out faster than a stable pool for typical slot content. Heavy custom renderers (charts, video) might still benefit; the surface accepts a custom recycling pool if needed.
- **Cluster-aware lane sizing.** Events with no transitive overlap render at full width even when busy parts of the same day have 3-deep stacks. Matches Google / Outlook behaviour.
- **LoAF, not rAF.** The CI perf gate measures Long Animation Frame entries; rAF FPS is unreliable under wheel-scroll on Chrome (input dispatch defers callbacks 1-2 vsync ticks without producing visual jank).

## Where to next

- **[`<CoarCalendar>` (composer)](/components/calendar/coar-calendar)** — the top-level shell + the full builder API reference.
- **[Year View](/components/calendar/year-view)** — responsive twelve-month overview and drill-in.
- **[Month Views](/components/calendar/month-view)** — continuous Compact / Stacked / Details months and responsive Month List.
- **[Day View](/components/calendar/day-view)** — one-day or width-aware multi-day time-grid surface.
- **[Week View](/components/calendar/week-view)** — 7-day time-grid + all-day band.
- **[Agenda View](/components/calendar/agenda-view)** — virtualized chronological list grouped by day.
