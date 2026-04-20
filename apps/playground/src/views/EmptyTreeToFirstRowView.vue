<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface TodoTreeNode {
  Id: string;
  Title: string;
  ParentTodoId: string | null;
  isPhantomParent: boolean;
  children: TodoTreeNode[];
}

// Simulate the consumer's "store-backed computed → mirrored ref" pattern
const storeData = ref<TodoTreeNode[]>([]);
const treeDataComputed = computed(() => storeData.value);
const treeDataRef = ref<TodoTreeNode[]>([]);
watch(treeDataComputed, (val) => { treeDataRef.value = val; }, { immediate: true });

// Simulate "modal/sidebar pushes grid narrow at mount, then collapses"
const sidebarOpen = ref(true);
const openRows = ref<string[]>([]);
const guardedOpenRows = computed({
  get: () => openRows.value,
  set: (v) => { openRows.value = v; },
});
const searchText = ref('');
const showSubTodos = ref(false);

let nextId = 1;
function addTodo() {
  const id = String(nextId++);
  storeData.value = [
    ...storeData.value,
    {
      Id: id,
      Title: `E2E Test Todo ${id}`,
      ParentTodoId: null,
      isPhantomParent: false,
      children: [],
    },
  ];
}

function clearTodos() {
  storeData.value = [];
}

const builder = computed(() =>
  CoarGridBuilder.create<TodoTreeNode>()
    .treeData({
      children: (row) => row.children,
      rowId: (row) => row.Id,
    })
    .openRows(guardedOpenRows)
    .rowDataRef(treeDataRef)
    .quickFilterText(searchText)
    .customFilter((todos, search) => {
      if (!showSubTodos.value) return null;
      if (!search.trim()) return todos;
      const q = search.toLowerCase();
      return todos.filter((p) => p.Title.toLowerCase().includes(q));
    })
    .forceExpanded(showSubTodos)
    .updateOn(showSubTodos)
    .searchHighlight()
    .rowSelection('multiple')
    .rowDragHighlight({ canDrop: (_d, t) => !t.ParentTodoId && !t.isPhantomParent })
    .option('suppressRowDrag', true)
    .columns([
      (col) => col.field('Id').header('ID').width(80),
      (col) => col.tree('Title').header('Title').flex(1).quickFilter(true),
    ]),
);

const measurement = ref('(not yet measured)');
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
  measurement.value = JSON.stringify({
    viewport: { bb_h: vRect.height, style_h: vStyle.height },
    container: { bb_h: cRect.height, style_h: getComputedStyle(container).height },
    rows: document.querySelectorAll('.ag-center-cols-container .ag-row').length,
  }, null, 2);
}
</script>

<template>
  <!-- Mirror consumer's wrap chain: outer flex column, inner flex row, padded wrapper, h-full grid -->
  <div style="display: flex; flex-direction: column; height: 100vh;">
    <header style="padding: 8px; background: #eef;">
      <h2>Empty Tree → First Row Repro (mirrors TodoGrid wrap chain)</h2>
      <div style="display: flex; gap: 8px;">
        <button data-testid="add-row" @click="addTodo">Create Todo</button>
        <button data-testid="clear-rows" @click="clearTodos">Clear</button>
        <button data-testid="inspect" @click="inspectViewport">Inspect viewport</button>
        <button data-testid="toggle-sidebar" @click="sidebarOpen = !sidebarOpen">Toggle sidebar (now {{ sidebarOpen ? 'open' : 'closed' }})</button>
        <span>Rows: {{ storeData.length }}</span>
      </div>
      <pre data-testid="measurement" style="background: #f4f4f4; padding: 8px; font-size: 12px; margin: 4px 0;">{{ measurement }}</pre>
    </header>

    <!-- main: flex-1, overflow-auto (NO height:100% — relies on flex chain) -->
    <main style="flex: 1; overflow: auto; min-height: 0;">
      <!-- TodoTableView outer row: flex min-h-0 flex-1 (NO height:100% — exact consumer pattern) -->
      <div style="display: flex; min-height: 0; flex: 1;">
        <!-- left sidebar (sub-nav flex-shrink-0) — wide initial to force narrow grid -->
        <div :style="{ flexShrink: 0, width: sidebarOpen ? 'calc(100vw - 220px)' : '100px', background: '#ddd' }">sidebar</div>
        <!-- center wrapper: flex-1 flex justify-center min-w-0 -->
        <div style="flex: 1; display: flex; justify-content: center; min-width: 0;">
          <!-- padding wrapper: flex w-11/12 p-4 -->
          <div style="display: flex; width: 91.666%; padding: 16px;">
            <!-- TodoGrid: flex-1 min-h-0 -->
            <div style="flex: 1; min-height: 0;" data-testid="todo-grid-wrap">
              <!-- CoarDataGrid h-full -->
              <CoarDataGrid :builder="builder" style="height: 100%;" bordered elevated />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
