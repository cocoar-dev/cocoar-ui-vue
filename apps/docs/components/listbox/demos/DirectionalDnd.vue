<template>
  <div style="display: flex; gap: 16px; height: 280px;">
    <CoarListbox
      :options="backlog"
      label="Backlog"
      show-count
      draggable
      drag-group="tickets"
      drag-id="backlog"
      @items-remove="remove('backlog', $event)"
    />
    <CoarListbox
      :options="inReview"
      label="In review"
      show-count
      draggable
      droppable
      drag-group="tickets"
      drag-id="review"
      :drag-accept="['backlog']"
      @items-add="receive('inReview', $event)"
      @items-remove="remove('inReview', $event)"
    />
    <CoarListbox
      :options="done"
      label="Done"
      show-count
      droppable
      drag-group="tickets"
      drag-id="done"
      :drag-accept="['backlog', 'review']"
      @items-add="receive('done', $event)"
    />
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
    Backlog → In review, Backlog → Done, In review → Done. No drops back onto Backlog (it's not droppable), and Done is a dead-end (not draggable).
  </p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';

type Lane = 'backlog' | 'inReview' | 'done';

const backlog = ref<CoarListboxOption<string>[]>([
  { value: 't1', label: 'Spec the drag API' },
  { value: 't2', label: 'Audit stale PRs' },
  { value: 't3', label: 'Upgrade Vue minor' },
]);
const inReview = ref<CoarListboxOption<string>[]>([
  { value: 't4', label: 'Tokens v2' },
]);
const done = ref<CoarListboxOption<string>[]>([
  { value: 't5', label: 'Script editor v1' },
]);

const lanes = { backlog, inReview, done };

function receive(to: Lane, payload: { items: CoarListboxOption<string>[] }) {
  lanes[to].value = [...lanes[to].value, ...payload.items];
}

function remove(from: Lane, payload: { items: CoarListboxOption<string>[] }) {
  const r = new Set(payload.items.map((i) => i.value));
  lanes[from].value = lanes[from].value.filter((o) => !r.has(o.value));
}
</script>
