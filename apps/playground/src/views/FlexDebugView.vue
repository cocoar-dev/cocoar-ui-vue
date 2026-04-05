<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { CoarDataGridPanel, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface UserListItem {
  id: string;
  userName: string;
  email: string;
  firstName: string;
  isActive: boolean;
}

// Simulate async API — exactly like confighub
const usersList = ref<UserListItem[]>([]);
const loading = ref(false);

async function loadUsers() {
  loading.value = true;
  await new Promise(r => setTimeout(r, 500));
  usersList.value = [
    { id: '1', userName: 'admin', email: 'admin@cocoar.local', firstName: 'Admin', isActive: true },
    { id: '2', userName: 'user1', email: 'user1@test.com', firstName: 'Test', isActive: false },
  ];
  loading.value = false;
}

onMounted(() => loadUsers());

const activeUsers = computed(() => usersList.value.filter(u => !false));

// Computed builder — exactly like confighub
const builder = computed(() =>
  CoarGridBuilder.create<UserListItem>()
    .columns([
      (col) => col.field('userName').header('Username').flex(1).sortable().quickFilter(true),
      (col) => col.field('email').header('Email').flex(1).sortable().quickFilter(true),
      (col) => col.field('firstName').header('Name').flex(1).quickFilter(true),
      (col) => col.field('isActive').header('Status').width(120)
        .valueFormatter((p) => p.value ? 'Active' : 'Inactive'),
    ])
    .rowDataRef(activeUsers)
    .searchHighlight()
    .rowSelection('single')
    .defaultSort('userName', 'asc')
    .option('domLayout', 'autoHeight'),
);
</script>

<template>
  <div>
    <h2>Flex Debug (Confighub Clone)</h2>
    <div v-if="loading">Loading users...</div>
    <template v-else>
      <CoarDataGridPanel :builder="builder" search-placeholder="Search users..." />
    </template>
  </div>
</template>
