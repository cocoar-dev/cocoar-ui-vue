import { reactive, ref } from 'vue';
import type { ActionValues, PageNode } from '@cocoar/vue-page-builder';

export interface PageVersion {
  version: string
  schema: PageNode
  publishedAt: string
}

export interface PageRecord {
  id: string
  name: string
  description: string
  canvasHeight: number
  versions: PageVersion[]
  draft: PageNode
}

export interface PageReference {
  id: string
  page: string
  version: string
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const meetingCanvas: PageNode = {
  id: 'meeting-root',
  type: 'page',
  schemaVersion: 6,
  style: { gap: '18px', padding: '22px', overflow: 'auto' },
  children: [
    {
      id: 'meeting-intro',
      type: 'stack',
      name: 'meetingIntro',
      props: {},
      style: { gap: '5px' },
      children: [
        { id: 'meeting-title', type: 'heading', name: 'meetingTitle', props: { text: 'Arbeitsfläche', level: 2 } },
        {
          id: 'meeting-intro-field',
          type: 'cocoar-markdown-field',
          name: 'meetingIntroText',
          props: { placeholder: 'Einleitung zur Arbeitsfläche ergänzen …' },
          style: { height: '105px', minWidth: '0' },
        },
      ],
    },
    {
      id: 'meeting-columns',
      type: 'stack',
      name: 'meetingColumns',
      props: { direction: 'row' },
      style: { gap: '16px', align: 'stretch', wrap: true },
      children: [
        {
          id: 'review-card',
          type: 'card',
          name: 'reviewCard',
          props: {},
          style: { size: 'fill', minWidth: '260px', gap: '10px', padding: '16px', surface: 'subtle' },
          children: [
            { id: 'review-heading', type: 'heading', name: 'reviewHeading', props: { text: 'Rückblick', level: 3 } },
            {
              id: 'review-field',
              type: 'cocoar-markdown-field',
              name: 'review',
              props: { placeholder: 'Was ist seit dem letzten Termin passiert?' },
              style: { height: '170px', minWidth: '0' },
            },
          ],
        },
        {
          id: 'topics-card',
          type: 'card',
          name: 'topicsCard',
          props: {},
          style: { size: 'fill', minWidth: '260px', gap: '10px', padding: '16px', surface: 'subtle' },
          children: [
            { id: 'topics-heading', type: 'heading', name: 'topicsHeading', props: { text: 'Aktuelle Themen', level: 3 } },
            {
              id: 'topics-field',
              type: 'cocoar-markdown-field',
              name: 'topics',
              props: { placeholder: 'Themen, Fragen und Diskussionspunkte …' },
              style: { height: '170px', minWidth: '0' },
            },
          ],
        },
      ],
    },
    { id: 'actions-divider', type: 'divider', name: 'actionsDivider', props: {} },
    { id: 'actions-heading', type: 'heading', name: 'actionsHeading', props: { text: 'Nächste Schritte', level: 3 } },
    {
      id: 'actions-field',
      type: 'cocoar-markdown-field',
      name: 'actions',
      props: { placeholder: '- [ ] Aufgabe und Verantwortliche ergänzen' },
      style: { height: '150px', minWidth: '0' },
    },
  ],
};

const decisionPanel: PageNode = {
  id: 'decision-root',
  type: 'page',
  schemaVersion: 6,
  style: { gap: '14px', padding: '22px', overflow: 'auto' },
  children: [
    { id: 'decision-title', type: 'heading', name: 'decisionTitle', props: { text: 'Entscheidungsnotiz', level: 2 } },
    {
      id: 'decision-context-field',
      type: 'cocoar-markdown-field',
      name: 'decisionContext',
      props: { placeholder: 'Kontext der Entscheidung beschreiben …' },
      style: { height: '105px', minWidth: '0' },
    },
    {
      id: 'decision-field',
      type: 'cocoar-markdown-field',
      name: 'decision',
      props: { placeholder: 'Entscheidung mit **Begründung** dokumentieren …' },
      style: { height: '210px', minWidth: '0' },
    },
    {
      id: 'decision-meta',
      type: 'stack',
      name: 'decisionMeta',
      props: { direction: 'row' },
      style: { gap: '12px', wrap: true },
      children: [
        { id: 'decision-owner', type: 'text-input', name: 'owner', props: { label: 'Verantwortlich', placeholder: 'Name' }, style: { size: 'fill', minWidth: '220px' } },
        { id: 'decision-date', type: 'date-input', name: 'dueDate', props: { label: 'Review am' }, style: { size: 'fill', minWidth: '220px' } },
      ],
    },
  ],
};

export const pages = reactive<PageRecord[]>([
  {
    id: 'jour-fixe-canvas',
    name: 'Jour-Fixe Arbeitsfläche',
    description: 'Zwei Markdown-Spalten und eine gemeinsame Maßnahmenliste.',
    canvasHeight: 650,
    versions: [{ version: '1', schema: clone(meetingCanvas), publishedAt: '2026-08-17' }],
    draft: clone(meetingCanvas),
  },
  {
    id: 'decision-panel',
    name: 'Entscheidungsnotiz',
    description: 'Markdown-Entscheidung kombiniert mit strukturierten Metadaten.',
    canvasHeight: 490,
    versions: [{ version: '1', schema: clone(decisionPanel), publishedAt: '2026-08-17' }],
    draft: clone(decisionPanel),
  },
]);

export const pageValues = reactive<Record<string, ActionValues>>({
  agenda: {
    meetingIntroText: 'Die Struktur kommt aus der Page. Die Inhalte bleiben eigenständige Markdown-Felder.',
    review: '- Der neue Import läuft stabil\n- Zwei Supportfälle wurden geschlossen',
    topics: '1. Release-Termin abstimmen\n2. Rollenmodell für externe Gäste',
    actions: '- [ ] Migrationsplan fertigstellen\n- [ ] Einladung für den Workshop senden',
  },
});

export const documentValues = reactive<Record<string, string>>({
  introduction: 'Diese Einleitung ist **editierbares Markdown**. Die Überschrift darüber bleibt Bestandteil der Vorlage.',
  closing: 'Die Page oben ist eine geschützte Referenz. Dieser Text darf dagegen vollständig verändert oder geleert werden.',
});

export const requestedBuilderPageId = ref<string | null>(null);

export const picker = reactive<{
  open: boolean
  preservedId?: string
}>({ open: false });

let pickerResolve: ((value: Record<string, string> | null) => void) | null = null;
let embedSequence = 1;

export function pageById(id: string): PageRecord | undefined {
  return pages.find((page) => page.id === id);
}

export function pageVersion(pageId: string, version: string): PageVersion | undefined {
  return pageById(pageId)?.versions.find((entry) => entry.version === version);
}

export function latestVersion(pageId: string): PageVersion | undefined {
  return pageById(pageId)?.versions.at(-1);
}

export function valuesFor(embedId: string): ActionValues {
  return pageValues[embedId] ?? (pageValues[embedId] = {});
}

export function updateValues(embedId: string, next: ActionValues): void {
  pageValues[embedId] = { ...next };
}

export function documentValueFor(id: string): string {
  return documentValues[id] ?? '';
}

export function updateDocumentValue(id: string, next: string): void {
  documentValues[id] = next;
}

export function requestPageReference(preservedId?: string): Promise<Record<string, string> | null> {
  if (pickerResolve) pickerResolve(null);
  picker.open = true;
  picker.preservedId = preservedId;
  return new Promise((resolve) => { pickerResolve = resolve; });
}

export function completePageReference(pageId?: string): void {
  const resolve = pickerResolve;
  pickerResolve = null;
  picker.open = false;
  if (!resolve) return;
  if (!pageId) {
    resolve(null);
    return;
  }
  const latest = latestVersion(pageId);
  if (!latest) {
    resolve(null);
    return;
  }
  const id = picker.preservedId || `${pageId.replace(/[^a-z0-9]+/g, '-')}-${++embedSequence}`;
  if (!pageValues[id]) pageValues[id] = {};
  resolve({ id, page: pageId, version: latest.version });
}

export function publishPage(pageId: string): string | undefined {
  const page = pageById(pageId);
  if (!page) return undefined;
  const nextVersion = String(Number(page.versions.at(-1)?.version ?? '0') + 1);
  page.versions.push({
    version: nextVersion,
    schema: clone(page.draft),
    publishedAt: new Date().toISOString().slice(0, 10),
  });
  return nextVersion;
}
