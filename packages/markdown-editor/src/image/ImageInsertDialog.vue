<script setup lang="ts">
/**
 * Body component for the "Insert image" dialog, mounted via
 * `useDialog().open(ImageInsertDialog, …)`. Collects the three fields a
 * standard Markdown image carries — `url`, `alt`, `title` — and resolves the
 * dialog with an `ImageInsertResult` (or `undefined` on cancel).
 *
 * The dialog shell injects `close`; calling it resolves the `open()` promise.
 * Insert is disabled until a non-empty URL is entered. Enter inside any field
 * submits, Escape is handled by the shell (resolves undefined).
 */
import { ref, computed, onMounted, useTemplateRef } from 'vue';
import { CoarFormField, CoarTextInput, CoarButton } from '@cocoar/vue-ui';

export interface ImageInsertResult {
  url: string;
  alt: string;
  title: string;
}

const props = defineProps<{
  /** Injected by CoarDialogShell — resolves the dialog. */
  close: (result?: ImageInsertResult) => void;
  initialUrl?: string;
  initialAlt?: string;
  initialTitle?: string;
}>();

const url = ref(props.initialUrl ?? '');
const alt = ref(props.initialAlt ?? '');
const title = ref(props.initialTitle ?? '');

const urlFieldRef = useTemplateRef<HTMLDivElement>('urlField');

const canInsert = computed(() => url.value.trim().length > 0);

function submit() {
  if (!canInsert.value) return;
  props.close({ url: url.value.trim(), alt: alt.value.trim(), title: title.value.trim() });
}

function cancel() {
  props.close();
}

onMounted(() => {
  // Focus the URL field so the user can paste straight away. The dialog shell
  // mounts after the editor blurs, so there's no focus contention.
  urlFieldRef.value?.querySelector('input')?.focus();
});
</script>

<template>
  <div class="coar-md-image-dialog" @keydown.enter.prevent="submit">
    <div ref="urlField">
      <CoarFormField label="Image URL" required>
        <CoarTextInput v-model="url" placeholder="https://example.com/image.png" autocomplete="off" />
      </CoarFormField>
    </div>

    <CoarFormField label="Alt text">
      <CoarTextInput v-model="alt" placeholder="Describe the image" autocomplete="off" />
    </CoarFormField>

    <CoarFormField label="Title (optional)">
      <CoarTextInput v-model="title" placeholder="Shown on hover" autocomplete="off" />
    </CoarFormField>

    <div class="coar-md-image-dialog__actions">
      <CoarButton variant="tertiary" type="button" @click="cancel">Cancel</CoarButton>
      <CoarButton variant="primary" type="button" :disabled="!canInsert" @click="submit">Insert</CoarButton>
    </div>
  </div>
</template>

<style scoped>
.coar-md-image-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--coar-spacing-m, 12px);
  min-width: 22rem;
}

.coar-md-image-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--coar-spacing-s, 8px);
  margin-top: var(--coar-spacing-s, 8px);
}
</style>
