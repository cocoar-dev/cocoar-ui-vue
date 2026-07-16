import type { NoteNode } from '../../schema';
import { definePageElement } from '../registry';
import NoteRenderer from './NoteRenderer.vue';

export const noteElement = definePageElement<NoteNode['props']>({
  renderer: NoteRenderer,
});
