import type { InjectionKey, Ref, ShallowRef, VNodeChild } from 'vue';

export type MarkdownEditorGroupToolbarPosition = 'left' | 'right' | 'top' | 'bottom';

/** The editor-owned command/state adapter rendered by one stable toolbar host. */
export interface MarkdownEditorToolbarController {
  id: string;
  render(): VNodeChild;
}

/**
 * Runtime coordination shared by one external toolbar and every editor in its
 * scope. Each editor owns its Milkdown-bound commands/state; the group switches
 * the stable toolbar host to the controller of the focused editor.
 */
export interface MarkdownEditorGroupContext {
  position: Ref<MarkdownEditorGroupToolbarPosition>;
  activeId: Ref<string | null>;
  activeController: ShallowRef<MarkdownEditorToolbarController | null>;
  register(controller: MarkdownEditorToolbarController): () => void;
  activate(id: string): void;
  deactivate(id: string): void;
}

export const MARKDOWN_EDITOR_GROUP_KEY: InjectionKey<MarkdownEditorGroupContext> =
  Symbol.for('coar:markdown-editor-group') as InjectionKey<MarkdownEditorGroupContext>;
