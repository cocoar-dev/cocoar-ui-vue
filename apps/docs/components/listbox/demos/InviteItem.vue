<template>
  <div class="invite-item">
    <span class="badge">Invite</span>
    <div class="email">{{ invite.email }}</div>
    <span class="expires">Expires in {{ invite.expiresInDays }}d</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CoarListboxOption } from '@cocoar/vue-ui';

interface InviteRow { id: string; email: string; expiresInDays: number }

const props = defineProps<{
  item: CoarListboxOption<InviteRow>;
  highlighted: boolean;
  selectable: boolean;
}>();

const invite = computed(() => props.item.value);
</script>

<style scoped>
.invite-item { display: flex; align-items: center; gap: 10px; width: 100%; font-style: italic; }
.badge {
  font-size: 10px; padding: 2px 6px; border-radius: 3px;
  background: #fef3c7; color: #92400e; font-weight: 600; text-transform: uppercase;
}
.email { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.expires { font-size: 11px; color: #64748b; font-style: normal; }
</style>
