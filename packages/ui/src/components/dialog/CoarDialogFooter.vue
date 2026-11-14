<script setup lang="ts">
/**
 * **Preview** — may still change. The buttons of a body component opened with
 * `useDialog().open()`: its slot moves into the fixed footer of the dialog or sheet, so the
 * buttons stay visible while the content scrolls. In a sheet they span the full width,
 * stacked with the last one on top, clear of the home indicator. Outside a dialog or sheet the
 * slot renders in place.
 *
 * ```vue
 * <CoarDialogFooter>
 *   <CoarButton variant="secondary" @click="close()">Cancel</CoarButton>
 *   <CoarButton @click="close(values)">Save</CoarButton>
 * </CoarDialogFooter>
 * ```
 */
import { onBeforeUnmount } from 'vue';
import { injectDialogFooter } from './dialogFooter';

defineOptions({ name: 'CoarDialogFooter' });
defineSlots<{ default(): unknown }>();

const footer = injectDialogFooter();
const unregister = footer?.register();
onBeforeUnmount(() => unregister?.());
</script>

<template>
  <slot v-if="!footer" />
  <!-- The shell renders its footer element once registered: until then (one render) nothing. -->
  <Teleport v-else-if="footer.element.value" :to="footer.element.value">
    <slot />
  </Teleport>
</template>
