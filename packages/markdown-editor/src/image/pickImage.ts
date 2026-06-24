/**
 * Types for the `pickImage` extension hook.
 *
 * When a consumer passes a `pickImage` callback to `<CoarMarkdownEditor>`, the
 * toolbar's **Insert Image** button calls it instead of opening the built-in
 * URL dialog. The callback receives an {@link ImagePickContext} — an
 * `insertImage` function already bound to the editor's stored cursor position,
 * plus the text that was selected when the button was clicked (a sensible
 * default for `alt`). The consumer typically opens its own asset/gallery modal
 * and calls `ctx.insertImage(...)` for each chosen image.
 *
 * The editor keeps ownership of the actual insertion (cursor retention,
 * Markdown round-trip), so the consumer never touches ProseMirror.
 */

/** A Markdown image to insert: `![alt](url "title")`. */
export interface ImageDescriptor {
  url: string;
  alt?: string;
  title?: string;
}

export interface ImagePickContext {
  /**
   * Insert an image at the position the cursor was in when **Insert Image**
   * was clicked. Safe to call multiple times (e.g. when the user selects
   * several gallery images before closing the modal) — each call inserts at
   * the current cursor, which advances past the previous insertion.
   */
  insertImage: (image: ImageDescriptor) => void;
  /**
   * Text selected in the editor when the picker was invoked. Empty string if
   * the selection was collapsed. Useful as a default `alt` value.
   */
  selectedText: string;
}

/**
 * Consumer-supplied image picker. Invoked when the **Insert Image** toolbar
 * button is clicked (replacing the built-in URL dialog). Open your own UI,
 * then call `context.insertImage(...)`. There is no return value — insertion
 * happens through the context, so the picker can be async, stay open, and
 * insert more than once.
 */
export type ImagePicker = (context: ImagePickContext) => void;
