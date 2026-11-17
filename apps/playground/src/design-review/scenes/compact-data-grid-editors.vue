<script setup lang="ts">
/**
 * Every cell editor `CoarGridBuilder` ships, in one editable grid (profile-neutral: the design-review
 * gallery puts `.coar-compact` / `.coar-mobile` / the scheme on an ancestor). Columns, in order:
 * text, checkbox, number, select, multi-select, tag-select, plain date, plain date-time, zoned date-time.
 * Row 3 is `locked`: its text cell has an `editable(row => …)` predicate that refuses the editor.
 * Fixed data, fixed zone; the picker panels open on the month of the cell value, so no clock is needed
 * (the spec still pins the clock). Every committed edit is appended to `[data-scene-part=changes]`
 * (one line per `onCellValueChanged`), which is what the spec reads. The grid is the library's own:
 * the builder calls below are the documented column/editor API (see apps/docs/components/data-grid/editing.md).
 */
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { CoarDataGrid, CoarGridBuilder } from '../../../../../packages/data-grid/src/index';

interface Row {
  id: string;
  name: string;
  locked: boolean;
  active: boolean;
  qty: number;
  status: string;
  tags: string[];
  labels: string[];
  due: Temporal.PlainDate | null;
  start: Temporal.PlainDateTime | null;
  meeting: Temporal.ZonedDateTime | null;
}

const STATUS = [
  { value: 'open', label: 'Open' },
  { value: 'review', label: 'In review' },
  { value: 'done', label: 'Done' },
];
const TAGS = [
  { value: 'priority', label: 'Priority' },
  { value: 'remote', label: 'Remote' },
  { value: 'onsite', label: 'Onsite' },
];
const LABELS = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

const rows = ref<Row[]>([
  {
    id: 'r1', name: 'Alpha', locked: false, active: true, qty: 3, status: 'open',
    tags: ['priority'], labels: ['red'],
    due: Temporal.PlainDate.from('2026-03-10'),
    start: Temporal.PlainDateTime.from('2026-03-10T09:30:00'),
    meeting: Temporal.ZonedDateTime.from('2026-03-10T09:30:00[Europe/Vienna]'),
  },
  {
    id: 'r2', name: 'Bravo', locked: false, active: false, qty: 7, status: 'review',
    tags: ['remote', 'onsite'], labels: ['green', 'blue'],
    due: Temporal.PlainDate.from('2026-03-12'),
    start: Temporal.PlainDateTime.from('2026-03-12T14:00:00'),
    meeting: Temporal.ZonedDateTime.from('2026-03-12T14:00:00[Asia/Tokyo]'),
  },
  {
    id: 'r3', name: 'Charlie (locked)', locked: true, active: true, qty: 12, status: 'done',
    tags: [], labels: [], due: null, start: null, meeting: null,
  },
]);

const changes = ref<string[]>([]);
const show = (value: unknown): string =>
  Array.isArray(value) ? value.join('|') : value == null ? '' : String(value);

const builder = CoarGridBuilder.create<Row>()
  .columns([
    (col) => col.text('name', (t) => t.maxLength(24)).header('Name').width(130).editable((row) => !row.locked),
    (col) => col.checkbox('active').header('Active').width(76).editable(true),
    (col) => col.number('qty', (n) => n.decimals(0).min(0).max(99).step(1)).header('Qty').width(80).editable(true),
    (col) => col.select('status', (s) => s.options(STATUS)).header('Status').width(110).editable(true),
    (col) => col.multiSelect('tags', (s) => s.options(TAGS).showSelectAll().display('chips')).header('Tags').width(160).editable(true),
    (col) => col.tagSelect('labels', (s) => s.options(LABELS).allowCreate().display('chips')).header('Labels').width(160).editable(true),
    (col) => col.plainDate('due', (d) => d.size('s').highlightWeekends()).header('Due').width(130).editable(true),
    (col) => col.plainDateTime('start', (d) => d.size('s')).header('Start').width(180).editable(true),
    (col) =>
      col
        .zonedDateTime('meeting', (d) => d.size('s').timeZone('Europe/Vienna').timezoneFilter(['Europe/*', 'Asia/*']))
        .header('Meeting')
        .width(260)
        .editable(true),
  ])
  .rowId((params) => params.data.id)
  .rowDataRef(rows)
  .stopEditingWhenCellsLoseFocus()
  .onCellValueChanged((event) => {
    changes.value.push(`${event.colDef.field}=${show(event.newValue)}`);
  });
</script>

<template>
  <div data-scene="data-grid-editors">
    <div data-scene-part="grid" style="height: 250px; display: flex">
      <CoarDataGrid :builder="builder" bordered />
    </div>
    <pre data-scene-part="changes" style="margin: 8px 0 0; min-height: 1.5em">{{ changes.join('\n') }}</pre>
  </div>
</template>
