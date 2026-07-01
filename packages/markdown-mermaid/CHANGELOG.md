# Changelog

All notable changes to `@cocoar/vue-markdown-mermaid` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial release. Thin adapter that registers `@cocoar/vue-mermaid` as a
  `mermaid` fenced-code-block renderer for `@cocoar/vue-markdown`:
  - `mermaidFenceRenderers` — a `FenceRegistry` fragment that renders
    ` ```mermaid ` fenced code blocks as diagrams.
  - `createMermaidFenceRenderers(options?)` — build a registry with options
    baked in (currently `{ zoomable }`), since the fence contract only passes
    `{ code, language }` to a component.

The diagram component, theming and zoom/pan now live in the standalone
`@cocoar/vue-mermaid` (no markdown dependency); this package is just the
markdown integration.
