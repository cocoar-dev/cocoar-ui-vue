# Changelog

All notable changes to `@cocoar/vue-mermaid` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 2.14.0

### Added

- Initial release. Standalone Mermaid diagram component, split out of
  `@cocoar/vue-markdown-mermaid` so it can be used anywhere, with no markdown
  dependency:
  - `CoarMermaidDiagram` — renders a diagram from a `code` string. Lazy Mermaid
    load, client-only, `securityLevel: 'strict'`, waits for `document.fonts.ready`
    (so labels aren't clipped by pre-font-load box measurements), and an
    error-with-source fallback for invalid diagrams.
  - **Zoom & pan** (`zoomable`): fixed-height viewport with +/−/⤢ controls,
    Ctrl/⌘+wheel zoom, drag-to-pan, double-click reset. Plain wheel/touch
    scrolling is left to the page (no scroll trap). `--coar-mermaid-height`
    sets the viewport height.
  - `buildMermaidThemeVariables` / `makeCssColorResolver` / `readCssTokens` —
    Cocoar design tokens → Mermaid `themeVariables` bridge (colors normalized
    to sRGB), so diagrams match the app theme.
