<template>
  <div style="display: flex; gap: 16px; height: 300px;">
    <CoarListbox
      :options="waiting"
      label="Backlog"
      show-count
      draggable
      droppable
      drag-group="tasks"
      @items-add="receive('waiting', $event)"
      @items-remove="remove('waiting', $event)"
    />
    <CoarListbox
      :options="doing"
      label="In progress"
      show-count
      draggable
      droppable
      drag-group="tasks"
      @items-add="receive('doing', $event)"
      @items-remove="remove('doing', $event)"
    />
    <CoarListbox
      :options="done"
      label="Done"
      show-count
      draggable
      droppable
      drag-group="tasks"
      @items-add="receive('done', $event)"
      @items-remove="remove('done', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

type Lane = 'waiting' | 'doing' | 'done';

const waiting = ref<CoarListboxOption<string>[]>([
  { value: 't1', label: 'Design migration plan' },
  { value: 't2', label: 'Spec compare-with API' },
  { value: 't3', label: 'Audit stale PRs' },
]);
const doing = ref<CoarListboxOption<string>[]>([
  { value: 't4', label: 'Ship script-editor v2' },
]);
const done = ref<CoarListboxOption<string>[]>([
  { value: 't5', label: 'Upgrade to Vue 3.5' },
]);

const laneRef = { waiting, doing, done };

function receive(to: Lane, payload: { items: CoarListboxOption<string>[] }) {
  laneRef[to].value = [...laneRef[to].value, ...payload.items];
}

function remove(from: Lane, payload: { items: CoarListboxOption<string>[] }) {
  const toRemove = new Set(payload.items.map((i) => i.value));
  laneRef[from].value = laneRef[from].value.filter((o) => !toRemove.has(o.value));
}
</script>
