<template>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    <CoarButton variant="danger" icon-start="trash-2" @click="confirmDelete">Delete as sheet</CoarButton>
    <CoarButton variant="secondary" @click="editContact">Edit contact as sheet</CoarButton>
  </div>
  <p style="margin-top: 8px; font-size: 13px; color: var(--coar-text-neutral-secondary);">
    Last result: {{ lastResult || 'none' }}
  </p>
</template>

<script setup lang="ts">
import { defineComponent, h, ref } from 'vue';
import { CoarButton, CoarDialogFooter, CoarFormField, CoarTextInput, useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();
const lastResult = ref('');

function confirmDelete() {
  dialog.confirm({
    title: 'Delete item?',
    message: 'This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Keep',
    confirmVariant: 'danger',
    presentation: 'sheet',
  }).result.then((confirmed) => {
    lastResult.value = confirmed ? 'deleted' : 'kept';
  });
}

// The body of the form sheet. In an app this is usually an SFC of its own; its buttons go into
// <CoarDialogFooter> so they stay in the sheet's fixed footer while the fields scroll.
const ContactForm = defineComponent({
  props: { close: { type: Function, required: true } },
  setup(props) {
    const name = ref('Anna Berger');
    const email = ref('anna@example.com');
    const phone = ref('+43 1 234 567');
    const field = (label: string, model: typeof name) =>
      h(CoarFormField, { label }, () =>
        h(CoarTextInput, { modelValue: model.value, 'onUpdate:modelValue': (v: string) => (model.value = v) }),
      );
    return () =>
      h('div', { style: 'display: grid; gap: 16px;' }, [
        field('Name', name),
        field('E-mail', email),
        field('Phone', phone),
        h(CoarDialogFooter, null, () => [
          h(CoarButton, { variant: 'secondary', onClick: () => props.close() }, () => 'Cancel'),
          h(CoarButton, { onClick: () => props.close(name.value) }, () => 'Save'),
        ]),
      ]);
  },
});

function editContact() {
  dialog.open<string>(ContactForm, { title: 'Edit contact', presentation: 'sheet' }).result.then((saved) => {
    lastResult.value = saved ? `saved ${saved}` : 'cancelled';
  });
}
</script>
