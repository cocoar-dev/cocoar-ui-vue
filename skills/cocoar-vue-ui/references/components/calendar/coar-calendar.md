<!-- Generated from apps/docs/components/calendar/coar-calendar.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# `<CoarCalendar>` — Composer (Preview)

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

> **Warning: Don't use `'UTC'` as your display zone**
>
> UTC is a derived value (article 4: "store intent, derive math"). If your users live in Vienna, set `.timezone('Europe/Vienna')`. If you serve users worldwide, set `.timezone(detectBrowserTimezone())`. Setting the display zone to UTC makes 09:00 wall-time render at 11:00 in summer / 10:00 in winter — invisible bugs that surface when you ship.

```html
<CoarCalendar :builder="builder" />
```

**Demo — `calendar/demos/CalendarBasic.vue`**

```vue
<template>
  <div style="height: 600px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarCalendar :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref(Temporal.PlainDate.from('2026-04-15'));

const pd = (iso: string) => Temporal.PlainDate.from(iso);
// Defaulting the source zone to Vienna deliberately — the events
// represent meetings scheduled BY VIENNA WORKERS. Article 4: store
// intent (local + IANA zone), derive UTC.
const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

// Mutable so drag/keyboard moves can rewrite start/end in place.
const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:30:00'),
    meta: { title: 'Daily standup', color: '#10b981' },
  },
  {
    id: 'design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'devconf',
    start: pd('2026-04-13'),
    end: pd('2026-04-16'),
    meta: { title: 'DevConf — Vienna', color: '#7c3aed' },
  },
  {
    id: 'sven-ooo',
    start: pd('2026-04-14'),
    end: pd('2026-04-17'),
    meta: { title: 'Sven — OOO', color: '#9ca3af' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-16T12:00:00'),
    end: zdt('2026-04-16T13:00:00'),
    meta: { title: 'Lunch with Anna', color: '#ef4444' },
  },
]);

const { builder } = useCalendar();
builder
  .events(events)
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  // Article 9: locale is a separate decision from timezone. Set it
  // explicitly to silence the dev-mode "defaults are not decisions"
  // warning. For multi-region apps, bind to your i18n source's
  // current language (e.g. `useLocalization().language`).
  .locale('en-US')
  // Article 5: how to resolve drops landing in DST gaps / fall-back
  // overlaps. `'compatible'` = silently shift forward / pick earlier
  // (Temporal default). `'reject'` = drop is vetoed, snap-back fires.
  // `'earlier'` / `'later'` = pick the corresponding instant on
  // overlap. Whatever fires, `target.disambiguation` tells the
  // consumer (see onEventDrop below).
  .dstPolicy('compatible')
  // The library doesn't mutate `events` itself — it emits `eventDrop`
  // with the consumer's responsibility to apply the move. This handler
  // patches the event in place so the move sticks (and so keyboard
  // navigation, drag-and-drop, and resize handles all work in the
  // demo). Cloning the array forces Vue to emit a fresh reference for
  // downstream computeds (event-index, layout, etc.).
  //
  // `next.start` / `next.end` are Temporal values matching the source
  // event's shape (PlainDate for all-day, ZonedDateTime for timed) —
  // assign them straight back onto the event.
  .onEventDrop(({ event, next, original, target }) => {
    // Article 5: when the drop landed in a DST gap or fall-back
    // overlap, `target.disambiguation` tells the consumer so they
    // can show a toast / dialog. Default `dstPolicy('compatible')`
    // resolves silently; consumers wanting different UX should set
    // `.dstPolicy('reject')` (drop is vetoed) or read this flag.
    if (target.disambiguation === 'gap') {
      // eslint-disable-next-line no-console
      console.info(
        `[CalendarBasic] DST gap on ${target.date} — meeting was ` +
          'shifted forward to the next valid wall-clock minute.',
      );
    } else if (target.disambiguation === 'overlap') {
      // eslint-disable-next-line no-console
      console.info(
        `[CalendarBasic] DST overlap on ${target.date} — meeting was ` +
          "resolved per dstPolicy (default 'compatible' = earlier instant).",
      );
    }
    // Article 3 / Article 9 — record the user's viewing context with
    // the move so audit logs / undo stacks can replay in the right
    // zone:
    //   - `original.displayZone` = zone the user was looking at when
    //      the drag started
    //   - `target.displayZone`   = zone the drop snapped in (same
    //      unless the user toggled `.timezone()` mid-drag)
    // Real apps push these into a `meta.audit = { from, at }` field
    // or a separate undo/redo store.
    pushUndoEntry({
      eventId: event.id,
      from: { start: original.start, end: original.end, displayZone: original.displayZone },
      to:   { start: next.start, end: next.end, displayZone: target.displayZone },
      disambiguation: target.disambiguation,
    });
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      // Cross-zone events: each endpoint may live in its own
      // `timeZoneId` — write both back unchanged from the payload,
      // don't try to "normalise" them.
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });

// Tiny demo undo stack (in-memory; real apps use a proper store).
type UndoEntry = {
  eventId: string;
  from: {
    start: Temporal.ZonedDateTime | Temporal.PlainDate;
    end?: Temporal.ZonedDateTime | Temporal.PlainDate;
    displayZone: string;
  };
  to: {
    start: Temporal.ZonedDateTime | Temporal.PlainDate;
    end?: Temporal.ZonedDateTime | Temporal.PlainDate;
    displayZone: string;
  };
  disambiguation: null | 'gap' | 'overlap';
};
const undoStack: UndoEntry[] = [];
function pushUndoEntry(entry: UndoEntry): void {
  undoStack.push(entry);
}
</script>
```

> **Tip: Why a builder?**
>
> Mirrors the `CoarGridBuilder` pattern from `<CoarDataGrid>`. One chainable surface keeps the consumer code linear, makes optional features (renderers, loaders, handlers) easy to register in any order, and gives us a single `api` object for imperative control.

## Time range / Working hours

Constrain the visible hour range in `day` / `week` views via `timeRange([startHour, endHour])` (24-hour). Default is `[0, 24]` (full day). Events outside the range are still rendered into the all-day band when applicable.

**Demo — `calendar/demos/CalendarWorkingHours.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <label style="font-size: 13px; display: flex; gap: 8px; align-items: center;">
      <input v-model="workingHoursOnly" type="checkbox" />
      Working hours only (8 AM – 6 PM)
    </label>
    <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref(Temporal.PlainDate.from('2026-04-15'));
const workingHoursOnly = ref(true);
const timeRange = computed(() =>
  workingHoursOnly.value
    ? { startMinutes: 8 * 60, endMinutes: 18 * 60 }
    : { startMinutes: 0, endMinutes: 24 * 60 },
);

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:30:00'),
    meta: { title: 'Standup', color: '#10b981' },
  },
  {
    id: 'design',
    start: zdt('2026-04-15T11:00:00'),
    end: zdt('2026-04-15T12:30:00'),
    meta: { title: 'Design review', color: '#8b5cf6' },
  },
  {
    id: 'demo',
    start: zdt('2026-04-17T15:00:00'),
    end: zdt('2026-04-17T16:30:00'),
    meta: { title: 'Client demo', color: '#dc2626' },
  },
]);

const { builder } = useCalendar();
builder
  .events(events)
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  .timeRange(timeRange)
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

## Locale & first day of week

Pass any BCP-47 locale via `locale(...)`. Without it the calendar follows the host's `@cocoar/vue-localization` language, and `en-US` when no localization service is installed. The first day of week is auto-detected from the locale (`en-US` → Sunday, `de-AT` / `fr-FR` → Monday, `ja-JP` → Sunday) and used by the `month` and `week` view windows. Override with `firstDayOfWeek(0..6)` (0 = Sunday … 6 = Saturday) when needed. Range labels and weekday names use the same locale.

**Demo — `calendar/demos/CalendarLocale.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; gap: 16px; align-items: center; font-size: 13px;">
      <label style="display: flex; gap: 6px; align-items: center;">
        Locale:
        <select v-model="locale">
          <option value="en-US">en-US</option>
          <option value="de-AT">de-AT</option>
          <option value="ja-JP">ja-JP</option>
          <option value="fr-FR">fr-FR</option>
        </select>
      </label>
      <span style="color: var(--coar-text-neutral-secondary);">
        First-day-of-week is detected from the locale (en-US → Sun, de-AT → Mon, …).
      </span>
    </div>
    <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('month');
const date = ref(Temporal.PlainDate.from('2026-04-15'));
const locale = ref('en-US');

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-04-15T09:30:00[Europe/Vienna]'),
    meta: { title: 'Standup', color: '#10b981' },
  },
]);

const { builder } = useCalendar();
builder
  .events(events)
  .view(view)
  .date(date)
  .locale(locale)
  .timezone('Europe/Vienna')
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

> **Tip: Where to set the display zone**
>
> Most apps want a single display zone matching the viewer's local zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). If you ship a "show in my zone" toggle, the only thing that needs to change is `builder.timezone(...)` — the events themselves stay put.

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

> **Tip: Cross-zone events keep their zones**
>
> `next.start.timeZoneId` and `next.end.timeZoneId` may differ — a Tokyo→Vienna flight stays Tokyo→Vienna across drag-and-drop. Persist both values verbatim; don't "normalise" to one zone.

> **Tip: Undo / audit log: persist `original.displayZone` and `target.displayZone`**
>
> The drop payload carries the **user's viewing context** in two places:
>
> - `original.displayZone` — the zone the calendar was rendering in when the drag started.
> - `target.displayZone` — the zone the drop snapped in (usually the same; differs only if the user toggled `.timezone()` mid-drag).
>
> Storing both alongside `next.start` / `next.end` lets you (a) replay the user's intent on undo without inheriting whatever zone they've toggled to since, and (b) write an audit log honest about "user moved this meeting AT 14:00 IN EUROPE/VIENNA". Article 3: deadlines are hard precisely because the wall-clock + the zone are inseparable. See `CalendarBasic.vue` demo for the canonical pattern.

## Custom event rendering

Two ways to customise event rendering — pick whichever fits the consumer code better. **Slot wins over builder renderer** when both are present.

### Template slot

The `#event` slot replaces the default event card. The slot receives `{ event, view, layout?, item? }` so you can render differently per view. The shell forwards it to every event-rendering sub-view (and uses it as a fallback for month pills / bars when no specific `#pill` / `#multiDayBar` slot is supplied).

**Demo — `calendar/demos/CalendarCustomEventSlot.vue`**

```vue
<template>
  <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarCalendar :builder="builder">
      <template #event="{ event }">
        <div class="custom-event">
          <span class="custom-event__icon">{{ iconFor(event) }}</span>
          <span class="custom-event__title">{{ titleOf(event) }}</span>
        </div>
      </template>
    </CoarCalendar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

interface MyMeta extends Record<string, unknown> {
  title: string;
  kind: 'meeting' | 'deepwork' | 'meal';
  color: string;
}

const view = ref<CalendarView>('day');
const date = ref(Temporal.PlainDate.from('2026-04-15'));

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent<MyMeta>[]>([
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:30:00'),
    meta: { title: 'Standup', kind: 'meeting', color: '#10b981' },
  },
  {
    id: 'deepwork',
    start: zdt('2026-04-15T10:00:00'),
    end: zdt('2026-04-15T12:00:00'),
    meta: { title: 'Deep work', kind: 'deepwork', color: '#2563eb' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch', kind: 'meal', color: '#ef4444' },
  },
]);

const { builder } = useCalendar<MyMeta>();
builder
  .events(events)
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  .onEventDrop(({ event, next }) => {
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });

const ICONS: Record<MyMeta['kind'], string> = {
  meeting: '👥',
  deepwork: '🧠',
  meal: '🥗',
};
function titleOf(e: CalendarEvent): string {
  return (e.meta as MyMeta | undefined)?.title ?? e.id;
}
function iconFor(e: CalendarEvent): string {
  const meta = e.meta as MyMeta | undefined;
  return meta ? ICONS[meta.kind] : '•';
}
</script>

<style scoped>
.custom-event {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  height: 100%;
  font-size: 12px;
}
.custom-event__icon {
  font-size: 14px;
  line-height: 1;
}
.custom-event__title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

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

> **Tip: Template slot trumps the renderer**
>
> A `<template #event>` slot on `<CoarCalendar>` always wins over `builder.eventRenderer(...)`. Use the slot for the common case; reach for the renderer when you need a function (e.g. dispatch on `meta.kind` to pick a Vue component dynamically).

`dayHeaderRenderer` is the only other renderer setter — it controls the per-day column header in week / month views and has its own dedicated `ctx` shape (`{ date, isToday, isWeekend }`), so it's a separate setter rather than a branch on `ctx.layout.kind`.

**Demo — `calendar/demos/CalendarBuilderRenderer.vue`**

```vue
<template>
  <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
    <CoarCalendar :builder="builder" />
  </div>
</template>

<script setup lang="ts">
/**
 * Builder-renderer demo.
 *
 * Same custom event shape as the slot demo — but registered via
 * `builder.eventRenderer((ctx) => h(...))`. The renderer is a
 * function returning a VNode, which gives full control over the
 * rendered markup without writing a `<template #event>` inside
 * the consumer template.
 */

import { h, ref } from 'vue';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

interface MyMeta extends Record<string, unknown> {
  title: string;
  kind: 'meeting' | 'deepwork' | 'meal';
  color: string;
}

const view = ref<CalendarView>('day');
const date = ref(Temporal.PlainDate.from('2026-04-15'));

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

const events = ref<CalendarEvent<MyMeta>[]>([
  {
    id: 'standup',
    start: zdt('2026-04-15T09:00:00'),
    end: zdt('2026-04-15T09:30:00'),
    meta: { title: 'Standup', kind: 'meeting', color: '#10b981' },
  },
  {
    id: 'deepwork',
    start: zdt('2026-04-15T10:00:00'),
    end: zdt('2026-04-15T12:00:00'),
    meta: { title: 'Deep work', kind: 'deepwork', color: '#2563eb' },
  },
  {
    id: 'lunch',
    start: zdt('2026-04-15T12:00:00'),
    end: zdt('2026-04-15T13:00:00'),
    meta: { title: 'Lunch', kind: 'meal', color: '#ef4444' },
  },
]);

const ICONS: Record<MyMeta['kind'], string> = {
  meeting: '👥',
  deepwork: '🧠',
  meal: '🥗',
};

const { builder } = useCalendar<MyMeta>();
builder
  .events(events)
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  .onEventDrop(({ event, next }) => {
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  })
  .eventRenderer((ctx) => {
    const meta = ctx.event.meta;
    if (!meta) return h('div', { class: 'br-event' }, ctx.event.id);
    return h(
      'div',
      {
        class: 'br-event',
        style: { borderLeftColor: meta.color },
      },
      [
        h('span', { class: 'br-event__icon' }, ICONS[meta.kind]),
        h('span', { class: 'br-event__title' }, meta.title),
      ],
    );
  });
</script>

<style scoped>
.br-event {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  height: 100%;
  border-left: 3px solid currentColor;
  font-size: 12px;
}
.br-event__icon {
  font-size: 14px;
  line-height: 1;
}
.br-event__title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
```

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

**Demo — `calendar/demos/CalendarEventsLoader.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; gap: 8px; align-items: center; font-size: 13px;">
      <span :class="['loader-pill', { 'loader-pill--active': loading }]">
        {{ loading ? 'Loading…' : 'Idle' }}
      </span>
      <CoarButton variant="secondary" size="s" @click="api.refresh()">
        Refresh
      </CoarButton>
      <span style="color: var(--coar-text-neutral-secondary);">
        Fetch count: {{ fetchCount }} (rapid prev/next coalesces into one fetch)
      </span>
    </div>
    <div style="height: 480px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Loader demo.
 *
 * `builder.eventsLoader(window => fetch(window))` lets the calendar
 * pull events for the visible window only. Rapid view-nav debounces
 * into a single fetch; results are cached per-window so revisiting
 * a previously-loaded window is instant. `api.loading` toggles
 * around the in-flight promise; `api.refresh()` invalidates the
 * cache and refetches.
 *
 * The mock loader below sleeps for 300 ms then returns synthesised
 * events for the window, so the loading state is observable.
 *
 * Returned events use the article-4 typed shape — `ZonedDateTime`
 * for timed entries (and `PlainDate` for all-day, if any).
 */

import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref(Temporal.PlainDate.from('2026-04-15'));
const fetchCount = ref(0);

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

const zdt = (iso: string, tz = 'Europe/Vienna') =>
  Temporal.ZonedDateTime.from(`${iso}[${tz}]`);

async function fakeBackendLoad(start: string, end: string): Promise<CalendarEvent[]> {
  await sleep(300);
  // Walk the date range using Temporal — `PlainDate.add({days:1})` is
  // calendar-correct (no DST drift, no UTC tax). The lib's article
  // series exists to kill `new Date() + 86_400_000` math; the demos
  // shouldn't teach it.
  const out: CalendarEvent[] = [];
  let cursor = Temporal.PlainDate.from(start);
  const stop = Temporal.PlainDate.from(end);
  while (Temporal.PlainDate.compare(cursor, stop) < 0) {
    // Temporal: dayOfWeek 1=Mon … 7=Sun. Mon-Fri = 1..5.
    if (cursor.dayOfWeek >= 1 && cursor.dayOfWeek <= 5) {
      const iso = cursor.toString();
      out.push({
        id: `loaded-${iso}`,
        start: zdt(`${iso}T11:00:00`),
        end: zdt(`${iso}T12:00:00`),
        meta: { title: `Loaded for ${iso}`, color: '#7c3aed' },
      });
    }
    cursor = cursor.add({ days: 1 });
  }
  return out;
}

const { builder, api } = useCalendar();
builder
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  .eventsLoader(async (window) => {
    fetchCount.value++;
    return fakeBackendLoad(window.start, window.end);
  });

const loading = api.loading;
</script>

<style scoped>
.loader-pill {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 12px;
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-secondary);
  font-variant-numeric: tabular-nums;
}
.loader-pill--active {
  background: var(--coar-color-accent, #2563eb);
  color: #fff;
}
</style>
```

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

**Demo — `calendar/demos/CalendarRecurrence.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="display: flex; gap: 8px; align-items: center; font-size: 13px; flex-wrap: wrap;">
      <label style="display: inline-flex; gap: 4px; align-items: center;">
        DST policy:
        <select v-model="dstPolicyValue" style="padding: 2px 6px;">
          <option value="compatible">compatible</option>
          <option value="reject">reject</option>
          <option value="earlier">earlier</option>
          <option value="later">later</option>
        </select>
      </label>
      <CoarButton variant="secondary" size="s" @click="addExtraSeries">
        + Add series
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="resetSeries">
        Reset
      </CoarButton>
      <span style="color: var(--coar-text-neutral-secondary);">
        Visible: {{ visibleCount }} (recurring: {{ recurringCount }})
      </span>
    </div>
    <div
      style="height: 480px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;"
    >
      <CoarCalendar :builder="builder" />
    </div>
    <div
      v-if="lastClick"
      style="font-family: monospace; font-size: 11px; color: var(--coar-text-neutral-secondary);"
    >
      {{ lastClick }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Recurrence demo.
 *
 * `builder.series([...])` for in-memory recurring series. Reactive —
 * mutating the source ref re-expands. Composes with one-off events
 * via `builder.events([...])`. `dstPolicy` applied uniformly to
 * every occurrence via the post-processing layer; engine swap never
 * changes observable semantics. Click an event to read its
 * `__recurrence` provenance.
 */

import { computed, ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
  type CalendarView,
  type DstPolicy,
  type RecurringSeries,
} from '@cocoar/vue-calendar';
import { getRecurrenceMeta } from '@cocoar/vue-calendar/recurrence';

const view = ref<CalendarView>('month');
const cursor = ref(Temporal.PlainDate.from('2026-06-15'));
const dstPolicyValue = ref<DstPolicy>('compatible');
const lastClick = ref<string>('');

const standup: RecurringSeries = {
  id: 'standup',
  rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
  dtstart: Temporal.ZonedDateTime.from(
    '2026-06-01T09:00:00[Europe/Vienna]',
  ),
  duration: { minutes: 30 },
  meta: { title: 'Standup', color: '#4f46e5' },
};
const sprintReview: RecurringSeries = {
  id: 'sprint-review',
  rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=FR',
  dtstart: Temporal.ZonedDateTime.from(
    '2026-06-05T15:00:00[Europe/Vienna]',
  ),
  duration: { hours: 1 },
  meta: { title: 'Sprint Review', color: '#06b6d4' },
};
const oneOff: CalendarEvent = {
  id: 'kickoff',
  start: Temporal.ZonedDateTime.from('2026-06-08T11:00:00[Europe/Vienna]'),
  end: Temporal.ZonedDateTime.from('2026-06-08T12:30:00[Europe/Vienna]'),
  meta: { title: 'Project Kickoff', color: '#f59e0b' },
};

const seriesSource = ref<RecurringSeries[]>([standup, sprintReview]);

const { builder, api } = useCalendar();
builder
  .view(view)
  .date(cursor)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .events([oneOff])
  .series(seriesSource)
  .dstPolicy(dstPolicyValue)
  .onEventClick(({ event }) => {
    const title = (event.meta as { title?: string } | undefined)?.title ?? event.id;
    const meta = getRecurrenceMeta(event);
    lastClick.value = meta
      ? `${title} — series=${meta.seriesId}, source=${meta.source}, recurrenceId=${meta.recurrenceId.toString()}`
      : `${title} (one-off)`;
  });

function addExtraSeries() {
  const id = `extra-${seriesSource.value.length}`;
  seriesSource.value = [
    ...seriesSource.value,
    {
      id,
      rrule: 'FREQ=DAILY;COUNT=3',
      dtstart: Temporal.ZonedDateTime.from(
        '2026-06-10T13:00:00[Europe/Vienna]',
      ),
      duration: { minutes: 45 },
      meta: { title: `Extra ${id}`, color: '#ec4899' },
    },
  ];
}

function resetSeries() {
  seriesSource.value = [standup, sprintReview];
  lastClick.value = '';
}

const visibleCount = computed(() => api.getVisibleEvents().length);
const recurringCount = computed(
  () =>
    api.getVisibleEvents().filter((e) => getRecurrenceMeta(e) !== null).length,
);
</script>
```

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

**Demo — `calendar/demos/CalendarPopover.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 8px;">
    <div style="font-family: monospace; font-size: 11px; color: var(--coar-text-neutral-secondary);">
      Currently hovered: <strong>{{ hoveredEventId ?? '(none)' }}</strong>
    </div>
    <div style="height: 520px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Wires `builder.onEventHover` / `onEventHoverLeave` to
 * `useOverlay()` from `@cocoar/vue-ui` so events get a hover popover
 * with consumer-defined content. The lib doesn't ship a built-in
 * popover — different apps want different content (title + time,
 * action buttons, edit-in-place, full preview). The handlers
 * surface the timing + anchor element; consumer composes the rest.
 *
 * Pattern:
 *   1. `useOverlay()` to get the overlay service.
 *   2. Store the active `OverlayRef` in a local ref.
 *   3. `onEventHover` opens (closing previous first — pointer can
 *      enter event B before leaving event A's bubble area).
 *   4. `onEventHoverLeave` closes.
 *
 * No hover delay applied — wrap the open call in `setTimeout` if a
 * delay is wanted. For touch / pen pointers, `pointerenter` fires
 * on press, so this doubles as a long-press surface on tablets when
 * paired with a delay.
 */

import { h, markRaw, ref } from 'vue';
import { useOverlay, popoverPreset, type OverlayRef } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  Temporal,
  useCalendar,
  type CalendarEvent,
} from '@cocoar/vue-calendar';

// Consumer-defined popover content. Receives the hovered event via
// `inputs`. Replace this with whatever fits your domain — action
// buttons, descriptions, status pills, edit forms…
const EventPopover = markRaw({
  name: 'EventPopover',
  props: {
    event: { type: Object, required: true },
  },
  setup(props: { event: CalendarEvent }) {
    return () =>
      h(
        'div',
        {
          style: {
            padding: '12px 16px',
            background: 'var(--coar-background-neutral-primary, white)',
            border: '1px solid var(--coar-border-neutral-tertiary, #e5e7eb)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            fontFamily: 'var(--coar-body-base-family)',
            fontSize: '13px',
            minWidth: '200px',
            maxWidth: '320px',
          },
        },
        [
          h(
            'div',
            { style: { fontWeight: 600, marginBottom: '4px' } },
            (props.event.meta as { title?: string } | undefined)?.title ??
              props.event.id,
          ),
          h(
            'div',
            { style: { color: 'var(--coar-text-neutral-secondary, #666)', fontSize: '12px' } },
            formatEventTime(props.event),
          ),
        ],
      );
  },
});

function formatEventTime(event: CalendarEvent): string {
  if (event.start instanceof Temporal.ZonedDateTime) {
    const start = event.start.toString().slice(0, 16).replace('T', ' ');
    if (event.end instanceof Temporal.ZonedDateTime) {
      return `${start} – ${event.end.toString().slice(11, 16)}`;
    }
    return start;
  }
  if (event.end instanceof Temporal.PlainDate) {
    return `${event.start.toString()} – ${event.end.toString()}`;
  }
  return event.start.toString();
}

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-06-15T09:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-15T09:30:00[Europe/Vienna]'),
    meta: { title: 'Daily Standup', color: '#4f46e5' },
  },
  {
    id: 'design-review',
    start: Temporal.ZonedDateTime.from('2026-06-16T14:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-16T15:30:00[Europe/Vienna]'),
    meta: { title: 'Design Review', color: '#06b6d4' },
  },
  {
    id: 'lunch',
    start: Temporal.ZonedDateTime.from('2026-06-17T12:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-06-17T13:00:00[Europe/Vienna]'),
    meta: { title: 'Lunch with Anna', color: '#f59e0b' },
  },
  {
    id: 'vacation',
    start: Temporal.PlainDate.from('2026-06-22'),
    end: Temporal.PlainDate.from('2026-06-27'),
    meta: { title: 'Vacation', color: '#10b981' },
  },
]);

const { builder } = useCalendar();
const overlay = useOverlay();
const activeOverlay = ref<OverlayRef | null>(null);
const hoveredEventId = ref<string | null>(null);

builder
  .events(events)
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .firstDayOfWeek(1)
  .view('week')
  .date(Temporal.PlainDate.from('2026-06-15'))
  .onEventHover(({ event, native }) => {
    activeOverlay.value?.close();
    hoveredEventId.value = event.id;
    activeOverlay.value = overlay.open({
      spec: {
        ...popoverPreset,
        anchor: {
          kind: 'element',
          element: native.currentTarget as Element,
        },
      },
      content: { kind: 'component', component: EventPopover },
      inputs: { event },
    });
  })
  .onEventHoverLeave(() => {
    activeOverlay.value?.close();
    activeOverlay.value = null;
    hoveredEventId.value = null;
  });
</script>
```

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

**Demo — `calendar/demos/CalendarImperativeApi.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 12px;">
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <CoarButton variant="secondary" size="s" @click="api.prev()">
        prev
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="api.goToToday()">
        today
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="api.next()">
        next
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="api.setView('month')">
        Switch to Month
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="api.scrollToTime(8)">
        Scroll to 8 AM
      </CoarButton>
      <CoarButton variant="secondary" size="s" @click="logVisible">
        Log visible range
      </CoarButton>
    </div>
    <div style="height: 500px; border: 1px solid var(--coar-border-neutral-tertiary); border-radius: var(--coar-radius-xs); overflow: hidden;">
      <CoarCalendar :builder="builder" />
    </div>
    <pre v-if="logLine" class="log">{{ logLine }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import {
  CoarCalendar,
  useCalendar,
  Temporal,
  type CalendarEvent,
  type CalendarView,
} from '@cocoar/vue-calendar';

const view = ref<CalendarView>('week');
const date = ref(Temporal.PlainDate.from('2026-04-15'));
const logLine = ref('');

const events = ref<CalendarEvent[]>([
  {
    id: 'standup',
    start: Temporal.ZonedDateTime.from('2026-04-15T09:00:00[Europe/Vienna]'),
    end: Temporal.ZonedDateTime.from('2026-04-15T09:30:00[Europe/Vienna]'),
    meta: { title: 'Standup', color: '#10b981' },
  },
]);

const { builder, api } = useCalendar();
builder
  .events(events)
  .view(view)
  .date(date)
  .timezone('Europe/Vienna')
  .onEventDrop(({ event, next }) => {
    const idx = events.value.findIndex((e) => e.id === event.id);
    if (idx < 0) return;
    events.value = [
      ...events.value.slice(0, idx),
      { ...event, start: next.start, ...(next.end ? { end: next.end } : {}) },
      ...events.value.slice(idx + 1),
    ];
  });

function logVisible() {
  const r = api.getVisibleRange();
  if (r) logLine.value = `${r.view}: ${r.start} → ${r.end}`;
}
</script>

<style scoped>
.log {
  margin: 0;
  padding: 8px 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xs);
  font-size: 12px;
  font-family: var(--coar-mono-base-family, monospace);
}
</style>
```

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
| `timedEventDetailMinWidth(px)` | `MaybeRefOrGetter<number>` | Unobscured width below which an overlapped Day / Week card switches to the compact anatomy (one end-truncated title line, no location, no time row). Default `112` like iOS; `0` disables the switch. See [Overlapping timed cards](./week-view.md#overlapping-timed-cards). |
| `allDayBandMode(m)` | `MaybeRefOrGetter<'fitsContent' \| 'alwaysOneLane' \| 'reservesCap'>` | How much height the all-day band claims. `fitsContent` (default) follows the content and disappears without all-day events; `alwaysOneLane` keeps at least one lane so the grid never jumps 0↔1; `reservesCap` is always `allDayMaxVisibleLanes` tall so the hour axis sits at the same place on every day. |
| `timeGridRange(spec)` | `MaybeRefOrGetter<TimeGridRangeSpec \| null>` | Anchor / span / filter / step of the Day view's columns and paging. Week and Work week are fixed presets of the same model. See the [Day view](./day-view.md#one-model-for-every-time-grid). |
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
