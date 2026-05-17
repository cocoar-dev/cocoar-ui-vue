/// <reference types="vite/client" />

// Vite ?raw query — imports a file's source as a string.
// Used by SFC-source regression tests (e.g. CoarOverlayOutlet.test.ts) to pin
// CSS declarations without needing @types/node for fs/path/url.
//
// The triple-slash reference above also pulls in `ImportMetaEnv` typings so
// `import.meta.env.DEV` (used by `_internal/use-router-link.ts` to gate the
// DEV-only warn) type-checks correctly.
declare module '*?raw' {
  const content: string;
  export default content;
}
