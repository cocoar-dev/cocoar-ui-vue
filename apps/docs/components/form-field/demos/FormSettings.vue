<template>
  <form class="demo-form" @submit.prevent>
    <CoarFormField label="Display Name" hint="This is shown publicly">
      <CoarTextInput v-model="displayName" placeholder="Your display name" />
    </CoarFormField>

    <CoarFormField label="Bio">
      <CoarTextInput v-model="bio" placeholder="Tell us about yourself..." :rows="3" />
    </CoarFormField>

    <CoarFormField label="Language">
      <CoarSelect v-model="language" :options="languages" />
    </CoarFormField>

    <CoarFormField label="Notifications">
      <div class="demo-checks">
        <CoarCheckbox v-model="emailNotifs" label="Email notifications" />
        <CoarCheckbox v-model="pushNotifs" label="Push notifications" />
        <CoarCheckbox v-model="weeklyDigest" label="Weekly digest" />
      </div>
    </CoarFormField>

    <CoarFormField label="Theme">
      <CoarRadioGroup v-model="theme" name="theme" orientation="horizontal">
        <CoarRadioButton value="light" label="Light" />
        <CoarRadioButton value="dark" label="Dark" />
        <CoarRadioButton value="system" label="System" />
      </CoarRadioGroup>
    </CoarFormField>

    <CoarFormField label="Experimental Features">
      <CoarSwitch v-model="experiments" label="Enable beta features" />
    </CoarFormField>

    <div class="demo-form__actions">
      <CoarButton>Save Settings</CoarButton>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFormField, CoarTextInput, CoarSelect, CoarCheckbox, CoarRadioGroup, CoarRadioButton, CoarSwitch, CoarButton } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const displayName = ref('Jane Doe');
const bio = ref('');
const language = ref('en');
const emailNotifs = ref(true);
const pushNotifs = ref(false);
const weeklyDigest = ref(true);
const theme = ref('system');
const experiments = ref(false);

const languages: CoarSelectOption<string>[] = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];
</script>

<style scoped>
.demo-form {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m);
  max-width: 400px;
}
.demo-checks {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-s);
}
.demo-form__actions {
  padding-top: var(--coar-spacing-s);
}
</style>
