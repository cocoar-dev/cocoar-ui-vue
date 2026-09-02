<template>
  <div style="height: 360px">
    <CoarDataGrid :builder="builder" show-search show-column-picker bordered>
      <template #toolbar-left>
        <CoarButton size="s" variant="secondary" @click="toggleBackendColumns">
          {{ backendColumnsLoaded ? 'Remove backend fields' : 'Load backend fields' }}
        </CoarButton>
      </template>
    </CoarDataGrid>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarDataGrid,
  CoarGridBuilder,
  CoarGridColumns,
  type ColumnDefinition,
} from '@cocoar/vue-data-grid';
import { CoarButton } from '@cocoar/vue-ui';

interface AssetRow {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}

interface BackendProperty {
  key: string;
  label: string;
  type: 'text' | 'number';
  visibleByDefault?: boolean;
}

const rows: AssetRow[] = [
  { id: 'A-101', name: 'Vienna Gateway', status: 'Active', region: 'EU', riskScore: 18 },
  { id: 'A-102', name: 'Danube Relay', status: 'Review', region: 'EU', riskScore: 62 },
  { id: 'A-103', name: 'Pacific Node', status: 'Active', region: 'APAC', riskScore: 27 },
  { id: 'A-104', name: 'Atlantic Edge', status: 'Offline', region: 'US', riskScore: 84 },
];

const baseColumns: ColumnDefinition<AssetRow>[] = [
  (col) => col.field('id').header('ID').width(100).option('lockVisible', true),
  (col) => col.field('name').header('Name').flex(1),
  (col) => col.field('status').header('Status').width(130),
];

// This is the shape a future backend endpoint could return.
const backendProperties: BackendProperty[] = [
  { key: 'region', label: 'Region', type: 'text' },
  { key: 'riskScore', label: 'Risk score', type: 'number', visibleByDefault: false },
];

function mapBackendProperty(property: BackendProperty): ColumnDefinition<AssetRow> {
  return (col) => {
    const definition =
      property.type === 'number' ? col.number(property.key) : col.field(property.key);
    definition.header(property.label).width(130);
    if (property.visibleByDefault === false) definition.hidden();
    return definition;
  };
}

const backendColumnsLoaded = ref(false);
const columns = CoarGridColumns.create(baseColumns);

const builder = CoarGridBuilder.create<AssetRow>()
  .columns(columns)
  .persistColumnState('docs-column-picker')
  .rowData(rows);

function toggleBackendColumns() {
  backendColumnsLoaded.value = !backendColumnsLoaded.value;
  columns.replaceDefinitions([
    ...baseColumns,
    ...(backendColumnsLoaded.value ? backendProperties.map(mapBackendProperty) : []),
  ]);
}
</script>
