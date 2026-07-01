# Changelog

All notable changes to `@cocoar/vue-markdown-mermaid` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release. Opt-in Mermaid renderer for `@cocoar/vue-markdown`:
  - `mermaidFenceRenderers` — a `FenceRegistry` fragment that renders
    ` ```mermaid ` fenced code blocks as diagrams.
  - `CoarMermaidDiagram` — the renderer component (lazy Mermaid load,
    client-only rendering, `securityLevel: 'strict'`, error-with-source
    fallback for invalid diagrams).
  - `buildMermaidThemeVariables` / `readCssTokens` — Cocoar design tokens →
    Mermaid `themeVariables` bridge, so diagrams match the app theme.
