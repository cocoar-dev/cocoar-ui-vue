<template>
  <div class="demo">
    <CoarObjectEditor v-model="settings" :schema="schema" :edit-unknown="editUnknown" locale="en-US" />
    <pre class="json">{{ JSON.stringify(settings, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarObjectEditor, type JsonObject, type JsonSchema, type JsonValue } from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';

const schema: JsonSchema = {
  type: 'object',
  properties: {
    DatabaseSettings: {
      type: 'object',
      title: 'Database',
      properties: { Host: { type: 'string', title: 'Host' }, Port: { type: 'integer', title: 'Port' } },
    },
  },
};

// A legacy field and one only newer clients know: neither is in the schema.
const settings = ref<JsonObject | undefined>({
  DatabaseSettings: { Host: 'db.internal', Port: 5432, UnknownLegacy: { Keep: 1 } },
  FeatureFlags: ['beta-search'],
});

// The app decides per value. Here: everything except the legacy field.
const editUnknown = (pointer: string, _value: JsonValue) => pointer !== '/DatabaseSettings/UnknownLegacy';
</script>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
}
.json {
  margin: 0;
  font-size: 12px;
}
</style>
