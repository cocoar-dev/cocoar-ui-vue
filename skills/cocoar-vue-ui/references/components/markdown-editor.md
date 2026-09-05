<!-- Generated from apps/docs/components/markdown-editor.md by apps/docs/scripts/sync-skill.mjs. Do not edit; edit the docs page. -->

# Markdown Editor (Preview)

WYSIWYG Markdown editor for Vue 3 based on [Milkdown](https://milkdown.dev/) (Kit approach), styled with the Cocoar Design System. Markdown-first: lossless round-trip between text and editor state. Shares the same remark stack — and the same render registry — as `@cocoar/vue-markdown-core` and `<CoarMarkdown>`.

> **Info: Separate Package**
>
>
```bash
pnpm add @cocoar/vue-markdown-editor @cocoar/vue-markdown @cocoar/vue-ui
```
>
> `@cocoar/vue-markdown`, `@cocoar/vue-ui` and `vue` are peer dependencies. Milkdown is bundled as a regular dependency — no extra setup required. The peer-dep on `@cocoar/vue-markdown` is what makes the **shared rendering registry** work — code blocks, tables, etc. look identical here and in `<CoarMarkdown>`.
>
> Import the stylesheets once at your app's entry — same pattern as `@cocoar/vue-ui`:
>
```css
/* app/main.css */
@import '@cocoar/vue-ui/styles';
@import '@cocoar/vue-markdown/styles'; /* ← shared block styles */
@import '@cocoar/vue-markdown-editor/styles'; /* ← editor-specific chrome */
```
>

> **Warning: Preview release**
>
> The package is on the `0.0.x` line. The render layer, `v-model` contract, toolbar API, form-field integration, and code-block view/edit toggle are **stable enough to ship in internal Cocoar apps** — the source format is plain Markdown, so any content written today round-trips through future API changes.
>
> Still missing for a `1.0`: a link insertion dialog and hover-based table edge-handles (row/column selection). See [TODO](#todo) below.

## Basic Usage

The editor exposes a plain `v-model` for the markdown string and renders a floating toolbar on text selection.

**Demo — `markdown-editor/demos/MarkdownEditorBasic.vue`**

```vue
<template>
  <ClientOnly>
    <div class="md-frame">
      <component :is="Editor" v-if="Editor" v-model="value" />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref(`# Try me

Select some text to see the **floating toolbar**, or insert a:

| Column A | Column B |
|----------|----------|
| Edit me  | Edit me  |

> Blockquote works too.
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});
</script>

<style scoped>
.md-frame {
  height: 360px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-frame__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

.md-output { margin-top: 12px; }
.md-output summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.md-output pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl);
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
```

```vue
<template>
  <CoarMarkdownEditor v-model="value" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';

const value = ref('# Hello\n\nStart typing **markdown**.');
</script>
```

> **Tip: Sizing**
>
> The editor fills its parent container. Wrap it in a parent with explicit height (`height: 360px`, `flex: 1` inside a column flexbox, etc.).

## Toolbar Modes

`toolbarMode` controls the layout. Four values:

| Value                  | Description                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `'floating'` (default) | Appears on text selection, teleported to `<body>`, context-aware (text vs. table)                                                |
| `'fixed'`              | `CoarSidebar` collapsed with icon buttons and flyout submenus, persistent. Sits on any of the four edges — see `toolbarPosition` |
| `'both'`               | Both active simultaneously                                                                                                       |
| `'external'`           | Routes this editor's commands and tool list into one shared `CoarMarkdownToolbar`                                                |

When `toolbarMode` is `'fixed'` or `'both'`, `toolbarPosition` controls which edge the toolbar attaches to. All four edges are supported — `'left'` and `'right'` give a vertical icon column, `'top'` and `'bottom'` switch to a horizontal toolbar above or below the editor area. Flyout submenus open in the corresponding direction (right for `left`, downward for `top`, etc.).

**Demo — `markdown-editor/demos/MarkdownEditorSidebar.vue`**

```vue
<template>
  <ClientOnly>
    <div style="display: flex; flex-direction: column; gap: 12px;">
      <CoarSelect
        v-model="position"
        :options="positionOptions"
        label="toolbar-position"
        size="s"
        style="width: 200px;"
      />
      <div class="md-frame">
        <component
          :is="Editor"
          v-if="Editor"
          v-model="value"
          toolbar-mode="fixed"
          :toolbar-position="position"
        />
        <div v-else class="md-frame__loading">Loading editor…</div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';
import { CoarSelect } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

type Position = 'left' | 'right' | 'top' | 'bottom';

const value = ref(`# Sidebar toolbar

Use the icon strip on any of the four edges for persistent access to formatting
commands. Hover **Headings** to open the flyout.
`);

const position = ref<Position>('left');

const positionOptions: CoarSelectOption<Position>[] = [
  { value: 'left', label: 'left' },
  { value: 'right', label: 'right' },
  { value: 'top', label: 'top' },
  { value: 'bottom', label: 'bottom' },
];

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});
</script>

<style scoped>
.md-frame {
  height: 320px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-frame__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}
</style>
```

```vue
<CoarMarkdownEditor v-model="value" toolbar-mode="fixed" toolbar-position="top" />
```

### One toolbar for multiple editors

Wrap one toolbar and all participating editors in `CoarMarkdownEditorGroup`.
Every editor uses `toolbar-mode="external"`:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarMarkdownEditor,
  CoarMarkdownEditorGroup,
  CoarMarkdownToolbar,
} from '@cocoar/vue-markdown-editor';

const document = ref('');
const notes = ref('');
</script>

<template>
  <CoarMarkdownEditorGroup>
    <CoarMarkdownToolbar position="top" />

    <CoarMarkdownEditor
      v-model="document"
      toolbar-mode="external"
      :tools="['bold', 'headings', 'bulletList', 'table']"
    />

    <CoarMarkdownEditor
      v-model="notes"
      toolbar-mode="external"
      :tools="['bold', 'italic', 'bulletList']"
    />
  </CoarMarkdownEditorGroup>
</template>
```

There is exactly one toolbar DOM host. Focusing an editor switches the active
command controller and its available `tools`; the toolbar is not hidden,
remounted or teleported during that switch. When focus is outside every editor
in the group, the toolbar stays visible but is disabled. Clicking the toolbar
does not lose the active editor.

Editors in the same group may expose different tool lists. Editors outside the
group and editors using `floating`, `fixed` or `both` remain independent.

## Flavors (portability)

The **`flavor`** prop is a portability contract: it picks which features the editor offers and **hard-enforces** them — it only registers the matching Milkdown plugins, so a non-flavor construct can't be typed _or pasted_ (it degrades to plain text), and its toolbar buttons are hidden.

This matters when the same Markdown is rendered somewhere stricter than the web — e.g. a **native SwiftUI Markdown view** that only understands CommonMark, or CommonMark+GFM. Pick the flavor that matches your strictest renderer and authors physically can't produce content it won't render.

| Flavor                 | Adds on top of CommonMark                                                                          | Renders in                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `'commonmark'`         | _(nothing — the portable floor)_ headings, bold/italic, lists, links, images, code, blockquote, hr | **any** Markdown renderer                            |
| `'gfm'`                | tables, task lists, strikethrough                                                                  | GFM-capable renderers (GitHub, swift-markdown-ui, …) |
| `'cocoar'` _(default)_ | inline **text color** + **custom embeds** (non-portable)                                           | the Cocoar viewer / your own renderer                |

```vue
<!-- Strict: only portable CommonMark can be authored -->
<CoarMarkdownEditor v-model="value" flavor="commonmark" toolbar-mode="both" />

<!-- Fine control: GFM tables etc. but no color, via a capability object -->
<CoarMarkdownEditor v-model="value" :flavor="{ gfm: true, textColor: false }" />
```

A capability object (`{ gfm?, textColor?, embeds? }`) is **opt-in** — unspecified capabilities are off, so `{}` ≡ `'commonmark'`. The default is `'cocoar'`, which also enables `embeds` — see [Custom Embeds](./markdown-embeds.md).

> **Tip: flavor vs. tools**
>
> `flavor` is the **hard format contract** (what can exist in the document). The [`tools`](#toolbar-layout-tools) layout is **soft toolbar curation** (which buttons show, and where) _within_ the flavor — e.g. keep GFM parsing but hide the table button. They compose.

> **Warning: Changing flavor at runtime**
>
> Plugin registration happens once at mount. To switch `flavor` on a live editor, **re-key** the component (`:key="flavor"`) so it remounts and re-registers — otherwise only the toolbar updates, not the parser. Switching to a stricter flavor degrades unsupported constructs already in the document (a table becomes its literal `| … |` text). The standalone `<CoarMarkdown>` viewer has its own parse options and is not affected by the editor's flavor.

## Readonly

```vue
<CoarMarkdownEditor v-model="value" readonly />
```

In `readonly` mode the editor accepts no input, the floating toolbar is suppressed, and the sidebar buttons are inert. The fixed toolbar still renders so the layout stays stable when toggling between view and edit.

## Placeholder

Pass a `placeholder` string to show a hint while the editor is empty. The
placeholder **is itself Markdown** — it renders through the same viewer the
editor uses for content, so `**bold**`, lists, and headings all work and match
the editor's typography.

```vue
<CoarMarkdownEditor
  v-model="value"
  :placeholder="'**Describe the change…**\n\n- What changed?\n- Why?'"
/>
```

**Demo — `markdown-editor/demos/MarkdownEditorPlaceholder.vue`**

```vue
<template>
  <ClientOnly>
    <div class="md-frame">
      <component
        :is="Editor"
        v-if="Editor"
        v-model="value"
        :placeholder="placeholder"
      />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      The hint above is a decoration only. Until you type, the raw
      <code>v-model</code> stays an empty string — nothing gets persisted.
    </p>
    <details class="md-output">
      <summary>Raw markdown (v-model) — <code>{{ value.length }}</code> chars</summary>
      <pre>{{ value || '(empty)' }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref('');

// The placeholder is itself Markdown — it renders through the same viewer the
// editor uses for content, so **bold**, lists and headings all work.
const placeholder = `**Describe the change…**

- What changed?
- Why does it matter?`;

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});
</script>

<style scoped>
.md-frame {
  height: 240px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-frame__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

.md-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}

.md-output { margin-top: 12px; }
.md-output summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.md-output pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl);
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
```

> **Tip: Never persisted — unlike pre-filling the value**
>
> The placeholder is a muted, click-through **overlay** of the `<CoarMarkdown>` viewer, shown only while the document is empty. It never enters `modelValue`. An untouched editor therefore still emits an empty string — so you can leave the field genuinely blank.
>
> Do **not** work around a missing placeholder by writing the hint into `v-model`: that turns the hint into real content, which then gets saved even when the user meant to leave the field empty.

The hint disappears the moment the document has any content and reappears if it's emptied again. It tracks the live `placeholder` prop, so you can swap it at runtime. Because it's a real Markdown render, the placeholder also picks up [custom renderers](#code-blocks-view-edit-toggle) you provide via `MARKDOWN_RENDERERS_KEY`.

## Frontmatter

A leading YAML frontmatter block (`---` … `---`) is recognised and shown as muted, italic `key: value` lines instead of being mis-parsed as a thematic break + setext heading (which collapses the whole block onto one line). It renders the same way in the [viewer](./markdown.md#frontmatter), so editing and reading look identical.

**Demo — `markdown-editor/demos/MarkdownEditorFrontmatter.vue`**

```vue
<template>
  <ClientOnly>
    <div class="md-frame">
      <component :is="Editor" v-if="Editor" v-model="value" />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      The <code>---</code> YAML block at the top renders as muted, italic
      <code>key: value</code> lines — not a collapsed heading. Edit the body and watch the
      raw <code>v-model</code>: the frontmatter is preserved untouched on save.
    </p>
    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref(`---
title: Release notes
author: Jane Doe
tags:
  - editor
  - markdown
---

# Heading

Body text. Try editing me — the metadata above stays put.
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});
</script>

<style scoped>
.md-frame {
  height: 360px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-frame__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

.md-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}

.md-output { margin-top: 12px; }
.md-output summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.md-output pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl);
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
```

The frontmatter is an **atomic block**: display-only in the rendered editor (muted + italic, like disabled text), selectable/deletable as a unit, and — crucially — it **round-trips**. The raw YAML is preserved verbatim, so `v-model` keeps emitting the `---` … `---` block untouched while you edit the body. To **edit** the YAML values, switch to [Source view](#source-view-raw-markdown).

> **Info: Parsing & nesting**
>
> Detection is powered by [`remark-frontmatter`](https://github.com/remarkjs/remark-frontmatter) on Milkdown's shared remark instance (and the matching parse path in `@cocoar/vue-markdown-core`). Only a YAML block at the very **top** of the document is treated as frontmatter — a `---` in the middle stays a horizontal rule. Malformed YAML falls back to showing the raw text in the card rather than collapsing.

## Source view (raw Markdown)

Set `source-toggle` to add a **Rendered ↔ Source** switch. In Source mode the entire document — body **and** the frontmatter YAML — is editable as raw Markdown in a `<textarea>`; switching back re-parses and re-renders it.

```vue
<CoarMarkdownEditor v-model="value" source-toggle toolbar-mode="fixed" />
```

**Demo — `markdown-editor/demos/MarkdownEditorSourceToggle.vue`**

```vue
<template>
  <ClientOnly>
    <div class="md-frame">
      <component
        :is="Editor"
        v-if="Editor"
        v-model="value"
        source-toggle
        toolbar-mode="fixed"
      />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      Use the <strong>Source</strong> button at the top of the toolbar. In Source mode you
      edit the whole Markdown document as raw text — including the frontmatter YAML —
      and the toolbar's <strong>Rendered</strong> button switches back.
    </p>
    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref(`---
title: Release notes
status: draft
---

# Heading

Some **body** text. Flip to *Source* to edit the raw Markdown
(and the YAML above) directly.
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});
</script>

<style scoped>
.md-frame {
  height: 360px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-frame__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

.md-hint {
  margin-top: 8px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}

.md-output { margin-top: 12px; }
.md-output summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.md-output pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl);
  font-size: 12px;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
```

This is the way to hand-edit frontmatter, fix up exact Markdown, or paste raw content. The toggle is **off by default** — without `source-toggle` the editor is WYSIWYG-only with no extra chrome.

> **Info: Where the toggle lives**
>
> With a **fixed** sidebar toolbar (`toolbar-mode` `'fixed'` / `'both'`) the toggle is the **first item in the sidebar** — and in Source mode the sidebar collapses to just that toggle (the formatting buttons act on the hidden rich editor, so they're hidden). With the default **floating** toolbar there's no persistent toolbar, so a small toggle button appears in the editor's top-right corner instead.

> **Info: Behaviour**
>
> The rich editor stays mounted in Source mode (just hidden), so switching is cheap and the toolbar stays put. `readonly` / `disabled` and the `CoarFormField` wiring carry over to the Source `<textarea>`. Switching back re-seeds the rich editor from the current value, so raw edits (incl. frontmatter) are picked up — the rich editor's undo history resets across a mode switch.

## Images

Images round-trip as standard Markdown — `![alt](url "title")` — so anything you paste from another CMS (a WordPress export, say) renders as-is in both the editor and `<CoarMarkdown>`.

There are three ways to add one:

- **Insert by URL** — the **Insert Image** button in the sidebar opens a small dialog for `url` / `alt` / `title`. (Like the table and code-block buttons, it lives in the **sidebar**, so use `toolbar-mode="fixed"` or `"both"`.)
- **Paste** an image from the clipboard (e.g. a screenshot).
- **Drag & drop** an image file into the writing area.

Paste and drop require an `upload-image` callback. It receives the dropped/pasted `File`, stores it wherever you like, and resolves with the resulting `url` (plus optional `alt`). A spinner placeholder is shown at the insertion point until it resolves, then is replaced by the image. Without the callback, image files fall through to the browser's default handling.

```vue
<CoarMarkdownEditor v-model="value" toolbar-mode="both" :upload-image="uploadImage" />

<script setup lang="ts">
async function uploadImage(file: File) {
  const url = await myAssetService.upload(file); // your storage
  return { url, alt: file.name };
}
</script>
```

**Demo — `markdown-editor/demos/MarkdownEditorImages.vue`**

```vue
<template>
  <ClientOnly>
    <div class="md-frame">
      <component
        :is="Editor"
        v-if="Editor"
        v-model="value"
        toolbar-mode="both"
        :upload-image="uploadImage"
      />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      Click the <strong>Insert Image</strong> button in the sidebar to add one by URL,
      or <strong>paste / drag &amp; drop</strong> an image file straight into the editor.
    </p>
    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref(`# Images

Markdown images round-trip as \`![alt](url)\`:

![A scenic placeholder](https://picsum.photos/seed/cocoar/640/360 "Hover title")

Try inserting your own below.
`);

const Editor = shallowRef<Component | null>(null);

onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});

/**
 * Demo uploader: reads the file as a base64 data URL so the demo works fully
 * offline with no backend. A real app would POST the file to its asset service
 * and return the hosted URL instead.
 */
function uploadImage(file: File): Promise<{ url: string; alt?: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result as string, alt: file.name });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
</script>

<style scoped>
.md-frame {
  height: 420px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-frame__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

.md-hint {
  margin-top: 10px;
  font-size: 13px;
  color: var(--coar-text-neutral-secondary);
}

.md-output { margin-top: 12px; }
.md-output summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.md-output pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl);
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
```

### Custom image source (`pickImage`)

To wire the **Insert Image** button to your own asset library or gallery, pass a `pickImage` callback. When set, it **replaces** the built-in URL dialog: clicking the button calls your callback with a context bound to the cursor position — `insertImage(...)` plus the `selectedText` (a handy default for `alt`). Open your own modal, then call `ctx.insertImage(...)` for each chosen image. The modal can stay open and insert several; the editor keeps ownership of cursor handling and the Markdown round-trip, so you never touch ProseMirror.

```vue
<CoarMarkdownEditor v-model="value" toolbar-mode="both" :pick-image="openGallery" />

<script setup lang="ts">
function openGallery(ctx) {
  myGalleryModal.open({
    defaultAlt: ctx.selectedText,
    onPick: (asset) => ctx.insertImage({ url: asset.url, alt: asset.title }),
  });
}
</script>
```

`pickImage` (button → your picker) and `uploadImage` (paste / drop) are orthogonal and compose — wire both for a full gallery-plus-paste experience.

**Demo — `markdown-editor/demos/MarkdownEditorImageGallery.vue`**

```vue
<template>
  <ClientOnly>
    <div class="md-frame">
      <component
        :is="Editor"
        v-if="Editor"
        v-model="value"
        toolbar-mode="both"
        :pick-image="openGallery"
      />
      <div v-else class="md-frame__loading">Loading editor…</div>
    </div>
    <p class="md-hint">
      Click <strong>Insert Image</strong> in the sidebar — instead of the built-in URL dialog,
      a custom “gallery” opens. Pick one or more; the modal stays open so you can insert several.
    </p>

    <!-- The consumer's own gallery modal — entirely app-owned. -->
    <div v-if="galleryOpen" class="gallery-backdrop" @click.self="closeGallery">
      <div class="gallery">
        <header class="gallery__head">
          <strong>Tellify gallery</strong>
          <button class="gallery__x" @click="closeGallery" aria-label="Close">✕</button>
        </header>
        <div class="gallery__grid">
          <button
            v-for="img in assets"
            :key="img.url"
            class="gallery__item"
            @click="pick(img)"
          >
            <img :src="img.url" :alt="img.alt" />
            <span>{{ img.alt }}</span>
          </button>
        </div>
        <footer class="gallery__foot">
          <label class="gallery__upload">
            Upload…
            <input type="file" accept="image/*" hidden @change="onUpload" />
          </label>
          <button class="gallery__done" @click="closeGallery">Done</button>
        </footer>
      </div>
    </div>

    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, shallowRef, type Component } from 'vue';

interface Asset { url: string; alt: string }
// Stand-in for what a real gallery API would return.
const assets: Asset[] = [
  { url: 'https://picsum.photos/seed/alpha/320/200', alt: 'Alpha' },
  { url: 'https://picsum.photos/seed/bravo/320/200', alt: 'Bravo' },
  { url: 'https://picsum.photos/seed/charlie/320/200', alt: 'Charlie' },
  { url: 'https://picsum.photos/seed/delta/320/200', alt: 'Delta' },
];

const value = ref(`# Gallery picker

Click **Insert Image** to choose from the gallery.
`);

const Editor = shallowRef<Component | null>(null);
onMounted(async () => {
  const mod = await import('@cocoar/vue-markdown-editor');
  Editor.value = mod.CoarMarkdownEditor;
});

// pickImage hands us a context bound to the cursor. We stash it, open our
// modal, and call ctx.insertImage(...) for each chosen asset — the modal can
// stay open and insert several.
type PickContext = { insertImage: (img: { url: string; alt?: string }) => void; selectedText: string };
const galleryOpen = ref(false);
let ctx: PickContext | null = null;

function openGallery(c: PickContext) {
  ctx = c;
  galleryOpen.value = true;
}
function closeGallery() {
  galleryOpen.value = false;
  ctx = null;
}
function pick(img: Asset) {
  ctx?.insertImage({ url: img.url, alt: img.alt });
}
function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => ctx?.insertImage({ url: reader.result as string, alt: file.name });
  reader.readAsDataURL(file);
}
</script>

<style scoped>
.md-frame {
  height: 420px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.md-frame__loading { padding: 24px; text-align: center; color: var(--coar-text-neutral-tertiary); font-size: 13px; }
.md-hint { margin-top: 10px; font-size: 13px; color: var(--coar-text-neutral-secondary); }

.gallery-backdrop {
  position: fixed; inset: 0; z-index: 50;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
}
.gallery {
  width: min(560px, 92vw);
  background: var(--coar-background-neutral-primary);
  border-radius: var(--coar-radius-xl);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.gallery__head, .gallery__foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
}
.gallery__head { border-bottom: 1px solid var(--coar-border-neutral); }
.gallery__foot { border-top: 1px solid var(--coar-border-neutral); }
.gallery__x { background: none; border: none; cursor: pointer; font-size: 16px; }
.gallery__grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 16px;
}
.gallery__item {
  display: flex; flex-direction: column; gap: 4px; padding: 0;
  background: none; border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-l); overflow: hidden; cursor: pointer;
  font-size: 12px;
}
.gallery__item:hover { border-color: var(--coar-border-interactive, #888); }
.gallery__item img { width: 100%; height: 100px; object-fit: cover; display: block; }
.gallery__item span { padding: 4px 8px; }
.gallery__upload { cursor: pointer; font-size: 13px; text-decoration: underline; }
.gallery__done {
  background: var(--coar-background-interactive-bold, #2563eb); color: #fff;
  border: none; border-radius: var(--coar-radius-l); padding: 6px 14px; cursor: pointer;
}

.md-output { margin-top: 12px; }
.md-output summary { cursor: pointer; font-size: 13px; font-weight: 600; }
.md-output pre {
  margin-top: 8px; padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl); font-size: 12px;
  max-height: 200px; overflow: auto; white-space: pre-wrap;
}
</style>
```

> **Info: Resize / alignment / captions**
>
> Width, alignment, and captions aren't part of standard Markdown, so they're not supported yet — a richer image block (a separate slice) is planned. Today an image is the plain `![alt](url "title")`.

## Tables

GFM tables are portable (they render on GitHub, in `swift-markdown-ui`, etc.), so they're available in the `'gfm'` and `'cocoar'` [flavors](#flavors-portability). The editor offers a full set of table operations:

**Create** — two ways:

- The **Insert Table** sidebar button opens a small **grid size picker** — hover (or tap) to choose `cols × rows`, then click to insert.
- Type **`|3x4|`** followed by a space anywhere — a GFM input rule turns it into a 3-column × 4-row table. This needs no toolbar, so it's the way to create a table in the default `floating` mode.

**Edit** — two ways:

- **Hover edge-handles** (Notion/Word-style) — point at any edge of a table and grips appear along all four sides (a segment per column on top & bottom, per row on left & right). Hovering a grip highlights the whole column/row; **clicking** it opens a menu to **insert before / after** or **delete**, and **dragging** it **reorders** the column/row (with a live drop indicator).
- **In-cell toolbar** — with the cursor inside a cell, the floating toolbar (and the sidebar in `fixed`/`both` mode) offers insert row/column, **column alignment** (left / center / right, applied to the whole column — round-trips as GFM `:--` / `:-:` / `--:`, active alignment highlighted), **delete cell** and **delete table**.

> **Info: How the handles work**
>
> The handles are geometry-driven — they measure the hovered table's cell rectangles and render fixed-position grips, rather than reacting to ProseMirror's `CellSelection` (which doesn't fire `selectionchange`). Clicking a grip targets that column/row by position, so it works on any table without needing a cursor inside it first.

## Code blocks — view / edit toggle

Code blocks have a richer UX than the rest of the editor. When the cursor is **outside** a code block it renders as `CoarCodeBlock` with full Prism syntax highlighting — same component, same look as `<CoarMarkdown>` produces in the viewer. When the cursor moves **inside** the block it switches to plain editable mode plus a language selector at the top.

| State              | What renders                                                     | Why                                                                                                    |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cursor **outside** | `CoarCodeBlock` (Prism-highlighted, copy button, language label) | Read-mode aesthetic — matches the viewer                                                               |
| Cursor **inside**  | Plain editable text + `CoarSelect` for the language              | Editing on top of Prism-highlighted DOM is fragile (cursor jumps, IME issues). Plain text avoids that. |

Switching directions:

- **Render → edit**: hover the code block to reveal a small **Edit** button (top-right), or simply click into the text via PM's natural cursor placement
- **Edit → render**: click anywhere outside the code block. PM's selection moves out → the NodeView swaps back automatically

Supported languages match what `CoarCodeBlock` ships with: `typescript`, `javascript`, `json`, `css`, `scss`, `html`, `bash`, plus `''` (Plain text — no highlighting). The language string is persisted exactly as picked into the markdown fence (` ```json `).

> **Tip: Custom code-block renderer**
>
> The render-mode component is the registry's `codeBlock` slot. Override it in `provide(MARKDOWN_RENDERERS_KEY, { ...defaults, codeBlock: MyCustom })` and the editor's render mode picks up the same custom component without any extra wiring.

## Form Integration

`CoarMarkdownEditor` is a full citizen of the Cocoar form ecosystem. Drop it inside `CoarFormField` and the label, error message, `aria-describedby` wiring, and `disabled` state propagate automatically — the same way `CoarTextInput`, `CoarSelect`, and `CoarScriptEditor` behave.

**Demo — `markdown-editor/demos/MarkdownEditorInForm.vue`**

```vue
<template>
  <ClientOnly>
    <div v-if="Editor && FormField && TextInput && Button" class="form-demo">
      <component :is="FormField" label="Title" :error="titleError" required>
        <component :is="TextInput" v-model="form.title" placeholder="My note" />
      </component>

      <component
        :is="FormField"
        label="Body"
        :error="bodyError"
        :disabled="locked"
        hint="Markdown — select text to format."
        required
      >
        <div class="md-frame">
          <component :is="Editor" v-model="form.body" />
        </div>
      </component>

      <div class="row">
        <component :is="Button" type="primary" @clicked="onSubmit">Save</component>
        <component :is="Button" @clicked="onReset">Reset</component>
        <label class="lock">
          <input v-model="locked" type="checkbox" /> lock (disabled)
        </label>
      </div>

      <pre class="preview">{{ preview }}</pre>
    </div>
    <div v-else class="loading">Loading editor…</div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef, type Component } from 'vue';

const form = reactive({
  title: '',
  body: '',
});
const locked = ref(false);

const titleError = computed(() => (form.title.length === 0 ? 'Required.' : ''));
const bodyError = computed(() =>
  form.body.trim().length === 0 ? 'Body cannot be empty.' : '',
);
const preview = computed(() => JSON.stringify(form, null, 2));

function onSubmit() {
  if (titleError.value || bodyError.value) return;
  // eslint-disable-next-line no-console
  console.log('submit', form);
}

function onReset() {
  form.title = '';
  form.body = '';
}

const Editor = shallowRef<Component | null>(null);
const FormField = shallowRef<Component | null>(null);
const TextInput = shallowRef<Component | null>(null);
const Button = shallowRef<Component | null>(null);

onMounted(async () => {
  const [mod, ui] = await Promise.all([
    import('@cocoar/vue-markdown-editor'),
    import('@cocoar/vue-ui'),
  ]);
  Editor.value = mod.CoarMarkdownEditor;
  FormField.value = ui.CoarFormField;
  TextInput.value = ui.CoarTextInput;
  Button.value = ui.CoarButton;
});
</script>

<style scoped>
.form-demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.md-frame {
  height: 220px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lock {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 12px;
  font-size: 13px;
  cursor: pointer;
}

.preview {
  background: var(--coar-background-neutral-secondary);
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  padding: 12px;
  font-size: 12px;
  color: var(--coar-text-neutral-secondary);
  overflow: auto;
  margin: 0;
}

.loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}
</style>
```

```vue
<template>
  <CoarFormField label="Body" :error="bodyError" hint="Markdown" required>
    <CoarMarkdownEditor v-model="form.body" />
  </CoarFormField>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { CoarFormField } from '@cocoar/vue-ui';
import { CoarMarkdownEditor } from '@cocoar/vue-markdown-editor';

const form = reactive({ body: '' });
const bodyError = computed(() => (form.body.trim().length === 0 ? 'Body cannot be empty.' : ''));
</script>
```

What gets auto-wired from the surrounding `<CoarFormField>`:

| Form-field state | Effect on the editor                                                                                        |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------------- |
| `id`             | Set as the editor wrapper's `id` (so `<label for="...">` association works)                                 |
| `error`          | Sets `aria-invalid="true"` and applies the error outline                                                    |
| `disabled`       | Combined with the editor's own `readonly` prop — `disabled                                                  |     | readonly`controls editability.`disabled` also dims the editor and blocks pointer events |
| `messageId`      | Set as `aria-describedby` so screen readers announce the form-field's error/hint when the editor is focused |

You can also pass these props directly without `CoarFormField` (`error`, `disabled`, `id`) — direct props win over the injected context.

## Text Color

Apply inline color to a selection. Click the **palette** button in the floating toolbar (or the sidebar item in fixed mode) to open the picker — pick a swatch from the 8-color palette or use the native browser color input for a custom hex value. The color persists to markdown as plain inline HTML so the document stays readable in any standard renderer:

```markdown
The quick <span style="color: #dc2626">red</span> fox.
```

**Demo — `markdown-editor/demos/MarkdownEditorTextColor.vue`**

```vue
<template>
  <ClientOnly>
    <div class="md-color-demo">
      <div class="md-color-demo__frame">
        <component :is="Editor" v-if="Editor" v-model="value" />
        <div v-else class="md-color-demo__loading">Loading editor…</div>
      </div>
      <div class="md-color-demo__viewer">
        <div class="md-color-demo__viewer-label">Rendered output (`@cocoar/vue-markdown`)</div>
        <component :is="Viewer" v-if="Viewer && doc" :doc="doc" />
      </div>
    </div>
    <details class="md-output">
      <summary>Raw markdown (v-model)</summary>
      <pre>{{ value }}</pre>
    </details>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, type Component } from 'vue';

const value = ref(`# Text color round-trip

Select some text and click the **palette** button in the floating toolbar.
Try a swatch, then the custom hex input, then re-select the colored text.

The wire format on disk is plain inline HTML:
<span style="color: #dc2626">red</span>,
<span style="color: #2563eb">blue</span>,
<span style="color: rgb(22, 163, 74)">green via rgb()</span>.

Anything outside the whitelist (other CSS properties, \`url(...)\`, \`var()\`)
is rejected by the sanitizer in both the editor and the viewer.
`);

const Editor = shallowRef<Component | null>(null);
const Viewer = shallowRef<Component | null>(null);
const parse = shallowRef<((md: string) => unknown) | null>(null);

const doc = computed(() => (parse.value ? parse.value(value.value) : null));

onMounted(async () => {
  const [editor, viewer, core] = await Promise.all([
    import('@cocoar/vue-markdown-editor'),
    import('@cocoar/vue-markdown'),
    import('@cocoar/vue-markdown-core'),
  ]);
  Editor.value = editor.CoarMarkdownEditor;
  Viewer.value = viewer.CoarMarkdown;
  parse.value = (md: string) => core.parse(md);
});
</script>

<style scoped>
.md-color-demo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--coar-spacing-m);
}

.md-color-demo__frame {
  height: 360px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.md-color-demo__loading {
  padding: 24px;
  text-align: center;
  color: var(--coar-text-neutral-tertiary);
  font-size: 13px;
}

.md-color-demo__viewer {
  height: 360px;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  overflow: auto;
  padding: var(--coar-spacing-m);
  background: var(--coar-background-neutral-primary);
}

.md-color-demo__viewer-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary);
  margin-bottom: var(--coar-spacing-s);
}

.md-output { margin-top: 12px; }
.md-output summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.md-output pre {
  margin-top: 8px;
  padding: 12px;
  background: var(--coar-background-neutral-secondary);
  border-radius: var(--coar-radius-xl);
  font-size: 12px;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
}

@media (max-width: 720px) {
  .md-color-demo {
    grid-template-columns: 1fr;
  }
}
</style>
```

The picker is rendered through the same overlay primitive (`menuPreset`) that powers menus, popovers, and sidebar flyouts: anchor-relative positioning, viewport flipping, scroll-reposition, plus outside-click and `Escape` dismissal — no bespoke layout or click-handling logic in the editor.

> **Info: Why a whitelist?**
>
> The viewer (`@cocoar/vue-markdown` and `@cocoar/vue-markdown-core`) and the editor share a single `sanitizeColor` helper that accepts only:
>
> - Hex (`#rgb`, `#rrggbb`, with optional alpha)
> - `rgb()` / `rgba()` and the modern space-separated form
> - `hsl()` / `hsla()` and the modern space-separated form
> - A small set of named CSS colors (`red`, `blue`, …, `transparent`, `currentcolor`)
>
> Anything else — `var(--token)`, `url(...)`, `expression(...)`, multi-declaration styles, foreign attributes — is rejected. A failed sanitization falls through to plain text in the viewer and keeps the surrounding content intact in the editor. There's no way for a hostile markdown payload to leak inline style beyond a single `color` declaration.
>
> The picker palette (`COAR_TEXT_COLOR_PALETTE`) is exported so consumers can mirror it in custom UI.

## Custom Embeds

Register your own Vue components against a `:::key{props}` directive and the
editor folds them into live, editable blocks (the viewer renders the same
component read-only). Pass an `embeds` registry and use the `cocoar` flavor:

```vue
<CoarMarkdownEditor
  v-model="value"
  flavor="cocoar"
  :embeds="embeds"
  :tools="tools"
  toolbar-mode="both"
/>
```

This is its own topic — see the dedicated **[Custom Embeds](./markdown-embeds.md)**
page for the registry shape, the editor `controller` contract, toolbar insert
placement, and a live demo.

## Editor ↔ Viewer Parity

`<CoarMarkdownEditor>` and `<CoarMarkdown>` (the viewer) read the **same shared stylesheet** (`@cocoar/vue-markdown/styles`) so a markdown document looks pixel-identical whether you're editing it or rendering it for display. The two render through different DOM shapes — the editor's PM-managed contenteditable emits bare `<li>` / `<td>` / `<blockquote>` nodes inside a `.ProseMirror` wrapper, while the viewer emits class-tagged elements (`.coar-markdown-list-item`, etc.) — and the shared stylesheet covers both via parallel `:where(…)` selectors:

| Concern         | Note                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vertical rhythm | Block margins apply to direct children of `.coar-markdown` (viewer) **and** `.coar-markdown .ProseMirror` (editor).                                                                                      |
| Typography      | Heading sizes, blockquote inset, list indentation, `<strong>` weight (700), inline-code color, link underline — all defined once.                                                                        |
| Tables          | Zebra alternation uses `:nth-child(<n> of :not([data-is-header]))` to handle Milkdown's `<tr data-is-header>`-inside-`<tbody>` shape and the viewer's classic `<thead>` / `<tbody>` split with one rule. |
| Task lists      | `<li data-item-type="task" data-checked="true">` in both panes; the visual checkbox is a `::before` pseudo-element (no native `<input>`). Completed items get the muted-color strikethrough.             |
| Cell padding    | `<p>` user-agent margin reset to `0` inside `<li>` / `<td>` / `<th>` — without the reset PM's auto-wrapped paragraph would add ~1em of vertical whitespace per row.                                      |

If you embed the editor next to a viewer pane (the playground's "viewer pane" toggle does exactly this), the two should render the same source identically. Differences narrow down to design tokens you can override globally:

| Variable                              | Default                               | Effect                                                                                        |
| ------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------- |
| `--coar-markdown-heading-block-start` | `var(--coar-spacing-xl, 2rem)`        | Extra space above every top-level heading. Lower for tighter docs, raise for more whitespace. |
| `--coar-markdown-space-2`             | `var(--coar-spacing-m, 1rem)`         | Default block-end margin. Drives paragraph / list / table / blockquote spacing.               |
| `--coar-markdown-link`                | `var(--coar-text-brand-primary)`      | Link color (also applied to inline code).                                                     |
| `--coar-markdown-border`              | `var(--coar-border-neutral-tertiary)` | Used by tables, blockquote, `<hr>`.                                                           |

## Toolbar layout (`tools`)

Pass a `tools` array to control which buttons the **sidebar** toolbar exposes and
in what order. When omitted, the default layout is used. **The array order IS the
toolbar order** — entries render top-to-bottom (or left-to-right) as listed.

```vue
<!-- Minimal subset, in the given order -->
<CoarMarkdownEditor
  v-model="value"
  :tools="['bold', 'italic', 'bulletList', 'orderedList', 'outdent', 'indent', 'clearFormatting']"
/>

<!-- All tools except tables -->
<script setup lang="ts">
import { COAR_MARKDOWN_EDITOR_ALL_TOOLS } from '@cocoar/vue-markdown-editor';
const tools = COAR_MARKDOWN_EDITOR_ALL_TOOLS.filter((t) => t !== 'table' && t !== 'tableOps');
</script>
<CoarMarkdownEditor v-model="value" :tools="tools" />
```

> **Warning: Order is now significant**
>
> Earlier, a flat `tools` array was an order-insensitive whitelist filtering a fixed
> sequence. It is now an **ordered layout**. If you relied on canonical ordering,
> list the tools in the order you want; the default (omit `tools`) is unchanged.

### Groups and custom items

An entry can also be a **flyout group** (a submenu) or a `'divider'`. A group
bundles any mix of built-in tools and [custom-embed](./markdown-embeds.md)
inserts (`embed:<key>`) behind one button:

```ts
import type { CoarMarkdownEditorToolEntry } from '@cocoar/vue-markdown-editor';

const tools: CoarMarkdownEditorToolEntry[] = [
  'bold',
  'italic',
  'headings',
  'divider',
  { flyout: ['table', 'image', 'embed:chart'], label: 'Insert', icon: 'plus' },
  'divider',
  'undo',
  'redo',
];
```

| Entry shape                                     | Meaning                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `'bold'` (a `CoarMarkdownEditorTool`)           | A built-in tool.                                                                            |
| `` `embed:chart` `` (a `` `embed:${string}` ``) | A registered custom embed's insert item — see [Custom Embeds](./markdown-embeds.md). |
| `{ flyout: ToolRef[], label?, icon? }`          | A flyout submenu containing any of the above.                                               |
| `'divider'`                                     | A separator.                                                                                |

### Tool identifiers

| Tool                                         | Description                                                             |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `bold` `italic` `strikethrough` `inlineCode` | Inline marks                                                            |
| `textColor`                                  | Text color picker — see [Text Color](#text-color)                       |
| `headings`                                   | Heading flyout (H1–H6 + paragraph)                                      |
| `bulletList` `orderedList` `taskList`        | List variants                                                           |
| `indent` `outdent`                           | List nesting controls                                                   |
| `blockquote` `horizontalRule`                | Block elements                                                          |
| `codeBlock` `table` `image`                  | Insert blocks (sidebar only)                                            |
| `tableOps`                                   | Insert/Delete row/col, shown contextually when cursor is inside a table |
| `clearFormatting`                            | Strip all marks + reset block to paragraph                              |
| `undo` `redo`                                | History                                                                 |

> **Info: Markdown-only formatting**
>
> Only formatting that round-trips through Markdown is exposed. There is intentionally **no underline, font-family, font-size, or alignment** — these have no Markdown representation and would silently break round-trip persistence. **Text color** is the one exception: it round-trips as plain inline HTML through a strict whitelist sanitizer (see [Text Color](#text-color)).
>
> When migrating from a richtext editor that exposed those tools, the closest Markdown-native substitutes are:
>
> | Richtext tool                            | Markdown equivalent                                  |
> | ---------------------------------------- | ---------------------------------------------------- |
> | Font size                                | `headings` — H1–H6 provide the typographic hierarchy |
> | Bold / italic                            | `bold` / `italic` (no change)                        |
> | Bulleted / numbered list                 | `bulletList` / `orderedList`                         |
> | Indent / outdent (in lists)              | `indent` / `outdent`                                 |
> | Clear / eraser                           | `clearFormatting`                                    |
> | Underline, color, alignment, font-family | _no equivalent — drop or accept embedded HTML_       |
>

## Props

| Prop              | Type                                                                 | Default          | Description                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`      | `string`                                                             | `''`             | Markdown content (use with `v-model`)                                                                                                                          |
| `readonly`        | `boolean`                                                            | `false`          | Disable editing (keeps the layout, suppresses the toolbar)                                                                                                     |
| `disabled`        | `boolean`                                                            | `false`          | Disabled state — non-interactive, dimmed. Auto-picked up from `CoarFormField`                                                                                  |
| `error`           | `boolean`                                                            | `false`          | Error state — adds outline + `aria-invalid`. Auto-picked up from `CoarFormField.error`                                                                         |
| `id`              | `string`                                                             | _(auto)_         | HTML id. Auto-generated if omitted; `CoarFormField`'s id takes precedence                                                                                      |
| `name`            | `string`                                                             | _undefined_      | Reflected as `data-name` for form-submission tooling                                                                                                           |
| `required`        | `boolean`                                                            | `false`          | Sets `aria-required="true"`                                                                                                                                    |
| `placeholder`     | `string`                                                             | `''`             | Markdown hint shown while the editor is empty. Overlay-only — never written to `modelValue`. See [Placeholder](#placeholder)                                   |
| `sourceToggle`    | `boolean`                                                            | `false`          | Show a Rendered ↔ Source toggle for editing the raw Markdown. See [Source view](#source-view-raw-markdown)                                                     |
| `toolbarMode`     | `'floating' \| 'fixed' \| 'both' \| 'external'`                      | `'floating'`     | Toolbar layout; `external` connects the editor to a shared `CoarMarkdownToolbar`                                                                               |
| `toolbarPosition` | `'left' \| 'right' \| 'top' \| 'bottom'`                             | `'left'`         | Toolbar edge when `toolbarMode` is `'fixed'` or `'both'`. `top`/`bottom` render a horizontal toolbar; flyouts open along the perpendicular axis.               |
| `tools`           | `CoarMarkdownEditorToolEntry[]`                                      | _default layout_ | Ordered toolbar layout (built-in ids, `embed:<key>` refs, `{ flyout }` groups, `'divider'`). See [Toolbar layout](#toolbar-layout-tools)                       |
| `flavor`          | `'commonmark' \| 'gfm' \| 'cocoar' \| { gfm?, textColor?, embeds? }` | `'cocoar'`       | Portability contract — hard-enforces which features can be authored. See [Flavors](#flavors-portability)                                                       |
| `embeds`          | `EmbedRegistry`                                                      | _undefined_      | Custom-embed registry (`:::key{props}` → your component). Requires the `embeds` capability (`cocoar` flavor). See [Custom Embeds](./markdown-embeds.md) |
| `uploadImage`     | `(file: File) => Promise<{ url: string; alt?: string }>`             | _undefined_      | Enables paste / drag-drop image upload. Returns the stored image's URL. See [Images](#images)                                                                  |
| `pickImage`       | `(ctx: ImagePickContext) => void`                                    | _undefined_      | Override the Insert Image button with your own asset picker. See [Custom image source](#custom-image-source-pickimage)                                         |

## Events

| Event               | Payload  | Description                                                                                                                              |
| ------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `update:modelValue` | `string` | Fired on every internal markdown change. The editor de-duplicates — if a parent echoes the value back unchanged, no second update fires. |

## Floating-Toolbar Contexts

The floating toolbar swaps its contents based on what's selected:

| Selection                | Toolbar                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Text outside a table     | Bold, Italic, Strikethrough, Inline Code, Headings flyout, Blockquote                |
| Text inside a table cell | Row insert above/below, Column insert left/right, Delete cell, plus Bold/Italic/Code |

Detection runs on the ProseMirror selection state via `editorViewCtx`. CellSelections are ProseMirror-internal and don't fire `selectionchange` — the column- and row-handle toolbars referenced in the architecture below are not wired up yet (see [TODO](#todo)).

## Architecture Notes

### Why Milkdown (not TipTap, not Crepe)

|              | Milkdown Kit                                                                      | TipTap                             | Milkdown Crepe                      |
| ------------ | --------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------- |
| Data format  | **Markdown-first** (lossless round-trip)                                          | JSON-first (lossy markdown export) | Markdown-first                      |
| Shared stack | Same as `@cocoar/vue-markdown-core`: unified@^11, remark-parse@^11, remark-gfm@^4 | No overlap                         | Same                                |
| Bundle       | ~137 KB gzip (Kit)                                                                | Similar                            | ~2 MB (CodeMirror, KaTeX, etc.)     |
| UI control   | Full — headless, own components                                                   | Full — headless                    | Limited — predefined Notion-like UI |
| License      | MIT                                                                               | MIT (core), paid (collab)          | MIT                                 |

The Kit approach gives full control over UI while sharing the remark pipeline with the existing `@cocoar/vue-markdown-core` parser and `<CoarMarkdown>` viewer.

### Why no `tableBlock` plugin

`@milkdown/components/table-block` provides edge-handle buttons, button-group popups, and drag-to-reorder, but:

- Clicking in a cell auto-selects all content (breaks normal editing)
- Button-group popup overlaps with the floating toolbar
- CellSelection is internal to ProseMirror — `window.getSelection()` returns `type: "None"`, so `selectionchange` doesn't fire and detection is unreliable
- Requires ~200 lines of CSS to style properly

Table operations are instead exposed via the floating toolbar (when the cursor is inside a cell) and the sidebar toolbar (always available in fixed mode). Custom edge-handles will be built when a stable design is settled.

## TODO

- [ ] Link insert/edit dialog
- [x] Image support (insert by URL, paste / drag-drop upload, custom `pickImage`)
- [x] Table create (size picker + `|CxR|`), column alignment, delete table
- [x] Hover edge-handles (row/column grips on all four edges → insert / delete menu)
- [ ] Task list checkbox rendering and toggling
- [ ] Use `computeOverlayCoordinates` for floating toolbar positioning instead of viewport clamping
- [ ] Slash commands for block insertions
- [ ] Block drag handle
- [ ] Code block syntax highlighting (Prism or Shiki)
