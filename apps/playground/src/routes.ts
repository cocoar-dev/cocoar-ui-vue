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
  {
    path: '/calendar-virtual-surface',
    component: () => import('./views/CalendarVirtualSurfaceView.vue'),
  },
  {
    path: '/calendar-virtual-surface-variable',
    component: () => import('./views/CalendarVirtualSurfaceVariableView.vue'),
  },
  {
    path: '/calendar-virtual-surface-2d',
    component: () => import('./views/CalendarVirtualSurface2DView.vue'),
  },
  {
    path: '/calendar-rrule-bakeoff',
    component: () => import('./views/CalendarRRuleBakeoffView.vue'),
  },
  {
    path: '/calendar-overlap-layout',
    component: () => import('./views/CalendarOverlapLayoutView.vue'),
  },
  {
    path: '/calendar-drag',
    component: () => import('./views/CalendarDragView.vue'),
  },
  {
    path: '/calendar-recurrence-worker',
    component: () => import('./views/CalendarRecurrenceWorkerBenchView.vue'),
  },
  {
    path: '/calendar-day-view',
    component: () => import('./views/CalendarDayViewDemo.vue'),
  },
  {
    path: '/calendar-week-view',
    component: () => import('./views/CalendarWeekViewDemo.vue'),
  },
  {
    path: '/calendar-month-view',
    component: () => import('./views/CalendarMonthViewDemo.vue'),
  },
  {
    path: '/calendar-agenda-view',
    component: () => import('./views/CalendarAgendaViewDemo.vue'),
  },
  {
    path: '/calendar-shell',
    component: () => import('./views/CalendarShellDemo.vue'),
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
