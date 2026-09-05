<!-- Generated from apps/docs/components/calendar/agenda-view.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# `<CoarAgendaView>` — Agenda View (Preview)

Virtualized chronological list grouped by day. Multi-day events appear on every day they touch (with a `(cont.)` tag from day 2 onwards). The current-day header floats at the top of the surface and is pushed up by the next inline header — same UX as native CSS sticky, but works correctly on top of an absolutely-positioned virtualized surface.

```html
<CoarAgendaView :builder="builder" />
```

## Standalone usage

```ts
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarAgendaView,
  useAgendaView,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[UTC]'),
    end:   Temporal.ZonedDateTime.from('2026-04-15T09:30:00[UTC]'),
  },
  {
    id: 'devconf',
    start: Temporal.PlainDate.from('2026-04-13'),
    end:   Temporal.PlainDate.from('2026-04-16'),
  },
]);
const date = ref('2026-04-15');

const { builder, api } = useAgendaView();
builder
  .events(events)
  .date(date)
  .timezone('UTC')
  .agendaLengthDays(60)
  .showEmptyDays(true);
```

```html
<CoarAgendaView :builder="builder" />
```

The visible window is derived from `date()` (the cursor — the **first** day) plus `agendaLengthDays()` (how many days forward to render). Use `api.scrollToDate(...)` to jump to any day inside that window.

**Demo — `calendar/demos/AgendaViewBasic.vue`**

```vue
<template>
  <div style="height: 520px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarAgendaView :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarAgendaView,
  useAgendaView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-13'));

// Local helpers — keep event construction terse while still using the
// article-4 typed shape (PlainDate for all-day, ZonedDateTime for timed).
const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  // Multi-day all-day event — appears on every day it touches with
  // a localized "(cont.)" tag from day 2 onwards.
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  // Single-day all-day.
  {
    id: 'easter-monday',
    start: pd('2026-04-13'),
    meta: { title: 'Easter Monday (PT branch)', color: '#10b981' },
  },
  // Daily standups Mon–Fri.
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: zdt(`${d}T09:00:00`),
      end: zdt(`${d}T09:30:00`),
      meta: { title: 'Daily standup', color: '#10b981' },
    }),
  ),
  // Wed busy day.
  {
    id: 'design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:00:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
  // Fri client demo.
  {
    id: 'fri-demo',
    start: zdt('2026-04-17T15:00:00'),
    end: zdt('2026-04-17T16:30:00'),
    meta: { title: 'Client demo', color: '#dc2626' },
  },
  // Quarterly review crossing the month boundary.
  {
    id: 'qr',
    start: pd('2026-04-29'),
    end: pd('2026-05-02'),
    meta: { title: 'Quarterly review', color: '#2563eb' },
  },
]);

const { builder } = useAgendaView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .agendaLengthDays(30)
  .onEventDrop(({ event, next }) => {
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });
</script>
```

## Imperative scroll-to-date + empty days

The `api` object returned by `useAgendaView()` exposes `scrollToDate(iso)` for jumping to any day inside the window. Toggle `showEmptyDays(true)` to render headers for days with no events — useful when you want a continuous date strip.

**Demo — `calendar/demos/AgendaViewScrollToDate.vue`**

```vue
<template>
  <div>
    <div class="controls">
      <CoarButton size="sm" @click="api.scrollToDate('2026-04-13')">
        ← DevConf (Apr 13)
      </CoarButton>
      <CoarButton size="sm" @click="api.scrollToDate('2026-04-22')">
        Team offsite (Apr 22)
      </CoarButton>
      <CoarButton size="sm" @click="api.scrollToDate('2026-05-04')">
        Quarterly review (May 4) →
      </CoarButton>
      <label class="toggle">
        <input v-model="empty" type="checkbox" />
        <span>Show empty days</span>
      </label>
    </div>
    <div style="height: 460px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarAgendaView :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarAgendaView,
  useAgendaView,
  Temporal,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const date = ref(Temporal.PlainDate.from('2026-04-01'));
const empty = ref(false);

const pd = (iso: string) => Temporal.PlainDate.from(iso);
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  {
    id: 'team-offsite',
    start: pd('2026-04-22'),
    end: pd('2026-04-25'),
    meta: { title: 'Team offsite', color: '#0891b2' },
  },
  ...['2026-04-13', '2026-04-14', '2026-04-15', '2026-04-16', '2026-04-17',
      '2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24'].map(
    (d): CalendarEvent => ({
      id: `standup-${d}`,
      start: zdt(`${d}T09:00:00`),
      end: zdt(`${d}T09:30:00`),
      meta: { title: 'Daily standup', color: '#10b981' },
    }),
  ),
  {
    id: 'qr',
    start: zdt('2026-05-04T10:00:00'),
    end: zdt('2026-05-04T12:00:00'),
    meta: { title: 'Quarterly review', color: '#2563eb' },
  },
]);

const { builder, api } = useAgendaView();
builder
  .events(events)
  .date(date)
  .timezone('Europe/Vienna')
  .agendaLengthDays(60)
  .showEmptyDays(() => empty.value);
</script>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  font-size: 13px;
  color: var(--coar-text-subtle, #6b7280);
}
</style>
```

## Inside `<CoarCalendar>`

`<CoarCalendar>` and `<CoarAgendaView>` consume the SAME `CalendarBuilder` instance — there's no sub-builder forking. Set agenda-specific config directly on the composer's builder:

```ts
const { builder } = useCalendar();
builder
  .agendaLengthDays(60)
  .showEmptyDays(true);
```

When the active view is agenda, the same builder feeds the embedded `<CoarAgendaView>`. View-specific settings simply have no effect outside their view.

## `useAgendaView<TMeta>()`

```ts
function useAgendaView<TMeta>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
};
```

Returns a fresh standalone builder + its imperative api.

## Builder setters

### Universal (every builder)

Same universal surface as the [composer](./coar-calendar.md#api-reference). Highlights for the agenda view:

| Setter | Notes |
|---|---|
| `eventRenderer(r)` | Replaces the default time + title row content. |
| `onDateClick(fn)` | Fires on day-group header click. |
| `onEventClick(fn)` / `onEventDoubleClick(fn)` | Per-row interaction. |

### Agenda specific

| Setter | Argument | Default | Notes |
|---|---|---|---|
| `agendaLengthDays(n)` | `MaybeRefOrGetter<number>` | `30` | How many days the visible window covers, starting from `date()`. |
| `showEmptyDays(b)` | `MaybeRefOrGetter<boolean>` | `false` | When `true`, empty days render a header in italic-grey. When `false`, only days with events appear. |

## Time labels

The time column follows one rule, shared with the Month List surface and with the SwiftUI port:

| Event | Label |
|---|---|
| all-day (`PlainDate` start) | the localised `All day` label |
| timed with `end` | `start – end`, both in the display zone (en dash, U+2013) |
| timed without `end` (point event) | the start time only |

Formatting goes through `buildFormatOptions` (C6): `locale`, `timeStyle` and `hour12` apply to both ends of the span.

## Multi-day events & continuation tags

A multi-day event appears on every day it touches. The first day shows the event normally; subsequent days show it dimmed with a localised `(cont.)` tag appended to the title. Both rows are interactive — clicking either dispatches `onEventClick` with the same event.

## Floating sticky header

Because the virtualized surface absolutely-positions every item, native `position: sticky` can't pin them. The agenda renders a separate **floating** day-header overlay above the surface that:

- shows the most recent header at-or-before `scrollTop`,
- gets pushed up by the next inline header crossing into its region (continuous swap, no snap),
- is reserved as a sibling of the surface so it doesn't scroll with the rows.

There's nothing to configure — it's automatic.

## Imperative API

```ts
interface CalendarApi<TMeta> {
  goTo(iso: string): void;
  goToToday(): void;
  next(): void;                  // ±agendaLengthDays
  prev(): void;
  getVisibleRange(): ViewWindow | null;
  getVisibleEvents(): CalendarEvent<TMeta>[];
  scrollToDate(iso: string): void;   // Agenda only
  refresh(): void;
  refreshRange(start: string, end: string): void;
  readonly loading: Readonly<Ref<boolean>>;
  readonly visibleRange: Readonly<Ref<ViewWindow | null>>;
  readonly gridReady: Readonly<Ref<boolean>>;
}
```

## `<CoarAgendaView>` props + slots

| Prop | Type | Description |
|---|---|---|
| `builder` | `CalendarBuilder` | **Required.** From `useAgendaView()` (or share the one from `useCalendar()`). |
| `estimatedItemSize` | `number` | Height estimate for the variable-size virtualization. Default `64`. |
| `overscan` | `number` | Items beyond the viewport rendered each direction. Default `5`. |

| Slot | Scope | Purpose |
|---|---|---|
| `event` | `{ event, item }` | Per-row renderer. `item` is the full `AgendaEventItem` (event + `isContinuation` flag). |
| `dayGroupHeader` | `{ date, item, isToday }` | Per-day header renderer (same component renders the inline + floating overlay). |
| `empty` | — | Empty state. Shown only when the list draws nothing — no events in the window, `showEmptyDays` off — and no load is in flight. No default; without the slot the surface stays blank. Rendered as a non-interactive overlay so the list stays mounted. Inside `<CoarCalendar>` use the `agendaEmpty` slot. |
