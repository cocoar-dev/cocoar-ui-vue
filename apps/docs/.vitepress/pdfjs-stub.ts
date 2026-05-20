/**
 * SSR-safe pdfjs-dist stub for the docs site.
 *
 * pdfjs-dist references browser-only globals (`DOMMatrix`, `Path2D`, …) at
 * module evaluation time, which makes it explode during VitePress's SSR pass.
 * None of the docs demos actually render a PDF (the live PDF demo lives in
 * the playground at `localhost:5188/pdf-viewer`), so pdfjs is imported by the
 * adapter modules but never called.
 *
 * Replacing the import target with this stub at the docs vite config level
 * keeps the dependency graph happy without forcing the document-viewer
 * package itself to make pdfjs lazy.
 *
 * If a docs demo ever needs to render a real PDF, remove this alias and
 * either wrap the demo in `<ClientOnly>` *and* lazy-import the adapter, or
 * make pdfjs a true runtime peer.
 */

export class TextLayer {
  constructor() {}
  render() { return Promise.resolve(); }
  cancel() {}
}

export const GlobalWorkerOptions: { workerPort: unknown } = { workerPort: null };

export function getDocument(): never {
  throw new Error(
    '[docs pdfjs-stub] PDF rendering is not available in the docs preview — see the playground at http://localhost:5188/pdf-viewer for the live PDF demo.',
  );
}

// pdf-adapter / page-provider import these as TYPES only at compile time;
// at runtime they are never instantiated. Export `null` to satisfy import resolution.
export const PDFDocumentProxy = null as unknown;
export const PDFPageProxy = null as unknown;
