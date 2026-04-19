<template>
  <div style="max-width: 360px; height: 320px;">
    <CoarListbox
      v-model="highlighted"
      :options="items"
      :item-components="{ user: UserItem, invite: InviteItem }"
      label="Mixed entries"
      searchable
      :search-by="(i) => `${i.label} ${(i.value as any).email ?? ''}`"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
import UserItem from './UserItem.vue';
import InviteItem from './InviteItem.vue';

interface UserRow { id: string; name: string; email: string; role: string }
interface InviteRow { id: string; email: string; expiresInDays: number }

const items: CoarListboxOption<UserRow | InviteRow>[] = [
  { value: { id: '1', name: 'Alice Müller', email: 'alice@x.com', role: 'Admin' }, label: 'Alice Müller', kind: 'user' },
  { value: { id: '2', name: 'Bob Meier', email: 'bob@x.com', role: 'Editor' }, label: 'Bob Meier', kind: 'user' },
  { value: { id: 'inv-1', email: 'carol@new.com', expiresInDays: 3 }, label: 'carol@new.com', kind: 'invite' },
  { value: { id: 'inv-2', email: 'dan@new.com', expiresInDays: 7 }, label: 'dan@new.com', kind: 'invite' },
];

const highlighted = ref<unknown[]>([]);
</script>
