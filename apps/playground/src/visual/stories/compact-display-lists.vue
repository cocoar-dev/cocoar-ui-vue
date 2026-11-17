<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): selection lists — inline menu with
 * heading and sub-expand, listbox (groups, rich rows, highlighted, disabled, empty),
 * dual listbox and tree with checkboxes.
 */
import { ref } from 'vue';
import {
  CoarDualListbox,
  CoarIcon,
  CoarListbox,
  CoarMenu,
  CoarMenuDivider,
  CoarMenuHeading,
  CoarMenuItem,
  CoarSubExpand,
  CoarTree,
  type CoarListboxOption,
} from '@cocoar/vue-ui';

const fruit: CoarListboxOption<string>[] = [
  { value: 'apple', label: 'Apfel', group: 'Obst' },
  { value: 'banana', label: 'Banane', group: 'Obst' },
  { value: 'cherry', label: 'Kirsche (ausverkauft)', group: 'Obst', disabled: true },
  { value: 'carrot', label: 'Karotte', group: 'Gemüse' },
  { value: 'potato', label: 'Kartoffel', group: 'Gemüse' },
];
const people: CoarListboxOption<string>[] = [
  { value: 'ada', label: 'Ada Lovelace', subtitle: 'ada@example.com', icon: 'user' },
  { value: 'grace', label: 'Grace Hopper', subtitle: 'grace@example.com', icon: 'user' },
  { value: 'linus', label: 'Linus Torvalds', subtitle: 'linus@example.com', icon: 'user' },
];
const highlighted = ref(['banana']);
const highlightedPeople = ref(['grace']);
const assigned = ref(['carrot']);

interface Node {
  id: string;
  label: string;
  children?: Node[];
}
const nodes: Node[] = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'src/main.ts', label: 'main.ts' },
      {
        id: 'src/components',
        label: 'components',
        children: [
          { id: 'src/components/button.vue', label: 'Button.vue' },
          { id: 'src/components/tree.vue', label: 'Tree.vue' },
        ],
      },
    ],
  },
  { id: 'readme', label: 'README.md' },
];
const expanded = ref(new Set(['src', 'src/components']));
const checked = ref(new Set(['src/components/button.vue']));
const selected = ref<string | null>('src/main.ts');
</script>

<template>
  <div class="coar-compact">
    <section class="vs-section">
      <h2 class="vs-title">Menu and listboxes</h2>
      <div class="vs-row" style="align-items: flex-start; gap: 24px">
        <div style="width: 220px">
          <CoarMenu>
            <CoarMenuHeading label="Projekt" />
            <CoarMenuItem label="Übersicht" icon="home" active />
            <CoarMenuItem label="Dateien" icon="folder" />
            <CoarMenuItem label="Archiv (keine Rechte)" icon="lock" disabled />
            <CoarMenuDivider />
            <CoarSubExpand label="Sicherheit" icon="shield" :open="true">
              <CoarMenuItem label="Passwort" />
              <CoarMenuItem label="Sitzungen" />
            </CoarSubExpand>
          </CoarMenu>
        </div>
        <div style="width: 220px; height: 260px; display: flex">
          <CoarListbox v-model="highlighted" :options="fruit" label="Zutaten" show-count />
        </div>
        <div style="width: 240px; height: 200px; display: flex">
          <CoarListbox v-model="highlightedPeople" :options="people" label="Personen" />
        </div>
        <div style="width: 160px; height: 120px; display: flex">
          <CoarListbox :model-value="[]" :options="[]" label="Leer" empty-text="Keine Einträge" />
        </div>
      </div>
    </section>

    <section class="vs-section">
      <h2 class="vs-title">Dual listbox and tree (checkbox mode, selected row)</h2>
      <div class="vs-row" style="align-items: flex-start; gap: 24px">
        <div style="width: 440px; height: 240px; display: flex">
          <CoarDualListbox
            v-model="assigned"
            :options="fruit"
            available-label="Verfügbar"
            selected-label="Zugewiesen"
          />
        </div>
        <div style="width: 240px">
          <CoarTree
            v-model:expanded="expanded"
            v-model:checked-ids="checked"
            v-model:selected="selected"
            :nodes="nodes"
            :get-id="(n: Node) => n.id"
            :get-children="(n: Node) => n.children"
            :get-label="(n: Node) => n.label"
            selection-mode="checkbox"
            aria-label="Projektdateien"
          >
            <template #default="{ node }">
              <CoarIcon :name="node.children ? 'folder' : 'file-text'" size="xs" />
              <span>{{ node.label }}</span>
            </template>
          </CoarTree>
        </div>
      </div>
    </section>
  </div>
</template>
