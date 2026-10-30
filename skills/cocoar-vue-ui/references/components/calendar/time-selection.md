<!-- Generated from apps/docs/components/calendar/time-selection.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Selecting time, drafts & bands (3.2)

Four opt-in features for Week, Work week and Day, in both [orientations](./day-view.md#days-as-rows-horizontal-orientation). Together they let a booking or scheduling screen work directly on the calendar: pick a range, see what a click will pick, keep the range of an open form visible, and show the working-time rules of each day behind the events.

```ts
const draft = ref<CalendarDraft | null>(null);

builder
  .timeRangeSelect(true)                                  // drag and click select ranges
  .hoverIndicator(true)                                   // time + line under the mouse
  .selectionPolicy(gapOrDurationPolicy({ minutes: 60 }))  // a click picks the gap, else 1 h
  .onTimeRangeSelect(({ start, end }) => {
    draft.value = { start, end };                         // show it …
    openBookingPanel(start, end);                         // … while the form is open
  })
  .draft(draft)                                           // follows the form; null hides it
  .backgrounds((date) => workRuleBands(date));            // core time, frame, limits
```

**Demo — `calendar/demos/TimeSelectionWeek.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px">
    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
      <CoarButton
        size="s"
        :variant="orientation === 'horizontal' ? 'primary' : 'secondary'"
        @click="orientation = 'horizontal'"
      >
        Days as rows
      </CoarButton>
      <CoarButton
        size="s"
        :variant="orientation === 'vertical' ? 'primary' : 'secondary'"
        @click="orientation = 'vertical'"
      >
        Days as columns
      </CoarButton>
      <CoarButton size="s" variant="secondary" :disabled="!draft" @click="draft = null">
        Clear draft
      </CoarButton>
      <span style="font-size: 12px; color: var(--coar-text-neutral-secondary)">{{ last }}</span>
    </div>
    <div
      style="
        height: 420px;
        border: 1px solid var(--coar-border-neutral-tertiary);
        border-radius: var(--coar-radius-xs);
        overflow: hidden;
      "
    >
      <CoarWeekView :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarWeekView,
  useWeekView,
  gapOrDurationPolicy,
  Temporal,
  type CalendarBand,
  type CalendarDraft,
  type CalendarEvent,
  type CalendarTimeGridOrientation,
} from '@cocoar/vue-calendar';

const zone = 'Europe/Vienna';
const at = (date: string, time: string) => Temporal.ZonedDateTime.from(`${date}T${time}[${zone}]`);
const hhmm = (z: Temporal.ZonedDateTime) => z.toPlainTime().toString().slice(0, 5);
const block = (id: string, date: string, from: string, to: string, title: string, color: string) =>
  ({ id, start: at(date, from), end: at(date, to), meta: { title, color } }) as CalendarEvent;

const events = ref<CalendarEvent[]>([
  block('mo-1', '2026-04-13', '07:30', '09:30', 'Development', '#93c5fd'),
  block('mo-2', '2026-04-13', '09:30', '09:45', 'Daily', '#f59e0b'),
  block('mo-3', '2026-04-13', '09:45', '12:00', 'Development', '#93c5fd'),
  block('tu-1', '2026-04-14', '08:00', '09:30', 'Development', '#93c5fd'),
  block('tu-2', '2026-04-14', '10:00', '12:00', 'Review', '#a78bfa'),
  block('tu-3', '2026-04-14', '13:00', '15:00', 'Backlog', '#f87171'),
  block('we-1', '2026-04-15', '08:30', '10:00', 'Meeting', '#38bdf8'),
]);

const T = (s: string) => Temporal.PlainTime.from(s);
// Working-time rules as bands: core time (shorter on Friday), outside the frame, a limit.
function workRules(date: Temporal.PlainDate): CalendarBand[] {
  if (date.dayOfWeek >= 6) {
    return [{ kind: 'outside', start: T('06:00'), end: T('19:00'), appearance: 'hatch' }];
  }
  return [
    { kind: 'outside', start: T('06:00'), end: T('07:00'), appearance: 'hatch' },
    { kind: 'core', start: T('09:00'), end: date.dayOfWeek === 5 ? T('12:00') : T('15:00') },
    { kind: 'max', at: T('17:30'), label: 'max. 10:30 h' },
  ];
}

const orientation = ref<CalendarTimeGridOrientation>('horizontal');
const draft = ref<CalendarDraft | null>(null);
const last = ref('Drag on free space, click a gap, or hover to see what a click selects.');

const { builder } = useWeekView();
builder
  .events(events)
  .date(Temporal.PlainDate.from('2026-04-15'))
  .timezone(zone)
  .firstDayOfWeek(1)
  .timeGridOrientation(orientation)
  .timeRange({ startMinutes: 6 * 60, endMinutes: 19 * 60 })
  .pixelsPerHour(80)
  .slotDuration(15)
  .timeRangeSelect(true)
  .hoverIndicator(true)
  .selectionPolicy(gapOrDurationPolicy({ minutes: 60 }))
  .backgrounds(workRules)
  .draft(draft)
  .onTimeRangeSelect(({ date, start, end, source }) => {
    last.value = `onTimeRangeSelect (${source}): ${date} ${hhmm(start)}–${hhmm(end)}`;
    draft.value = { start, end };
  });
</script>
```

The calendar owns the interaction and the drawing; what a pointer position selects is decided by the **selection policy**, a plain function you can replace.

## Selecting a time range

`builder.timeRangeSelect(true)` turns free space of the time grid into a selection surface. Events keep their own behaviour: a press on a card still clicks, moves or resizes it.

| Input | What happens |
|---|---|
| Mouse drag on free space | Past 4 px the press is a drag: the range from the press to the pointer is drawn in the day pressed and on the time axis (`12:00 ─ 2:15 h ─ 14:15`). Release calls `onTimeRangeSelect` with `source: 'drag'`. |
| Mouse click | `onTimeClick` on release, then `onTimeRangeSelect` with the policy's proposal (`source: 'click'`). |
| Escape during a drag | Cancels; no call. |
| Mouse hover | The proposal a click would select is drawn faintly (not over an event). |
| Touch tap | `onTimeClick`, then `onTimeRangeSelect` (`'click'`), after the tap's click — see [Touch](./coar-calendar.md#touch-taps-not-scroll-starts). |
| Touch long press (500 ms) | Starts a drag: the policy's proposal appears, moving the finger changes the range, lifting it reports it. Scrolling and swipe paging stay off until the finger lifts. |
| Touch swipe | Unchanged: scrolls (and pages the vertical grid). Moving before the long press fires never selects. |

The **day** of a selection is the day pressed: while dragging only the time axis follows the pointer, so drifting into the next row or column does not switch days. Days lie edge to edge, so hover always belongs to the nearest day and does not flicker between rows.

```ts
interface TimeRangeSelectPayload {
  date: Temporal.PlainDate;          // the day, display zone
  start: Temporal.ZonedDateTime;     // display zone, snapped by the policy
  end: Temporal.ZonedDateTime;       // exclusive; next midnight for a range up to 24:00
  source: 'click' | 'drag';
  native: PointerEvent;              // pointerup of a drag, pointerdown of a click
}
```

`start` / `end` are ready to store as an event's endpoints. Wall times that fall into a spring-forward gap resolve by `builder.dstPolicy()`; with `'reject'` such a selection is not reported.

> **Info: onTimeClick with selection on**
>
> With `timeRangeSelect(true)` a mouse `onTimeClick` moves from the press to the release, because only the release tells a click from a drag. A drag fires no `onTimeClick`. Without `timeRangeSelect` nothing changes.

## Selection policy

The policy maps a pointer position to a range in **minutes of the day** (wall time in the display zone, `0` = midnight, `1440` = the next midnight), or to `null` for nothing. It is asked on every hover move, on a click and on every drag move:

```ts
type TimeSelectionPolicy = (ctx: TimeSelectionContext) => { start: number; end: number } | null;

interface TimeSelectionContext {
  phase: 'hover' | 'click' | 'drag';
  date: Temporal.PlainDate;
  minute: number;            // under the pointer, unsnapped
  anchorMinute?: number;     // 'drag': where the press started
  slotDuration: number;
  bounds: { start: number; end: number };   // the visible time range
  busy: ReadonlyArray<{ start: number; end: number; event: CalendarEvent }>;  // timed events of the day, sorted
}
```

Two policies ship with the package:

| Policy | Hover / click | Drag |
|---|---|---|
| `defaultSelectionPolicy()` (used without `selectionPolicy`) | The slot under the pointer — the same slot `onTimeClick` reports. | Both ends snapped to the slot grid; events ignored. |
| `gapOrDurationPolicy({ minutes, overlap = false })` | Between two events the **whole gap**; otherwise `minutes` from the rounded time, at most up to the next event. A start less than one slot after an event joins it. On an event: nothing. | Snapped, limited to the free range around the press — a drag never runs over an event. |

With `overlap: true`, `gapOrDurationPolicy` ignores events (`minutes` from the rounded time, drags anywhere).

A policy of your own is a small function; the helpers below are exported from `@cocoar/vue-calendar`:

```ts
import { gapOrDurationPolicy } from '@cocoar/vue-calendar';

// Book only inside opening hours (09–18), otherwise like gapOrDurationPolicy.
const open = { start: 9 * 60, end: 18 * 60 };
const booking = gapOrDurationPolicy({ minutes: 30 });
builder.selectionPolicy((ctx) => {
  const at = ctx.anchorMinute ?? ctx.minute;   // a drag starts inside opening hours …
  if (at < open.start || at >= open.end) return null;
  return booking({ ...ctx, bounds: open });    // … and its end is clamped to them
});
```

| Helper | Purpose |
|---|---|
| `freeRangeAt(busy, minute, bounds?)` | The free range around `minute` between the neighbouring events, or `null` inside one. |
| `snapToSlot(minute, slot)` | `minute` rounded to the nearest slot boundary. |
| `busyMinutesOn(events, date, timezone)` | The timed events of a day as sorted minutes of that day — what the calendar hands the policy as `busy`. |
| `minuteOfDayToZoned(date, minute, timezone, dstPolicy?)` | A minute of the day as a `ZonedDateTime` (`1440` = next midnight); `null` in a DST gap with `'reject'`. |

The policy is read on every call (C7): read refs inside it, or bind a function that forwards to a computed policy.

## Hover indicator

`builder.hoverIndicator(true)` shows, under a mouse or a hovering pen, the time at the pointer — snapped to `slotDuration` — on the time axis (hour column in the vertical grid, hour header in the horizontal one) and a thin line through all days at that time. Touch has no hover, so nothing is shown there. It works with or without `timeRangeSelect`.

## Draft

`builder.draft(source)` draws a range that is not an event — typically the one in an open booking form — as an outlined block **above** the events of its day(s). An overlap with an existing event therefore stays visible before anything is saved. The block takes no pointer events and is not part of the event layout; a draft over midnight is drawn in both days, the cut ends dashed. While nothing is hovered or dragged, the time axis shows the draft's start, duration and end.

```ts
const form = reactive({ start: '', end: '' });
builder.draft(() =>
  form.start && form.end
    ? { start: toZoned(form.date, form.start), end: toZoned(form.date, form.end) }
    : null,                       // null hides it
);
```

`<CoarCalendar>` (and the Day / Week / Work week views) take a `#draft` slot to draw it yourself. It is called once per day the draft covers:

```vue
<CoarCalendar :builder="builder">
  <template #draft="{ start, end, segment }">
    <div class="my-draft">{{ fmt(start) }} – {{ fmt(end) }}</div>
  </template>
</CoarCalendar>
```

`segment` is `{ date, startMinutes, endMinutes, clippedStart, clippedEnd, start, end }`. With the slot the default frame is not drawn; the block keeps its position and size.

## Background bands

`builder.backgrounds((date) => CalendarBand[])` paints ranges and lines per day — core hours, opening hours, shifts, a frame outside which hatching warns, a daily limit. It is called for every visible day on render; return `[]` or `null` for none.

```ts
type CalendarBand =
  | { kind: string; start: Temporal.PlainTime; end: Temporal.PlainTime;
      appearance?: 'tint' | 'hatch' | 'outline';   // default 'tint'
      layer?: 'below' | 'above';                     // default 'below' (behind the events)
      color?: string; label?: string }
  | { kind: string; at: Temporal.PlainTime; color?: string; label?: string };  // a line
```

- Times are wall time of that day in the display zone; `end` `00:00` means midnight at the end of the day. A range over midnight is two bands, one per day. Bands are clipped to the visible `timeRange`.
- `tint` fills, `hatch` stripes, `outline` frames with a dashed border. `layer: 'above'` lays a range over the events — use it with `outline` for hints such as "work outside the frame".
- Lines are drawn above the events with their `label` beside them ("max. 10:30 h"); a range's `label` sits in its leading corner.
- Bands never take pointer events: clicks, hover, selection and drags reach the day underneath.

**Styling.** Every band carries `coar-calendar-band coar-calendar-band--{kind}` plus `--{appearance}` (or `--line`). The colour comes from `color`, else from `--coar-calendar-band-color` — set it per kind in your own CSS — else from the appearance's token:

```css
.coar-calendar-band--core { --coar-calendar-band-color: #16a34a; }
```

| Token | Default (light) | Used by |
|---|---|---|
| `--coar-calendar-band-tint` | `#2563eb` (12 %) | `tint` |
| `--coar-calendar-band-hatch` | `#6b7280` (26 %) | `hatch` |
| `--coar-calendar-band-outline` | `#d97706` | `outline` |
| `--coar-calendar-band-line` | `#dc2626` | lines |
| `--coar-calendar-selection-color` | accent | selection preview |
| `--coar-calendar-draft-color` | accent | draft frame and its axis marks |

Dark mode lifts the four band tokens through the package's dark token sheet.

## Builder reference

| Setter | Argument | Default | Notes |
|---|---|---|---|
| `timeRangeSelect(b)` | `MaybeRefOrGetter<boolean>` | `false` | Drag / click / long press select ranges. `timeRangeSelect()` = on. |
| `hoverIndicator(b)` | `MaybeRefOrGetter<boolean>` | `false` | Time and line under the mouse. `hoverIndicator()` = on. |
| `selectionPolicy(fn)` | `TimeSelectionPolicy<TMeta>` | `defaultSelectionPolicy()` | What hover, click and drag select. |
| `onTimeRangeSelect(fn)` | `(payload: TimeRangeSelectPayload) => void` | — | A range was selected. |
| `draft(source)` | `MaybeRefOrGetter<CalendarDraft \| null>` | `null` | `{ start, end }` as `ZonedDateTime`s. |
| `backgrounds(fn)` | `(date: PlainDate) => CalendarBand[] \| null` | — | Bands per visible day. |

Web only: the iOS and Android calendars create events with a long press of their own and have no policy, draft or bands.
