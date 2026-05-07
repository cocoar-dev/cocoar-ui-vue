import type { RouteRecordRaw } from 'vue-router';
import type { RoutedOverlayFragment } from '@cocoar/vue-fragment-parser';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('./views/HomeView.vue'),
  },
  {
    path: '/flex-debug',
    component: () => import('./views/FlexDebugView.vue'),
  },
  {
    path: '/empty-to-first-row',
    component: () => import('./views/EmptyToFirstRowView.vue'),
  },
  {
    path: '/empty-tree-to-first-row',
    component: () => import('./views/EmptyTreeToFirstRowView.vue'),
  },
  {
    path: '/script-editor',
    component: () => import('./views/ScriptEditorView.vue'),
  },
  {
    path: '/constrained-editor',
    component: () => import('./views/ConstrainedEditorView.vue'),
  },
  {
    path: '/editor-in-modal',
    component: () => import('./views/ScriptEditorInModalView.vue'),
  },
  {
    path: '/overlay-stacking',
    component: () => import('./views/OverlayStackingView.vue'),
  },
  {
    path: '/markdown-editor',
    component: () => import('./views/MarkdownEditorView.vue'),
  },
  // ─── @cocoar/vue-calendar demos ────────────────────────────
  {
    path: '/calendar-basic',
    component: () => import('./views/CalendarBasicDemo.vue'),
  },
  {
    path: '/calendar-cross-zone',
    component: () => import('./views/CalendarCrossZoneDemo.vue'),
  },
  {
    path: '/calendar-events-loader',
    component: () => import('./views/CalendarEventsLoaderDemo.vue'),
  },
  {
    path: '/calendar-dst-policy',
    component: () => import('./views/CalendarDstPolicyDemo.vue'),
  },
  {
    path: '/calendar-wire-helpers',
    component: () => import('./views/CalendarWireHelpersDemo.vue'),
  },
  {
    path: '/calendar-standalone',
    component: () => import('./views/CalendarStandaloneDemo.vue'),
  },
  {
    path: '/calendar-shell',
    component: () => import('./views/CalendarShellDemo.vue'),
  },
  {
    path: '/calendar-perf-bench',
    component: () => import('./views/CalendarPerfBenchDemo.vue'),
  },
  {
    path: '/todos',
    component: () => import('./views/TodoListView.vue'),
    meta: {
      routedFragments: [
        {
          type: 'dialog',
          path: 'dialog/:todoId',
          component: () => import('./views/TodoDetailView.vue'),
          dialogOptions: { title: 'Todo Details', size: 'l' },
        },
        {
          type: 'modal',
          path: 'modal/:todoId',
          component: () => import('./views/TodoDetailModal.vue'),
        },
      ] satisfies RoutedOverlayFragment[],
    },
  },
];
