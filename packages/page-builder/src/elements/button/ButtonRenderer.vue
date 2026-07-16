<script setup lang="ts">
import { CoarButton } from '@cocoar/vue-ui';
import type { ButtonNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: ButtonNode }>();

const ctx = usePageElement();

function callAction(id?: string, validates?: boolean) {
  if (!id) return;
  ctx.triggerAction(id, validates);
}
</script>

<template>
  <!-- Validating buttons stay CLICKABLE while the form is invalid — the click
       reveals the errors (a disabled button can't explain itself). They only
       disable while an async onValidate is in flight, to block double-submit. -->
  <CoarButton
    class="pb-button"
    :variant="node.props.variant ?? 'primary'"
    :size="node.props.size"
    :icon-left="node.props.icon"
    :disabled="node.props.validates && ctx.isValidating.value"
    @click="callAction(props.node.props.action, props.node.props.validates)"
  >
    {{ node.props.label }}
  </CoarButton>
</template>

<style scoped>
/*
 * Inline-natured leaf — would otherwise be stretched to the full cross-axis by
 * `align-items: stretch` (the flexbox default) on the parent stack — matching
 * the editor canvas where these elements sit content-sized inside a wrapper.
 * Explicit `style.width` on the schema still wins because it's applied as an
 * inline style.
 */
.pb-button {
  width: fit-content;
  max-width: 100%;
}
</style>
