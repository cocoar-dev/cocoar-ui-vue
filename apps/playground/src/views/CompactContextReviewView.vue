<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { CoarButton, CoarFormField, CoarSelect, CoarTextInput, CoarThemeScope, setCoarDragImageFromElement, useCompactPresentationContext, useDragDrop } from '@cocoar/vue-ui';
import '../../../../packages/ui/src/compact-fonts';

const mobile = ref(true);
const mode = ref<'light' | 'dark'>('dark');
const font = ref('Arial');
const text = ref('Überprüfung');
const value = ref<string | null>('one');
const options = [{ value: 'one', label: 'Ausgewählt' }, { value: 'two', label: 'Weitere Option' }];
const origin = useTemplateRef<HTMLElement>('origin');
const presentation = useCompactPresentationContext(() => origin.value);
const drag = useDragDrop<string>({ engine: 'pointer' });
function nativeDrag(event: DragEvent) {
  setCoarDragImageFromElement(event, event.currentTarget as HTMLElement);
}
</script>

<template>
  <main>
    <label>Mobile <input v-model="mobile" type="checkbox" data-context-mobile></label>
    <label>Mode <select v-model="mode" data-context-mode><option>light</option><option>dark</option></select></label>
    <label>Font <select v-model="font" data-context-font><option>Arial</option><option>Inter</option></select></label>
    <CoarThemeScope mode="dark" :theme="{ accent: '#15803d', bodyFontFamily: font, buttonRadius: 11 }">
      <section class="coar-compact" data-context-profile>
        <div :class="{ 'coar-mobile': mobile }">
          <CoarThemeScope :mode="mode">
            <div data-context-inherited>
              <CoarButton>Geerbte Größen</CoarButton>
              <CoarTextInput v-model="text" aria-label="Geerbte Eingabe" />
            </div>
            <div ref="origin" class="coar-theme-scope" style="--coar-ui-font-size: 15px; --coar-caption-font-size: 13px" data-context-origin>
              <CoarFormField label="Lokale Auswahl"><CoarSelect v-model="value" :options="options" /></CoarFormField>
              <CoarTextInput v-model="text" aria-label="Lokale Eingabe" />
              <CoarButton data-context-button>Aktion</CoarButton>
              <div class="context-drag-source" data-context-native-drag draggable="true" @dragstart="nativeDrag">Native Ziehvorschau</div>
              <div class="context-drag-source" data-context-pointer-drag @pointerdown="drag.onPointerDown($event, ['one', 'two'])">Pointer-Ziehvorschau</div>
            </div>
            <div class="coar-theme-none" data-context-reset>
              <CoarFormField label="Zurückgesetzte Auswahl"><CoarSelect v-model="value" :options="options" /></CoarFormField>
              <CoarTextInput v-model="text" aria-label="Zurückgesetzte Eingabe" />
              <CoarButton>Zurückgesetzte Aktion</CoarButton>
            </div>
          </CoarThemeScope>
        </div>
      </section>
    </CoarThemeScope>
    <section data-context-legacy><CoarTextInput v-model="text" aria-label="Bisherige Eingabe" /></section>
    <Teleport to="body">
      <div class="context-custom-teleport" :class="presentation.classes" :style="presentation.style" data-context-teleport>
        <span>Eigenes teleportiertes Werkzeug</span>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
main { padding: 16px; }
section { padding: 12px; }
[data-context-origin] { display: grid; gap: 8px; }
.context-custom-teleport { padding: 8px; background: var(--coar-background-neutral-primary); color: var(--coar-text-neutral-primary); }
.context-custom-teleport span { font-size: var(--coar-caption-font-size); }
.context-drag-source {
  padding: 8px;
  min-height: var(--coar-interactive-row-height);
  box-sizing: border-box;
  font-size: var(--coar-ui-font-size);
  background: var(--coar-background-neutral-primary);
  color: var(--coar-text-neutral-primary);
}
</style>
