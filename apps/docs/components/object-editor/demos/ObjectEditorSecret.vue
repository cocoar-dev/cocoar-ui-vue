<template>
  <div class="demo">
    <CoarObjectEditor
      v-model="settings"
      :schema="schema"
      :types="types"
      :resolve-type="resolveType"
      :redact="isEnvelope"
      locale="en-US"
    />
    <pre>{{ JSON.stringify(settings, null, 2) }}</pre>
  </div>
</template>

<script setup lang="ts">
import { markRaw, ref } from 'vue';
import {
  CoarObjectEditor,
  defineObjectEditorTypes,
  type CoarValueType,
  type JsonObject,
  type JsonSchema,
  type JsonValue,
} from '@cocoar/vue-object-editor';
import '@cocoar/vue-object-editor/styles';
import SecretControl from './SecretControl.vue';

// The app's secret type: its own control, shown as dots, stored as an envelope.
const secret: CoarValueType = {
  id: 'secret',
  label: 'Secret',
  icon: 'lock',
  hue: 0,
  schema: { type: 'string' },
  sensitive: true,
  validateSchema: false,
  control: markRaw(SecretControl),
  format: () => '••••••',
};
const types = defineObjectEditorTypes([secret]);

// The schema keeps its own marker; the editor picks the type from it.
const schema: JsonSchema = {
  type: 'object',
  properties: {
    user: { type: 'string', title: 'User' },
    password: { type: 'string', title: 'Password', 'x-cocoar-secret': true },
  },
};
const resolveType = ({ schema: property }: { schema: JsonSchema }) => (property['x-cocoar-secret'] ? 'secret' : undefined);
const isEnvelope = (_pointer: string, value: JsonValue) => typeof value === 'object' && value !== null && '$enc' in value;

const settings = ref<JsonObject | undefined>({
  user: 'service',
  password: { $enc: 'demo', data: 'c2VjcmV0' },
  legacyToken: { $enc: 'demo', data: 'b2xk' },
});
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
pre {
  font-size: 12px;
}
</style>
