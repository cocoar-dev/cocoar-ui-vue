<script setup lang="ts">
/**
 * `<CoarCalendarBands>` — the host's background bands of one day
 * (`builder.backgrounds`), in a day column (vertical grid) or a day
 * row's track (horizontal grid).
 *
 * One instance per layer: `below` sits behind the events (z-index 0),
 * `above` over them (ranges with `layer: 'above'` and every line).
 * Purely visual — `pointer-events: none`, `aria-hidden` — so clicks,
 * hover and drags reach the column / track underneath.
 *
 * Colours come from `--coar-calendar-band-color` (set inline from a
 * band's `color`, or by the host on `.coar-calendar-band--{kind}`),
 * else from the appearance's token.
 *
 * Lives in `internal/` — NOT exported from the package barrel.
 */

import { computed } from 'vue';
import type { ResolvedBand } from '../../../composables/useTimeGridOverlays';

const props = defineProps<{
  bands: ReadonlyArray<ResolvedBand>;
  layer: 'below' | 'above';
  orientation: 'vertical' | 'horizontal';
  /** Pixel offset along the time axis of a minute of the day. */
  toPx: (minuteOfDay: number) => number;
}>();

const visible = computed(() =>
  props.bands.filter((b) =>
    b.type === 'line' ? props.layer === 'above' : b.layer === props.layer,
  ),
);

function boxStyle(band: ResolvedBand): Record<string, string> {
  const style: Record<string, string> = {};
  if (band.color) style['--coar-calendar-band-color'] = band.color;
  if (band.type === 'line') {
    const at = props.toPx(band.at) + 'px';
    if (props.orientation === 'horizontal') style.left = at;
    else style.top = at;
    return style;
  }
  const start = props.toPx(band.start);
  const size = Math.max(1, props.toPx(band.end) - start);
  if (props.orientation === 'horizontal') {
    style.left = start + 'px';
    style.width = size + 'px';
  } else {
    style.top = start + 'px';
    style.height = size + 'px';
  }
  return style;
}

function classes(band: ResolvedBand): string[] {
  return [
    'coar-calendar-band',
    `coar-calendar-band--${band.kind}`,
    band.type === 'line' ? 'coar-calendar-band--line' : `coar-calendar-band--${band.appearance}`,
  ];
}
</script>

<template>
  <div
    v-for="band in visible"
    :key="band.key"
    :class="[classes(band), `coar-calendar-band--${orientation}`, `coar-calendar-band--${layer}`]"
    :style="boxStyle(band)"
    :data-band-kind="band.kind"
    aria-hidden="true"
  >
    <span v-if="band.label" class="coar-calendar-band__label">{{ band.label }}</span>
  </div>
</template>

<style scoped>
.coar-calendar-band {
  position: absolute;
  box-sizing: border-box;
  pointer-events: none;
}
.coar-calendar-band--below {
  z-index: 0;
}
.coar-calendar-band--above {
  z-index: 90;
}
.coar-calendar-band--vertical {
  left: 0;
  right: 0;
}
.coar-calendar-band--horizontal {
  top: 0;
  bottom: 0;
}
.coar-calendar-band--tint {
  background: color-mix(
    in srgb,
    var(--coar-calendar-band-color, var(--coar-calendar-band-tint, #2563eb)) 12%,
    transparent
  );
}
.coar-calendar-band--hatch {
  background-image: repeating-linear-gradient(
    135deg,
    color-mix(
        in srgb,
        var(--coar-calendar-band-color, var(--coar-calendar-band-hatch, #6b7280)) 26%,
        transparent
      )
      0 1.5px,
    transparent 1.5px 7px
  );
}
.coar-calendar-band--outline {
  border: 1.5px dashed var(--coar-calendar-band-color, var(--coar-calendar-band-outline, #d97706));
  border-radius: 3px;
  background: color-mix(
    in srgb,
    var(--coar-calendar-band-color, var(--coar-calendar-band-outline, #d97706)) 8%,
    transparent
  );
}
/* A line at one time: horizontal in a column, vertical in a row. */
.coar-calendar-band--line {
  --line-color: var(--coar-calendar-band-color, var(--coar-calendar-band-line, #dc2626));
}
.coar-calendar-band--line.coar-calendar-band--vertical {
  height: 0;
  border-top: 2px solid var(--line-color);
}
.coar-calendar-band--line.coar-calendar-band--horizontal {
  width: 0;
  border-left: 2px solid var(--line-color);
}
.coar-calendar-band__label {
  position: absolute;
  padding: 0 3px;
  font-size: 10px;
  line-height: 14px;
  white-space: nowrap;
  color: var(--coar-text-subtle, #6c7280);
}
.coar-calendar-band--vertical > .coar-calendar-band__label {
  top: 1px;
  right: 2px;
}
.coar-calendar-band--horizontal > .coar-calendar-band__label {
  top: 1px;
  left: 2px;
}
.coar-calendar-band--line > .coar-calendar-band__label {
  color: var(--line-color);
  font-weight: 600;
  background: var(--coar-calendar-bg, #fff);
  border-radius: 2px;
}
.coar-calendar-band--line.coar-calendar-band--vertical > .coar-calendar-band__label {
  top: auto;
  bottom: 1px;
}
</style>
