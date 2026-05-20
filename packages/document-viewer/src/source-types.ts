/**
 * Capability flags advertised by a `DocumentSource`. The toolbar reads
 * these to decide which tools to enable/disable — e.g. a single-page image
 * source sets `multiPage: false` so the prev/next/page-input buttons go
 * disabled rather than disappearing.
 *
 * Adding capabilities: name them after the *feature* (search, outline) not
 * the *file type*, so future sources can mix-and-match (e.g. a future OCR'd
 * image source could set `search: true`).
 */
export interface DocumentSourceCapabilities {
  /** True if the document has more than one page. Drives prev/next/page-input. */
  multiPage: boolean;
  /** True if pages expose selectable text. Drives Ctrl+C copy + the textLayer DOM. */
  textLayer: boolean;
  /** True if the source can be searched for substring matches. Drives search button. */
  search: boolean;
  /** True if the source exposes a navigable outline (table of contents). Drives outline tab. */
  outline: boolean;
  /** True if the source can be printed. Drives print button (some formats can't print sensibly). */
  print: boolean;
}

/**
 * Tagged union of supported document kinds. Consumers build a source via the
 * matching factory (`pdfSource()`, `imageSource()`, …) — they don't construct
 * the union members directly. The viewer dispatches internally on `kind`.
 *
 * This shape is intentionally opaque from the consumer's POV: implementation
 * fields beyond `kind` and `capabilities` are read by the viewer only.
 */
export type DocumentSource = PdfDocumentSource | ImageDocumentSource | ImageGalleryDocumentSource;

export interface PdfDocumentSource {
  readonly kind: 'pdf';
  readonly capabilities: DocumentSourceCapabilities;
  /** Source URL the pdfjs loader will fetch. */
  readonly url: string;
  /** Extra HTTP headers (e.g. `Authorization`). */
  readonly headers: Readonly<Record<string, string>>;
  /** Whether to send cookies / HTTP auth with the fetch. */
  readonly withCredentials: boolean;
}

export interface ImageDocumentSource {
  readonly kind: 'image';
  readonly capabilities: DocumentSourceCapabilities;
  /** Image URL — anything an `<img src>` can handle (JPG, PNG, SVG, WebP, …). */
  readonly url: string;
}

/**
 * Multiple images presented as the pages of a single document. Page count
 * is `urls.length`; each image gets its own intrinsic dimensions, so a
 * gallery can mix landscape + portrait pages without any extra rigging.
 */
export interface ImageGalleryDocumentSource {
  readonly kind: 'image-gallery';
  readonly capabilities: DocumentSourceCapabilities;
  /** Image URLs, one per page. Order in the array = order in the document. */
  readonly urls: readonly string[];
}

/**
 * Source-level metadata surfaced by the active adapter. The viewer's optional
 * Info panel reads these; consumers can also read them off the
 * `useDocumentLoader` return for their own UI (analytics, audit logs, etc).
 *
 * Every field except `kind`, `format`, and `pageCount` is optional — they're
 * only populated when the source has them. The `pdf` block applies only to
 * PDF sources (always absent for images).
 */
export interface DocumentInfo {
  /** Discriminator matching `DocumentSource.kind`. */
  readonly kind: DocumentSource['kind'];
  /**
   * Human-readable format string. Examples:
   *   - `"PDF · v1.7"`
   *   - `"Image · PNG"`
   *   - `"Image gallery · mixed"`
   */
  readonly format: string;
  /** Total page count. Always present; 1 for `imageSource`, `urls.length` for galleries, `doc.numPages` for PDFs. */
  readonly pageCount: number;
  /** File size in bytes when known. PDFs surface this via the pdfjs `contentLength`; image / gallery sources omit it. */
  readonly bytes?: number;
  /** PDF-only block — present iff `kind === 'pdf'`. Fields inside are individually optional. */
  readonly pdf?: PdfMetadata;
}

export interface PdfMetadata {
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly keywords?: string;
  /** Tool that authored the source content (e.g. `"TeX"`, `"Microsoft Word"`). */
  readonly creator?: string;
  /** Tool that produced the final PDF binary (e.g. `"pdfTeX-1.40.10"`). */
  readonly producer?: string;
  /** Human-readable ISO-ish creation date (`YYYY-MM-DD HH:mm:ss`) parsed from the PDF date string. */
  readonly creationDate?: string;
  readonly modificationDate?: string;
  /** PDF specification version (e.g. `"1.7"`). */
  readonly version?: string;
}
