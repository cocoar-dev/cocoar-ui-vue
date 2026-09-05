<!-- Generated from apps/docs/components/transitions.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Transitions

Pre-built Vue `<Transition>` wrappers that use the design system's motion tokens. Drop them in, toggle visibility, done — durations, easing, and `prefers-reduced-motion` are handled automatically.

```ts
import { CoarFade, CoarSlide, CoarScale, CoarCollapse } from '@cocoar/vue-ui';
```

## Fade

Simple opacity transition. Use for overlays, tooltips, and content toggling.

**Demo — `transitions/demos/FadeDemo.vue`**

```vue
<template>
  <div class="demo">
    <div class="demo-controls">
      <CoarButton @click="visible = !visible">Toggle</CoarButton>
      <CoarRadioGroup v-model="duration" name="fade-duration" orientation="horizontal">
        <CoarRadioButton value="fast">Fast</CoarRadioButton>
        <CoarRadioButton value="normal">Normal</CoarRadioButton>
        <CoarRadioButton value="slow">Slow</CoarRadioButton>
      </CoarRadioGroup>
    </div>
    <div class="demo-area">
      <CoarFade :duration="duration">
        <CoarNote v-if="visible" variant="accent">This content fades in and out.</CoarNote>
      </CoarFade>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarFade, CoarButton, CoarNote, CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const visible = ref(true);
const duration = ref('normal');
</script>

<style scoped>
.demo-controls { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.demo-area { min-height: 60px; }
</style>
```

## Slide

Slides content in from a direction with a subtle opacity fade. Use for dropdowns, drawers, and notification panels.

**Demo — `transitions/demos/SlideDemo.vue`**

```vue
<template>
  <div class="demo">
    <div class="demo-controls">
      <CoarButton @click="visible = !visible">Toggle</CoarButton>
      <CoarRadioGroup v-model="direction" name="slide-dir" orientation="horizontal">
        <CoarRadioButton value="down">Down</CoarRadioButton>
        <CoarRadioButton value="up">Up</CoarRadioButton>
        <CoarRadioButton value="left">Left</CoarRadioButton>
        <CoarRadioButton value="right">Right</CoarRadioButton>
      </CoarRadioGroup>
    </div>
    <div class="demo-area">
      <CoarSlide :direction="direction">
        <CoarNote v-if="visible" variant="info">This content slides {{ direction }}.</CoarNote>
      </CoarSlide>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarSlide, CoarButton, CoarNote, CoarRadioGroup, CoarRadioButton } from '@cocoar/vue-ui';

const visible = ref(true);
const direction = ref<'up' | 'down' | 'left' | 'right'>('down');
</script>

<style scoped>
.demo-controls { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.demo-area { min-height: 60px; }
</style>
```

## Scale

Scales content in with a slight bounce and fades out cleanly. Use for dialogs, popovers, and action confirmations.

**Demo — `transitions/demos/ScaleDemo.vue`**

```vue
<template>
  <div class="demo">
    <div class="demo-controls">
      <CoarButton @click="visible = !visible">Toggle</CoarButton>
    </div>
    <div class="demo-area">
      <CoarScale>
        <CoarCard v-if="visible" variant="outlined" padding="m">
          <strong>Scaled content</strong>
          <p>This card scales in with a subtle bounce and fades out.</p>
        </CoarCard>
      </CoarScale>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarScale, CoarButton, CoarCard } from '@cocoar/vue-ui';

const visible = ref(true);
</script>

<style scoped>
.demo-controls { margin-bottom: 16px; }
.demo-area { min-height: 80px; }
</style>
```

## Collapse

Animates the actual height of content for smooth expand/collapse. Use for accordions, expandable sections, and progressive disclosure.

**Demo — `transitions/demos/CollapseDemo.vue`**

```vue
<template>
  <div class="demo">
    <CoarButton @click="expanded = !expanded">
      {{ expanded ? 'Collapse' : 'Expand' }}
    </CoarButton>
    <CoarCollapse>
      <div v-if="expanded" class="demo-content">
        <CoarNote variant="neutral" padding="m">
          <p><strong>Expandable content</strong></p>
          <p>This section smoothly collapses and expands by animating the height. Useful for accordions, expandable panels, and progressive disclosure patterns.</p>
          <ul>
            <li>Animates actual height (not max-height hack)</li>
            <li>Works with dynamic content</li>
            <li>Respects prefers-reduced-motion</li>
          </ul>
        </CoarNote>
      </div>
    </CoarCollapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCollapse, CoarButton, CoarNote } from '@cocoar/vue-ui';

const expanded = ref(false);
</script>

<style scoped>
.demo-content { margin-top: 12px; }
</style>
```

## Accessibility

All transition components respect `prefers-reduced-motion: reduce`. When the user has reduced motion enabled, the design system's duration tokens collapse to `0ms`, making all transitions instant.

## API

### Shared Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `duration` | `'fast' \| 'normal' \| 'slow'` | `'normal'` | Maps to `--coar-duration-*` tokens (100ms / 200ms / 300ms) |
| `appear` | `boolean` | `false` | Animate on initial render |

### CoarSlide Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `direction` | `'up' \| 'down' \| 'left' \| 'right'` | `'down'` | Slide direction |

### Slots

All transition components have a single default slot. The child element must support `v-if` or `v-show` for the transition to work.

```vue
<CoarFade>
  <div v-if="visible">I fade in and out</div>
</CoarFade>
```
