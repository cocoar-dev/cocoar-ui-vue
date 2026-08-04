<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import { CoarScriptEditor } from '@cocoar/vue-script-editor';
import type { PageConfig } from '../schema';
import {
  EXPRESSION_PREAMBLE,
  expectedExpressionType,
  runtimeTypeLibrary,
} from './expressionAuthoring';

const props = defineProps<{
  nodeId: string;
  target: string;
  expression: string;
  config?: PageConfig;
  close: (result?: string) => void;
}>();

const draft = ref(props.expression);
const extraLibs = computed(() => runtimeTypeLibrary(props.config));
const expectedType = computed(() => expectedExpressionType(props.target));
</script>

<template>
  <div class="pb-expression-dialog">
    <div class="pb-expression-dialog__meta">
      <div>
        <span>Property</span>
        <strong>{{ nodeId }} · {{ target }}</strong>
      </div>
      <div>
        <span>Result</span>
        <code>{{ expectedType }}</code>
      </div>
    </div>

    <div class="pb-expression-dialog__editor">
      <CoarScriptEditor
        v-model="draft"
        language="javascript"
        :script-mode="true"
        :preamble="EXPRESSION_PREAMBLE"
        :extra-libs="extraLibs"
        height="clamp(320px, 52vh, 520px)"
        placeholder="Enter a JavaScript expression…"
      />
    </div>

    <p class="pb-expression-dialog__hint">
      Available: <code>fields</code>, <code>form</code>, <code>context</code>,
      <code>resources</code>, <code>viewport</code>. IntelliSense shows the
      fields and context allowed by this page's host configuration.
    </p>

    <footer>
      <CoarButton variant="secondary" @click="close()">Cancel</CoarButton>
      <CoarButton @click="close(draft)">Apply expression</CoarButton>
    </footer>
  </div>
</template>

<style scoped>
.pb-expression-dialog { display: flex; flex-direction: column; gap: 12px; }
.pb-expression-dialog__meta { display: flex; justify-content: space-between; gap: 24px; }
.pb-expression-dialog__meta div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pb-expression-dialog__meta span, .pb-expression-dialog__hint { color: var(--coar-text-neutral-secondary, #666); font-size: 12px; }
.pb-expression-dialog__meta strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pb-expression-dialog__editor { flex: none; border: 1px solid var(--coar-border-neutral, #ddd); border-radius: 6px; overflow: hidden; }
.pb-expression-dialog__hint { margin: 0; }
.pb-expression-dialog footer { display: flex; justify-content: flex-end; gap: 8px; }
</style>
