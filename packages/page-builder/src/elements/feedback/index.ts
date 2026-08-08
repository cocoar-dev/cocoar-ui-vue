import type { FeedbackNode } from '../../schema'
import { definePageElement } from '../registry'
import FeedbackRenderer from './FeedbackRenderer.vue'
import FeedbackPreview from './FeedbackPreview.vue'
import FeedbackInspector from './FeedbackInspector.vue'

export const feedbackElement = definePageElement<FeedbackNode['props']>({
  renderer: FeedbackRenderer,
  builder: {
    label: { key: 'coar.pageBuilder.type.feedback', fallback: 'Feedback zone' },
    icon: 'message-square-warning',
    defaults: () => ({ kind: 'form-error', text: '' }),
    preview: FeedbackPreview,
    inspector: FeedbackInspector,
    inspectorTitle: { key: 'coar.pageBuilder.props.section.feedback', fallback: 'Feedback zone' },
  },
})
