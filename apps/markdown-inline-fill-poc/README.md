# Markdown Form POC

Interactive playground for the production `@cocoar/vue-markdown-form` package.
It deliberately has no PageBuilder or PageRenderer dependency; the existing
Document Composer POC remains separate.

```bash
pnpm --filter @cocoar/markdown-inline-fill-poc dev
```

The template uses two form extensions:

- `:field{id=name type=text}` inside Markdown text for inline values.
- `:::field{id=summary type=markdown}` for block Markdown values.

Values are stored separately from the template. Field controls are resolved
through the package's typed registry; the POC demonstrates the built-in text,
number, date/datetime, boolean, select and Markdown controls.
