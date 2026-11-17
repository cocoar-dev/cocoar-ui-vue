<script setup lang="ts">
import './compact-fonts';
import { defineComponent, h, ref } from 'vue';
import { CoarButton, CoarDialogFooter, CoarTextInput, useDialog } from '@cocoar/vue-ui';

const dialog = useDialog();
const result = ref('');
const Body = defineComponent({
  props: { close: Function },
  setup(props) {
    const nested = useDialog();
    return () => h('div', { 'data-case': 'dialog-body' }, [
      h(CoarTextInput, { modelValue: 'Eine lange deutsche Beschreibung' }),
      h(CoarButton, {
        variant: 'secondary',
        onClick: () => nested.alert('Innerer Dialog', 'Der äußere Dialog bleibt geöffnet.'),
      }, () => 'Inneren Dialog öffnen'),
      h(CoarDialogFooter, null, () => [
        h(CoarButton, { onClick: () => props.close?.('saved') }, () => 'Speichern'),
      ]),
    ]);
  },
});

async function confirm() {
  result.value = String(await dialog.confirm({
    title: 'Änderung übernehmen?',
    message: 'Die Bestätigung bleibt eine eigene Dialog-Präsentation.',
    confirmText: 'Übernehmen',
    cancelText: 'Abbrechen',
  }).result);
}
</script>

<template>
  <div class="coar-compact" data-edge="dialogs">
    <section class="vs-section">
      <h2 class="vs-title">Every dialog size, nested dialogs, alert, confirm and dragging a sheet</h2>
      <div class="vs-row">
        <CoarButton v-for="size in (['s', 'm', 'l', 'xl'] as const)" :key="size"
          :data-size="size" @click="dialog.open(Body, { title: `Größe ${size}`, size })"
        >Größe {{ size }}</CoarButton>
        <CoarButton data-case="alert" @click="dialog.alert('Hinweis', 'Eine kurze Meldung.')">Hinweis</CoarButton>
        <CoarButton data-case="confirm" @click="confirm">Bestätigen</CoarButton>
        <CoarButton data-case="sheet" @click="dialog.open(Body, { title: 'Ziehbares Sheet', presentation: 'sheet' })">Sheet</CoarButton>
      </div>
      <output data-case="result">{{ result }}</output>
    </section>
  </div>
</template>
