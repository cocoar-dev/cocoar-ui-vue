import type { PageNode } from '@cocoar/vue-page-builder';
import consent from './consent.json';
import login from './login.json';
import logout from './logout.json';
import passwordForgot from './password-forgot.json';

import type { AuthPageSlot } from '../authPageConfig';

/*
 * Demo documents as plain JSON — exactly what a host would load from its own
 * storage. Nothing here is generated at runtime, so every style value is
 * visible in the file and editable without reading code. The page-builder has
 * no notion of auth; these are just four example pages that happen to be login
 * screens because they exercise fields, actions, conditions and compositions.
 */
const DOCUMENTS: Record<AuthPageSlot, PageNode> = {
  login: login as PageNode,
  'password-forgot': passwordForgot as PageNode,
  logout: logout as PageNode,
  consent: consent as PageNode,
};

/**
 * A structurally-shared JSON import would let one view's edits leak into the
 * next load, so every caller gets its own copy.
 */
export function loadAuthDemoDocument(slot: AuthPageSlot): PageNode {
  return structuredClone(DOCUMENTS[slot]);
}

export const AUTH_DEMO_SLOTS = Object.keys(DOCUMENTS) as AuthPageSlot[];
