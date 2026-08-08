<script setup lang="ts" generic="TMeta extends Record<string, unknown> = Record<string, unknown>">
import { computed } from 'vue';
import type { CalendarEvent } from '../../core';

const props = withDefaults(
  defineProps<{
    event: CalendarEvent<TMeta>;
    max?: number;
    size?: 'xs' | 's' | 'm';
  }>(),
  { max: 3, size: 's' },
);

interface Assignee {
  id: string;
  displayName: string;
  color?: string;
}

const assignees = computed<Assignee[]>(() => {
  const raw = (props.event.meta as Record<string, unknown> | undefined)?.assignees;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const value = candidate as Record<string, unknown>;
    const displayName =
      typeof value.displayName === 'string'
        ? value.displayName
        : typeof value.name === 'string'
          ? value.name
          : '';
    if (!displayName.trim()) return [];
    const rawColor = value.color ?? value.colorHex;
    const color =
      typeof rawColor === 'string'
        ? rawColor
        : typeof rawColor === 'number'
          ? `#${rawColor.toString(16).padStart(6, '0').slice(-6)}`
          : colorFor(String(value.id ?? displayName));
    return [{ id: String(value.id ?? `${displayName}:${index}`), displayName, color }];
  });
});

const visible = computed(() => assignees.value.slice(0, Math.max(1, props.max)));
const overflow = computed(() => Math.max(0, assignees.value.length - visible.value.length));
const label = computed(() => assignees.value.map((person) => person.displayName).join(', '));

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}` : (parts[0]?.slice(0, 2) ?? '')
  ).toLocaleUpperCase();
}

function colorFor(seed: string): string {
  let hash = 0;
  for (const character of seed) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return `hsl(${Math.abs(hash) % 360} 58% 46%)`;
}
</script>

<template>
  <span
    v-if="assignees.length"
    class="coar-event-assignees"
    :class="`coar-event-assignees--${size}`"
    role="img"
    :aria-label="label"
    :title="label"
  >
    <span
      v-for="person in visible"
      :key="person.id"
      class="coar-event-assignees__avatar"
      :style="{ background: person.color }"
      aria-hidden="true"
      >{{ initials(person.displayName) }}</span
    >
    <span v-if="overflow" class="coar-event-assignees__overflow" aria-hidden="true"
      >+{{ overflow }}</span
    >
  </span>
</template>

<style scoped>
.coar-event-assignees {
  display: inline-flex;
  flex: none;
  align-items: center;
  margin-inline-start: auto;
  padding-inline-start: 4px;
}
.coar-event-assignees__avatar,
.coar-event-assignees__overflow {
  display: inline-flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, white 78%, transparent);
  border-radius: 999px;
  color: white;
  font-weight: 750;
  line-height: 1;
  box-shadow: 0 0 0 1px color-mix(in srgb, black 13%, transparent);
}
.coar-event-assignees__avatar + .coar-event-assignees__avatar,
.coar-event-assignees__overflow {
  margin-inline-start: -4px;
}
.coar-event-assignees__overflow {
  background: var(--coar-surface-muted, #6b7280);
}
.coar-event-assignees--xs .coar-event-assignees__avatar,
.coar-event-assignees--xs .coar-event-assignees__overflow {
  width: 14px;
  height: 14px;
  font-size: 7px;
}
.coar-event-assignees--s .coar-event-assignees__avatar,
.coar-event-assignees--s .coar-event-assignees__overflow {
  width: 18px;
  height: 18px;
  font-size: 8px;
}
.coar-event-assignees--m .coar-event-assignees__avatar,
.coar-event-assignees--m .coar-event-assignees__overflow {
  width: 22px;
  height: 22px;
  font-size: 9px;
}
</style>
