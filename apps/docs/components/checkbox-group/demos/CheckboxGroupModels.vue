<template>
  <div class="group-models">
    <CoarFormField label="Array model" hint="The model contains only selected values.">
      <CoarCheckboxGroup v-model="arrayValue" name="array-permissions">
        <CoarCheckbox value="read" label="Read" />
        <CoarCheckbox value="write" label="Write" />
        <CoarCheckbox value="admin" label="Admin" />
      </CoarCheckboxGroup>
    </CoarFormField>
    <pre>{{ arrayValue }}</pre>

    <CoarFormField
      label="Object model"
      hint="Every registered value is represented by an explicit Boolean."
    >
      <CoarCheckboxGroup v-model="objectValue" model-type="object" name="object-permissions">
        <CoarCheckbox value="read" label="Read" />
        <CoarCheckbox value="write" label="Write" />
        <CoarCheckbox value="admin" label="Admin" />
      </CoarCheckboxGroup>
    </CoarFormField>
    <pre>{{ objectValue }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox, CoarCheckboxGroup, CoarFormField } from '@cocoar/vue-ui';

const arrayValue = ref<string[]>(['read']);
const objectValue = ref<Record<string, boolean>>({
  read: true,
  write: false,
  admin: false,
});
</script>

<style scoped>
.group-models {
  display: grid;
  gap: var(--coar-spacing-m);
}

.group-models pre {
  margin: 0;
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  border-radius: var(--coar-radius-xs);
  background: var(--coar-background-neutral-secondary);
  font-size: 12px;
}
</style>
