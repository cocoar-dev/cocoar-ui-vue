<template>
  <div class="avatar-stack">
    <CoarAvatar src="https://i.pravatar.cc/150?img=10" name="User A" size="m" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=11" name="User B" size="m" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=12" name="User C" size="m" />
    <CoarAvatar src="https://i.pravatar.cc/150?img=13" name="User D" size="m" />
    <CoarAvatar name="+5" size="m" />
  </div>
</template>

<script setup lang="ts">
import { CoarAvatar } from '@cocoar/vue-ui';
</script>

<style scoped>
.avatar-stack {
  display: flex;
  align-items: center;
}
.avatar-stack > * + * {
  margin-left: -8px;
}
.avatar-stack > * {
  border: 2px solid var(--coar-background-neutral-primary, #fff);
  border-radius: 50%;
}
</style>
