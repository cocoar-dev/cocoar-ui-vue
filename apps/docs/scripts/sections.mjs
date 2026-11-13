// The pages of the docs that become the Agent Skill, in the order of the site's sidebar.
// Side-effect free: read by sync-skill.mjs and by the site's data loader
// (.vitepress/theme/devices.data.ts), which groups the device table the same way.

// Mirrors the site's sidebar (apps/docs/.vitepress/config.ts). Listing pages explicitly is
// deliberate: a docs page that is neither here nor in EXCLUDED fails the run, so a new page
// cannot silently stay out of the skill.
export const SECTIONS = [
  {
    title: 'Guide',
    pages: [
      'guide/getting-started.md',
      'guide/error-handling.md',
      'guide/theming.md',
      'guide/mobile.md',
      'guide/migration.md',
      'guide/migration-page-builder-3.md',
    ],
  },
  {
    title: 'Foundations',
    pages: [
      'foundations/design-principles.md',
      'foundations/colors.md',
      'foundations/typography.md',
      'foundations/spacing.md',
      'foundations/icons.md',
      'foundations/motion.md',
      'foundations/theming.md',
    ],
  },
  {
    title: 'Localization (@cocoar/vue-localization)',
    pages: [
      'foundations/localization/setup.md',
      'foundations/localization/formatting.md',
      'foundations/localization/translations.md',
      'foundations/localization/timezones.md',
    ],
  },
  {
    title: 'Form controls',
    pages: [
      'components/button.md',
      'components/form-field.md',
      'components/text-input.md',
      'components/number-input.md',
      'components/password-input.md',
      'components/otp-input.md',
      'components/select.md',
      'components/listbox.md',
      'components/dual-listbox.md',
      'components/checkbox.md',
      'components/checkbox-group.md',
      'components/radio-group.md',
      'components/switch.md',
      'components/segmented-control.md',
      'components/date-picker.md',
      'components/date-time-picker.md',
      'components/zoned-date-time-picker.md',
      'components/date-or-time-picker.md',
      'components/date-views.md',
    ],
  },
  {
    title: 'Display',
    pages: [
      'components/avatar.md',
      'components/badge.md',
      'components/card.md',
      'components/code-block.md',
      'components/data-list.md',
      'components/divider.md',
      'components/link.md',
      'components/note.md',
      'components/notice.md',
      'components/progress-bar.md',
      'components/spinner.md',
      'components/table.md',
      'components/tag.md',
    ],
  },
  {
    title: 'Navigation',
    pages: [
      'components/menu.md',
      'components/context-menu.md',
      'components/sidebar.md',
      'components/navbar.md',
      'components/tabs.md',
      'components/tree.md',
      'components/breadcrumb.md',
      'components/pagination.md',
    ],
  },
  {
    title: 'Layout',
    pages: ['components/panel-layout.md', 'components/wizard.md'],
  },
  {
    title: 'Overlay',
    pages: [
      'components/dialog.md',
      'components/popover.md',
      'components/popconfirm.md',
      'components/toast.md',
      'components/tooltip.md',
    ],
  },
  {
    title: 'Utilities',
    pages: [
      'components/transitions.md',
      'components/virtual-list.md',
      'components/drag-drop.md',
      'components/fragment-parser.md',
    ],
  },
  {
    title: 'Content (@cocoar/vue-markdown, -editor, -form, -mermaid, @cocoar/vue-script-editor)',
    pages: [
      'components/markdown.md',
      'components/markdown-editor.md',
      'components/markdown-form.md',
      'components/markdown-embeds.md',
      'components/markdown-diagrams.md',
      'components/mermaid.md',
      'components/script-editor.md',
    ],
  },
  {
    title: 'Data Grid (@cocoar/vue-data-grid)',
    pages: [
      'components/data-grid.md',
      'components/data-grid/editing.md',
      'components/data-grid/text.md',
      'components/data-grid/number.md',
      'components/data-grid/select.md',
      'components/data-grid/multi-select.md',
      'components/data-grid/date-columns.md',
      'components/data-grid/checkbox.md',
    ],
  },
  {
    title: 'Page Builder (@cocoar/vue-page-builder)',
    pages: [
      'components/page-builder/index.md',
      'components/page-builder/coar-page-builder.md',
      'components/page-builder/coar-page-renderer.md',
      'components/page-builder/authoring-contract.md',
      'components/page-builder/custom-elements.md',
      'components/page-builder/idp-integration.md',
    ],
  },
  {
    title: 'Document Viewer (@cocoar/vue-document-viewer)',
    pages: [
      'components/document-viewer/index.md',
      'components/document-viewer/coar-document-viewer.md',
      'components/document-viewer/toolbar.md',
      'components/document-viewer/annotations.md',
    ],
  },
  {
    title: 'Map (@cocoar/vue-map)',
    pages: ['components/map/index.md', 'components/map/editor.md'],
  },
  {
    title: 'File Explorer (@cocoar/vue-file-explorer-core)',
    pages: [
      'components/file-explorer/index.md',
      'components/file-explorer/use-file-explorer.md',
      'components/file-explorer/asset-store.md',
      'components/file-explorer/in-memory-store.md',
    ],
  },
  {
    title: 'Calendar (@cocoar/vue-calendar)',
    pages: [
      'components/calendar/index.md',
      'components/calendar/coar-calendar.md',
      'components/calendar/year-view.md',
      'components/calendar/month-view.md',
      'components/calendar/day-view.md',
      'components/calendar/week-view.md',
      'components/calendar/work-week-view.md',
      'components/calendar/time-selection.md',
      'components/calendar/agenda-view.md',
      'components/calendar/timeline-view.md',
      'components/calendar/performance.md',
    ],
  },
];

// Pages that exist for the site, not for an agent working with the library: the landing page,
// the changelog (an include of CHANGELOG.md, which ships with the package anyway) and the
// kitchen sink (a visual comparison page with no prose).
export const EXCLUDED = new Set(['index.md', 'guide/changelog.md', 'foundations/kitchen-sink.md']);
