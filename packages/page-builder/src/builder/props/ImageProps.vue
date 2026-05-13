<script setup lang="ts">
import { computed, inject } from 'vue';
import {
  CoarFormField,
  CoarTextInput,
  CoarButton,
  CoarIcon,
} from '@cocoar/vue-ui';
import type { ImageNode } from '../../schema';
import { BUILDER_CONFIG } from '../builderContext';

const props = defineProps<{
  node: ImageNode;
  patch: (update: Partial<ImageNode>) => void;
}>();

const config = inject(BUILDER_CONFIG);

const hasPicker = computed(() => !!config?.value?.pickAsset);
const thumbUrl = computed(() => {
  const id = props.node.assetId;
  if (!id) return '';
  return config?.value?.assetResolver?.(id) ?? '';
});

async function openPicker() {
  const pick = config?.value?.pickAsset;
  if (!pick) return;
  const picked = await pick(props.node.assetId || undefined);
  if (picked === null || picked === undefined) return; // cancelled
  props.patch({ assetId: picked });
}

function clearAsset() {
  props.patch({ assetId: '' });
}
</script>

<template>
  <!-- ── With pickAsset callback: visual picker entry point ───────────────── -->
  <template v-if="hasPicker">
    <CoarFormField label="Asset">
      <div class="pb-image-asset">
        <div class="pb-image-asset__thumb">
          <img v-if="thumbUrl" :src="thumbUrl" :alt="props.node.alt ?? ''" />
          <span v-else class="pb-image-asset__empty">
            <CoarIcon name="image" size="m" />
            <span class="pb-image-asset__empty-label">
              {{ props.node.assetId ? 'No preview' : 'No image' }}
            </span>
          </span>
        </div>
        <div class="pb-image-asset__controls">
          <CoarButton size="s" variant="secondary" @click="openPicker">
            {{ props.node.assetId ? 'Change…' : 'Choose…' }}
          </CoarButton>
          <CoarButton
            v-if="props.node.assetId"
            size="s"
            variant="ghost"
            @click="clearAsset"
          >
            Clear
          </CoarButton>
        </div>
      </div>
    </CoarFormField>
  </template>

  <!-- ── Fallback: free-text Asset ID (no pickAsset configured) ───────────── -->
  <CoarFormField
    v-else
    label="Asset ID"
    hint="Resolved via assetResolver at render time"
  >
    <CoarTextInput
      :model-value="props.node.assetId ?? ''"
      @update:model-value="(v) => props.patch({ assetId: v })"
    />
  </CoarFormField>

  <CoarFormField label="Alt text">
    <CoarTextInput
      :model-value="props.node.alt ?? ''"
      @update:model-value="(v) => props.patch({ alt: v })"
    />
  </CoarFormField>
</template>

<style scoped>
.pb-image-asset {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

.pb-image-asset__thumb {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  background: var(--coar-surface-neutral-subtle, #f0f0f2);
  border: 1px solid var(--coar-border-neutral, #e0e0e0);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.pb-image-asset__thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pb-image-asset__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: var(--coar-icon-neutral-disabled, #b0b0b6);
  font-size: 10px;
}

.pb-image-asset__empty-label {
  font-size: 10px;
}

.pb-image-asset__controls {
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
}
</style>
