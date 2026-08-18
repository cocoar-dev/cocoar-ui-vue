<script setup lang="ts">
import { computed } from 'vue';
import { CoarPageRenderer, type ActionValues } from '@cocoar/vue-page-builder';
import { latestVersion, pageById, pageVersion, updateValues, valuesFor } from './page-store';
import { pageConfig } from './page-config';

const props = defineProps<{ id: string; page: string; version: string }>();
const record = computed(() => pageById(props.page));
const selectedVersion = computed(() => pageVersion(props.page, props.version));
const currentValues = computed(() => valuesFor(props.id));
const newerVersion = computed(() => latestVersion(props.page)?.version !== props.version);

function onValues(next: ActionValues): void {
  updateValues(props.id, next);
}
</script>

<template>
  <section
    v-if="record && selectedVersion"
    class="page-island"
    :style="{ height: `${record.canvasHeight}px` }"
  >
    <header class="page-island__header">
      <div>
        <span>Interactive page</span>
        <strong>{{ record.name }}</strong>
      </div>
      <div class="page-island__version">v{{ selectedVersion.version }}<small v-if="newerVersion">newer available</small></div>
    </header>
    <div class="page-island__body">
      <CoarPageRenderer
        :schema="selectedVersion.schema"
        :config="pageConfig"
        :initial-values="currentValues"
        @update:values="onValues"
      />
    </div>
  </section>
  <section v-else class="page-island page-island--missing">
    <strong>Page unavailable</strong>
    <span>{{ page }}@{{ version }} could not be resolved.</span>
  </section>
</template>

<style scoped>
.page-island { display: flex; flex-direction: column; min-height: 260px; overflow: hidden; border: 1px solid #b7c6ba; border-radius: 10px; background: #fff; box-shadow: 0 12px 32px rgba(38, 55, 44, .08); }
.page-island__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 54px; padding: 9px 16px; border-bottom: 1px solid #d8e0d9; background: #edf3ed; }
.page-island__header > div:first-child { display: grid; gap: 1px; }
.page-island__header span { color: #55705a; font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
.page-island__header strong { color: #202522; font-size: 14px; }
.page-island__version { display: flex; align-items: center; gap: 8px; color: #55705a; font-size: 12px; font-weight: 700; }
.page-island__version small { padding: 3px 6px; border-radius: 999px; background: #fff; color: #47697a; font-weight: 600; }
.page-island__body { flex: 1; min-height: 0; }
.page-island--missing { height: auto; padding: 18px; border-color: #d6a46b; background: #fff8ee; }
.page-island--missing span { color: #7b674e; }
</style>
