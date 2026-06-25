<script setup lang="ts">
// Internal primitive — imported by relative path (not exported from the package).
import CoarInputFrame from '../../../../packages/ui/src/components/input-frame/CoarInputFrame.vue';
import CoarInputFrameButton from '../../../../packages/ui/src/components/input-frame/CoarInputFrameButton.vue';
import { CoarIcon } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
</script>

<template>
  <div class="demo">
    <h1>CoarInputFrame — internal shell proof</h1>
    <p>Open the theme editor (palette, bottom-right) → Inputs → Field padding / Corner radius to see padding &amp; radius drive every variant from one place.</p>

    <section v-for="size in sizes" :key="size">
      <h2>size = {{ size }}</h2>
      <div class="row">
        <!-- plain -->
        <CoarInputFrame :size="size" style="width: 200px">
          <input class="fld" placeholder="plain field" />
        </CoarInputFrame>

        <!-- leading prefix -->
        <CoarInputFrame :size="size" style="width: 200px">
          <template #leading><CoarIcon name="search" size="s" /></template>
          <input class="fld" placeholder="with leading" />
        </CoarInputFrame>

        <!-- trailing clear (Type A) -->
        <CoarInputFrame :size="size" style="width: 200px">
          <input class="fld" placeholder="with clear" value="value" />
          <template #trailing><CoarIcon name="x" size="s" /></template>
        </CoarInputFrame>

        <!-- edge button (Type B) — the date-picker / select case -->
        <CoarInputFrame :size="size" style="width: 220px">
          <input class="fld" style="text-align: right" placeholder="DD.MM.YYYY" />
          <template #actions>
            <CoarInputFrameButton aria-label="open calendar">
              <CoarIcon name="calendar" size="s" />
            </CoarInputFrameButton>
          </template>
        </CoarInputFrame>

        <!-- trailing clear + edge button (combined) -->
        <CoarInputFrame :size="size" style="width: 240px">
          <input class="fld" style="text-align: right" value="24.06.2026" />
          <template #trailing><CoarIcon name="x" size="s" /></template>
          <template #actions>
            <CoarInputFrameButton aria-label="open calendar">
              <CoarIcon name="calendar" size="s" />
            </CoarInputFrameButton>
          </template>
        </CoarInputFrame>
      </div>
    </section>
  </div>
</template>

<style scoped>
.demo { padding: 24px; max-width: 1100px; font-family: var(--coar-body-base-family); }
h1 { font-size: 20px; margin-bottom: 4px; }
p { color: var(--coar-text-neutral-secondary); margin-bottom: 24px; font-size: 13px; }
h2 { font-size: 13px; color: var(--coar-text-neutral-tertiary); margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; }
.row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
.fld {
  flex: 1; min-width: 0; height: 100%; border: none; background: transparent; outline: none;
  font-family: var(--coar-body-small-base-family); font-size: inherit;
  color: var(--coar-text-neutral-primary);
}
.fld::placeholder { color: var(--coar-text-placeholder); }
</style>
