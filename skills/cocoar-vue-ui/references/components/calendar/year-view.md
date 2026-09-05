<!-- Generated from apps/docs/components/calendar/year-view.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# `<CoarYearView>` — Year View (Preview)

Responsive twelve-month overview. The grid automatically chooses how many month cards fit across the available width, uses the configured locale / first weekday, and marks today. Selecting a month title or a day updates the builder cursor and drills into Month.

The Year view intentionally shows date structure rather than event density. It does not render event pills or occurrence markers. Loader and range-change consumers still receive the ordinary year `ViewWindow`, so applications can decide whether to return data for that surface.

## In `<CoarCalendar>`

Year is part of the default primary hierarchy. Include both `year` and `month` when filtering views so drill-in has a visible destination:

```ts
import { Temporal } from '@js-temporal/polyfill';
import { useCalendar } from '@cocoar/vue-calendar';

const { builder, api } = useCalendar();
builder
  .view('year')
  .date(Temporal.PlainDate.from('2026-08-06'))
  .timezone('Europe/Vienna')
  .locale('de-AT')
  .availableViews(['year', 'month']);

api.next(); // 2027
api.prev(); // 2026
```

```html
<CoarCalendar :builder="builder" />
```

## Standalone

`<CoarYearView>` consumes the same flat `CalendarBuilder`. There is no separate year builder because the view needs the ordinary cursor and `api.setView('month')` drill-in contract.

```ts
import { CoarYearView, useCalendar } from '@cocoar/vue-calendar';

const { builder } = useCalendar();
builder.view('year').availableViews(['year', 'month']);
```

```html
<CoarYearView :builder="builder" />
```

## Configuration

| Setter | Default | Purpose |
|---|---|---|
| `date(d)` | today in the display zone | Selects the visible year. |
| `timezone(tz)` | browser zone | Determines which date receives the today marker. |
| `locale(loc)` | `'en-US'` | Month and weekday labels. |
| `firstDayOfWeek(d)` | locale-derived | Overrides weekday order (`0` = Sunday … `6` = Saturday). |

`next()` and `prev()` move by one calendar year while Year is active. Clicking a day keeps that exact date as the Month cursor; clicking a month title selects the first day of that month.

## Prop

| Prop | Type | Description |
|---|---|---|
| `builder` | `CalendarBuilder` | **Required.** Usually from `useCalendar()`. |
