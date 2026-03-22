<template>
  <div>
    <CoarTabGroup v-model="settingsTab">
      <CoarTab id="general">General</CoarTab>
      <CoarTab id="security">Security</CoarTab>
      <CoarTab id="notifications">Notifications</CoarTab>
      <CoarTab id="billing">Billing</CoarTab>
    </CoarTabGroup>
    <div style="padding: 16px; border: 1px solid var(--coar-border-neutral-secondary); border-top: none; border-radius: 0 0 8px 8px; min-height: 100px;">
      <div v-if="settingsTab === 'general'">
        <h4 style="margin: 0 0 8px;">General Settings</h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
            <span style="font-size: 13px;">Display name</span>
            <input type="text" value="John Doe" style="padding: 4px 8px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 6px; background: var(--coar-background-neutral-primary); color: var(--coar-text-neutral-primary); font-size: 13px; min-width: 160px;" />
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
            <span style="font-size: 13px;">Email</span>
            <input type="email" value="john@example.com" style="padding: 4px 8px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 6px; background: var(--coar-background-neutral-primary); color: var(--coar-text-neutral-primary); font-size: 13px; min-width: 160px;" />
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
            <span style="font-size: 13px;">Language</span>
            <select style="padding: 4px 8px; border: 1px solid var(--coar-border-neutral-secondary); border-radius: 6px; background: var(--coar-background-neutral-primary); color: var(--coar-text-neutral-primary); font-size: 13px; min-width: 160px;">
              <option>English</option>
              <option>German</option>
            </select>
          </div>
        </div>
      </div>
      <div v-else-if="settingsTab === 'security'">
        <h4 style="margin: 0 0 8px;">Security Settings</h4>
        <p style="font-size: 13px; color: var(--coar-text-neutral-secondary);">Manage your password and two-factor authentication settings.</p>
      </div>
      <div v-else-if="settingsTab === 'notifications'">
        <h4 style="margin: 0 0 8px;">Notification Preferences</h4>
        <p style="font-size: 13px; color: var(--coar-text-neutral-secondary);">Choose how you want to be notified about account activity.</p>
      </div>
      <div v-else-if="settingsTab === 'billing'">
        <h4 style="margin: 0 0 8px;">Billing & Plans</h4>
        <p style="font-size: 13px; color: var(--coar-text-neutral-secondary);">Manage your subscription and payment methods.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarTabGroup, CoarTab } from '@cocoar/vue-ui';

const settingsTab = ref('general');
</script>
