<template>
  <CoarFormField label="Owner">
    <CoarSelect
      v-model="owner"
      :options="options"
      :compare-with="samePerson"
      placeholder="Choose a person"
      searchable
      clearable
    >
      <template #value="{ option, placeholder }">
        <span v-if="option" class="person">
          <CoarAvatar :name="option.label" size="xs" :max-length="2" aria-hidden="true" />
          <span>{{ option.label }}</span>
        </span>
        <span v-else>{{ placeholder }}</span>
      </template>
      <template #option="{ option }">
        <span class="person">
          <CoarAvatar :name="option.label" size="xs" :max-length="2" aria-hidden="true" />
          <span class="person-copy">
            <span>{{ option.label }}</span>
            <small>{{ option.value.role }}</small>
          </span>
        </span>
      </template>
    </CoarSelect>
  </CoarFormField>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarAvatar, CoarFormField, CoarSelect, type CoarSelectOption } from '@cocoar/vue-ui';

interface Person {
  id: string;
  role: string;
}
const options: CoarSelectOption<Person>[] = [
  { value: { id: 'anna', role: 'Product management' }, label: 'Anna Berger' },
  { value: { id: 'lukas', role: 'Design' }, label: 'Lukas Huber' },
  { value: { id: 'sophie', role: 'Purchasing' }, label: 'Sophie Wagner' },
];
const owner = ref<Person | null>(options[1].value);
const samePerson = (a: Person, b: Person) => a.id === b.id;
</script>

<style scoped>
.person {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.person-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.person-copy small {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
}
</style>
