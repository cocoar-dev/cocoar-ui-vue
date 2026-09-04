---
description: "CoarCalendar — top-level calendar shell wiring the iOS-style Year, Month, Day and Agenda hierarchy plus Week and Work Week, driven by the chainable useCalendar builder"
---

# `<CoarCalendar>` — Composer <Badge type="warning" text="Preview" />

`<CoarCalendar>` is the top-level shell that wires the complete calendar hierarchy together with prev / today / next navigation and responsive display controls. It's driven by the **builder** returned from `useCalendar()` — a single chainable surface that owns events, recurrence, configuration, handlers, renderers, and an imperative `api` object.

The builder is **flat**: every setter lives directly on it, including view-specific ones (`timeRange`, `slotDuration` for Day / Week; `maxEventsPerCell` for Month; `agendaLengthDays` / `showEmptyDays` for Agenda). View-specific settings are no-ops outside their target view, so a single chained `.timeRange(...).maxEventsPerCell(...)` is fine — each one only takes effect when the matching view is active.

When you embed `<CoarDayView>` / `<CoarWeekView>` / `<CoarMonthView>` / `<CoarAgendaView>` standalone (without the shell), they consume the same builder type — `useDayView()` etc. are just shorthands that pre-set the matching `view` value.

## View hierarchy

The primary switcher follows iOS while keeping the fixed web time grids as useful additions:

| Primary view | Display choices |
|---|---|
| Year | Responsive twelve-month overview; selecting a day or month drills into Month. |
| Month | Compact, Stacked, Details, List. The first three use continuously scrolling 4–6-week month sections. |
| Week | Fixed seven-day time grid. |
| Work week | The Week grid filtered by `workDays(...)`. |
| Day | One day or width-aware Multi-day (1–7 complete columns). |
| Agenda | Virtualized chronological list. |

`monthList` is a serializable `CalendarView`, but the shell presents it as the **List** choice under Month. Likewise, `dayMode('single' | 'multiDay')` changes the Day renderer without adding another primary view. `dayAgenda` and `timeline` remain opt-in views and are not in the default switcher.

```ts
builder
  .availableViews(['year', 'month', 'monthList', 'week', 'workWeek', 'day', 'agenda'])
  .monthDensity('stacked')
  .dayMode('multiDay')
  .dayColumnMinWidth(220)
  .shadeWeekends(true);
```

## Basic usage

```ts
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarCalendar,
  useCalendar,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    // Daily standup at 09:00 IN VIENNA — store the human's intent
    // (local time + IANA zone), not a UTC instant. See
    // "Display vs source zone" below.
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[Europe/Vienna]'),
    end:   Temporal.ZonedDateTime.from('2026-04-15T09:30:00[Europe/Vienna]'),
    meta: { title: 'Daily standup', color: '#10b981' },
  },
  {
    id: 'devconf',
    start: Temporal.PlainDate.from('2026-04-13'),
    end:   Temporal.PlainDate.from('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
]);
const view = ref<CalendarView>('week');
const date = ref('2026-04-15');

const { builder, api } = useCalendar();
builder
  .events(events)
  .view(view)              // caller-owned view ref (optional)
  .date(date)              // caller-owned date ref (optional)
  .timezone('Europe/Vienna') // DISPLAY zone — set this to a real IANA
                             // zone (or `detectBrowserTimezone()`).
                             // Don't use 'UTC' unless your users
                             // actually live in UTC.
  .onEventClick(({ event }) => console.log(event.id));
```

::: warning Don't use `'UTC'` as your display zone
UTC is a derived value (article 4: "store intent, derive math"). If your users live in Vienna, set `.timezone('Europe/Vienna')`. If you serve users worldwide, set `.timezone(detectBrowserTimezone())`. Setting the display zone to UTC makes 09:00 wall-time render at 11:00 in summer / 10:00 in winter — invisible bugs that surface when you ship.
:::

```html
<CoarCalendar :builder="builder" />
```

<preview path="./demos/CalendarBasic.vue" />

::: tip Why a builder?
Mirrors the `CoarGridBuilder` pattern from `<CoarDataGrid>`. One chainable surface keeps the consumer code linear, makes optional features (renderers, loaders, handlers) easy to register in any order, and gives us a single `api` object for imperative control.
:::

## Time range / Working hours

Constrain the visible hour range in `day` / `week` views via `timeRange([startHour, endHour])` (24-hour). Default is `[0, 24]` (full day). Events outside the range are still rendered into the all-day band when applicable.

<preview path="./demos/CalendarWorkingHours.vue" />

## Locale & first day of week

Pass any BCP-47 locale via `locale(...)`. Without it the calendar follows the host's `@cocoar/vue-localization` language, and `en-US` when no localization service is installed. The first day of week is auto-detected from the locale (`en-US` → Sunday, `de-AT` / `fr-FR` → Monday, `ja-JP` → Sunday) and used by the `month` and `week` view windows. Override with `firstDayOfWeek(0..6)` (0 = Sunday … 6 = Saturday) when needed. Range labels and weekday names use the same locale.

<preview path="./demos/CalendarLocale.vue" />

## Display vs source zone

The calendar separates the **display zone** (where events are rendered on the grid) from each event's **source zone** (the zone the consumer captured when creating the event). This is the most common source of bugs when porting calendar code from string-based APIs, so it's worth being explicit:

- **`builder.timezone(tz)` is the DISPLAY zone.** Every column / row / hour-axis label resolves in this zone. Switching it (`builder.timezone('Asia/Tokyo')`) re-renders existing events at their Tokyo wall-clock time without mutating the events.

- **`event.start.timeZoneId` is the SOURCE zone** — what the human meant when they put the event on the calendar. A meeting in Vienna is `ZonedDateTime.from('2026-06-15T10:00:00[Europe/Vienna]')`, regardless of whose calendar it eventually lands on.

- **Cross-zone events are allowed.** `start.timeZoneId !== end.timeZoneId` is fine (e.g. a flight from Tokyo to Vienna is `start: …[Asia/Tokyo]`, `end: …[Europe/Vienna]`). The calendar renders both endpoints in the display zone using their underlying instant; the source zones are preserved on the event for round-tripping.

- **All-day events are intentionally zone-less.** A `PlainDate` carries no zone — that's the correct shape for a holiday, vacation, or anniversary. They appear on the calendar day with that name in every display zone, never shifting.

```ts
// Same builder, two display zones — the underlying event is identical.
builder.events([
  {
    id: 'sync',
    // SOURCE zone is Vienna — that's where the meeting was scheduled.
    start: Temporal.ZonedDateTime.from('2026-06-15T10:00:00[Europe/Vienna]'),
    end:   Temporal.ZonedDateTime.from('2026-06-15T11:00:00[Europe/Vienna]'),
  },
]);

builder.timezone('Europe/Vienna');  // renders 10:00–11:00 on Mon Jun 15
builder.timezone('Asia/Tokyo');     // same event renders 17:00–18:00 on Mon Jun 15
builder.timezone('America/Los_Angeles'); // same event renders 01:00–02:00 on Mon Jun 15
```

::: tip Where to set the display zone
Most apps want a single display zone matching the viewer's local zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). If you ship a "show in my zone" toggle, the only thing that needs to change is `builder.timezone(...)` — the events themselves stay put.
:::

## DST handling and the drop payload

Article 5 of the *Time in Software, Done Right* series demands that DST gaps and overlaps be handled **explicitly**. The library plumbs four policies through `.dstPolicy(...)`:

| Policy | Gap (e.g. 02:30 Vienna on spring-forward) | Overlap (e.g. 02:30 Vienna on fall-back) |
|---|---|---|
| `'compatible'` (default) | Shifts forward to the first valid minute | Picks the **earlier** instant |
| `'reject'` | Drop is vetoed — `canDrop=false`, snap-back fires | Same: vetoed |
| `'earlier'` | Same as compatible | Picks the earlier instant |
| `'later'` | Same as compatible | Picks the later instant |

Whatever policy fires, the resolved drop is reported to your `onEventDrop` handler with a `target.disambiguation` field — `'gap'`, `'overlap'`, or `null` for clean drops. **Consumer apps that want to surface DST resolutions should read this field** and show a toast / dialog accordingly:

```ts
builder.onEventDrop(({ event, next, target }) => {
  if (target.disambiguation === 'gap') {
    showToast(`DST gap — your meeting was shifted to ${next.start}`);
  } else if (target.disambiguation === 'overlap') {
    showToast(`DST fall-back — using the ${dstPolicy === 'later' ? 'second' : 'first'} 02:30`);
  }
  // ...persist next.start / next.end on your event store
});
```

Article 5 quote: *"You need to decide, and your code needs to handle it explicitly."* The lib gives you the explicit handle; ignoring it silently corrupts user expectations.

::: tip Cross-zone events keep their zones
`next.start.timeZoneId` and `next.end.timeZoneId` may differ — a Tokyo→Vienna flight stays Tokyo→Vienna across drag-and-drop. Persist both values verbatim; don't "normalise" to one zone.
:::

::: tip Undo / audit log: persist `original.displayZone` and `target.displayZone`
The drop payload carries the **user's viewing context** in two places:

- `original.displayZone` — the zone the calendar was rendering in when the drag started.
- `target.displayZone` — the zone the drop snapped in (usually the same; differs only if the user toggled `.timezone()` mid-drag).

Storing both alongside `next.start` / `next.end` lets you (a) replay the user's intent on undo without inheriting whatever zone they've toggled to since, and (b) write an audit log honest about "user moved this meeting AT 14:00 IN EUROPE/VIENNA". Article 3: deadlines are hard precisely because the wall-clock + the zone are inseparable. See `CalendarBasic.vue` demo for the canonical pattern.
:::

## Custom event rendering

Two ways to customise event rendering — pick whichever fits the consumer code better. **Slot wins over builder renderer** when both are present.

### Template slot

The `#event` slot replaces the default event card. The slot receives `{ event, view, layout?, item? }` so you can render differently per view. The shell forwards it to every event-rendering sub-view (and uses it as a fallback for month pills / bars when no specific `#pill` / `#multiDayBar` slot is supplied).

<preview path="./demos/CalendarCustomEventSlot.vue" />

### Builder renderer

`builder.eventRenderer(...)` accepts three forms — register once, applies everywhere a slot isn't already supplied:

```ts
// (A) one component for all events
builder.eventRenderer(MyEventCard);

// (B) function returning a component — choose by event meta
builder.eventRenderer((ctx) =>
  ctx.event.meta?.kind === 'meeting' ? MeetingCard : DefaultCard,
);

// (C) function returning a VNode — fully custom h() output
builder.eventRenderer((ctx) =>
  h('div', { class: 'pill' }, ctx.event.id),
);
```

### Branching per layout variant

The same event can render in four very different visual shapes depending on the view it lands in:

| `ctx.layout.kind` | Where it appears | Visual |
|---|---|---|
| `'positioned'` | Day / Week time-grid | Card pinned to an hour, color-bar on the leading edge |
| `'allDayBar'` | Day / Week all-day band | Bar that spans multiple day-columns at the top of the time-grid |
| `'monthPill'` | Month cell (single-day event) | Rounded pill stacked inside the cell |
| `'monthBar'` | Month row (multi-day event) | Bar that spans across day-cells in a row |

`builder.eventRenderer((ctx) => …)` is invoked for **every** variant. Inspect `ctx.layout?.kind` and branch:

```ts
builder.eventRenderer((ctx) => {
  switch (ctx.layout?.kind) {
    case 'monthPill':
      return h('div', { class: 'fancy-pill' }, [
        h('span', '🎉'),
        h('span', ctx.event.meta.title),
      ]);
    case 'monthBar':
      return h('div', { class: 'fancy-bar' }, ctx.event.meta.title);
    case 'allDayBar':
      return h('div', { class: 'fancy-allday' }, ctx.event.meta.title);
    case 'positioned':
      return h('div', { class: 'fancy-card' }, [
        h('span', { class: 'time' }, ctx.event.start.toString()),
        h('span', ctx.event.meta.title),
      ]);
    default:
      // Agenda rows etc. — fall through to the lib's default by
      // returning `undefined`.
      return undefined;
  }
});
```

Returning `undefined` from any branch lets the lib fall back to its built-in default for that variant.

::: tip Template slot trumps the renderer
A `<template #event>` slot on `<CoarCalendar>` always wins over `builder.eventRenderer(...)`. Use the slot for the common case; reach for the renderer when you need a function (e.g. dispatch on `meta.kind` to pick a Vue component dynamically).
:::

`dayHeaderRenderer` is the only other renderer setter — it controls the per-day column header in week / month views and has its own dedicated `ctx` shape (`{ date, isToday, isWeekend }`), so it's a separate setter rather than a branch on `ctx.layout.kind`.

<preview path="./demos/CalendarBuilderRenderer.vue" />


## Loading events on-demand

Backends with thousands of events benefit from loader mode — give the builder an async function and the calendar requests events for the visible window only, with caching + debouncing built in:

```ts
builder.eventsLoader(async (window) => {
  const res = await fetch(`/api/events?from=${window.start}&to=${window.end}`);
  return res.json();
});
```

The calendar:

- Watches the visible window and calls the loader whenever it changes.
- Debounces rapid view-nav (50 ms) — clicking next / prev / today in quick succession fires a single fetch for the window the user lands on.
- Caches results per `${view}|${timezone}|${start}|${end}` key. Going back to a previously-loaded window is instant. The display timezone is part of the key so a `.timezone()` toggle re-fetches (events near local midnight differ across zones).
- Tracks in-flight count via `api.loading` (a readonly `Ref<boolean>`).
- Exposes `api.refresh()` to invalidate the entire cache, and `api.refreshRange(start, end)` to invalidate only the window(s) that intersect a date range.

`events()` and `eventsLoader()` are mutually exclusive — calling one drops the other.

<preview path="./demos/CalendarEventsLoader.vue" />

## Recurring events

`@cocoar/vue-calendar` expands recurring series at the visible-window boundary — the engine never sees occurrences outside the current view, so a series with `RRULE:FREQ=DAILY` from year 2000 doesn't pay 25 years of expansion cost when you mount the calendar today. Two source modes mirror non-recurring events:

```ts
import { Temporal } from '@js-temporal/polyfill';
import type { RecurringSeries } from '@cocoar/vue-calendar';

const series = ref<RecurringSeries[]>([
  {
    id: 'standup',
    rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    dtstart: Temporal.ZonedDateTime.from('2026-06-01T09:00:00[Europe/Vienna]'),
    duration: { minutes: 30 },
    meta: { title: 'Standup', color: '#4f46e5' },
  },
  {
    id: 'public-holiday',
    rrule: 'FREQ=YEARLY;BYMONTH=8;BYMONTHDAY=15',
    // All-day series — `dtstart` is a `PlainDate`, not a `ZonedDateTime`.
    dtstart: Temporal.PlainDate.from('2026-08-15'),
    meta: { title: 'Mariä Himmelfahrt' },
  },
]);

builder.series(series); // reactive; mutating the ref re-expands
```

For backend-managed series, use the loader form — the calendar fetches once per visible window, results cached the same way as `eventsLoader`:

```ts
builder.seriesLoader(async (window) => {
  const res = await fetch(`/api/series?from=${window.start}&to=${window.end}`);
  return res.json();
});
```

`series()` and `seriesLoader()` are mutually exclusive but both compose with `events()` / `eventsLoader()` — `getVisibleEvents()` returns the merged set.

### What ships in the wire

`RecurringSeries` is the public type (in `@cocoar/vue-calendar`):

```ts
interface RecurringSeries<TMeta = Record<string, unknown>> {
  id: string;                // stable series identifier
  rrule: string;             // RFC 5545 RRULE, e.g. 'FREQ=WEEKLY;BYDAY=MO'
  dtstart:
    | Temporal.ZonedDateTime // timed series — local + IANA zone
    | Temporal.PlainDate;    // all-day series
  duration?: { minutes?: number; hours?: number; days?: number };
  rdate?: ReadonlyArray<Temporal.ZonedDateTime | Temporal.PlainDate>;
  exdate?: ReadonlyArray<Temporal.ZonedDateTime | Temporal.PlainDate>;
  meta?: TMeta;
}
```

The Temporal-typed `dtstart` is a non-negotiable: ISO strings, native `Date`, and floating `Temporal.PlainDateTime` are rejected at the boundary. Article 4 — store intent (local time + IANA zone), derive instants. The same rule applies to `rdate` and `exdate`: every entry's `timeZoneId` is preserved to the output, so a series in Tokyo with an RDATE in Vienna keeps both zones.

Each expanded `CalendarEvent` carries provenance under `meta.__recurrence`:

```ts
import { getRecurrenceMeta } from '@cocoar/vue-calendar/recurrence';

builder.onEventClick(({ event }) => {
  const meta = getRecurrenceMeta(event);
  if (meta) {
    console.log(meta.seriesId);     // 'standup'
    console.log(meta.recurrenceId); // ZonedDateTime — the original wall-time slot
    console.log(meta.source);       // 'rrule' | 'rdate'
  }
});
```

`event.id` is a unique synthetic value of shape `${seriesId}__${recurrenceId}` — the layout pipeline dedupes by id, so series identity lives in the provenance accessor, not on the event id directly. `recurrenceId` matches RFC 5545 RECURRENCE-ID semantics (the original slot) and is the stable boundary for occurrence-scoped editing.

### Editing a recurring occurrence

The calendar owns expansion and provenance; the host application owns persistence. When an occurrence is clicked, dragged, resized, or deleted, use `getRecurrenceMeta(event)` to offer the familiar scopes:

| Scope | Persistence operation |
|---|---|
| This occurrence | Add `recurrenceId` to the source series' EXDATE set and, for a move/edit, persist one standalone event at the new date/time. |
| This and following | Split the RRULE immediately before `recurrenceId`, then persist the following part as a new series whose DTSTART contains the edit or move. |
| Entire series | Update the original series and shift its DTSTART / RDATE / EXDATE values losslessly. |

The library deliberately does not guess a backend wire shape or perform those writes. It guarantees that every occurrence handler receives the original series id, RFC recurrence id, and source (`rrule` or `rdate`) needed to implement all three operations without identifying an occurrence by its rendered position.

### Standalone expansion

`expandSeries(...)` is exported from a subpath so apps that don't use the builder still avoid pulling the engine into their main bundle:

```ts
import { expandSeries } from '@cocoar/vue-calendar/recurrence';
import { Temporal } from '@js-temporal/polyfill';

const occurrences = await expandSeries(
  series,
  {
    start: Temporal.ZonedDateTime.from('2026-06-01T00:00:00[Europe/Vienna]'),
    end:   Temporal.ZonedDateTime.from('2026-07-01T00:00:00[Europe/Vienna]'),
  },
  'compatible',          // DstPolicy — same union as builder.dstPolicy(...)
  /* engine? optional */ // defaults to lazy-loaded rrule-temporal adapter
);
```

### Custom engines

The calendar ships one bundled engine — a `rrule-temporal` adapter at the `@cocoar/vue-calendar/recurrence-rrule-temporal` subpath, lazy-loaded on first call. Apps with extreme volume or specialized needs (server-side pre-expansion, alternative parsers) implement the `RecurrenceEngine` interface in their own code:

```ts
import type { RecurrenceEngine } from '@cocoar/vue-calendar/recurrence';

const myEngine: RecurrenceEngine = {
  async expand(request) {
    // request.window.{startMs, endMs}
    // request.series — the typed wire shape (no string roundtrips)
    // …
    return { results, errors };
  },
};

builder.recurrenceEngine(myEngine);
// or, SSR-friendly factory form:
builder.recurrenceEngine(() => new MyEngine());
```

Engine-swap invariance is enforced by the library: every occurrence is re-resolved from intended wallclock + source zone + `DstPolicy` after the engine returns, so observable output depends only on the contract inputs, never on which engine ran underneath.

<preview path="./demos/CalendarRecurrence.vue" />

## Create and edit integration

The calendar owns interaction geometry; the host application owns the editing experience and persistence. There is deliberately no fixed create/edit overlay because web consumers may want a popover, modal, side panel, routed page, or a completely custom view. The flat builder exposes the same integration seam for each choice:

```ts
builder
  .onDateClick(({ date }) => selectDay(date))
  .onTimeClick(({ date, time }) => selectSlot(date, time))
  .onDateDoubleClick(({ date, native }) => openCreate({ date, anchor: native.currentTarget }))
  .onTimeDoubleClick(({ date, time, native }) =>
    openCreate({ date, time, anchor: native.currentTarget }),
  )
  .onEventClick(({ event, native }) => openDetails(event, native.currentTarget))
  .onEventDoubleClick(({ event }) => openEditModal(event))
  .onEventDrop(({ event, next }) => persistMove(event.id, next));
```

Single-click and double-click on an empty cell or slot are separate hooks. The desktop convention "click selects, double-click creates" (Apple Calendar, Outlook) therefore needs no click-timer on the host side, and the Google-style "click opens a popup" model is one handler away. The single-click hooks still fire for the two clicks that precede a double-click. A double-click on an event element stops at the event and reaches `onEventDoubleClick` only — never the date / time hooks. `onTimeDoubleClick` snaps to the slot grid exactly like `onTimeClick`.

`native.currentTarget` is the rendered calendar element and can be passed directly to `@cocoar/vue-ui`'s overlay service. Applications using a modal or routed editor can ignore it. For recurring events, call `getRecurrenceMeta(event)` before opening the editor so the host can offer This occurrence / This and following / Entire series; the calendar supplies stable occurrence identity but never guesses the backend mutation.

## Popovers and tooltips

The library deliberately doesn't ship a built-in popover — every app wants different content (title-only tooltip vs full action menu vs edit-in-place panel). What it does ship are two handlers that surface the timing + anchor element so consumer code can wire `useOverlay()` (from `@cocoar/vue-ui`) into events:

```ts
import { useOverlay, popoverPreset, type OverlayRef } from '@cocoar/vue-ui';

const overlay = useOverlay();
const activeOverlay = ref<OverlayRef | null>(null);

builder
  .onEventHover(({ event, native }) => {
    activeOverlay.value?.close();          // close previous first
    activeOverlay.value = overlay.open({
      spec: {
        ...popoverPreset,
        anchor: { kind: 'element', element: native.currentTarget as Element },
      },
      content: { kind: 'component', component: MyEventPopover },
      inputs: { event },
    });
  })
  .onEventHoverLeave(() => {
    activeOverlay.value?.close();
    activeOverlay.value = null;
  });
```

`native.currentTarget` is the event-element DOM node — pass it straight to the overlay's anchor spec. The same pattern works for click-driven popovers (use `onEventClick`) and double-click triggers (`onEventDoubleClick`). No hover delay is applied; wrap the open in `setTimeout(..., 200)` if you want one. For touch / pen pointers, `pointerenter` fires on press — handler doubles as a long-press surface on tablets when paired with a delay.

Handlers fire across every event-rendering view at the same DOM elements that handle click. The library never opens an overlay itself — the entire interaction lifecycle (open / close / outside-click / escape / scroll-strategy) lives in consumer code via the overlay spec.

<preview path="./demos/CalendarPopover.vue" />

## Imperative API

The builder exposes an `api` object — same shape regardless of whether the calendar component has mounted yet. Stash it from `useCalendar()` and call methods directly:

```ts
const { builder, api } = useCalendar();

api.next();                     // ±1 view-page
api.prev();
api.goToToday();
api.goTo('2026-12-25');
api.setView('month');
api.setMonthDensity('compact');
api.setDayMode('multiDay');
api.scrollToTime(8);            // day / week only
api.scrollToDate('2026-04-15'); // agenda only
api.getVisibleRange();          // ViewWindow | null
api.getVisibleEvents();         // events touching the current window
api.refresh();                  // re-run the loader for the current window
api.refreshRange(start, end);   // invalidate intersecting cache entries

watch(api.loading, (b) => console.log('loading?', b));
watch(api.visibleRange, (w) => console.log('window changed', w));
api.rangeLabel.value;           // "15.–21. Juni 2026" — the header's title, for your own header
api.topmostVisibleMonth.value;  // Month view: the month at the top while scrolling (cursor follows on settle)
```

<preview path="./demos/CalendarImperativeApi.vue" />

## API reference

### `useCalendar<TMeta>()`

```ts
function useCalendar<TMeta>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
};
```

Returns a fresh builder + its imperative api. Call once per `<CoarCalendar>` instance, typically at the top of `<script setup>`.

### `CalendarBuilder<TMeta>` setters

The builder is **flat** — every setter lives directly on it. There are no sub-builders or factory callbacks.

| Setter | Argument | Notes |
|--------|----------|-------|
| `events(source)` | `MaybeRefOrGetter<readonly CalendarEvent<TMeta>[]>` | Consumer-managed event array. |
| `eventsLoader(loader)` | `(window: ViewWindow) => CalendarEvent[] \| Promise<CalendarEvent[]>` | Calendar-managed async loader (cached, debounced). Mutually exclusive with `events`. |
| `series(source)` | `MaybeRefOrGetter<readonly RecurringSeries<TMeta>[]>` | Recurring series — expanded per visible window. Reactive. Composes with `events` / `eventsLoader`. |
| `seriesLoader(loader)` | `(window: ViewWindow) => RecurringSeries[] \| Promise<RecurringSeries[]>` | Calendar-managed series loader (cached). Mutually exclusive with `series`. |
| `recurrenceEngine(engineOrFactory)` | `RecurrenceEngine \| (() => RecurrenceEngine)` | Override the bundled rrule-temporal engine. Factory form is the SSR escape. |
| `view(model)` | `Ref<CalendarView>` | Bind a caller-owned view ref. |
| `date(model)` | `Ref<Temporal.PlainDate>` | Bind a caller-owned date ref. |
| `timezone(tz)` | `MaybeRefOrGetter<string>` | IANA display timezone. |
| `locale(loc)` | `MaybeRefOrGetter<string \| undefined>` | BCP-47 locale. |
| `firstDayOfWeek(d)` | `MaybeRefOrGetter<0..6 \| undefined>` | Override the locale-detected default. |
| `workDays(d)` | `MaybeRefOrGetter<readonly DayOfWeek[]>` | Days to render in the `'workWeek'` view (0 = Sun … 6 = Sat). Default `[1,2,3,4,5]` (Mon–Fri). |
| `shadeWeekends(b)` | `MaybeRefOrGetter<boolean>` | Tint Saturday / Sunday cells and headers in Month. Default `true`; disable for the unshaded iOS appearance. |
| `monthDensity(d)` | `MaybeRefOrGetter<'compact' \| 'stacked' \| 'details'>` | Month presentation. The shell exposes these beside the optional List variation. Default `'details'`. |
| `dayMode(m)` | `MaybeRefOrGetter<'single' \| 'multiDay'>` | One fixed day or a width-aware 1–7-day surface. Default `'single'`. |
| `timeRange(r)` | `MaybeRefOrGetter<{ startMinutes: number; endMinutes: number }>` | Day / week visible hour range, in minutes from midnight. |
| `slotDuration(d)` | `MaybeRefOrGetter<number>` | Time-grid slot subdivision (minutes). Default `30`. |
| `pixelsPerHour(p)` | `MaybeRefOrGetter<number>` | Time-grid row height. Default `60`. |
| `dayColumnCount(n)` | `MaybeRefOrGetter<number>` | Minimum complete columns in Multi-day mode. Clamped to `1…7`. |
| `dayColumnMinWidth(px)` | `MaybeRefOrGetter<number>` | Target width used to derive extra Multi-day columns. |
| `density(d)` | `MaybeRefOrGetter<'comfortable' \| 'compact'>` | Row / padding tightness. |
| `maxEventsPerCell(n)` | `MaybeRefOrGetter<number>` | Month-cell pill hint. Default `3`. |
| `agendaLengthDays(n)` | `MaybeRefOrGetter<number>` | Days the agenda window covers. Default `30`. |
| `showEmptyDays(b)` | `MaybeRefOrGetter<boolean>` | Render headers for empty days (agenda). |
| `availableViews(v)` | `MaybeRefOrGetter<readonly CalendarView[]>` | Filter the view-switcher. |
| `dstPolicy(p)` | `MaybeRefOrGetter<'compatible' \| 'reject' \| 'earlier' \| 'later'>` | DST gap/overlap resolution (Article 5). Default `'compatible'`. See "DST handling" above. |
| `dateStyle(s)` | `MaybeRefOrGetter<'full' \| 'long' \| 'medium' \| 'short' \| undefined>` | Verbosity of date labels (Article 9 — independent of locale). |
| `timeStyle(s)` | `MaybeRefOrGetter<'full' \| 'long' \| 'medium' \| 'short' \| undefined>` | Verbosity of time labels (Article 9). |
| `hour12(h)` | `MaybeRefOrGetter<boolean \| undefined>` | Force 12-/24-hour clock independent of locale. `undefined` lets the locale decide. |
| `canDrop(fn)` | `(event, target) => boolean` | Drop-target validator. Read refs inside the function for reactive policies. |
| `eventRenderer(r)` | `EventRenderer<TMeta>` | Universal event renderer. Branch on `ctx.layout?.kind` (`'positioned'` / `'allDayBar'` / `'monthPill'` / `'monthBar'`) to render per layout variant. See "Custom event rendering" above. |
| `dayHeaderRenderer(r)` | `DayHeaderRenderer` | Day column header. |
| `allDayMaxVisibleLanes(n)` | `MaybeRefOrGetter<number \| null>` | Lanes the all-day band (week / work-week / day) shows before it folds the rest behind per-day "+N" markers. Default `3`; `null` = unlimited. A click on a marker expands the band; a collapse control folds it back. |
| `timedEventDetailMinWidth(px)` | `MaybeRefOrGetter<number>` | Unobscured width below which an overlapped Day / Week card switches to the compact anatomy (one end-truncated title line, no location, no time row). Default `112` like iOS; `0` disables the switch. See [Overlapping timed cards](/components/calendar/week-view#overlapping-timed-cards). |
| `allDayBandMode(m)` | `MaybeRefOrGetter<'fitsContent' \| 'alwaysOneLane' \| 'reservesCap'>` | How much height the all-day band claims. `fitsContent` (default) follows the content and disappears without all-day events; `alwaysOneLane` keeps at least one lane so the grid never jumps 0↔1; `reservesCap` is always `allDayMaxVisibleLanes` tall so the hour axis sits at the same place on every day. |
| `timeGridRange(spec)` | `MaybeRefOrGetter<TimeGridRangeSpec \| null>` | Anchor / span / filter / step of the Day view's columns and paging. Week and Work week are fixed presets of the same model. See the [Day view](/components/calendar/day-view#one-model-for-every-time-grid). |
| `swipeNavigation(b)` | `MaybeRefOrGetter<boolean>` | Touch paging on week / work-week / day (default `true`): a horizontal pan moves the grid with the finger and pages on release past a quarter of the width or on a fast flick. A touch that never moves is a tap and reaches `onTimeClick` on release. On the columns mouse / pen are unaffected; a mouse drag across the day-name strip pages too. Honours `prefers-reduced-motion`. |
| `prefetchNeighbours(b)` | `MaybeRefOrGetter<boolean>` | Warm the loader / series caches for the previous and next page of the time grids so the neighbour pages drawn during a swipe carry their events. Default `true`; one extra fetch per neighbour in loader mode, a no-op in `events()` mode. |
| `eventTextContrast(p)` | `MaybeRefOrGetter<'wcag' \| 'apca'>` | How the automatic black/white text on event surfaces is chosen. `'wcag'` (default) is the WCAG 2 ratio; `'apca'` (WCAG 3 draft) picks white on saturated mid-tones such as `#e03131`, where WCAG 2 narrowly picks black. A per-event `meta.textColor` wins over either. |
| `onEventClick(fn)` | `(payload: { event, native: PointerEvent }) => void` | Common: open details, a side panel or a click-anchored popover. |
| `onEventDoubleClick(fn)` | `(payload: { event, native: MouseEvent }) => void` | Common: open the host application's edit UI. |
| `onEventHover(fn)` | `(payload: { event, native: PointerEvent }) => void` | Pair with `useOverlay()` for popovers / tooltips. `native.currentTarget` is the anchor element. No hover delay applied — wrap with `setTimeout(..., 200)` if needed. |
| `onEventHoverLeave(fn)` | `(payload: { event, native: PointerEvent }) => void` | Companion close-trigger for the popover the hover handler opened. |
| `onEventDrop(fn)` | `(payload) => void` | Drag-and-drop / keyboard / touch all flow through this. |
| `onDateClick(fn)` | `(payload: { date, native: PointerEvent }) => void` | Empty cell / day-header clicked. |
| `onTimeClick(fn)` | `(payload: { date, time, native: PointerEvent }) => void` | Empty time slot (week / day). |
| `onDateDoubleClick(fn)` | `(payload: { date, native: MouseEvent }) => void` | Empty month cell / all-day cell double-clicked. Never fires for a double-click on an event. |
| `onTimeDoubleClick(fn)` | `(payload: { date, time, native: MouseEvent }) => void` | Empty time slot double-clicked; `time` snapped like `onTimeClick`. |
| `onRangeChange(fn)` | `(window) => void` | Visible window changed. |

### `CalendarApi<TMeta>`

```ts
interface CalendarApi<TMeta> {
  goTo(date: Temporal.PlainDate): void;
  goToToday(): void;
  next(): void;
  prev(): void;
  setView(view: CalendarView): void;
  setMonthDensity(density: CalendarMonthDensity): void;
  setDayMode(mode: CalendarDayMode): void;
  getVisibleRange(): ViewWindow | null;
  getVisibleEvents(): CalendarEvent<TMeta>[];
  /** Same read for any window, e.g. the neighbour pages drawn during a swipe. */
  getEventsForWindow(window: ViewWindow): CalendarEvent<TMeta>[];
  scrollToTime(time: Temporal.PlainTime): void;
  scrollToDate(date: Temporal.PlainDate): void;
  refresh(): void;
  refreshRange(window: ViewWindow): void;
  readonly loading: Readonly<Ref<boolean>>;
  readonly visibleRange: Readonly<Ref<ViewWindow | null>>;
  readonly gridReady: Readonly<Ref<boolean>>;
  /** Title of the visible window, exactly as the built-in header shows it. */
  readonly rangeLabel: Readonly<ComputedRef<string>>;
  /** Month view: the topmost visible month, live while scrolling; `null` elsewhere. */
  readonly topmostVisibleMonth: Readonly<ShallowRef<Temporal.PlainYearMonth | null>>;
}
```

### `<CoarCalendar>` slots

Variant-specific slots (`pill`, `multiDayBar`, `allDayEvent`) still exist on the **component** even though there are no matching builder setters — the slots take precedence over `eventRenderer` when both are supplied, so reach for a slot when you want a one-line template-side override and the renderer when you want a function with discriminated branching.

| Slot | Scope | Purpose |
|------|-------|---------|
| `header` | `{ view, cursor, range, controls }` | Replace the entire header. |
| `headerStart` | `{ controls }` | Prepend before nav buttons. |
| `headerEnd` | `{ controls }` | Append after the view switcher. |
| `viewSwitcher` | `{ view, available, setView }` | Replace just the view switcher. |
| `event` | `{ event, view, layout?, item? }` | Per-event renderer (Day / Week / Agenda; falls back for month pills / bars). |
| `allDayEvent` | `{ event, layout }` | All-day band renderer (week / day). |
| `pill` | `{ event, pill }` | Month single-day pill. |
| `agendaEmpty` | — | Agenda empty state (forwarded to `<CoarAgendaView>`'s `empty` slot). Shown only when the agenda draws nothing and no load is in flight; no default. |
| `multiDayBar` | `{ event, bar }` | Month multi-day bar. |
| `dayHeader` | `{ date, isToday, isWeekend }` | Per-day column header (week / day). |

### `<CoarCalendar>` props

| Prop | Type | Description |
|------|------|-------------|
| `builder` | `CalendarBuilder` | **Required.** From `useCalendar()`. |
| `hideHeader` | `boolean` | Render only the body — no header bar. For hosts that own navigation and view selection and drive the calendar through `api.goTo / next / prev / setView / setMonthDensity / setDayMode`; `api.rangeLabel` is the title the built-in header would have shown. Default `false`. |
| `hideViewSwitcher` | `boolean` | Keep the header but drop the primary view switcher. Default `false`. |
| `hideModeSwitcher` | `boolean` | Keep the header but drop the Month / Day display-choice switcher. Default `false`. |

Everything else lives on the builder. To replace the header with your own controls instead of hiding it, use the `header` slot — its `controls` scope carries `prev`, `next`, `goToToday`, `setView`, the formatted `rangeLabel`, the active `view` and the `available` views. Note that an **empty** `#header` slot does not hide the header: Vue renders the built-in fallback when a slot yields no nodes, which is why `hideHeader` exists.
