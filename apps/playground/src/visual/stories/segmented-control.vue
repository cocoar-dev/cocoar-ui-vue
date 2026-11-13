<script setup lang="ts">
import { CoarSegmentedControl } from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;
const views = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];
const withIcons = [
  { value: 'list', label: 'List', icon: 'list' },
  { value: 'grid', label: 'Grid', icon: 'layout-grid' },
  { value: 'table', label: 'Table', icon: 'table', disabled: true },
];
const iconOnly = [
  { value: 'left', label: '', icon: 'align-left', ariaLabel: 'Left' },
  { value: 'center', label: '', icon: 'align-center', ariaLabel: 'Center' },
  { value: 'right', label: '', icon: 'align-right', ariaLabel: 'Right' },
];
</script>

<template>
  <section class="vs-section">
    <h2 class="vs-title">Sizes, second option active</h2>
    <div class="vs-grid" style="--vs-columns: 1">
      <template v-for="size in sizes" :key="size">
        <span class="vs-label">{{ size }}</span>
        <div>
          <CoarSegmentedControl
            :size="size"
            :options="views"
            model-value="week"
            aria-label="View"
          />
        </div>
      </template>
    </div>
  </section>

  <section class="vs-section">
    <h2 class="vs-title">Icons, disabled option, icon only, all disabled, full width</h2>
    <div class="vs-stack">
      <CoarSegmentedControl :options="withIcons" model-value="grid" aria-label="Layout" />
      <CoarSegmentedControl :options="iconOnly" model-value="center" aria-label="Alignment" />
      <CoarSegmentedControl
        :options="views"
        model-value="day"
        disabled
        aria-label="View (disabled)"
      />
    </div>
    <div style="margin-top: 12px">
      <CoarSegmentedControl
        :options="views"
        model-value="month"
        full-width
        aria-label="View (full width)"
      />
    </div>
  </section>
</template>
