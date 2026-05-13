<script setup lang="ts">
/**
 * Example asset picker, built entirely outside `@cocoar/vue-page-builder`.
 *
 * The library only knows `config.pickAsset(currentId) => Promise<string | null>` —
 * the consumer (an IDP, this playground, …) owns the full UX: list source,
 * upload semantics, search, categorisation, delete, etc.
 *
 * This component is intentionally small to illustrate the contract. Real
 * IDPs typically wire `list()` to an HTTP API and `upload()` to a signed
 * upload URL.
 */
import { ref, type Ref } from 'vue';
import { CoarButton, CoarIcon } from '@cocoar/vue-ui';

export interface AssetItem {
  id: string;
  url: string;
  name?: string;
  alt?: string;
}

const props = defineProps<{
  /** Reactive backing store; the playground owns this ref. */
  assets: Ref<AssetItem[]>;
  /** Already-selected asset (for highlighting). */
  currentId?: string;
  /** Injected by useDialog.open(). */
  close: (value?: string) => void;
}>();

const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function pick(asset: AssetItem) {
  props.close(asset.id);
}

function triggerUpload() {
  fileInput.value?.click();
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  uploading.value = true;
  await new Promise((r) => setTimeout(r, 200)); // simulate upload latency
  const item: AssetItem = {
    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url: URL.createObjectURL(file),
    name: file.name,
  };
  props.assets.value = [item, ...props.assets.value];
  uploading.value = false;
}
</script>

<template>
  <div class="playground-asset-picker">
    <header class="playground-asset-picker__header">
      <span class="playground-asset-picker__hint">
        {{ props.assets.value.length }} asset{{ props.assets.value.length === 1 ? '' : 's' }}
      </span>
      <CoarButton size="s" variant="secondary" :disabled="uploading" @click="triggerUpload">
        <CoarIcon name="upload" size="s" />
        {{ uploading ? 'Uploading…' : 'Upload' }}
      </CoarButton>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="playground-asset-picker__file-input"
        @change="onFileChange"
      />
    </header>

    <div
      v-if="props.assets.value.length === 0"
      class="playground-asset-picker__state"
    >
      <CoarIcon name="image" size="l" />
      <p>No assets yet. Click <strong>Upload</strong> to add one.</p>
    </div>

    <ul v-else class="playground-asset-picker__grid">
      <li
        v-for="a in props.assets.value"
        :key="a.id"
        class="playground-asset-picker__item"
        :class="{ 'playground-asset-picker__item--selected': a.id === props.currentId }"
      >
        <button
          type="button"
          class="playground-asset-picker__item-btn"
          :title="a.name ?? a.id"
          @click="pick(a)"
        >
          <img :src="a.url" :alt="a.alt ?? a.name ?? a.id" />
          <span class="playground-asset-picker__item-label">{{ a.name ?? a.id }}</span>
        </button>
      </li>
    </ul>

    <footer class="playground-asset-picker__footer">
      <CoarButton variant="ghost" size="s" @click="props.close(undefined)">
        Cancel
      </CoarButton>
    </footer>
  </div>
</template>

<style scoped>
.playground-asset-picker {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 480px;
  max-height: 70vh;
}

.playground-asset-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.playground-asset-picker__hint {
  font-size: 12px;
  color: var(--coar-text-neutral-secondary, #666);
}

.playground-asset-picker__file-input {
  display: none;
}

.playground-asset-picker__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 16px;
  color: var(--coar-icon-neutral-disabled, #b0b0b6);
  text-align: center;
}

.playground-asset-picker__grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.playground-asset-picker__item-btn {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 6px;
  border: 1px solid var(--coar-border-neutral, #e0e0e0);
  background: var(--coar-surface-default, #fff);
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.12s, background-color 0.12s;
  font-family: inherit;
}

.playground-asset-picker__item-btn:hover {
  border-color: var(--coar-border-accent, #1666cc);
  background: var(--coar-surface-accent-subtle, #e6eefa);
}

.playground-asset-picker__item--selected .playground-asset-picker__item-btn {
  border-color: var(--coar-border-accent, #1666cc);
  outline: 2px solid var(--coar-border-accent, #1666cc);
  outline-offset: -2px;
}

.playground-asset-picker__item-btn img {
  display: block;
  width: 100%;
  height: 90px;
  object-fit: cover;
  border-radius: 4px;
  background: var(--coar-surface-neutral-subtle, #f0f0f2);
}

.playground-asset-picker__item-label {
  font-size: 11px;
  color: var(--coar-text-neutral-secondary, #555);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.playground-asset-picker__footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--coar-border-neutral-subtle, #eeeef0);
  padding-top: 12px;
}
</style>
