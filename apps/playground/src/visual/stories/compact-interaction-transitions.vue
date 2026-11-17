<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): the four transitions (`CoarCollapse`,
 * `CoarFade`, `CoarSlide`, `CoarScale`) in their settled states, shown and hidden side by side.
 * The buttons toggle the real transitions (the spec measures the motion; the images show
 * the settled states only).
 */
import { reactive } from 'vue';
import { CoarButton, CoarCollapse, CoarFade, CoarScale, CoarSlide } from '@cocoar/vue-ui';

const kinds = ['collapse', 'fade', 'slide', 'scale'] as const;
const shown = reactive<Record<string, boolean>>({
  'collapse-on': true, 'collapse-off': false,
  'fade-on': true, 'fade-off': false,
  'slide-on': true, 'slide-off': false,
  'scale-on': true, 'scale-off': false,
});
const components = { collapse: CoarCollapse, fade: CoarFade, slide: CoarSlide, scale: CoarScale };
</script>

<template>
  <div class="coar-compact" data-interaction="transitions">
    <section class="vs-section">
      <h2 class="vs-title">Transitions: shown (left) and hidden (right) after the toggle</h2>
      <div class="vs-grid" style="--vs-columns: 2; align-items: start">
        <template v-for="kind in kinds" :key="kind">
          <span class="vs-label">{{ kind }}</span>
          <div v-for="state in ['on', 'off']" :key="state" :data-transition="`${kind}-${state}`" class="vs-stack" style="gap: 8px">
            <CoarButton size="s" variant="secondary" data-toggle @click="shown[`${kind}-${state}`] = !shown[`${kind}-${state}`]">
              {{ shown[`${kind}-${state}`] ? 'Ausblenden' : 'Einblenden' }}
            </CoarButton>
            <div style="min-height: 56px; width: 100%; outline: 1px dashed var(--coar-border-neutral-tertiary)">
              <component :is="components[kind]">
                <div
                  v-if="shown[`${kind}-${state}`]"
                  data-panel
                  style="padding: 8px 12px; background: var(--coar-background-neutral-secondary); border-radius: 4px"
                >
                  Inhalt — {{ kind }}
                </div>
              </component>
            </div>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
