---
description: "Month views — continuously scrolling Compact, Stacked and Details months, responsive Month List, and the lower-level CoarMonthView section"
---

# Month Views <Badge type="warning" text="Preview" />

The shell's Month view follows the iOS structure: months scroll continuously and expose **Compact**, **Stacked**, **Details**, and **List** display choices. Continuous sections render only the 4–6 weeks the month actually needs; leading and trailing positions stay blank instead of repeating neighbour dates.

| Choice | Rendering |
|---|---|
| Compact | 52 px base week rows; per-day events combine into a segmented colour capsule. |
| Stacked | 68 px base rows; compact individual event marks. |
| Details | 94 px base rows; titles, assignees, multi-day bars and row expansion. |
| List | Compact month selector plus the selected day's event list; stacked in narrow containers and side-by-side from 720 px. |

The regular Month choices use `<CoarContinuousMonthView>`. `<CoarMonthView>` remains exported as the lower-level single-month section for widgets and custom compositions.

```ts
const { builder } = useCalendar();
builder
  .view('month')
  .availableViews(['month', 'monthList'])
  .monthDensity('compact')
  .shadeWeekends(true);
```

## Continuous month

Month navigation scrolls to the requested section. Scrolling updates the builder cursor when the next month's heading reaches the top, and event / recurrence loaders preload the adjacent months. The surface initially materializes 13 months and extends in either direction while keeping a bounded DOM window.

```html
<CoarContinuousMonthView :builder="builder" />
```

## Month List {#month-list}

`monthList` is a real serialized `CalendarView`, but `<CoarCalendar>` nests it under Month as the **List** display choice. Selecting a date in the small calendar updates the builder cursor and the adjacent daily event list.

```html
<CoarMonthListView :builder="builder" />
```

## Single month section {#single-month-section}

`<CoarMonthView>` renders the fixed single-section grid used internally by the continuous composition. Multi-day events render as continuous **bars** across the rows they touch; single-day events render as **pills** inside cells. Use it directly when the host owns pagination or needs a compact embedded month.

```html
<CoarMonthView :builder="builder" />
```

## Standalone usage

```ts
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarContinuousMonthView,
  CoarMonthListView,
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

When the active view is `month`, the same builder feeds `<CoarContinuousMonthView>` and resolves `monthDensity`. Selecting List switches the serialized view to `monthList` and mounts `<CoarMonthListView>`. View-specific settings simply have no effect outside their view.

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
| `monthDensity(d)` | `'compact' \| 'stacked' \| 'details'` | `'details'` | Presentation used by continuous Month. |
| `shadeWeekends(b)` | `MaybeRefOrGetter<boolean>` | `true` | Shades Saturday / Sunday cells and weekday headers. Set `false` for an unshaded appearance. |
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

`scrollToTime` / `scrollToDate` are not month operations. `api.goTo(...)`, `next()`, and `prev()` align the continuous surface to the requested month; a standalone `<CoarContinuousMonthView>` additionally exposes `scrollToMonth(...)` on its component ref.

## Month component props + slots

| Prop | Type | Description |
|---|---|---|
| `builder` | `CalendarBuilder` | **Required.** From `useMonthView()` (or share the one from `useCalendar()`). |

| Slot | Scope | Purpose |
|---|---|---|
| `pill` | `{ event, pill }` | Single-day pill renderer. `pill` is the `MonthCellPill` (event + visual order in the cell). |
| `multiDayBar` | `{ event, bar }` | Multi-day bar renderer. `bar` is the `MonthMultiDayBar` (lane / startCol / endCol / clipping flags). |
