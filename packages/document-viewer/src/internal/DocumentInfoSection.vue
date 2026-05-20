<script setup lang="ts">
/**
 * Collapsible source-info section, displayed at the top of the annotations
 * rail when the consumer opted into either. Pure presentation over the
 * `DocumentInfo` bag emitted by `useDocumentLoader` — no fetching, no async.
 *
 * The section header toggles visibility; default is expanded. Field rows
 * render only when their value is set, so a PDF without an Author field
 * doesn't show an empty `Author:` row.
 */
import { computed, ref } from 'vue';
import { CoarIcon } from '@cocoar/vue-ui';
import type { DocumentInfo } from '../source-types';
import type { CoarDocumentViewerLabels } from '../CoarDocumentViewer.vue';

const props = defineProps<{
  info: DocumentInfo | null;
  /**
   * Current page's intrinsic dimensions, used to render the per-page
   * "Page N: W × H" row. Null while no page is bound yet.
   */
  currentPage: { index: number; width: number; height: number } | null;
  labels: Required<CoarDocumentViewerLabels>;
}>();

const expanded = ref(true);

function toggle(): void {
  expanded.value = !expanded.value;
}

/**
 * Pick a per-page dimension unit label. PDF user units are points (1/72 in);
 * image pages are in natural pixels. The renderer doesn't expose this directly,
 * so we infer from the source kind.
 */
const dimUnit = computed(() => {
  const k = props.info?.kind;
  return k === 'pdf' ? 'pt' : 'px';
});

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

/**
 * Field rows — only present when a value is set. The pdf-block fields are
 * grouped (metadata / technical) so consumers see a visual separator
 * between authoring-side fields and pipeline-side fields.
 */
interface Row {
  label: string;
  value: string;
}

const sourceRows = computed<Row[]>(() => {
  const i = props.info;
  if (!i) return [];
  const rows: Row[] = [
    { label: props.labels.infoFormat, value: i.format },
    { label: props.labels.infoPages, value: String(i.pageCount) },
  ];
  if (props.currentPage) {
    const { index, width, height } = props.currentPage;
    rows.push({
      label: `${props.labels.infoPage} ${index + 1}`,
      value: `${Math.round(width)} × ${Math.round(height)} ${dimUnit.value}`,
    });
  }
  if (typeof i.bytes === 'number') {
    rows.push({ label: props.labels.infoSize, value: formatBytes(i.bytes) });
  }
  return rows;
});

const metadataRows = computed<Row[]>(() => {
  const pdf = props.info?.pdf;
  if (!pdf) return [];
  const rows: Row[] = [];
  if (pdf.title) rows.push({ label: props.labels.infoTitle, value: pdf.title });
  if (pdf.author) rows.push({ label: props.labels.infoAuthor, value: pdf.author });
  if (pdf.subject) rows.push({ label: props.labels.infoSubject, value: pdf.subject });
  if (pdf.keywords) rows.push({ label: props.labels.infoKeywords, value: pdf.keywords });
  return rows;
});

const technicalRows = computed<Row[]>(() => {
  const pdf = props.info?.pdf;
  if (!pdf) return [];
  const rows: Row[] = [];
  if (pdf.creator) rows.push({ label: props.labels.infoCreator, value: pdf.creator });
  if (pdf.producer) rows.push({ label: props.labels.infoProducer, value: pdf.producer });
  if (pdf.creationDate) rows.push({ label: props.labels.infoCreated, value: pdf.creationDate });
  if (pdf.modificationDate) rows.push({ label: props.labels.infoModified, value: pdf.modificationDate });
  if (pdf.version) rows.push({ label: props.labels.infoPdfVersion, value: pdf.version });
  return rows;
});
</script>

<template>
  <section
    v-if="info"
    class="coar-pdf-info"
    :class="{ 'coar-pdf-info--collapsed': !expanded }"
    :aria-label="labels.infoSection"
  >
    <button
      type="button"
      class="coar-pdf-info__header"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <CoarIcon :name="expanded ? 'chevron-down' : 'chevron-right'" size="xs" />
      <span class="coar-pdf-info__title">{{ labels.infoSection }}</span>
    </button>

    <div v-if="expanded" class="coar-pdf-info__body">
      <dl class="coar-pdf-info__rows">
        <template v-for="row in sourceRows" :key="row.label">
          <dt class="coar-pdf-info__dt">{{ row.label }}</dt>
          <dd class="coar-pdf-info__dd">{{ row.value }}</dd>
        </template>
      </dl>

      <template v-if="metadataRows.length > 0">
        <div class="coar-pdf-info__divider" role="separator" />
        <dl class="coar-pdf-info__rows">
          <template v-for="row in metadataRows" :key="row.label">
            <dt class="coar-pdf-info__dt">{{ row.label }}</dt>
            <dd class="coar-pdf-info__dd">{{ row.value }}</dd>
          </template>
        </dl>
      </template>

      <template v-if="technicalRows.length > 0">
        <div class="coar-pdf-info__divider" role="separator" />
        <dl class="coar-pdf-info__rows">
          <template v-for="row in technicalRows" :key="row.label">
            <dt class="coar-pdf-info__dt">{{ row.label }}</dt>
            <dd class="coar-pdf-info__dd">{{ row.value }}</dd>
          </template>
        </dl>
      </template>
    </div>
  </section>
</template>

<style scoped>
.coar-pdf-info {
  border-bottom: 1px solid var(--coar-color-divider, rgba(0, 0, 0, 0.08));
  background: var(--coar-color-surface, #ffffff);
}

.coar-pdf-info__header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
}
.coar-pdf-info__header:hover {
  background: var(--coar-color-surface-2, rgba(0, 0, 0, 0.03));
}
.coar-pdf-info__header:focus-visible {
  outline: 2px solid var(--coar-color-focus-ring, #2563eb);
  outline-offset: -2px;
}

.coar-pdf-info__title {
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-color-fg-2, #4b5563);
}

.coar-pdf-info__body {
  padding: 4px 12px 12px;
}

.coar-pdf-info__rows {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 12px;
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
}

.coar-pdf-info__dt {
  color: var(--coar-color-fg-3, #6b7280);
  margin: 0;
  white-space: nowrap;
}

.coar-pdf-info__dd {
  color: var(--coar-color-fg, #1a1a1a);
  margin: 0;
  /* Long values (PDF producers, keywords) — wrap rather than force the
     panel wider. `min-width: 0` is required for grid item to actually shrink. */
  min-width: 0;
  overflow-wrap: anywhere;
}

.coar-pdf-info__divider {
  height: 1px;
  background: var(--coar-color-divider, rgba(0, 0, 0, 0.06));
  margin: 10px 0;
}
</style>
