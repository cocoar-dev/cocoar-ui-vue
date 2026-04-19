<template>
  <div style="height: 360px;">
    <CoarDualListbox
      v-model="selectedIds"
      :options="items"
      :item-components="{ user: UserItem }"
      :compare-with="byId"
      available-label="Everyone"
      selected-label="Group members"
      :search-by="(i) => `${i.label} ${(i.value as UserRow).email}`"
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Group: {{ selectedIds.map(u => u.name).join(', ') || '—' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
import UserItem from '../../listbox/demos/UserItem.vue';

interface UserRow { id: string; name: string; email: string; role: string }

const users: UserRow[] = [
  { id: '1', name: 'Alice Müller', email: 'alice@x.com', role: 'Admin' },
  { id: '2', name: 'Bob Meier', email: 'bob@x.com', role: 'Editor' },
  { id: '3', name: 'Clara Schmid', email: 'clara@x.com', role: 'Viewer' },
  { id: '4', name: 'Dan Roth', email: 'dan@x.com', role: 'Editor' },
  { id: '5', name: 'Eva Horn', email: 'eva@x.com', role: 'Admin' },
];

const items: CoarListboxOption<UserRow>[] = users.map(u => ({
  value: u,
  label: u.name,
  kind: 'user',
}));

// Compare users by id — protects against reactivity-induced reference changes.
const byId = (a: UserRow, b: UserRow) => a.id === b.id;

const selectedIds = ref<UserRow[]>([users[0]]);
</script>
