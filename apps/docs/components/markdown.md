# Markdown

Render markdown content with Cocoar Design System styling. The system is split into two packages: a framework-agnostic parser and a Vue component.

::: info Separate Packages
```bash
pnpm add @cocoar/vue-markdown @cocoar/vue-markdown-core
```

Then load the shared block stylesheet **once** at app entry, alongside `@cocoar/vue-ui/styles`:

```css
/* app/main.css */
@import "@cocoar/vue-ui/styles";
@import "@cocoar/vue-markdown/styles";
```

The same stylesheet is consumed by `@cocoar/vue-markdown-editor` — viewer and editor render identical output for every node type.
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
| `renderers` | `MarkdownViewerRenderers` | _(optional)_ Per-instance renderer override. See [Custom renderers](#custom-renderers-registry) below. |
| `embeds` | `EmbedRegistry` | _(optional)_ Custom-embed registry — renders `:::key{props}` directives via your components. See [Custom Embeds](/components/markdown-embeds). |
| `fenceRenderers` | `FenceRegistry` | _(optional)_ Fenced-code-block renderer registry — render a fence language (e.g. ` ```mermaid `) with a rich component instead of a plain code block. Unregistered languages stay code blocks. See [Diagrams](/components/markdown-diagrams). |

### Custom renderers (registry)

Every node type — headings, paragraphs, code blocks, tables, lists, even inline marks like `<em>` — is rendered by a swappable Vue component. The package exports the full default registry so you can override **just one slot** while keeping the rest of the Cocoar look:

```vue
<script setup lang="ts">
import { CoarMarkdown, defaultMarkdownRenderers } from '@cocoar/vue-markdown';
import MyHighlightedCodeBlock from './MyHighlightedCodeBlock.vue';

const renderers = {
  ...defaultMarkdownRenderers,
  codeBlock: MyHighlightedCodeBlock,  // Swap just the code-block slot
};
</script>

<template>
  <CoarMarkdown :doc="doc" :renderers="renderers" />
</template>
```

For app-wide overrides, `provide` the registry once at startup:

```ts
import { MARKDOWN_RENDERERS_KEY, defaultMarkdownRenderers } from '@cocoar/vue-markdown';
app.provide(MARKDOWN_RENDERERS_KEY, {
  ...defaultMarkdownRenderers,
  codeBlock: MyHighlightedCodeBlock,
});
```

Resolution order: per-instance prop → app-level inject → built-in defaults.

#### Renderer contract

Each renderer receives:

```ts
interface MarkdownRendererProps {
  /** The AST node currently being rendered. */
  node: MarkdownNode;
  /** Recursive child renderer — call to render `node.children`. */
  renderChildren: () => VNode[];
  /** Render an arbitrary list of nodes through the registry. Used by `DefaultTable`
   *  to render each cell's inline content while keeping the `<thead>/<tbody>` shape
   *  under the renderer's control. */
  renderNodes: (nodes: readonly MarkdownNode[]) => VNode[];
}
```

A custom renderer is a regular Vue component that emits the right semantic HTML for its node type. Use `renderChildren()` for the typical "wrap children in a tag" case; reach for `renderNodes(...)` only when the rendered structure isn't a flat children list (the GFM table is the canonical example).

#### Why the registry matters

The same registry is consumed by `@cocoar/vue-markdown-editor`. Overriding `codeBlock` in your app's `provide` flips the rendering both in the viewer **and** in the editor's render mode (the cursor-out state of the in-editor code block). Output stays in sync without any duplicated wiring.

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

## Frontmatter

A leading YAML frontmatter block (`---` … `---`) is parsed into a single `frontmatter` node and rendered as muted, italic `key: value` lines (styled like disabled text, so it reads as metadata rather than body content). Without this, CommonMark mis-reads the block as a thematic break followed by a setext heading, collapsing the entire YAML onto one line.

```ts
import { parse } from '@cocoar/vue-markdown-core';

const doc = parse(`---
title: Release notes
tags:
  - editor
  - markdown
---

# Heading
`);

doc.nodes[0].type;          // 'frontmatter'
doc.nodes[0].attrs.data;    // { title: 'Release notes', tags: ['editor', 'markdown'] }
doc.nodes[0].attrs.entries; // [{ key: 'title', value: 'Release notes' }, { key: 'tags', value: 'editor, markdown' }]
doc.nodes[0].attrs.raw;     // the original YAML text (used for round-trip via serialize())
```

The node carries three attrs: `raw` (verbatim YAML, the round-trip source), `data` (the parsed object, or `null` for non-map/invalid YAML), and `entries` (flattened, display-ready key/value rows). The default `DefaultFrontmatter` renderer reads `entries`; on a parse failure it falls back to the raw text so nothing is hidden. Override it like any other slot via `MARKDOWN_RENDERERS_KEY` (key: `frontmatter`).

`@cocoar/vue-markdown-editor` renders it the **same** way and round-trips the block on save — see the [editor's Frontmatter section](/components/markdown-editor#frontmatter).

## Custom Embeds

Render your own Vue components from a `:::key{props}` directive by passing an
`embeds` registry. The same registry works in `<CoarMarkdownEditor>`, where the
embed becomes editable — so a document looks consistent whether read or written.

```vue
<CoarMarkdown :doc="doc" :embeds="embeds" />
```

See the dedicated **[Custom Embeds](/components/markdown-embeds)** page for the
registry shape, security model, and a live editor + viewer demo.

## Diagrams

Render a fenced code block — ` ```mermaid ` — as a diagram by passing a
`fenceRenderers` registry. An unregistered fence language stays a plain,
syntax-highlighted code block, so the markdown stays portable.

```vue
<CoarMarkdown :doc="doc" :fence-renderers="fenceRenderers" />
```

See the dedicated **[Diagrams](/components/markdown-diagrams)** page for the
opt-in `@cocoar/vue-markdown-mermaid` package, theming, zoom/pan and how to
register your own fence renderer.

## Node Types

```ts
type MarkdownNodeType =
  | 'frontmatter'
  | 'heading' | 'paragraph' | 'blockquote'
  | 'list' | 'listItem'
  | 'codeBlock' | 'table' | 'tableRow' | 'tableCell'
  | 'thematicBreak' | 'lineBreak'
  | 'text' | 'emphasis' | 'strong' | 'strikethrough'
  | 'inlineCode' | 'link' | 'image'
  | 'colorSpan' | 'embed';

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
