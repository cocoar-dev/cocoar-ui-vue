<template>
  <div class="user-item">
    <div class="avatar">{{ initials }}</div>
    <div class="meta">
      <div class="name">{{ user.name }}</div>
      <div class="email">{{ user.email }}</div>
    </div>
    <span class="role">{{ user.role }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CoarListboxOption } from '@cocoar/vue-ui';

interface UserRow { id: string; name: string; email: string; role: string }

const props = defineProps<{
  item: CoarListboxOption<UserRow>;
  highlighted: boolean;
  selectable: boolean;
}>();

const user = computed(() => props.item.value);
const initials = computed(() =>
  user.value.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
);
</script>

<style scoped>
.user-item { display: flex; align-items: center; gap: 10px; width: 100%; }
.avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: #4f46e5; color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; flex-shrink: 0;
}
.meta { flex: 1; min-width: 0; line-height: 1.2; }
.name { font-weight: 500; }
.email { font-size: 12px; color: #64748b; overflow: hidden; text-overflow: ellipsis; }
.role {
  font-size: 11px; padding: 2px 8px; border-radius: 999px;
  background: #e0e7ff; color: #4338ca; font-weight: 500;
}
</style>
