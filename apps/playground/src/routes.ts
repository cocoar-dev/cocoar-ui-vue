import type { RouteRecordRaw } from 'vue-router';
import type { RoutedOverlayFragment } from '@cocoar/vue-fragment-parser';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('./views/HomeView.vue'),
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
