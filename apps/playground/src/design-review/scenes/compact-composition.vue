<script setup lang="ts">
/**
 * A realistic cross-package screen, profile-neutral (the gallery sets the profile on an
 * ancestor, or on `<html>` inside its iframe): a field-service workspace where the same
 * synthetic sites appear in an editable, filterable data grid (text and select editors,
 * an AG Grid floating filter), on a map with the point list, in a Markdown note, a
 * Markdown visit form and an approval flow (Mermaid), framed by ui buttons, tags and a
 * card. Everything is fixed: sites from compact-map-fixtures.ts, no tiles, no clock, no
 * network. Mermaid's config is page-global, so the gallery isolates the scene per profile.
 */
import { ref } from 'vue';
import { CoarButton, CoarCard, CoarTag } from '@cocoar/vue-ui';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarMap } from '@cocoar/vue-map';
import { parse } from '@cocoar/vue-markdown-core';
import { CoarMarkdown } from '@cocoar/vue-markdown';
import { CoarMermaidDiagram } from '@cocoar/vue-mermaid';
// No playground alias for @cocoar/vue-markdown-form: imported by path.
import { CoarMarkdownForm } from '../../../../../packages/markdown-form/src/index';
import '../../../../../packages/markdown-form/styles/markdown-form.css';
import { config, data } from './compact-map-fixtures';

interface Site {
  id: number;
  name: string;
  category: string;
  status: 'planned' | 'visited' | 'blocked';
  visits: number;
  lastVisit: string;
}

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'visited', label: 'Visited' },
  { value: 'blocked', label: 'Blocked' },
];
const fixed: Array<Pick<Site, 'status' | 'visits' | 'lastVisit'>> = [
  { status: 'visited', visits: 4, lastVisit: '2026-11-02' },
  { status: 'planned', visits: 0, lastVisit: '2026-10-21' },
  { status: 'blocked', visits: 2, lastVisit: '2026-09-30' },
  { status: 'visited', visits: 7, lastVisit: '2026-11-12' },
];
const categories = Object.fromEntries((config.categories ?? []).map((c) => [c.id, c.label]));
const sites: Site[] = data.points
  .map((point, index) => ({ point, index }))
  .filter(({ point }) => point.kind === 'stop')
  .map(({ point, index }, order) => ({
    id: index,
    name: point.label ?? '',
    category: categories[point.category ?? ''] ?? '',
    ...fixed[order],
  }));

const selected = ref(2);
const builder = CoarGridBuilder.create<Site>()
  .columns([
    (col) => col.text('name').header('Site').flex(1).editable(true)
      .filter('agTextColumnFilter').customize((def) => { def.floatingFilter = true; }),
    (col) => col.field('category').header('Category').width(110),
    (col) => col.select('status', (s) => s.options(statusOptions)).header('Status').width(130).editable(true),
    (col) => col.number('visits', { decimals: 0 }).header('Visits').width(80),
    (col) => col.date('lastVisit').header('Last visit').width(120),
  ])
  .rowData(sites);

const note = parse(`### Visit notes

**British Museum** — the loading dock is closed on Mondays; use the north entrance.
Prüfungsergebnis: *two* open items, see the \`checklist\`.

| Item | Owner | Due |
| --- | --- | --- |
| Access badge | Ada | 2026-11-20 |
| Fire exit sign | Bob | 2026-11-24 |
`);
const template = `**Site:** :field{id=site type=text layout=row width=fill required placeholder="Site name"}

**Visits:** :field{id=visits type=number} **Approved:** :field{id=ok type=boolean label="Approved"}

:::field{id=summary type=markdown required placeholder="What was found?"}`;
const values = { site: 'British Museum', visits: 7, ok: false };
const flow = `flowchart LR
  P[Planned] --> V[Visited]
  V --> R{Review}
  R -->|ok| A[Approved]
  R -->|issues| B[Blocked]`;
</script>

<template>
  <div class="vs-stack" style="align-items: stretch" data-scene-part="composition">
    <header class="vs-row" style="justify-content: space-between" data-scene-part="header">
      <div class="vs-row">
        <strong>Field service · London</strong>
        <CoarTag variant="info" size="s">4 sites</CoarTag>
        <CoarTag variant="warning" size="s">1 blocked</CoarTag>
      </div>
      <div class="vs-row">
        <CoarButton variant="secondary">Export</CoarButton>
        <CoarButton variant="primary">Plan visit</CoarButton>
      </div>
    </header>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 12px; align-items: start">
      <div data-scene-part="grid" style="height: 280px; display: flex">
        <CoarDataGrid :builder="builder" bordered />
      </div>
      <div data-scene-part="map">
        <CoarMap :data="data" :config="config" :selected="selected" show-legend />
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 12px; align-items: start">
      <CoarCard data-scene-part="note">
        <CoarMarkdown :doc="note" />
      </CoarCard>
      <CoarCard data-scene-part="form">
        <CoarMarkdownForm :template="template" :values="values" show-errors />
      </CoarCard>
    </div>

    <div data-scene-part="flow" style="--coar-mermaid-height: 180px">
      <CoarMermaidDiagram :code="flow" zoomable />
    </div>
  </div>
</template>
