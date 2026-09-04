---
description: "CoarAgendaView — virtualized chronological agenda list grouped by day, with floating day headers, multi-day event continuation and imperative scroll-to-date"
---

# `<CoarAgendaView>` — Agenda View <Badge type="warning" text="Preview" />

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

<preview path="./demos/AgendaViewBasic.vue" />

## Imperative scroll-to-date + empty days

The `api` object returned by `useAgendaView()` exposes `scrollToDate(iso)` for jumping to any day inside the window. Toggle `showEmptyDays(true)` to render headers for days with no events — useful when you want a continuous date strip.

<preview path="./demos/AgendaViewScrollToDate.vue" />

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

Same universal surface as the [composer](/components/calendar/coar-calendar#api-reference). Highlights for the agenda view:

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
