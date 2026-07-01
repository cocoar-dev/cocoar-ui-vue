# Changelog

All notable changes to `@cocoar/vue-markdown-mermaid` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release. Opt-in Mermaid renderer for `@cocoar/vue-markdown`:
  - `mermaidFenceRenderers` — a `FenceRegistry` fragment that renders
    ` ```mermaid ` fenced code blocks as diagrams.
  - `createMermaidFenceRenderers(options?)` — build a registry with options
    baked in (currently `{ zoomable }`).
  - `CoarMermaidDiagram` — the renderer component (lazy Mermaid load,
    client-only rendering, `securityLevel: 'strict'`, error-with-source
    fallback for invalid diagrams). Waits for `document.fonts.ready` before
    rendering so text isn't clipped by pre-font-load box measurements.
  - **Zoom & pan** (`zoomable`): fixed-height viewport with +/−/⤢ controls,
    Ctrl/⌘+wheel zoom, drag-to-pan, double-click reset. Plain wheel/touch
    scrolling is left to the page (no scroll trap).
  - `buildMermaidThemeVariables` / `makeCssColorResolver` / `readCssTokens` —
    Cocoar design tokens → Mermaid `themeVariables` bridge (colors normalized
    to sRGB), so diagrams match the app theme.
