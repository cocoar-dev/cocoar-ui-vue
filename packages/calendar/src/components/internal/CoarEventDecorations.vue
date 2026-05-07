<script setup lang="ts">
/**
 * Inline decoration layer for the default event renderers — surfaces
 * the C3 / C5 zone semantics that Article 3 + Article 5 call out:
 *
 *   - **Globe icon** when the event is UTC-anchored (`start.timeZoneId
 *     === 'UTC'`) — Article 5's "global event, same instant worldwide".
 *   - **Cross-zone tag** + tooltip + sr-only announcement when the
 *     event's source zone differs from the display zone (Article 3 —
 *     "render the user's clock, but don't hide the source").
 *
 * Both renders inline before the title so they read as part of the
 * card label. Tooltips are native `title=""` so we don't pull in
 * `<CoarTooltip>` (which would add overlay-layer cost to every event).
 *
 * Consumer renderers that bypass the default can re-use the same
 * semantics via `getEventZoneHints(event, displayZone)` and render
 * whatever icon / chip they like.
 */
import { computed } from 'vue';
import { CoarIcon } from '@cocoar/vue-ui';
import { useLocalization } from '@cocoar/vue-localization';
import type { CalendarEvent } from '../../core';
import { getEventZoneHints } from '../../builders/event-zone-hints';

interface Props {
  event: CalendarEvent;
  /** The calendar's display zone — `state.timezone` resolved at the parent. */
  displayZone?: string;
  /** Visual size of the icon. `xs` for pills/bars, `s` for cards/agenda rows. */
  size?: 'xs' | 's';
}
const props = withDefaults(defineProps<Props>(), { size: 'xs' });

const localization = useLocalization();
const t = localization?.t ?? ((_k: string, _p?: unknown, fb?: string) => fb ?? '');

const hints = computed(() => getEventZoneHints(props.event, props.displayZone));

const utcLabel = computed(() =>
  t('coar.calendar.event.utcLabel', undefined, 'Global'),
);
const utcTooltip = computed(() =>
  t(
    'coar.calendar.event.utcGlobalHint',
    undefined,
    'Global event — same instant worldwide',
  ),
);

const sourceZoneTooltip = computed<string>(() => {
  const z = hints.value.sourceZone;
  if (!z) return '';
  return t(
    'coar.calendar.event.crossZoneHint',
    { zone: z },
    `Source zone: ${z}`,
  );
});

const iconPx = computed(() => (props.size === 's' ? 14 : 12));
</script>

<template>
  <span
    v-if="hints.isUtcAnchored"
    class="coar-event-decorations__utc"
    :title="utcTooltip"
    :aria-label="utcTooltip"
  >
    <CoarIcon name="globe" :size="iconPx" />
    <span class="coar-event-decorations__sr-only">{{ utcLabel }}</span>
  </span>
  <span
    v-else-if="hints.sourceZone"
    class="coar-event-decorations__cross-zone"
    :title="sourceZoneTooltip"
    :aria-label="sourceZoneTooltip"
  >
    <CoarIcon name="globe" :size="iconPx" />
    <span class="coar-event-decorations__sr-only">{{ sourceZoneTooltip }}</span>
  </span>
</template>

<style scoped>
.coar-event-decorations__utc,
.coar-event-decorations__cross-zone {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  /* Keep the decoration visually quiet — it's a hint, not a badge. */
  color: var(--coar-text-subtle, #6c7280);
  margin-right: 4px;
}
.coar-event-decorations__cross-zone {
  /* Faint accent dot to differentiate cross-zone from UTC-anchored
     for sighted users without leaning on a different icon. */
  position: relative;
}
.coar-event-decorations__cross-zone::after {
  content: '';
  position: absolute;
  top: 0;
  right: -2px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--coar-color-accent, #2563eb);
}
.coar-event-decorations__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
