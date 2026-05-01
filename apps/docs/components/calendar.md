# Calendar

A Vue 3 calendar built around four views (Day, Week, Month, Agenda) and a top-level `<CoarCalendar>` shell that wires them together with prev / today / next navigation and a view switcher. Events use ISO-8601 strings on the public surface, so they round-trip cleanly with backend payloads, but the layout pipeline runs on `Temporal` internally for correct date math across DST boundaries.

```ts
import {
  CoarCalendar,
  // sub-views — usable standalone
  CoarDayView,
  CoarWeekView,
  CoarMonthView,
  CoarAgendaView,
  // types
  type CalendarEvent,
  type CalendarView,
  type ViewWindow,
} from '@cocoar/vue-calendar';
```

## Basic Usage

The shell takes an `events` array (any meta you like via `CalendarEvent<TMeta>`) and a `v-model:view` + `v-model:date` pair. Switch views via the segmented control in the header, or programmatically via the API.

<preview path="./calendar/demos/CalendarBasic.vue" />

## Views

`<CoarCalendar>` ships four views; you can also use any of them directly if you want to compose your own shell.

### Week & Day

The time-grid views (`week`, `day`) render an hour-by-hour vertical timeline with a sticky day-of-week header and an all-day band that pins under it as you scroll. Overlapping events are laid out with cluster-aware lane sizing — events with no transitive overlap take the full column width even when other parts of the day are busy.

### Month

The month view is a 6×7 grid showing the full calendar month plus leading / trailing days. Multi-day events render as continuous bars across the rows they touch; single-day events render as pills inside cells. When a cell would overflow its `maxEventsPerCell`, a "+ N more" link appears.

### Agenda

The agenda view is a chronological list grouped by day, virtualized via `VirtualizedSurface1DY` so 60+ days perform identically to a single week. Multi-day events appear on every day they cover, with a `(cont.)` tag on day-2 onwards. The current-day header floats at the top of the surface and is pushed up by the next inline header — same behaviour as native CSS sticky.

## Time Range / Working Hours

Constrain the visible hour range in `day` / `week` views via `time-range`. Pass `[startHour, endHour]` (24-hour). Default is `[0, 24]` (full day). Events outside the range are still rendered into the all-day band when applicable.

<preview path="./calendar/demos/CalendarWorkingHours.vue" />

## Locale & First Day of Week

Pass any BCP-47 locale via `locale`. The first day of week is auto-detected from the locale (`en-US` → Sunday, `de-AT` / `fr-FR` → Monday, `ja-JP` → Sunday) and used by the `month` and `week` view windows. Override with `firstDayOfWeek` (0 = Sunday … 6 = Saturday) when needed. Range labels and weekday names use the same locale.

<preview path="./calendar/demos/CalendarLocale.vue" />

## Custom Event Renderer

The `#event` slot replaces the default event card. The slot receives `{ event, view }` so you can render differently per view. The same slot is forwarded to all four sub-views.

<preview path="./calendar/demos/CalendarCustomEventSlot.vue" />

## Imperative API

`<CoarCalendar ref>` exposes a navigation + inspection API. `getVisibleRange()` returns the current `ViewWindow` (start / end / view) and is also fired as the `range-change` event whenever the window changes — use it to lazy-load events from a backend.

<preview path="./calendar/demos/CalendarImperativeApi.vue" />

## CalendarEvent Shape

Public events are plain JSON. The library reads the layout-relevant fields (`start`, `end`, `allDay`, `id`); anything you put in `meta` is opaque to the engine and forwarded back to your `#event` slot. Use the generic `CalendarEvent<TMeta>` to keep your meta strongly typed.

```ts
interface CalendarEvent<TMeta extends Record<string, unknown> = Record<string, unknown>> {
  /** Stable id. For occurrences of a recurring event, this is the SERIES id. */
  id: string;
  /** ISO-8601. Date-only string ('YYYY-MM-DD') is treated as all-day. */
  start: string;
  /** ISO-8601, exclusive. Defaults to start + slot duration / start + 1 day. */
  end?: string;
  /** Force all-day even if start has a time component (rare). */
  allDay?: boolean;
  /** Anything the consumer needs in their renderer. */
  meta?: TMeta;
}
```

The default event renderer reads `meta.title` and `meta.color` if present. Drop those in `meta` to skip writing a custom slot for simple cases.

## API

### `<CoarCalendar>` Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `v-model:view` | `'day' \| 'week' \| 'month' \| 'agenda'` | `'week'` | Active view. |
| `v-model:date` | `string` (ISO date) | today | Cursor / focus date. |
| `events` | `CalendarEvent<TMeta>[]` | `[]` | The event set. |
| `availableViews` | `CalendarView[]` | `['month','week','day','agenda']` | Filter the view-switcher. |
| `locale` | `string` | `'en-US'` | BCP-47 locale. |
| `timezone` | `string` | browser TZ | IANA timezone. |
| `firstDayOfWeek` | `0..6` | per-locale | 0 = Sun … 6 = Sat. |
| `timeRange` | `[number, number]` | `[0, 24]` | Visible hour range (day / week). |
| `slotDuration` | `5 \| 10 \| 15 \| 30 \| 60` | `30` | Slot subdivision in minutes. |
| `pixelsPerHour` | `number` | `60` | Time-grid row height. |
| `maxEventsPerCell` | `number` | `3` | Month-cell pill cap before "+ N more". |
| `agendaLengthDays` | `number` | `30` | Days the agenda window covers. |
| `showEmptyDays` | `boolean` | `false` | Render headers for days with no events (agenda). |
| `density` | `'comfortable' \| 'compact'` | `'comfortable'` | Tightens row heights / paddings. |

### Slots

| Slot | Scope | Purpose |
|------|-------|---------|
| `header` | `{ view, cursor, range, controls }` | Replace the entire header. |
| `headerStart` | `{ controls }` | Prepend before nav buttons. |
| `headerEnd` | `{ controls }` | Append after the view switcher. |
| `viewSwitcher` | `{ view, available, setView }` | Replace just the view switcher. |
| `event` | `{ event, view, layout?, item?, isContinuation? }` | **Primary slot.** Per-event renderer (forwarded to all sub-views). |
| `allDayEvent` | `{ event, layout }` | All-day band renderer (week / day). |
| `dayHeader` | `{ date, isToday, isWeekend }` | Per-day-column / per-month-cell header. |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:view` | `CalendarView` | v-model — view switched. |
| `update:date` | `string` | v-model — cursor moved. |
| `range-change` | `ViewWindow` | Visible range changed. Use to drive `loadEvents`. |
| `event-click` | `{ event, native }` | Event card clicked. |
| `date-click` | `{ date, native }` | Empty cell / day-header clicked. |
| `time-click` | `{ date, time, native }` | Empty time slot clicked (week / day). |
| `more-click` | `{ date, events, native }` | "+ N more" link clicked (month). |

### Imperative API (via `ref`)

```ts
interface CoarCalendarApi {
  goTo(date: string): void;        // jump cursor to ISO date
  goToToday(): void;
  next(): void;                    // ±1 view-page
  prev(): void;
  setView(view: CalendarView): void;
  getVisibleRange(): ViewWindow;
  getVisibleEvents(): CalendarEvent[];
  scrollToTime(hour: number): void;        // day / week only
  scrollToDate(iso: string): void;         // agenda only
  getActiveViewRef(): unknown;             // sub-view's exposed API
}
```

## Sub-Views as Standalone Components

Each view is exported and works on its own — useful when the shell's header is wrong for your design. Their props mirror the shell where relevant:

- `<CoarDayView :cursor :events :time-range :slot-duration :pixels-per-hour />`
- `<CoarWeekView :cursor :events :first-day-of-week …>`
- `<CoarMonthView :cursor :events :first-day-of-week :max-events-per-cell …>`
- `<CoarAgendaView :range-start :range-end :events :show-empty-days …>`

All four accept the same `#event` slot signature, so a renderer written once works in any view.

## Performance Notes

- **Variable-size virtualization.** The agenda surface uses a Fenwick-tree-backed measurement cache so every day-row keeps its natural height (header ~37 px, event ~42 px) without breaking anchor-restoration when the user scrolls.
- **No recycling pool.** Vue's keyed v-for diff turned out faster than a stable pool for typical slot content. Heavy custom renderers (charts, video) might still benefit; the surface accepts a custom recycling pool if needed.
- **Cluster-aware lane sizing.** Events with no transitive overlap render at full width even when busy parts of the same day have 3-deep stacks. Matches Google / Outlook behaviour.
- **LoAF, not rAF.** The CI perf gate measures Long Animation Frame entries; rAF FPS is unreliable under wheel-scroll on Chrome (input dispatch defers callbacks 1-2 vsync ticks without producing visual jank).
