<!-- Generated from apps/docs/components/code-block.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Code Block

Display source code with syntax highlighting, a one-click copy button, and optional collapsing. Use it in documentation, onboarding flows, or anywhere users need to read or copy code snippets.

```ts
import { CoarCodeBlock } from '@cocoar/vue-ui';
```

## Language Support

Built-in highlighting for TypeScript, HTML, CSS, Bash, JSON, and more. The language is detected from the `language` prop, so colors and tokens always match the syntax.

**Demo — `code-block/demos/CodeBlockLanguages.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">TypeScript</p>
      <CoarCodeBlock :code="tsExample" language="typescript" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">HTML / Template</p>
      <CoarCodeBlock :code="htmlExample" language="html" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">CSS</p>
      <CoarCodeBlock :code="cssExample" language="css" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';

const tsExample = `import { ref, computed } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';

const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}`;

const htmlExample = `<template>
  <CoarButton
    variant="primary"
    icon-start="plus"
    @click="increment"
  >
    Count: {{ count }}
  </CoarButton>
  <p>Doubled: {{ doubled }}</p>
</template>`;

const cssExample = `.my-component {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-m);
  padding: var(--coar-spacing-l);
  border-radius: var(--coar-radius-m);
  background: var(--coar-background-neutral-primary);
  box-shadow: var(--coar-shadow-s);
}`;
</script>
```

**Demo — `code-block/demos/CodeBlockBashJson.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Bash</p>
      <CoarCodeBlock :code="bashExample" language="bash" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">JSON</p>
      <CoarCodeBlock :code="jsonExample" language="json" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';

const bashExample = `# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build`;

const jsonExample = `{
  "name": "@cocoar/vue-ui",
  "version": "1.0.0",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "import": "./dist/index.js"
    },
    "./styles": "./styles/bundle.css"
  }
}`;
</script>
```

## Collapsible Behavior

Keep long snippets from dominating the page. Start them collapsed so users can expand on demand, or disable collapsing when the code should always be visible.

**Demo — `code-block/demos/CodeBlockCollapsed.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Collapsed by default (click to expand)</p>
      <CoarCodeBlock :code="code" language="typescript" :collapsed="true" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Non-collapsible (always visible)</p>
      <CoarCodeBlock :code="shortCode" language="bash" :collapsible="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';

const code = `import { ref, computed } from 'vue';
import { CoarButton } from '@cocoar/vue-ui';

const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}`;

const shortCode = `# Install dependencies
pnpm install

# Start development server
pnpm dev`;
</script>
```

## Variants

The default `neutral` variant uses a neutral background. Other variants color the header area to match semantic context — `info`, `success`, `warning`, `error`, or `accent`.

**Demo — `code-block/demos/CodeBlockVariants.vue`**

```vue
<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Neutral (default)</p>
      <CoarCodeBlock code="import { CoarButton } from '@cocoar/vue-ui';" language="typescript" :collapsible="false" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Info</p>
      <CoarCodeBlock code="import { CoarButton } from '@cocoar/vue-ui';" language="typescript" variant="info" :collapsible="false" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Success</p>
      <CoarCodeBlock code="import { CoarButton } from '@cocoar/vue-ui';" language="typescript" variant="success" :collapsible="false" />
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Error</p>
      <CoarCodeBlock code="import { CoarButton } from '@cocoar/vue-ui';" language="typescript" variant="error" :collapsible="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';
</script>
```

## With Line Numbers

Enable line numbers for larger code blocks where users need to reference specific lines.

**Demo — `code-block/demos/CodeBlockNoLineNumbers.vue`**

```vue
<template>
  <CoarCodeBlock :code="code" language="typescript" :show-line-numbers="true" :collapsible="false" />
</template>

<script setup lang="ts">
import { CoarCodeBlock } from '@cocoar/vue-ui';

const code = `import { ref, computed } from 'vue';

const count = ref(0);
const doubled = computed(() => count.value * 2);

function increment() {
  count.value++;
}`;
</script>
```

## API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | `''` | The source code to display |
| `language` | `string` | `'html'` | Syntax highlighting language |
| `variant` | `'neutral' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'accent'` | `'neutral'` | Header color variant |
| `title` | `string` | `''` | Optional title/filename label |
| `collapsible` | `boolean` | `true` | Show collapse/expand toggle |
| `collapsed` | `boolean` | `false` | Start in collapsed state |
| `showLineNumbers` | `boolean` | `false` | Show line numbers |
| `showCopy` | `boolean` | `true` | Show copy-to-clipboard button |
| `maxHeight` | `number` | `0` | Maximum height in px before scrolling (0 = no limit) |
| `borderless` | `boolean` | `false` | Hide border and border-radius |
| `elevated` | `boolean` | `false` | Add box shadow |

## i18n Keys

These keys can be translated via [`@cocoar/vue-localization`](../foundations/localization/translations.md).

| Key | Default (English) | Used as |
|-----|-------------------|---------|
| `coar.ui.codeBlock.copy` | `'Copy'` | Copy button text |
| `coar.ui.codeBlock.copied` | `'Copied!'` | Copy button text (after success) |
| `coar.ui.codeBlock.failed` | `'Failed'` | Copy button text (after error) |
| `coar.ui.codeBlock.copyLabel` | `'Copy code'` | Copy button `aria-label` |
| `coar.ui.codeBlock.toggleVisibility` | `'Toggle code visibility'` | Collapse/expand button `aria-label` |
| `coar.ui.codeBlock.code` | `'Code'` | Code block `aria-label` |
