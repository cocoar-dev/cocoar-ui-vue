---
description: "CoarMonthView — 6x7 month-grid calendar view rendering multi-day events as bars and single-day events as pills, with per-cell overflow and custom event renderers"
---

# `<CoarMonthView>` — Month View <Badge type="warning" text="Preview" />

6×7 grid showing the full calendar month plus leading / trailing days for context. Multi-day events render as continuous **bars** across the rows they touch; single-day events render as **pills** inside cells. Cells with overflow scroll internally; per-cell expansion via the kebab menu replaces the older "+ N more" popover.

```html
<CoarMonthView :builder="builder" />
```

## Standalone usage

```ts
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarMonthView,
  useMonthView,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

const events = ref<CalendarEvent[]>([
  {
    id: 'devconf',
    start: Temporal.PlainDate.from('2026-04-13'),
    end:   Temporal.PlainDate.from('2026-04-16'),
  },
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[UTC]'),
    end:   Temporal.ZonedDateTime.from('2026-04-15T09:30:00[UTC]'),
  },
]);
const date = ref('2026-04-15');

const { builder, api } = useMonthView();
builder
  .events(events)
  .date(date)
  .timezone('UTC')
  .maxEventsPerCell(5)
  .eventRenderer((ctx) => {
    if (ctx.layout?.kind === 'monthPill') return h(MyPill, { event: ctx.event, pill: ctx.layout.layout });
    if (ctx.layout?.kind === 'monthBar')  return h(MyBar,  { event: ctx.event, bar:  ctx.layout.layout });
    return undefined; // fall through to lib default for other variants
  });
```

```html
<CoarMonthView :builder="builder" />
```

<preview path="./demos/MonthViewBasic.vue" />

## Custom pills and bars

The month view exposes two slots — `#pill` for single-day events and `#multiDayBar` for multi-day events. Both receive `{ event, pill }` / `{ event, bar }` so you can branch on the layout payload (lane, col-span, clipping flags) when needed.

<preview path="./demos/MonthViewCustomPillBar.vue" />

## Inside `<CoarCalendar>`

`<CoarCalendar>` and `<CoarMonthView>` consume the SAME `CalendarBuilder` instance — there's no sub-builder forking. Set month-specific config (e.g. `maxEventsPerCell`) directly on the composer's builder:

```ts
const { builder } = useCalendar();
builder.maxEventsPerCell(5);
```

When the active view is month, the same builder feeds the embedded `<CoarMonthView>`. When it's week or day, the same builder feeds `<CoarTimeGrid>`. View-specific settings simply have no effect outside their view.

## `useMonthView<TMeta>()`

```ts
function useMonthView<TMeta>(): {
  builder: CalendarBuilder<TMeta>;
  api: CalendarApi<TMeta>;
};
```

Returns a fresh standalone builder + its imperative api. The builder type is the same `CalendarBuilder` used by `<CoarCalendar>` — `useMonthView()` is just a thin shorthand that pre-sets `view: 'month'`.

## Builder setters

Full reference: see [the composer's API reference](/components/calendar/coar-calendar#api-reference). Highlights that matter for the month view:

| Setter | Argument | Default | Notes |
|---|---|---|---|
| `firstDayOfWeek(d)` | `0..6 \| undefined` | locale-aware | `0` = Sunday, `1` = Monday, … |
| `maxEventsPerCell(n)` | `MaybeRefOrGetter<number>` | `3` | Pill cap hint. The library never truncates — pills always reach the DOM — but the collapsed-cell height reserves space for ~`n` pills before the cell starts to scroll. |
| `eventRenderer(r)` | `EventRenderer<TMeta>` | — | Universal renderer. Branch on `ctx.layout?.kind === 'monthPill' \| 'monthBar'` for variant-specific rendering — see the example above. |
| `dayHeaderRenderer(r)` | `DayHeaderRenderer` | — | Weekday-strip header (Mon / Tue / ...). |

## Per-cell expansion

Each cell has a kebab trigger (top-right of the day-number row, hover-reveal on desktop, always visible on touch). Clicking it opens a context menu with **Show more events** / **Show fewer events**, which expands or collapses the entire **row** (single-row mode — opening one collapses any other previously-expanded row). Right-click / long-press on the cell body opens the same menu at the pointer.

The collapsed cell uses a height that fits ~`maxEventsPerCell` pills + the multi-day-bar lane area; expanded rows grow to a fixed maximum so all overflowing pills are reachable via scroll.

## Drag and drop

- **Pills** — drag a single-day pill to another cell to shift its date. The library reflows the source cell as if the event were already gone, and renders a dashed-outline ghost pill at the target.
- **Bars** — drag a multi-day bar's body to shift the whole bar; drag the **left** or **right** edge handle to resize one side. Resize handles only appear on non-clipped edges (no point resizing from off-month).
- **Keyboard** — Tab to focus an event, Arrow keys to move ±1 day (Up / Down jump a full week-row). Shift + Arrow on an all-day event grows / shrinks the end side.
- **`canDrop`** — the universal drop validator on the builder; returning `false` paints a red dashed "invalid" ghost and silently swallows the drop on release.

## Imperative API

```ts
interface CalendarApi<TMeta> {
  goTo(iso: string): void;
  goToToday(): void;
  next(): void;                  // ±1 month
  prev(): void;
  getVisibleRange(): ViewWindow | null;
  getVisibleEvents(): CalendarEvent<TMeta>[];
  refresh(): void;
  refreshRange(start: string, end: string): void;
  readonly loading: Readonly<Ref<boolean>>;
  readonly visibleRange: Readonly<Ref<ViewWindow | null>>;
  readonly gridReady: Readonly<Ref<boolean>>;
}
```

`scrollToTime` / `scrollToDate` are not on the month API — neither has a vertical-scroll surface in this view.

## `<CoarMonthView>` props + slots

| Prop | Type | Description |
|---|---|---|
| `builder` | `CalendarBuilder` | **Required.** From `useMonthView()` (or share the one from `useCalendar()`). |

| Slot | Scope | Purpose |
|---|---|---|
| `pill` | `{ event, pill }` | Single-day pill renderer. `pill` is the `MonthCellPill` (event + visual order in the cell). |
| `multiDayBar` | `{ event, bar }` | Multi-day bar renderer. `bar` is the `MonthMultiDayBar` (lane / startCol / endCol / clipping flags). |
