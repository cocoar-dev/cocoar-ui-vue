/**
 * Paste & drag-drop image upload for the Markdown editor.
 *
 * A consumer supplies an async `uploadImage(file)` callback that stores the
 * file somewhere and returns its URL. This plugin wires that callback to the
 * editor's paste and drop events using the canonical ProseMirror
 * upload-placeholder recipe:
 *
 *   1. On paste/drop of one or more image files, insert a zero-width spinner
 *      *widget decoration* at the target position (so the user sees the upload
 *      is in flight without mutating the document).
 *   2. Call `uploadImage(file)`. The decoration is mapped through any edits the
 *      user makes meanwhile, so we always know where the placeholder ended up.
 *   3. On success, replace the placeholder range with a real `image` node
 *      (standard Markdown `![alt](url)`). On failure, remove the placeholder
 *      and surface the error.
 *
 * Without a callback the plugin is inert — image files fall through to the
 * browser's default handling (we never preventDefault), so normal text
 * drag-and-drop inside the editor is untouched.
 */
import { $prose } from '@milkdown/utils';
import { Plugin, PluginKey } from '@milkdown/prose/state';
import { Decoration, DecorationSet, type EditorView } from '@milkdown/prose/view';

/** Resolves to the stored image's URL (and optional alt text). */
export type ImageUploader = (file: File) => Promise<{ url: string; alt?: string }>;

export interface ImageUploadOptions {
  /** Read the current uploader lazily so a reactive prop can change at runtime. */
  getUploader: () => ImageUploader | undefined;
  /** Called when an upload rejects. Defaults to `console.error`. */
  onError?: (error: unknown, file: File) => void;
}

/** Unique token identifying one in-flight upload's placeholder decoration. */
type PlaceholderId = { readonly token: symbol };

type PlaceholderMeta =
  | { readonly type: 'add'; readonly id: PlaceholderId; readonly pos: number }
  | { readonly type: 'remove'; readonly id: PlaceholderId };

const placeholderKey = new PluginKey<DecorationSet>('coar-image-upload-placeholder');

function createPlaceholderWidget(): HTMLElement {
  const el = document.createElement('span');
  el.className = 'coar-md-image-uploading';
  el.setAttribute('aria-label', 'Uploading image…');
  el.setAttribute('role', 'img');
  return el;
}

/** Locate the live position of a placeholder, or `null` if it was removed. */
function findPlaceholderPos(view: EditorView, id: PlaceholderId): number | null {
  const set = placeholderKey.getState(view.state);
  if (!set) return null;
  const found = set.find(undefined, undefined, (spec) => (spec as { id?: PlaceholderId }).id === id);
  return found.length ? found[0]!.from : null;
}

/** Extract image files from a clipboard/drag data-transfer, if any. Exported
 *  for unit testing — the paste/drop handlers gate on its result. */
export function imageFilesFrom(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files).filter((f) => f.type.startsWith('image/'));
}

function startUpload(
  view: EditorView,
  file: File,
  pos: number,
  options: ImageUploadOptions,
): void {
  const uploader = options.getUploader();
  if (!uploader) return;

  const id: PlaceholderId = { token: Symbol('coar-image-upload') };

  // 1. Drop a spinner widget at the target position.
  view.dispatch(
    view.state.tr.setMeta(placeholderKey, { type: 'add', id, pos } satisfies PlaceholderMeta),
  );

  // 2. Upload, then swap the placeholder for the real image node.
  uploader(file)
    .then(({ url, alt }) => {
      const livePos = findPlaceholderPos(view, id);
      // The user may have removed the placeholder (e.g. undo) while uploading.
      if (livePos === null) return;

      const imageType = view.state.schema.nodes['image'];
      if (!imageType) return;

      const node = imageType.create({ src: url, alt: alt ?? file.name.replace(/\.[^.]+$/, '') });
      const tr = view.state.tr
        .replaceWith(livePos, livePos, node)
        .setMeta(placeholderKey, { type: 'remove', id } satisfies PlaceholderMeta);
      view.dispatch(tr);
    })
    .catch((error: unknown) => {
      // Remove the placeholder and report; the document is left untouched.
      if (findPlaceholderPos(view, id) !== null) {
        view.dispatch(view.state.tr.setMeta(placeholderKey, { type: 'remove', id } satisfies PlaceholderMeta));
      }
      (options.onError ?? ((e) => console.error('[CoarMarkdownEditor] image upload failed', e)))(error, file);
    });
}

export function imageUpload(options: ImageUploadOptions) {
  return $prose(
    () =>
      new Plugin<DecorationSet>({
        key: placeholderKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            // Map existing placeholders across the document change first.
            let next = set.map(tr.mapping, tr.doc);
            const meta = tr.getMeta(placeholderKey) as PlaceholderMeta | undefined;
            if (meta?.type === 'add') {
              const widget = Decoration.widget(meta.pos, createPlaceholderWidget(), { id: meta.id });
              next = next.add(tr.doc, [widget]);
            } else if (meta?.type === 'remove') {
              next = next.remove(
                next.find(undefined, undefined, (spec) => (spec as { id?: PlaceholderId }).id === meta.id),
              );
            }
            return next;
          },
        },
        props: {
          decorations(state) {
            return placeholderKey.getState(state);
          },
          handlePaste(view, event) {
            if (!options.getUploader()) return false;
            const files = imageFilesFrom(event.clipboardData);
            if (files.length === 0) return false;
            event.preventDefault();
            const pos = view.state.selection.from;
            files.forEach((file) => startUpload(view, file, pos, options));
            return true;
          },
          handleDrop(view, event, _slice, moved) {
            // `moved` = an internal node drag; leave ProseMirror to handle it.
            if (moved || !options.getUploader()) return false;
            const files = imageFilesFrom(event.dataTransfer);
            if (files.length === 0) return false;
            event.preventDefault();
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const pos = coords?.pos ?? view.state.selection.from;
            files.forEach((file) => startUpload(view, file, pos, options));
            return true;
          },
        },
      }),
  );
}
