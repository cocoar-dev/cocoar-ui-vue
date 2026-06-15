# Wizard <Badge type="warning" text="Preview" />

A multi-step flow shell — built to live **inside a modal** (it renders no modal of its own). Three things make it a wizard rather than a plain stepper:

- **Animated body resize.** Only the active step is mounted, and the body smoothly animates its height between steps — so the surrounding modal grows / shrinks to fit each page.
- **A scrollable indicator that follows you.** The step indicator can be far wider (or taller) than the modal; it scrolls and auto-centers the active step on every move.
- **Edge-placeable indicator.** `indicatorPosition` puts the progress strip on any of the four edges.

```ts
import { CoarWizard, type CoarWizardStep } from '@cocoar/vue-ui';
```

::: warning Preview
`CoarWizard` is new and on the `0.0.x` line. The API (props, slots, events) may still change before it stabilises — pin a version if you depend on it.
:::

## Basic Usage

Pass an ordered `steps` array — each step's `id` is the name of its content slot, and only the active step is rendered. Bind the active step with `v-model:step`. Try the **Top / Right / Bottom / Left** toggle, and watch the modal resize as you move between the short and tall steps. Step 1 gates **Next** via `canAdvance` until a name is entered.

<preview path="./wizard/demos/WizardBasic.vue" />

```vue
<template>
  <CoarWizard :steps="steps" v-model:step="step" @finish="create">
    <template #basics>…</template>
    <template #scopes>…</template>
    <template #review>…</template>
  </CoarWizard>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarWizard, type CoarWizardStep } from '@cocoar/vue-ui';

const step = ref('basics');
const steps: CoarWizardStep[] = [
  { id: 'basics', label: 'Basics', canAdvance: true },
  { id: 'scopes', label: 'Scopes' },
  { id: 'review', label: 'Review' },
];
</script>
```

::: tip Designed for modals
The wizard renders no modal — drop it into your modal / routed-modal body. Give that modal a **content-driven height** (and a `max-height` for very tall steps) so the per-step resize animation is visible.
:::

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` | `CoarWizardStep[]` | — | Ordered steps. Each `id` names that step's content slot. |
| `step` (`v-model:step`) | `string` | _first step_ | The active step id. Uncontrolled (defaults to the first step) when not bound. |
| `indicatorPosition` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'top'` | Which edge the indicator sits on. `top`/`bottom` scroll horizontally; `left`/`right` vertically. |
| `freeNavigation` | `boolean` | `false` | Allow jumping to any non-disabled step from the indicator (default: only completed steps are clickable). |
| `hideFooter` | `boolean` | `false` | Hide the built-in Back / Next / Finish footer. |
| `disableAnimation` | `boolean` | `false` | Skip the height + content transition (also auto-skipped under `prefers-reduced-motion`). |
| `backLabel` / `nextLabel` / `finishLabel` | `string` | `Back` / `Next` / `Finish` | Built-in button labels. |

### `CoarWizardStep`

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Stable id + content slot name. |
| `label` | `string` | Indicator label. |
| `description` | `string?` | Optional second line under the label. |
| `optional` | `boolean?` | Marks the step optional in the indicator. |
| `canAdvance` | `boolean?` | When `false`, the built-in Next is disabled on this step (per-step gate). Defaults to allowed. |
| `disabled` | `boolean?` | Prevents navigating to this step from the indicator. |

## Slots

| Slot | Props | Description |
|---|---|---|
| `<step id>` | `{ step, index }` | Content for that step. Only the active step's slot is rendered. |
| `footer` | `{ next, back, goTo, isFirst, isLast, canAdvance, activeStep, activeIndex }` | Replace the built-in footer with your own controls. |

## Events

| Event | Payload | Description |
|---|---|---|
| `update:step` | `string` | Active step id changed. |
| `step-change` | `(id, index)` | Active step changed. |
| `finish` | — | Next pressed on the last step. |
