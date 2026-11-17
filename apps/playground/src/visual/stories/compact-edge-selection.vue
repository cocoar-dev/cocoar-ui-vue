<script setup lang="ts">
import './compact-fonts';
import { ref } from 'vue';
import { CoarButton, CoarListbox, CoarSelect, CoarTagSelect } from '@cocoar/vue-ui';

const options = Array.from({ length: 240 }, (_, index) => ({
  value: `item-${index}`,
  label: `Eintrag ${String(index + 1).padStart(3, '0')}`,
}));
const selected = ref<string | null>('item-3');
const tags = ref<string[]>([]);
const delayedOptions = ref<typeof options>([]);
</script>

<template>
  <div class="coar-compact" data-edge="selection">
    <section class="vs-section">
      <h2 class="vs-title">Search, no results, empty data and creating a tag</h2>
      <div class="vs-row" style="align-items: start">
        <div data-case="search" style="width: 240px">
          <CoarSelect v-model="selected" :options="options" searchable search-placeholder="Einträge suchen" />
        </div>
        <div data-case="empty" style="width: 240px">
          <CoarSelect :options="delayedOptions" placeholder="Noch keine Daten" searchable />
        </div>
        <div data-case="create" style="width: 240px">
          <CoarTagSelect v-model="tags" :options="options.slice(0, 3)" allow-create />
          <output>{{ tags.join(', ') }}</output>
        </div>
        <CoarButton data-case="load" variant="secondary" size="s" @click="delayedOptions = options">Daten übernehmen</CoarButton>
      </div>
    </section>
    <section class="vs-section" style="width: 360px">
      <h2 class="vs-title">Real virtual list — its own explicit row geometry</h2>
      <CoarListbox :options="options" virtual searchable height="240px" label="240 Einträge" />
    </section>
  </div>
</template>
