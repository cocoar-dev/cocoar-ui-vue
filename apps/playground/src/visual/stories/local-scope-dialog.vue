<script setup lang="ts">
import { defineComponent, h, onMounted } from 'vue';
import { CoarButton, CoarTextInput, useDialog } from '@cocoar/vue-ui';

// A component inside the local area that asks for a confirmation on mount, as an app does:
// useDialog() in its setup() takes the component's element as the dialog's context.
const AskOnMount = defineComponent({
  setup() {
    const dialog = useDialog();
    onMounted(() => {
      dialog.confirm({
        title: 'Discard the draft?',
        message: 'The changes to this customer are not saved.',
        confirmText: 'Discard',
        cancelText: 'Keep editing',
        confirmVariant: 'danger',
      });
    });
    return () => h('span', { style: 'font-size: 12px' }, 'Asks on mount');
  },
});
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">
      .coar-mobile on a local container beside a desktop sibling; dialog opened from inside it
    </h2>
    <div class="vs-row" style="align-items: flex-start; gap: 32px">
      <div style="width: 280px; align-items: stretch" class="vs-stack">
        <strong style="font-size: 12px">Desktop sibling</strong>
        <CoarTextInput model-value="Desktop input" />
        <div><CoarButton>Save</CoarButton></div>
      </div>
      <div style="width: 280px; align-items: stretch" class="vs-stack coar-mobile">
        <strong style="font-size: 12px">Local .coar-mobile container</strong>
        <CoarTextInput model-value="Mobile input" />
        <AskOnMount />
      </div>
    </div>
  </section>
</template>
