<template>
  <div class="user-card">
    <div class="avatar">{{ initials }}</div>
    <div class="meta">
      <div class="name">{{ user.name }}</div>
      <div class="email">{{ user.email }}</div>
    </div>
    <span class="role">{{ user.role }}</span>
    <!-- The × only appears on the selected side. Click → api.remove() → parent drops from v-model. -->
    <button
      v-if="side === 'selected'"
      type="button"
      class="remove"
      title="Remove from group"
      @click.stop="api.remove()"
    >×</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CoarListboxOption, CoarListboxItemApi, CoarListboxSide } from '@cocoar/vue-ui';

interface UserRow { id: string; name: string; email: string; role: string }

const props = defineProps<{
  item: CoarListboxOption<UserRow>;
  highlighted: boolean;
  selectable: boolean;
  side?: CoarListboxSide;
  api: CoarListboxItemApi<UserRow>;
}>();

const user = computed(() => props.item.value);
const initials = computed(() =>
  user.value.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
);
</script>

<style scoped>
.user-card { display: flex; align-items: center; gap: 10px; width: 100%; }
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
.remove {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 3px;
  cursor: pointer;
  color: #6b7280;
  font-size: 15px;
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}
.remove:hover { color: #dc2626; border-color: #dc2626; }
</style>
