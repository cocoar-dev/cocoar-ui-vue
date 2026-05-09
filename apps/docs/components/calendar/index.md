# Calendar <Badge type="warning" text="Preview" />

A Vue 3 calendar built around four views — **Day**, **Week**, **Month**, **Agenda** — and a top-level [`<CoarCalendar>`](/components/calendar/coar-calendar) shell that wires them together with prev / today / next navigation and a view switcher.

Events on the public surface use **`Temporal`** values directly (`PlainDate` for all-day, `ZonedDateTime` for timed) — there's no string parsing or implicit-zone guessing. Consumers convert their wire format (ISO strings, epoch ms, etc.) at the boundary; the calendar receives unambiguous values and runs all date math on them across DST boundaries.

```ts
import {
  // Top-level shell + composer
  CoarCalendar,
  useCalendar,
  // Sub-views — each usable standalone via a matching composable
  CoarDayView,    useDayView,
  CoarWeekView,   useWeekView,
  CoarMonthView,  useMonthView,
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

## Two ways to use the calendar

### As a single shell

[`<CoarCalendar>`](/components/calendar/coar-calendar) is the all-in-one component: header with prev / today / next, a segmented-control view switcher, and the body that dispatches to whichever view is active. **One** `useCalendar()` builder feeds it; switching views is just `api.setView('agenda')`.

```ts
const { builder, api } = useCalendar();
builder.events(events).date(date).timezone('Europe/Vienna');
```

```html
<CoarCalendar :builder="builder" />
```

::: tip Use the shell when…
You want all four views, navigation chrome, and a consistent feel without writing custom layout. This is the path 90 % of consumers want.
:::

### As a single sub-view

Each sub-view is exported and consumes its OWN `:builder` produced by a matching composable:

| View | Component | Composable | Builder |
|---|---|---|---|
| Day | [`<CoarDayView>`](/components/calendar/day-view) | `useDayView()` | `CalendarBuilder` |
| Week | [`<CoarWeekView>`](/components/calendar/week-view) | `useWeekView()` | `CalendarBuilder` |
| Month | [`<CoarMonthView>`](/components/calendar/month-view) | `useMonthView()` | `CalendarBuilder` |
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
| 5 | **C8** Recurrence is a first-class type | `RecurringSeries` lives separately from `CalendarEvent`. `expandSeries(...)` ships as a typed throwing stub today — the engine wires up post-launch, but the contract is stable now so consumers can build against it. |

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

The default event renderer reads `meta.title` and `meta.color` if present. Drop those in `meta` to skip writing a custom renderer for simple cases.

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

This applies on every builder — the shell composer, every sub-view standalone, and the sub-builders inside the shell.

## Theming

The calendar reads CSS custom properties at runtime, so themes apply the moment you set them on any ancestor — typically `:root`, the calendar's wrapper, or a per-instance class.

Two layers of tokens. **Calendar-specific** tokens are unique to this component and override only what would otherwise inherit from the design system. **Inherited DS tokens** are the shared `--coar-*` palette / type / radius scale every Cocoar component uses; they're listed here for completeness so consumers know what to set if they're embedding the calendar in a non-Cocoar host.

### Calendar-specific

| Token | Default | Purpose |
|---|---|---|
| `--coar-calendar-bg` | `#fff` | Background of every cell, header, and band. |
| `--coar-calendar-bg-today` | `rgba(37, 99, 235, 0.04)` | Today highlight on month cells + day-column tint. |
| `--coar-calendar-bg-weekend` | `#f6f7f9` | Weekend tint (Sat/Sun) on month cells + day-columns. |
| `--coar-calendar-bg-other-month` | `#fafafb` | Leading / trailing days outside the active month. |
| `--coar-calendar-border` | `#d1d5db` | Cell borders, header underlines, axis dividers. |
| `--coar-calendar-grid-line` | `#e3e5e9` | The slot-line gradient inside time-grid columns. |
| `--coar-time-grid-axis-width` | `80px` | Width of the hour-axis on the left of Day / Week. |
| `--coar-time-grid-header-height` | _auto_ | Sticky day-of-week header min-height. |

### Inherited from the design system

Used as direct `var()` references. Override at the design-system level rather than per-calendar-instance unless you need a calendar-only variant.

| Group | Tokens |
|---|---|
| Palette | `--coar-color-accent`, `--coar-color-accent-soft`, `--coar-color-danger`, `--coar-background-accent-primary`, `--coar-background-neutral-primary`, `--coar-background-neutral-tertiary`, `--coar-surface-subtle` |
| Text | `--coar-text-base`, `--coar-text-subtle`, `--coar-text-neutral-primary` |
| Type | `--coar-font-size-base`, `--coar-font-size-sm`, `--coar-font-size-xs`, `--coar-body-base-family` |
| Shape | `--coar-radius-md`, `--coar-radius-xs`, `--coar-border-neutral-tertiary` |

### Example: dark theme

```css
.dark .coar-calendar,
.dark .coar-month-view,
.dark .coar-day-view,
.dark .coar-week-view,
.dark .coar-agenda-view {
  --coar-calendar-bg: #1a1c1f;
  --coar-calendar-bg-today: rgba(96, 165, 250, 0.08);
  --coar-calendar-bg-weekend: #14161a;
  --coar-calendar-bg-other-month: #111316;
  --coar-calendar-border: #2a2e34;
  --coar-calendar-grid-line: #25282d;
}
```

The DS-level tokens (`--coar-color-accent`, `--coar-text-base`, etc.) typically already flip in your design-system's dark theme — only the calendar-specific tokens need explicit overrides above.

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
- **[Day View](/components/calendar/day-view)** — single-day time-grid surface.
- **[Week View](/components/calendar/week-view)** — 7-day time-grid + all-day band.
- **[Month View](/components/calendar/month-view)** — 6×7 grid with multi-day bars + per-cell pills.
- **[Agenda View](/components/calendar/agenda-view)** — virtualized chronological list grouped by day.
