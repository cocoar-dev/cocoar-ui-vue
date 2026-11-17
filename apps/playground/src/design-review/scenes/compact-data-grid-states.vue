<script setup lang="ts">
/**
 * Pagination, filter popup / column menu, loading and empty overlays of `CoarDataGrid`
 * (profile-neutral). Only the library's own pieces are used: `builder.options({...})` forwards AG Grid
 * options (`pagination`, `paginationPageSize`, `floatingFilter`, `loading`), an empty `rowData([])` shows
 * AG Grid's no-rows overlay, and `api.showColumnMenu` is AG Grid's public API.
 *
 * Blocker recorded in the draft README: with `CoarGridHeader` (the library's header component) there is no
 * header menu button, and AG Grid Community's `FilterMenuFactory.showMenuAfterContextMenuEvent()` is empty, so a
 * right click on a header opens nothing. What a user can open is the floating-filter popup (button inside the
 * floating filter) - that is what the spec drives with the mouse; `showColumnMenu` is reached through the scene's
 * own button `[data-scene-action=column-menu]` (test scaffolding, not a product control).
 */
import { ref } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '../../../../../packages/data-grid/src/index';

interface Row { id: number; name: string; qty: number }
const NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima'];
const rows = ref<Row[]>(NAMES.map((name, i) => ({ id: i + 1, name, qty: (i + 1) * 3 })));

const paged = CoarGridBuilder.create<Row>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).filter(true).sortable(),
    (col) => col.number('qty', { decimals: 0 }).header('Qty').width(100).filter(true),
  ])
  .rowId((params) => String(params.data.id))
  .rowDataRef(rows)
  .defaultColDef({ floatingFilter: true })
  .options({ pagination: true, paginationPageSize: 5, paginationPageSizeSelector: [5, 10] });

const loading = CoarGridBuilder.create<Row>()
  .columns([(col) => col.field('name').header('Name').flex(1), (col) => col.number('qty').header('Qty').width(100)])
  .rowData(null)
  .options({ loading: true });

const empty = CoarGridBuilder.create<Row>()
  .columns([(col) => col.field('name').header('Name').flex(1), (col) => col.number('qty').header('Qty').width(100)])
  .rowData([]);

function openColumnMenu() {
  paged.api?.showColumnMenu('name');
}
</script>

<template>
  <div data-scene="data-grid-states" style="display: grid; gap: 12px">
    <div data-scene-part="paged" style="height: 330px; display: flex">
      <CoarDataGrid :builder="paged" bordered />
    </div>
    <div>
      <button type="button" data-scene-action="column-menu" @click="openColumnMenu">scene: api.showColumnMenu('name')</button>
    </div>
    <div data-scene-part="loading" style="height: 150px; display: flex">
      <CoarDataGrid :builder="loading" bordered />
    </div>
    <div data-scene-part="empty" style="height: 150px; display: flex">
      <CoarDataGrid :builder="empty" bordered />
    </div>
  </div>
</template>
