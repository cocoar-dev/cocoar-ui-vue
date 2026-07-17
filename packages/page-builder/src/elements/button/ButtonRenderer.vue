<script setup lang="ts">
import { computed } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';
import type { ButtonNode } from '../../schema';
import { usePageElement } from '../usePageElement';

const props = defineProps<{ node: ButtonNode }>();

const ctx = usePageElement();

/** This button's trigger is in flight (onValidate or the action itself). */
const isPending = computed(
  () => !!props.node.props.action && ctx.pendingAction.value === props.node.props.action,
);
/** Another trigger is in flight — every action button disables while it runs. */
const busy = computed(() => ctx.isValidating.value || ctx.isSubmitting.value);

function callAction(id?: string, validates?: boolean) {
  if (!id) return;
  ctx.triggerAction(id, validates);
}
</script>

<template>
  <!-- Validating buttons stay CLICKABLE while the form is invalid — the click
       reveals the errors (a disabled button can't explain itself). Buttons
       only disable while a trigger is in flight (onValidate or an async
       action), to block double-submit; the triggering one spins instead. -->
  <CoarButton
    class="pb-button"
    :variant="node.props.variant ?? 'primary'"
    :size="node.props.size"
    :icon-left="node.props.icon"
    :loading="isPending && busy"
    :disabled="busy && !isPending"
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
