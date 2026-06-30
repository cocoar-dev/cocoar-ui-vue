/**
 * Custom-embed registry for the markdown stack.
 *
 * A `:::key{props}` directive in the source parses (in `markdown-core`) to a
 * generic `embed` node `{ key, props }`. This registry is the **open** lookup
 * that maps a `key` to a consumer-provided Vue component — the meeting point
 * that lets apps drop their own rich components into markdown without the
 * markdown packages ever depending on those components.
 *
 * The registry holds plain objects; storing a component creates no extra Vue
 * coupling. It lives here, in the shared Vue package both the viewer
 * (`@cocoar/vue-markdown`) and the editor (`@cocoar/vue-markdown-editor`)
 * already depend on, so a single registration drives both.
 *
 * Resolution: an explicit `registry` prop on {@link EmbedRenderer} wins, else
 * the injected {@link MARKDOWN_EMBEDS_KEY} value (set by `<CoarMarkdown>`'s
 * `embeds` prop or an app-wide `app.provide`).
 */
import {
  defineComponent,
  h,
  inject,
  type Component,
  type InjectionKey,
  type PropType,
} from 'vue';
import { toEmbedProps } from '@cocoar/vue-markdown-core';

/**
 * Insert affordance for an embed (future toolbar / slash-command entry). Data +
 * callbacks only — deliberately free of Milkdown/ProseMirror types so this
 * contract can live in the shared viewer package the editor also consumes.
 */
export interface EmbedInsertIntegration {
  /** Label for an insert menu / toolbar entry. */
  label?: string;
  /** Optional icon (name or emoji) for the insert affordance. */
  icon?: string;
  /**
   * Produce the attributes for a NEW embed of this key — e.g. open a picker.
   * Resolve `null` to cancel. When omitted, the editor inserts a bare `:::key`.
   */
  pick?: () => Promise<Record<string, string> | null> | Record<string, string> | null;
}

/**
 * The write-back channel handed to an embed's **editor** component. This is the
 * whole point of an editor (vs. the read-only viewer): it can change the
 * directive attributes, and those changes round-trip into the `:::key{props}`
 * markdown. There is no other way to mutate an embed — the viewer can't, because
 * it renders an immutable parsed document.
 *
 * `T` lets a specific embed type its own attribute bag (e.g.
 * `EmbedEditorController<{ id: string; zoom: string }>`).
 */
export interface EmbedEditorController<T extends Record<string, string> = Record<string, string>> {
  /** Current directive attributes (re-supplied whenever the node changes). */
  readonly props: Readonly<T>;
  /** Replace the whole attribute bag — writes back to the markdown. */
  update(next: T): void;
  /** Merge a partial patch over the current attributes (the common case). */
  patch(partial: Partial<T>): void;
}

/**
 * Props an embed editor component receives — a SINGLE typed `controller`, no
 * magic `v-model` emit string. Type your editor with it:
 * `defineProps<EmbedEditorProps>()` (or `EmbedEditorProps<MyAttrs>`), then call
 * `controller.patch({ ... })` / `controller.update({ ... })` to write back.
 */
export interface EmbedEditorProps<T extends Record<string, string> = Record<string, string>> {
  controller: EmbedEditorController<T>;
}

/** One registry entry: a required read-only viewer + optional editable editor. */
export interface EmbedDefinition {
  /** Read-only render for this key — used by the viewer AND as the editor's
   *  fallback when no editable `editor` component is supplied. */
  viewer: Component;
  /**
   * Editable variant mounted inside the editor NodeView. Receives a single
   * {@link EmbedEditorProps} `controller` prop and writes attribute changes back
   * through it. When omitted, the editor shows the read-only `viewer` instead.
   *
   * Typed `Component<EmbedEditorProps>` as a best-effort hint — Vue can't fully
   * enforce a registered component's prop shape at this boundary, but the
   * controller makes the write contract explicit and impossible to mis-name.
   */
  editor?: Component<EmbedEditorProps>;
  /** Optional insert affordance (toolbar / slash) — not yet wired. */
  insert?: EmbedInsertIntegration;
}

/** Map of embed `key` (the bit after `:::`) → its definition. */
export type EmbedRegistry = Record<string, EmbedDefinition>;

/** Vue inject key. Set via `<CoarMarkdown :embeds>` or `app.provide`. */
export const MARKDOWN_EMBEDS_KEY: InjectionKey<EmbedRegistry> = Symbol.for(
  'coar:markdown-embeds',
);

/** Look up a definition, tolerating an undefined registry. */
export function resolveEmbed(
  registry: EmbedRegistry | undefined,
  key: string,
): EmbedDefinition | undefined {
  return registry ? registry[key] : undefined;
}

/**
 * Renders one embed: resolves the registry (explicit prop > injected), looks up
 * the key, and renders the registered component with the directive props spread
 * straight through. An unregistered key degrades to a labelled placeholder
 * instead of vanishing — the author still sees that an embed is there.
 *
 * Shared by the viewer's `DefaultEmbed` node renderer (registry via inject) and
 * the editor's NodeView (registry passed explicitly, since a manually-mounted
 * NodeView doesn't inherit component-level provides).
 */
export const EmbedRenderer = defineComponent({
  name: 'CoarMarkdownEmbed',
  props: {
    embedKey: { type: String, required: true },
    embedProps: {
      type: Object as PropType<Record<string, string>>,
      default: () => ({}),
    },
    /** Explicit registry — wins over the injected one. */
    registry: { type: Object as PropType<EmbedRegistry>, default: undefined },
  },
  setup(props) {
    const injected = inject(MARKDOWN_EMBEDS_KEY, undefined);
    return () => {
      const registry = props.registry ?? injected;
      const def = resolveEmbed(registry, props.embedKey);

      if (!def) {
        return h(
          'div',
          {
            class: 'coar-markdown-embed coar-markdown-embed--unknown',
            'data-embed-key': props.embedKey,
          },
          [
            h('span', { class: 'coar-markdown-embed__icon' }, '🧩'),
            h(
              'span',
              { class: 'coar-markdown-embed__label' },
              `Unknown embed: :::${props.embedKey}`,
            ),
          ],
        );
      }

      return h(
        'div',
        { class: 'coar-markdown-embed', 'data-embed-key': props.embedKey },
        [h(def.viewer, { ...props.embedProps })],
      );
    };
  },
});

/** Re-export the core coercion helper so renderers needn't import core directly. */
export { toEmbedProps };
