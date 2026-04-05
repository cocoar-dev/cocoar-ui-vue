# Markdown

Render markdown content with Cocoar Design System styling. The system is split into two packages: a framework-agnostic parser and a Vue component.

::: info Separate Packages
```bash
pnpm add @cocoar/vue-markdown @cocoar/vue-markdown-core
```
:::

## Quick Start

Parse a markdown string, then render it:

```vue
<template>
  <CoarMarkdown :doc="doc" />
</template>

<script setup lang="ts">
import { parse } from '@cocoar/vue-markdown-core';
import { CoarMarkdown } from '@cocoar/vue-markdown';

const doc = parse(`
# Hello World

This is **bold** and *italic* text with a [link](https://example.com).

- Item one
- Item two
- Item three
`, { gfm: true });
</script>
```

## Parsing (`@cocoar/vue-markdown-core`)

### `parse(markdown, options?)`

Converts a markdown string into a `MarkdownDocument` tree.

```ts
import { parse } from '@cocoar/vue-markdown-core';

const doc = parse('# Title\n\nParagraph text.', { gfm: true });
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gfm` | `boolean` | `false` | Enable GitHub Flavored Markdown (tables, strikethrough, task lists) |

### `serialize(doc, options?)`

Convert a document tree back to a markdown string:

```ts
import { serialize } from '@cocoar/vue-markdown-core';

const markdown = serialize(doc, { gfm: true });
```

### `transform(doc, ...transforms)`

Apply transformations to the document tree:

```ts
import { parse, transform, type MarkdownTransform } from '@cocoar/vue-markdown-core';

const addPrefix: MarkdownTransform = (doc) => ({
  ...doc,
  nodes: doc.nodes.map(node => {
    if (node.type === 'heading') {
      return { ...node, text: `[Docs] ${node.text}` };
    }
    return node;
  }),
});

const doc = transform(parse(markdown), addPrefix);
```

## Rendering (`@cocoar/vue-markdown`)

### `CoarMarkdown`

| Prop | Type | Description |
|------|------|-------------|
| `doc` | `MarkdownDocument` | Pre-parsed markdown document |

### Supported Elements

| Markdown | HTML | Notes |
|----------|------|-------|
| `# Heading` | `<h1>` - `<h6>` | With anchor IDs |
| `**bold**` | `<strong>` | |
| `*italic*` | `<em>` | |
| `` `code` `` | `<code>` | Inline code |
| Code blocks | `<CoarCodeBlock>` | With language highlighting |
| `[text](url)` | `<a>` | External links open in new tab |
| `![alt](src)` | `<img>` | Lazy loaded |
| `> quote` | `<blockquote>` | Styled with left border |
| Lists | `<ul>` / `<ol>` | Including task lists |
| Tables | `<CoarTable>` | GFM tables with alignment |
| `~~strike~~` | `<del>` | GFM strikethrough |
| `---` | `<hr>` | Thematic break |

### Links

Links are handled intelligently:
- **External** (`https://...`): Opens in new tab with `rel="noopener noreferrer"`
- **Hash anchors** (`#section`): Resolved relative to current page
- **Relative paths** (`./page`): Local navigation

## Node Types

```ts
type MarkdownNodeType =
  | 'heading' | 'paragraph' | 'blockquote'
  | 'list' | 'listItem'
  | 'codeBlock' | 'table' | 'tableRow' | 'tableCell'
  | 'thematicBreak' | 'lineBreak'
  | 'text' | 'emphasis' | 'strong' | 'strikethrough'
  | 'inlineCode' | 'link' | 'image';

interface MarkdownNode {
  id: string;
  type: MarkdownNodeType;
  children?: readonly MarkdownNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  position?: MarkdownPosition;
}

interface MarkdownDocument {
  nodes: readonly MarkdownNode[];
}
```

## Theming

The markdown component uses CSS custom properties for theming:

```css
/* Override in your app */
.coar-markdown {
  --coar-markdown-text: var(--coar-text-neutral-primary);
  --coar-markdown-link: var(--coar-text-accent);
  --coar-markdown-border: var(--coar-border-neutral);
}
```
