<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): data and containers — data list with
 * groups and a selected row, table (striped, plain, compact prop), code block, cards
 * and a split pane with its divider.
 */
import { ref } from 'vue';
import {
  CoarAvatar,
  CoarCard,
  CoarCodeBlock,
  CoarDataList,
  CoarSplitPane,
  CoarTable,
} from '@cocoar/vue-ui';

interface Contact {
  name: string;
  email: string;
  team: string;
}
const contacts: Contact[] = [
  { name: 'Ada Lovelace', email: 'ada@example.com', team: 'Platform' },
  { name: 'Grace Hopper', email: 'grace@example.com', team: 'Platform' },
  { name: 'Linus Torvalds', email: 'linus@example.com', team: 'Design' },
  { name: 'Margaret Hamilton', email: 'margaret@example.com', team: 'Design' },
];
const selection = ref<string[]>(['grace@example.com']);
const rows = [
  { name: 'Größe', type: "'s' | 'm' | 'l'", def: "'m'" },
  { name: 'Variante', type: 'string', def: "'neutral'" },
  { name: 'Deaktiviert', type: 'boolean', def: 'false' },
];
const code = `import { CoarTag } from '@cocoar/vue-ui';\n\nexport const tag = { variant: 'success', size: 'm' };`;
</script>

<template>
  <div class="coar-compact">
    <section class="vs-section">
      <h2 class="vs-title">Data list (groups, bordered, selected) and table variants</h2>
      <div class="vs-row" style="align-items: flex-start; gap: 24px">
        <div style="width: 280px; height: 280px; display: flex">
          <CoarDataList
            v-model:selected="selection"
            :items="contacts"
            :item-key="(c: Contact) => c.email"
            :group-by="(c: Contact) => c.team"
            selection="single"
            bordered
          >
            <template #item="{ item }">
              <div style="display: flex; align-items: center; gap: 8px">
                <CoarAvatar :name="item.name" size="xs" />
                <span>{{ item.name }}</span>
              </div>
            </template>
          </CoarDataList>
        </div>
        <div class="vs-stack" style="align-items: stretch; width: 420px">
          <CoarTable>
            <thead>
              <tr><th>Prop</th><th>Typ</th><th>Standard</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.name">
                <td>{{ row.name }}</td><td><code>{{ row.type }}</code></td><td>{{ row.def }}</td>
              </tr>
            </tbody>
          </CoarTable>
          <CoarTable variant="plain" compact>
            <thead>
              <tr><th>Prop</th><th>Typ</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.name"><td>{{ row.name }}</td><td>{{ row.type }}</td></tr>
            </tbody>
          </CoarTable>
        </div>
      </div>
    </section>

    <section class="vs-section">
      <h2 class="vs-title">Code block, cards, split pane</h2>
      <div class="vs-stack" style="align-items: stretch">
        <CoarCodeBlock :code="code" language="typescript" title="tag.ts" show-line-numbers />
        <div class="vs-row" style="align-items: stretch">
          <CoarCard variant="neutral" style="width: 200px">
            <template #header><strong>Neutral</strong></template>
            Inhalt der Karte.
          </CoarCard>
          <CoarCard variant="outlined" style="width: 200px">
            <template #header><strong>Outlined</strong></template>
            Inhalt der Karte.
          </CoarCard>
          <CoarCard variant="info" elevated style="width: 200px">Info, elevated.</CoarCard>
        </div>
        <div style="height: 120px">
          <CoarSplitPane direction="row" :size="200">
            <template #first><div style="padding: 8px">Links</div></template>
            <template #second><div style="padding: 8px">Rechts</div></template>
          </CoarSplitPane>
        </div>
      </div>
    </section>
  </div>
</template>
