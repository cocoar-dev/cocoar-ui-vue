<template>
  <div style="height: 420px;">
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { ref, defineComponent, h } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';
import { CoarBadge, CoarTag, CoarIcon } from '@cocoar/vue-ui';

interface Message {
  id: number;
  subject: string;
  sender: string;
  starred: boolean;
  unread: number;
  isCritical: boolean;
  awaitingFeedback: boolean;
  priority: 'low' | 'normal' | 'high';
}

const rows = ref<Message[]>([
  { id: 1, subject: 'Q4 budget review',          sender: 'Alice', starred: true,  unread: 3,  isCritical: true,  awaitingFeedback: false, priority: 'high'   },
  { id: 2, subject: 'Design handoff — checkout', sender: 'Bob',   starred: false, unread: 0,  isCritical: false, awaitingFeedback: true,  priority: 'normal' },
  { id: 3, subject: 'Release notes draft',       sender: 'Carol', starred: false, unread: 12, isCritical: false, awaitingFeedback: false, priority: 'low'    },
  { id: 4, subject: 'Offsite logistics',         sender: 'David', starred: true,  unread: 1,  isCritical: true,  awaitingFeedback: true,  priority: 'high'   },
  { id: 5, subject: 'Customer escalation #42',   sender: 'Eve',   starred: false, unread: 0,  isCritical: false, awaitingFeedback: false, priority: 'normal' },
]);

function toggleStar(row: Message): void {
  const target = rows.value.find((r) => r.id === row.id);
  if (target) target.starred = !target.starred;
}

// A single Vue component that receives the whole row and decides internally
// whether to render an icon, a tag, or nothing — demonstrates the implicit `row` prop.
const PriorityIndicator = defineComponent({
  props: { row: { type: Object as () => Message, required: true } },
  setup(props) {
    return () => {
      if (props.row.priority === 'high') {
        return h(CoarTag, { variant: 'error', size: 's' }, () => 'HIGH');
      }
      if (props.row.priority === 'low') {
        return h(CoarIcon, { name: 'arrow-down', source: 'coar-builtin', size: 's', color: '#9ca3af' });
      }
      return null; // 'normal' — render nothing
    };
  },
});

const builder = CoarGridBuilder.create<Message>()
  .columns([
    // Wrapper with a single left item (star toggle) and a single right item (badge).
    // Subject is editable — double-click opens the editor. Slots disappear automatically
    // in edit mode because AG Grid swaps the whole cellRenderer for the cellEditor.
    (col) => col
      .wrap(col.field('subject').header('Subject').flex(1).sortable().option('editable', true))
      .left({
        icon: 'star',
        source: 'coar-builtin',
        color: (r) => (r.starred ? '#f5a623' : '#cbd5e1'),
        tooltip: (r) => (r.starred ? 'Unstar' : 'Star'),
        onClick: (r) => toggleStar(r),
      })
      .right({
        component: CoarBadge,
        params: (r) => ({ content: String(r.unread) }),
        show: (r) => r.unread > 0,
      }),

    (col) => col.field('sender').header('From').width(130).sortable(),

    // Wrapper with TWO right-side icons + a component that decides what to render
    // based on the full row. Each item has its own show() gate.
    (col) => col
      .wrap(col.field('priority').header('Priority').width(200).sortable())
      .right([
        // 1) Critical-flag icon — only visible when isCritical = true
        {
          icon: 'circle-alert',
          source: 'coar-builtin',
          color: '#dc2626',
          tooltip: 'Critical',
          show: (r) => r.isCritical,
        },
        // 2) Awaiting-feedback icon — only visible when awaitingFeedback = true
        {
          icon: 'message-circle',
          source: 'coar-builtin',
          color: '#3b82f6',
          tooltip: 'Awaiting feedback',
          show: (r) => r.awaitingFeedback,
        },
        // 3) A component that receives the whole row and renders tag OR icon OR nothing
        { component: PriorityIndicator },
      ]),
  ])
  .rowDataRef(rows)
  .rowId((params) => String(params.data.id));
</script>
