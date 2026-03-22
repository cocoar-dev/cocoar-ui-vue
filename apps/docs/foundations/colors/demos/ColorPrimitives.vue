<template>
  <div class="color-primitives">
    <div v-for="palette in palettes" :key="palette.name" class="palette-row">
      <div class="palette-label">
        <span class="palette-name">{{ palette.name }}</span>
        <span class="palette-sub">{{ palette.sub }}</span>
      </div>
      <div class="palette-swatches">
        <div
          v-for="shade in shades"
          :key="shade"
          class="swatch-cell"
        >
          <div
            class="swatch"
            :style="{ backgroundColor: `var(--coar-color-${palette.key}-${shade})` }"
            :title="`--coar-color-${palette.key}-${shade}`"
          />
          <span class="shade-num">{{ shade }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

const palettes = [
  { name: 'Gray', sub: 'Neutral UI', key: 'gray' },
  { name: 'Slate', sub: 'Brand', key: 'slate' },
  { name: 'Accent', sub: 'Themeable', key: 'accent' },
  { name: 'Green', sub: 'Success', key: 'green' },
  { name: 'Red', sub: 'Error', key: 'red' },
  { name: 'Amber', sub: 'Warning', key: 'amber' },
];
</script>

<style scoped>
.color-primitives {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.palette-row {
  display: flex;
  align-items: center;
  gap: 24px;
}

.palette-label {
  display: flex;
  flex-direction: column;
  min-width: 90px;
  flex-shrink: 0;
}

.palette-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.3;
}

.palette-sub {
  font-size: 11px;
  color: var(--vp-c-text-3);
  line-height: 1.3;
}

.palette-swatches {
  display: flex;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.swatch-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.swatch {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
}

.swatch:hover {
  transform: scale(1.15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 1;
  position: relative;
}

.shade-num {
  font-size: 10px;
  font-weight: 500;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .palette-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .palette-label {
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
  }

  .palette-swatches {
    width: 100%;
  }

  .swatch {
    border-radius: 8px;
  }
}
</style>
