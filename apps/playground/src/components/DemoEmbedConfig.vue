<script setup lang="ts">
/**
 * The EDITABLE variant of the demo embed, mounted by the editor NodeView. It
 * receives a single typed `controller` ({@link EmbedEditorProps}) — no magic
 * v-model string — and writes changes back via `controller.patch(...)`, which
 * round-trips into the `:::demo{...}` markdown. Shows the same live `DemoEmbed`
 * preview PLUS a config strip.
 *
 * Like DemoEmbed, it has zero markdown dependency — the editor wires the
 * controller <-> markdown round-trip; this component just edits a string bag.
 */
import { reactive, watch } from 'vue';
import type { EmbedEditorProps } from '@cocoar/vue-markdown';
import DemoEmbed from './DemoEmbed.vue';

const props = defineProps<EmbedEditorProps>();

// Local working copy so typing drives the preview instantly and survives the
// round-trip re-render without losing input focus.
const model = reactive<Record<string, string>>({ ...props.controller.props });

watch(
  () => props.controller.props,
  (next) => {
    for (const key of Object.keys(next)) {
      if (model[key] !== next[key]) model[key] = next[key] ?? '';
    }
  },
  { deep: true },
);

function onField(key: string, event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  model[key] = value;
  props.controller.patch({ [key]: value });
}
</script>

<template>
  <div class="demo-config">
    <div class="demo-config__bar">
      <span class="demo-config__tag">✎ Configure embed</span>
      <label class="demo-config__field">
        <span>Title</span>
        <input :value="model.title ?? ''" @input="onField('title', $event)" />
      </label>
      <label class="demo-config__field">
        <span>Metric</span>
        <input :value="model.metric ?? ''" @input="onField('metric', $event)" />
      </label>
      <label class="demo-config__field">
        <span>Trend</span>
        <input :value="model.trend ?? ''" @input="onField('trend', $event)" />
      </label>
      <label class="demo-config__field demo-config__field--color">
        <span>Accent</span>
        <input type="color" :value="model.accent || '#6366f1'" @input="onField('accent', $event)" />
      </label>
    </div>

    <DemoEmbed v-bind="model" />
  </div>
</template>

<style scoped>
.demo-config {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.demo-config__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  padding: 8px 10px;
  border: 1px dashed var(--coar-border-accent, #6366f1);
  border-radius: 8px;
  background: color-mix(in srgb, var(--coar-border-accent, #6366f1) 7%, transparent);
}

.demo-config__tag {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-accent, #4f46e5);
  align-self: center;
  margin-right: 4px;
}

.demo-config__field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  color: var(--coar-text-neutral-secondary, #666);
}

.demo-config__field input {
  font: inherit;
  font-weight: 500;
  padding: 4px 7px;
  border: 1px solid var(--coar-border-neutral, #d4d4d4);
  border-radius: 5px;
  background: var(--coar-background-neutral-primary, #fff);
  color: var(--coar-text-neutral-primary, #111);
  width: 120px;
}

.demo-config__field--color input {
  width: 44px;
  height: 30px;
  padding: 2px;
  cursor: pointer;
}
</style>
