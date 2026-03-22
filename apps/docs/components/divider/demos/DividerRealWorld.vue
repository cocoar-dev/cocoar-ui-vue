<template>
  <div style="display: flex; flex-direction: column; gap: 8px; max-width: 360px;">
    <button class="oauth-btn">Continue with Google</button>
    <button class="oauth-btn">Continue with GitHub</button>
    <CoarDivider label="or sign in with email" />
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <label style="font-size: 14px;">Email</label>
      <input type="email" placeholder="you@example.com" class="native-input" />
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <label style="font-size: 14px;">Password</label>
      <input type="password" placeholder="••••••••" class="native-input" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarDivider } from '@cocoar/vue-ui';
</script>

<style scoped>
.oauth-btn {
  padding: 8px 16px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 6px;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  font-size: 14px;
  cursor: pointer;
}
.oauth-btn:hover {
  background: var(--coar-background-neutral-tertiary);
}
.native-input {
  padding: 6px 10px;
  border: 1px solid var(--coar-border-neutral-secondary);
  border-radius: 6px;
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
  font-size: 14px;
}
</style>
