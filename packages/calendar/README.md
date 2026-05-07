# @cocoar/vue-calendar

> **Vue 3 calendar component built around `Temporal`.** Day / Week /
> Month / Agenda views, drag-and-drop with cross-zone safety, and an
> 8-invariant architecture (C1–C8) drawn from the
> ["Time in Software, Done Right"][articles] article series.

[articles]: https://dev.to/bwi/why-a-date-is-not-a-point-in-time-ad8

## Install

```bash
pnpm add @cocoar/vue-calendar
```

Peer deps: `vue ^3.5`, `@cocoar/vue-ui workspace:*`,
`@cocoar/vue-localization workspace:*`. Direct dep:
`@js-temporal/polyfill ^0.5` (re-exported as `Temporal`).

## Quick start

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

// Events are Temporal-typed (C1) — never strings, Date,
// PlainDateTime, or Instant on the public surface. The library
// throws at the boundary if you try.
const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-06-15T09:00:00[Europe/Vienna]'),
    end:   Temporal.ZonedDateTime.from('2026-06-15T09:30:00[Europe/Vienna]'),
    meta: { title: 'Daily Standup' },
  },
  {
    id: 'vacation',
    start: Temporal.PlainDate.from('2026-06-22'), // all-day → PlainDate
    end:   Temporal.PlainDate.from('2026-06-27'),
    meta: { title: 'Vacation' },
  },
]);

const { builder, api } = useCalendar();
builder
  .events(events)
  .timezone('Europe/Vienna')         // C5 display zone — REQUIRED
  .locale('de-AT')                    // C6 (independent of timeStyle / hour12)
  .firstDayOfWeek(1)                  // 0 = Sun, 1 = Mon, …
  .view('week')
  .date(Temporal.PlainDate.from('2026-06-15'))
  .dstPolicy('compatible')            // C4 — explicit DST policy
  .onEventDrop(({ event, next, target }) => {
    // C3: next.start / next.end keep their per-endpoint source zones.
    //     For a Tokyo→Vienna flight, next.start.timeZoneId stays
    //     'Asia/Tokyo' even when displayed in Vienna.
    // C5: target.displayZone is the zone the user's eyes saw at drop.
    // C4: target.disambiguation is 'gap' | 'overlap' | null (DST outcome).
    saveEvent({ id: event.id, start: next.start, end: next.end });
  });
</script>

<template>
  <CoarCalendar :builder="builder" />
</template>
```

That's it. Drag events, switch views, navigate dates — all wired.

## API contract for backends (Article 8)

The library ships two helpers that mirror Article 8's recommended
wire shape (`{ local, timeZoneId }`):

```ts
import {
  parseScheduledTime,
  formatScheduledTime,
} from '@cocoar/vue-calendar';

// Wire → Temporal (use this when deserialising backend payloads):
const start = parseScheduledTime({
  local: '2026-06-15T09:00:00',
  timeZoneId: 'Europe/Vienna',
  dstPolicy: 'compatible', // optional, default
});

// Temporal → wire (use this when shipping back to the backend):
const wire = formatScheduledTime(event.start);
// → { local: '2026-06-15T09:00:00', timeZoneId: 'Europe/Vienna' }
```

The shape is stable across:

- Frontend pickers (Article 8 — "DateTimePickers that don't lie")
- .NET / NodaTime backends (Article 6 — `LocalDateTime + TimeZoneId`)
- PostgreSQL storage (Article 7 — `local_start text + time_zone_id text`)

## The 8 invariants (C1–C8)

| Article basis | Invariant | What it means |
|---|---|---|
| 1, 2, 4, 8 | **C1** Temporal-only public surface | Strings / `Date` / `PlainDateTime` / `Instant` rejected at the boundary by `validateCalendarEvent`. |
| 4, 5 | **C2** Single drop pipeline | Exactly one function (`applyMoveToEvent`) converts a UI drop → new endpoints. Mouse, keyboard, touch all reach it once. |
| 4 | **C3** Source zone preserved per-endpoint | Cross-zone events are first-class. A Tokyo→Vienna flight keeps both endpoints in their source zones across every drag. |
| 5 | **C4** DST disambiguation explicit | `DstPolicy` is a required arg of every wall-time → instant conversion. No silent default. |
| 3, 4 | **C5** Display zone vs source zone separate | `EventDropPayload.target.displayZone` (what the user saw) and `next.start.timeZoneId` (where the event lives) are distinct fields. |
| 9 | **C6** Three independent display decisions | `locale`, `dateStyle`, `timeStyle`, `hour12` are independent setters. `buildFormatOptions` is the only `Intl` merge point. |
| spirit | **C7** Reactivity by reads | Every consumer function (`canDrop`, `eventsLoader`, `eventRenderer`) is read on every invocation, never captured at setup. |
| 5 | **C8** Recurrence is a first-class type | `RecurringSeries` lives separately from `CalendarEvent`. `expandSeries` ships as a throwing stub until Phase 4. |

The conformance test suite at `src/core/__tests__/timezone/` pins
every invariant.

## What's NOT in the public surface (intentional)

- **`EventIndex`** — bucketing utility kept private. Consumers wanting
  a sidebar / minimap will get a public composable in Phase 4+ (otherwise
  misuse silently drifts from the actual grid).
- **ISO strings on event start/end** — would re-introduce the
  Article-1 "guess the zone" failure mode. Use `Temporal.ZonedDateTime`
  or `Temporal.PlainDate`. The wire helpers above handle deserialisation.
- **`Date` / `PlainDateTime` / `Instant`** — same reason. Throws at
  the events-source watch with the offending event id named.
- **`'EST'` / `'CET'` / `'GMT'` abbreviations** — Article 2 calls these
  out as ambiguous. Use full IANA zones (`Europe/Vienna`,
  `America/New_York`, etc.). Temporal's polyfill resolves abbreviations
  to fixed-offset zones, but consumers are encouraged not to.

## Cross-zone events — what "preserve source zone" actually means

A flight Tokyo → Vienna stored as

```ts
{
  id: 'flight',
  start: Temporal.ZonedDateTime.from('2026-06-15T22:00:00[Asia/Tokyo]'),
  end:   Temporal.ZonedDateTime.from('2026-06-16T06:00:00[Europe/Vienna]'),
}
```

renders correctly in any display zone — the calendar always shows the
right wall-clock per the user's display zone. When the user **drags
the start handle** to a new slot in the Vienna-rendered calendar:

- **C3 means the event's `start.timeZoneId` stays `'Asia/Tokyo'`** in
  the drop payload. The stored intent is preserved.
- This means `next.start.toString()` reports a **Tokyo wall-time** —
  which is *not* the Vienna wall-time the user clicked. If the user
  clicked 14:00 Vienna in summer, `next.start` is the Tokyo wall-time
  of that same instant (≈ 21:00 Tokyo).
- The drop payload's `target.date` + `target.minutes` + `target.displayZone`
  capture what the user's eyes saw (Article 3 — fairness contract).
- If a consumer needs the Vienna wall-time directly, they can compute
  `next.start.withTimeZone('Europe/Vienna').toPlainTime()` on the spot.

**Why this design:** Article 4 is explicit — store intent, derive math.
A flight scheduled in Tokyo means "depart at this wall-clock in Tokyo";
re-anchoring start to Vienna would silently destroy that intent the
moment a user (or admin) drags the event in a different display zone.
The trade-off is that consumers reading `next.start.toString()` see
the source-zone wall-time, not the click-zone wall-time.

For a meeting that should **be re-anchored to the click-zone** (a
local meeting that just happens to be viewed from somewhere else), set
`event.start.timeZoneId === builder.timezone()` — when source and
display zone match, click-zone and source-zone wall-times are identical.

## Standalone sub-views

Each sub-view works without the `<CoarCalendar>` shell — useful for
sidebars, widgets, embedded month-pickers. The flat `CalendarBuilder`
carries every view's config, so a sub-view consumes the SAME builder
type the shell does:

```vue
<script setup lang="ts">
import { CoarMonthView, useMonthView, Temporal } from '@cocoar/vue-calendar';

const { builder } = useMonthView(); // pre-locks view + availableViews
builder.timezone('Europe/Vienna').date(Temporal.PlainDate.from('2026-06-15'));
</script>

<template>
  <CoarMonthView :builder="builder" />
</template>
```

When mounted standalone, the sub-view sets `state.view` to its
intended value and mounts its own `useViewWindow` (single writer per
the C5 invariant).

## Known scope cuts (post-2.0.0)

- **Recurrence engine** — `expandSeries(...)` is a typed throwing stub.
  The contract (`RecurringSeries` shape, `dstPolicy` argument) is stable,
  but the engine wires up in Phase 4. Consumers porting from FullCalendar /
  ICS feeds should construct concrete events in their data layer for now.
- **Global-event type** — Article 5's "global events" (same instant
  worldwide — product launches, livestreams) have no first-class
  `event.kind === 'global'` discriminator. Consumers model them as
  `Temporal.ZonedDateTime` in `'UTC'` and accept that the calendar
  re-renders them in the display zone (which is the conceptually correct
  behaviour, just not the typed-vocabulary the article recommends).
- **Tzdb update / future-event recalc** — Article 4 § "What Happens When
  Rules Change" is a consumer concern. The library stores
  `Temporal.ZonedDateTime` (which contains the IANA zone, not a baked-in
  offset), so re-rendering after a tzdb update is automatic. Recalculating
  cached `instantUtc` values in your data layer is consumer code, not
  calendar code.
- **Timezone abbreviations (`'EST'`, `'CET'`, etc.)** — the underlying
  Temporal polyfill resolves these to fixed-offset zones rather than
  rejecting them. The calendar accepts whatever Temporal accepts.
- **`onMoreClick`** — typed setter exists, but the "+N more" overflow
  surface in `<CoarMonthView>` is a post-2.0 visual-polish item. Setting
  the handler today emits a one-shot dev-warn; the handler starts firing
  once the overflow surface ships.

## Architecture decisions (locked)

In short:

- **D1** — `RecurringSeries` is a first-class type from day one;
  `expandSeries` throws informatively until Phase 4 wires the engine.
- **D2** — All-day drops preserve **day-count duration only**.
  Calendar UIs don't have a "+1 month" gesture; spans are always
  preserved as day-counts (May 5–10 → drag onto June 5 → June 5–10).
- **D3** — `parseScheduledTime` / `formatScheduledTime` /
  `parsePlainDate` are public helpers (the wire-contract surface).
- **D4** — `canDrop` runs on every hit-test. If you have expensive
  validation logic, memoize it consumer-side; the library reading fresh
  state is the correct behaviour.
- **D5** — One `dstPolicy` per builder. Per-operation policies are a
  YAGNI for now.

## Status

Feature-complete for the initial release (Temporal-only public API,
C1–C8 invariants, all four views, drag-and-drop, virtualization). The
repo's release version is calculated by GitVersion at publish time, so
this package's `package.json` carries a placeholder `0.0.1` like
everything else in the workspace — the actual semver number lives in
CI.

Post-launch backlog: recurrence engine (`expandSeries` is a typed
throwing stub today), Ctrl+C / Ctrl+V copy-paste, "+ N more" overflow
signal in `<CoarMonthView>`, preemptive DST-gap visual marker.

## License

Apache-2.0. Same as the rest of the Cocoar UI Vue suite.
