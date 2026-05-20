# Annotations

`CoarDocumentViewer` ships with a built-in annotation layer that supports four types — **marker** highlights, comment **notes**, free-hand **ink**, and **freetext** boxes. Annotations are **controlled**: the consumer owns the data, the viewer emits events, the consumer applies changes.

```ts
import {
  CoarDocumentViewer,
  type CoarPdfAnnotation,
  type CoarPdfAnnotationMode,
  type CoarPdfAnnotationCreatePayload,
  type CoarPdfAnnotationUpdatePayload,
} from '@cocoar/vue-document-viewer';
```

## Live demo

<preview path="./demos/AnnotationsDemo.vue" />

Pick a mode in the toolbar (marker / note / draw / text), then interact with the image. The consumer assigns `id` + `createdAt` on creation, merges patches on update, and removes on delete. Try **switch to Select**, then drag an existing annotation, or click the 3-dot menu in the right panel.

## Annotation types

Four discriminated-union types, all sharing a `BaseAnnotation` shape:

```ts
interface BaseAnnotation {
  id: string;
  type: 'marker' | 'comment' | 'ink' | 'freetext';
  pageIndex: number;       // 0-based
  color: string;           // CSS color
  createdAt: string;       // ISO timestamp
  createdBy?: string;      // Consumer-provided display string
  comment?: string;        // Every type may carry a side comment
}
```

### Marker (highlighter)

```ts
interface CoarPdfMarkerAnnotation extends BaseAnnotation {
  type: 'marker';
  strokes: CoarPdfPoint[][];  // SVG-style polyline list
  width: number;              // Stroke width in CSS px at zoom=1
}
```

Drawn like a felt-tip marker, rendered with `mix-blend-mode: multiply` so the underlying text reads through.

### Comment pin

```ts
interface CoarPdfCommentAnnotation extends BaseAnnotation {
  type: 'comment';
  anchor: CoarPdfPoint;       // Pin location in normalized page coords
  comment: string;            // REQUIRED for comment annotations
}
```

Drops a pin at the click point and opens a popover for the comment body. The comment text is mandatory — empty pins are never created.

### Ink (freehand)

```ts
interface CoarPdfInkAnnotation extends BaseAnnotation {
  type: 'ink';
  strokes: CoarPdfPoint[][];
  width: number;
}
```

Same wire shape as marker but rendered as opaque strokes (no blend mode, thinner default width).

### Freetext

```ts
interface CoarPdfFreetextAnnotation extends BaseAnnotation {
  type: 'freetext';
  rect: CoarPdfRect;          // Box geometry in normalized page coords
  text: string;               // The visible label
  fontSize: number;           // CSS px at zoom=1
}
```

User clicks to drop a text box; the textarea writes to `text` (not `comment`). Optional `comment` still works as a side note.

## Coordinate system

All coordinates are **page-relative and normalized to `[0..1]`**:

```ts
interface CoarPdfPoint { x: number; y: number; }
interface CoarPdfRect  { x: number; y: number; w: number; h: number; }
```

This means the same annotation renders correctly at any zoom level and rotation — the viewer multiplies by the current viewport at render time. Storage stays portable: an annotation drawn at 100 % zoom plays back identically at 250 %, on a different screen, or after a rotation.

## Lifecycle

The viewer never mutates the `annotations` array directly. Instead it emits three events that the consumer applies:

### Create

```ts
import { v4 as uuid } from 'uuid';

function onCreate(payload: CoarPdfAnnotationCreatePayload) {
  annotations.value = [
    ...annotations.value,
    {
      ...payload,
      id: uuid(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.displayName,
    } as CoarPdfAnnotation,
  ];
}
```

`CoarPdfAnnotationCreatePayload` is `CoarPdfAnnotation` with the consumer-owned fields stripped (`'id' | 'createdAt' | 'createdBy'`). The viewer fills in everything else — type, color, geometry, stroke data — based on the active mode and pointer input.

### Update

```ts
function onUpdate({ id, patch }: CoarPdfAnnotationUpdatePayload) {
  annotations.value = annotations.value.map((a) =>
    a.id === id ? ({ ...a, ...patch } as CoarPdfAnnotation) : a,
  );
}
```

Fired when the user edits an annotation through its popover (color, comment, freetext body) or drags it to a new position (anchor / rect / strokes). `patch` is a partial of the relevant annotation shape — apply with a plain spread.

### Delete

```ts
function onDelete(id: string) {
  annotations.value = annotations.value.filter((a) => a.id !== id);
}
```

Fired when the user picks "Delete" from the panel's 3-dot menu, or when the eraser tool removes the last stroke from a marker / ink annotation.

## Modes

```ts
type CoarPdfAnnotationMode =
  | 'view'        // Read-only — existing annotations clickable, no new ones
  | 'select'      // Existing annotations clickable AND draggable
  | 'eraser'      // Click a stroke on marker/ink to remove it
  | 'marker'      // Drawing
  | 'comment'     // Drawing — drops a pin
  | 'ink'         // Drawing
  | 'freetext';   // Drawing — drops a text box
```

Mode is two-way bound — the toolbar's mode buttons update it, but the consumer can also drive it from outside (e.g. a keyboard shortcut, a parent's "Start commenting" CTA):

```vue
<CoarDocumentViewer
  :source="src"
  v-model:annotation-mode="mode"
  :annotations="annotations"
/>
```

```ts
// Keyboard shortcut from anywhere
useEventListener(window, 'keydown', (e) => {
  if (e.key === 'm' && (e.ctrlKey || e.metaKey)) mode.value = 'marker';
});
```

## Color palette

The mode picker shows a color selector with seven defaults:

| Color | Hex |
|---|---|
| Yellow | `#fde68a` |
| Pink | `#fca5a5` |
| Green | `#86efac` |
| Blue | `#93c5fd` |
| Purple | `#c4b5fd` |
| Saturated yellow | `#facc15` |
| Hot pink | `#ec4899` |

Pass `:annotation-colors="[...]"` to override the entire palette. Each color is a CSS string — anything `rgb()`, `hsl()`, `#xxx`, `oklch()` etc. that the browser accepts works.

## Panel + filters

`:show-annotations-panel="true"` opens the right rail with:

- **Info section** at the top (source metadata — see [Overview](./)).
- **Annotation list** — every annotation, grouped by page or chronologically. Click an entry to select + scroll-to. 3-dot menu per entry: edit comment, change color, delete.
- **Filter chips** — toggle each type on/off (marker / note / ink / freetext).
- **Search input** — substring search over comments and freetext bodies.
- **Sort toggle** — By page / Chronological.

The list is read-only — every interaction goes through the same `annotation:update` / `annotation:delete` event pipeline as the in-page surface, so the consumer-owned state stays canonical.

## Worked example — collaborative review

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  CoarDocumentViewer,
  type CoarPdfAnnotation,
  type CoarPdfAnnotationMode,
  type CoarPdfAnnotationCreatePayload,
  type CoarPdfAnnotationUpdatePayload,
} from '@cocoar/vue-document-viewer';
import { pdfSource } from '@cocoar/vue-document-viewer/pdf';
import { v4 as uuid } from 'uuid';

const props = defineProps<{
  documentId: string;
  currentUser: { id: string; displayName: string };
}>();

const annotations = ref<CoarPdfAnnotation[]>([]);
const mode = ref<CoarPdfAnnotationMode>('view');
const source = computed(() =>
  pdfSource({ url: `/api/files/${props.documentId}/source.pdf`, withCredentials: true }),
);

// Initial load
onMounted(async () => {
  annotations.value = await api.listAnnotations(props.documentId);
});

async function onCreate(payload: CoarPdfAnnotationCreatePayload) {
  const next: CoarPdfAnnotation = {
    ...payload,
    id: uuid(),
    createdAt: new Date().toISOString(),
    createdBy: props.currentUser.displayName,
  } as CoarPdfAnnotation;
  // Optimistic insert; rollback on failure
  annotations.value = [...annotations.value, next];
  try { await api.createAnnotation(props.documentId, next); }
  catch (err) { annotations.value = annotations.value.filter(a => a.id !== next.id); throw err; }
}

async function onUpdate({ id, patch }: CoarPdfAnnotationUpdatePayload) {
  const before = annotations.value;
  annotations.value = annotations.value.map(a => a.id === id ? { ...a, ...patch } as CoarPdfAnnotation : a);
  try { await api.updateAnnotation(props.documentId, id, patch); }
  catch (err) { annotations.value = before; throw err; }
}

async function onDelete(id: string) {
  const before = annotations.value;
  annotations.value = annotations.value.filter(a => a.id !== id);
  try { await api.deleteAnnotation(props.documentId, id); }
  catch (err) { annotations.value = before; throw err; }
}
</script>

<template>
  <CoarDocumentViewer
    :source="source"
    v-model:annotation-mode="mode"
    :annotations="annotations"
    :show-annotations-panel="true"
    storage-key="`doc-${documentId}`"
    @annotation:create="onCreate"
    @annotation:update="onUpdate"
    @annotation:delete="onDelete"
  />
</template>
```

The controlled pattern makes optimistic updates + rollback trivial: snapshot `annotations.value`, apply locally, and revert on API failure.

## Persistence shape

Annotations are plain JSON — no `Date` objects, no class instances, no internal references. Store as-is:

```ts
// PostgreSQL JSONB column
CREATE TABLE annotations (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents,
  data JSONB NOT NULL                 -- one CoarPdfAnnotation
);
```

```ts
// MongoDB / Firestore — embed directly
{ documentId: "...", annotations: CoarPdfAnnotation[] }
```

Because coordinates are normalized, annotations migrate across documents only when the page geometry matches; they're fully portable across rendering environments (different screens, zoom levels, rotation).

## Tips

- **Always wrap `annotations` mutations in a fresh array** (`[...]`, `.map`, `.filter`) so Vue's reactivity sees the change.
- **Generate the id on create**, not before — the create event fires only after the user finishes the drawing gesture (releases the mouse / taps "Save"). Pre-creating ids causes orphan entries when the gesture is cancelled.
- **Touch interactions work the same as mouse** — drawing modes accept both. The viewer normalizes pointer events internally.
- **Eraser is destructive** — clicking a stroke on a marker/ink annotation deletes that stroke; deleting the last stroke fires `annotation:delete` for the whole annotation. There's no per-stroke undo built in; consumers wanting one should keep a history snapshot ring around their `annotations` array.
