# Document Composer POC

Proof of concept for Markdown documents with versioned PageBuilder islands and
one shared Markdown toolbar.

```bash
pnpm --filter @cocoar/document-composer-poc dev
```

The demo has three deliberately separate authoring surfaces:

- **Template** edits the Markdown root. A `:::page{...}` directive is an atomic,
  version-pinned Page reference with Replace and Open Page actions.
- **Fill document** renders headings, Pages, and other template structure as
  read-only. Explicit `:::field{id=...}` slots at root level and Markdown value
  fields inside Pages remain editable; clearing a slot never removes its shell.
- **Pages** opens the PageBuilder at full size and publishes immutable versions.

`CoarMarkdownEditorGroup` coordinates the editors. `CoarMarkdownToolbar` is one
stable DOM host; focus switches its active controller and available tools. Page
insertion is intentionally available only in the Markdown root in this POC, so
Page → Markdown → Page recursion and circular references cannot be authored.
