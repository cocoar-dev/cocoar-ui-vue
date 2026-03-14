<script setup lang="ts">
import { CoarCodeBlock, CoarCard } from '@cocoar/vue-ui';

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
    icon-start="add"
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

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Code Block</h1>
      <p class="page-description">
        Syntax-highlighted code display with copy button, collapsible mode, and multiple language support.
      </p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarCodeBlock } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>TypeScript</h3>
          <p class="example-description">TypeScript code with syntax highlighting.</p>
          <CoarCodeBlock :code="tsExample" language="typescript" />
        </CoarCard>

        <CoarCard elevated>
          <h3>HTML / Template</h3>
          <p class="example-description">Vue template syntax.</p>
          <CoarCodeBlock :code="htmlExample" language="html" />
        </CoarCard>

        <CoarCard elevated>
          <h3>CSS</h3>
          <p class="example-description">CSS with design token usage.</p>
          <CoarCodeBlock :code="cssExample" language="css" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Bash</h3>
          <p class="example-description">Shell commands and scripts.</p>
          <CoarCodeBlock :code="bashExample" language="bash" />
        </CoarCard>

        <CoarCard elevated>
          <h3>JSON</h3>
          <p class="example-description">JSON configuration files.</p>
          <CoarCodeBlock :code="jsonExample" language="json" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Collapsed by Default</h3>
          <p class="example-description">Long code blocks can start collapsed and expand on demand.</p>
          <CoarCodeBlock :code="tsExample" language="typescript" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Non-collapsible</h3>
          <p class="example-description">Disable the collapse feature for always-visible code.</p>
          <CoarCodeBlock :code="bashExample" language="bash" :collapsible="false" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Variants</h3>
          <p class="example-description">Info variant for documentation callouts.</p>
          <CoarCodeBlock :code="'import { CoarButton } from \'@cocoar/vue-ui\';'" language="typescript" variant="info" :collapsible="false" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Without Line Numbers</h3>
          <p class="example-description">Hide line numbers for compact inline examples.</p>
          <CoarCodeBlock :code="bashExample" language="bash" :show-line-numbers="false" :collapsible="false" />
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Code Block API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>code</code></td><td><code>string</code></td><td><code>''</code></td><td>The source code to display</td></tr>
              <tr><td><code>language</code></td><td><code>string</code></td><td><code>'typescript'</code></td><td>Syntax highlighting language</td></tr>
              <tr><td><code>variant</code></td><td><code>'default' | 'info'</code></td><td><code>'default'</code></td><td>Background style variant</td></tr>
              <tr><td><code>collapsible</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show collapse/expand toggle</td></tr>
              <tr><td><code>collapsed</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Start in collapsed state</td></tr>
              <tr><td><code>showLineNumbers</code></td><td><code>boolean</code></td><td><code>true</code></td><td>Show line numbers</td></tr>
              <tr><td><code>elevated</code></td><td><code>boolean</code></td><td><code>false</code></td><td>Add box shadow</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }
</style>
