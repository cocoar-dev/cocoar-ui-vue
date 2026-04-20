<script setup lang="ts">
import { ref, computed } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface TodoItem {
  id: string;
  title: string;
  status: string;
}

const todos = ref<TodoItem[]>([]);
let nextId = 1;

function addRow() {
  todos.value = [
    ...todos.value,
    { id: String(nextId), title: `Todo #${nextId}`, status: nextId % 2 === 0 ? 'done' : 'open' },
  ];
  nextId++;
}

function clearRows() {
  todos.value = [];
}

const useAutoHeight = ref(false);

const builder = computed(() => {
  let b = CoarGridBuilder.create<TodoItem>()
    .columns([
      (col) => col.field('id').header('ID').width(80),
      (col) => col.field('title').header('Title').flex(1).quickFilter(true),
      (col) => col.field('status').header('Status').width(120),
    ])
    .rowDataRef(todos);
  if (useAutoHeight.value) {
    b = b.option('domLayout', 'autoHeight');
  }
  return b;
});

function inspectViewport() {
  const viewport = document.querySelector('.ag-center-cols-viewport') as HTMLElement | null;
  const container = document.querySelector('.ag-center-cols-container') as HTMLElement | null;
  if (!viewport || !container) {
    measurement.value = 'no viewport found';
    return;
  }
  const vRect = viewport.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  const vStyle = getComputedStyle(viewport);
  const cStyle = getComputedStyle(container);
  measurement.value = JSON.stringify({
    viewport: {
      bb_h: vRect.height,
      style_h: vStyle.height,
      overflow: vStyle.overflow,
    },
    container: {
      bb_h: cRect.height,
      style_h: cStyle.height,
    },
    rows: document.querySelectorAll('.ag-center-cols-container .ag-row').length,
  }, null, 2);
}

const measurement = ref('(not yet measured)');
</script>

<template>
  <div style="padding: 16px;">
    <h2>Empty → First Row Repro</h2>
    <p>Grid starts with 0 rows. Add a row and inspect viewport height.</p>
    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
      <button data-testid="add-row" @click="addRow">Add row</button>
      <button data-testid="clear-rows" @click="clearRows">Clear</button>
      <button data-testid="inspect" @click="inspectViewport">Inspect viewport</button>
      <label>
        <input type="checkbox" v-model="useAutoHeight" data-testid="auto-height" />
        autoHeight
      </label>
      <span>Rows: {{ todos.length }}</span>
    </div>
    <pre data-testid="measurement" style="background: #f4f4f4; padding: 8px; font-size: 12px;">{{ measurement }}</pre>
    <CoarDataGrid :key="useAutoHeight ? 'auto' : 'normal'" :builder="builder" />
  </div>
</template>
