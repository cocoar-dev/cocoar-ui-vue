<script setup lang="ts">
import type { MarkdownNode } from '@cocoar/vue-markdown-core';
import { CoarCodeBlock, CoarTable } from '@cocoar/vue-ui';
import MarkdownInlineNode from './MarkdownInlineNode.vue';
import {
  headingDepth,
  headingAnchor,
  codeBlockLanguage,
  isOrderedList,
  listStart,
  isTaskListItem,
  taskChecked,
  isTableColumnRightAligned,
  isTableColumnCenterAligned,
  unsupportedType,
} from './helpers';

defineProps<{
  nodes: readonly MarkdownNode[];
  /** The table node, passed down so cells can read column alignment. */
  tableNode?: MarkdownNode;
}>();
</script>

<template>
  <template v-for="node in nodes" :key="node.id">
    <!-- heading -->
    <component
      :is="'h' + headingDepth(node)"
      v-if="node.type === 'heading'"
      :id="headingAnchor(node) ?? undefined"
      class="coar-markdown-heading"
    >
      <MarkdownInlineNode :nodes="node.children ?? []" />
    </component>

    <!-- paragraph -->
    <p v-else-if="node.type === 'paragraph'" class="coar-markdown-paragraph">
      <MarkdownInlineNode :nodes="node.children ?? []" />
    </p>

    <!-- blockquote -->
    <blockquote v-else-if="node.type === 'blockquote'" class="coar-markdown-blockquote">
      <MarkdownBlockNode :nodes="node.children ?? []" />
    </blockquote>

    <!-- list -->
    <template v-else-if="node.type === 'list'">
      <ol
        v-if="isOrderedList(node)"
        class="coar-markdown-list coar-markdown-list--ordered"
        :start="listStart(node) ?? undefined"
      >
        <MarkdownBlockNode :nodes="node.children ?? []" />
      </ol>
      <ul v-else class="coar-markdown-list coar-markdown-list--unordered">
        <MarkdownBlockNode :nodes="node.children ?? []" />
      </ul>
    </template>

    <!-- listItem -->
    <li
      v-else-if="node.type === 'listItem'"
      class="coar-markdown-list-item"
      :class="{ 'coar-markdown-list-item--task': isTaskListItem(node) }"
    >
      <input
        v-if="isTaskListItem(node)"
        class="coar-markdown-task-checkbox"
        type="checkbox"
        :checked="taskChecked(node)"
        disabled
        aria-hidden="true"
        tabindex="-1"
      />
      <div class="coar-markdown-list-item-content">
        <MarkdownBlockNode :nodes="node.children ?? []" />
      </div>
    </li>

    <!-- codeBlock -->
    <CoarCodeBlock
      v-else-if="node.type === 'codeBlock'"
      class="coar-markdown-code-block"
      :code="node.text ?? ''"
      :language="codeBlockLanguage(node)"
      :collapsible="false"
      :show-copy="true"
    />

    <!-- thematicBreak -->
    <hr v-else-if="node.type === 'thematicBreak'" class="coar-markdown-hr" />

    <!-- table -->
    <CoarTable
      v-else-if="node.type === 'table'"
      variant="plain"
      hover
    >
      <template v-if="(node.children ?? []).length > 0">
        <thead>
          <tr>
            <th
              v-for="(cell, colIndex) in (node.children ?? [])[0]?.children ?? []"
              :key="cell.id"
              :class="{
                'text-right': isTableColumnRightAligned(node, colIndex),
                'text-center': isTableColumnCenterAligned(node, colIndex),
              }"
            >
              <MarkdownInlineNode :nodes="cell.children ?? []" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in (node.children ?? []).slice(1)" :key="row.id">
            <td
              v-for="(cell, colIndex) in row.children ?? []"
              :key="cell.id"
              :class="{
                'text-right': isTableColumnRightAligned(node, colIndex),
                'text-center': isTableColumnCenterAligned(node, colIndex),
              }"
            >
              <MarkdownInlineNode :nodes="cell.children ?? []" />
            </td>
          </tr>
        </tbody>
      </template>
    </CoarTable>

    <!-- tableRow (standalone fallback) -->
    <template v-else-if="node.type === 'tableRow'">
      <MarkdownBlockNode :nodes="node.children ?? []" />
    </template>

    <!-- tableCell (standalone fallback) -->
    <td v-else-if="node.type === 'tableCell'" class="coar-markdown-table-cell">
      <MarkdownInlineNode :nodes="node.children ?? []" />
    </td>

    <!-- unsupported / default -->
    <div v-else class="coar-markdown-unsupported">
      Unsupported markdown node: {{ unsupportedType(node) }}
    </div>
  </template>
</template>
