/**
 * `useTree` — public composable, sole entry point to the `TreeBuilder`.
 *
 * Mirrors `useCalendar` from `@cocoar/vue-calendar` so the two APIs feel
 * interchangeable. Use it whenever you want declarative context menus, the
 * fluent setter chain, or the imperative `api` (focus, readonly selected).
 *
 * @example
 * ```ts
 * import { useTree } from '@cocoar/vue-ui';
 *
 * interface FileNode { id: string; name: string; children?: FileNode[]; }
 *
 * const { builder, api } = useTree<FileNode>();
 *
 * builder
 *   .nodes(treeRef)
 *   .getId(n => n.id)
 *   .getChildren(n => n.children)
 *   .getLabel(n => n.name)
 *   .draggable(true)
 *   .acceptsFiles(true)
 *   .onActivate(n => openFile(n))
 *   .onNodeMove(moveNode)
 *   .onFilesDrop(({ files, target }) => upload(target?.id ?? null, files))
 *   .folderMenu(folder => [
 *     { label: 'Upload here', icon: 'upload', onClick: () => upload(folder.id) },
 *     { label: 'New subfolder', icon: 'plus', onClick: () => newFolder(folder.id) },
 *     'divider',
 *     { label: 'Delete', icon: 'trash-2', danger: true, onClick: () => del(folder) },
 *   ])
 *   .leafMenu(leaf => [
 *     { label: 'Open', icon: 'file', onClick: () => openFile(leaf) },
 *     { label: 'Delete', icon: 'trash-2', danger: true, onClick: () => del(leaf) },
 *   ])
 *   .viewportMenu(() => [
 *     { label: 'New folder', icon: 'plus', onClick: () => newFolder(null) },
 *   ]);
 * ```
 *
 * @example
 * ```html
 * <CoarTree :builder="builder">
 *   <template #default="{ node }">…</template>
 * </CoarTree>
 * ```
 */

import { TreeBuilder, type TreeApi } from './tree-builder';

export function useTree<T>(): {
  builder: TreeBuilder<T>;
  api: TreeApi<T>;
} {
  const builder = TreeBuilder.create<T>();
  return { builder, api: builder.api };
}
