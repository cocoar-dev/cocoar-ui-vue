import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  documentPresentation, isPresentation, PRESENTATION_EVENT, PRESENTATION_KEY,
  PRESENTATION_MESSAGE, setPresentation,
} from './presentation.mjs';

export type DocsPresentation = 'legacy' | 'compact';

export function useDocsPresentation() {
  // Match the static server render. The head script has already restored the
  // root class; reflecting it after mount avoids hydration-dependent markup.
  const presentation = ref<DocsPresentation>('legacy');
  const sync = () => { presentation.value = documentPresentation(); };
  const apply = (value: DocsPresentation) => {
    document.documentElement.classList.toggle('coar-compact', value === 'compact');
    presentation.value = value;
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === PRESENTATION_KEY || event.key === null) {
      apply(event.newValue === 'compact' ? 'compact' : 'legacy');
    }
  };
  const onMessage = (event: MessageEvent) => {
    if (window.parent === window || event.source !== window.parent
      || event.origin !== window.location.origin) return;
    const data = event.data as { type?: unknown; presentation?: unknown } | null;
    if (data?.type === PRESENTATION_MESSAGE && isPresentation(data.presentation)) {
      apply(data.presentation);
    }
  };
  watch(presentation, (value) => {
    // Loading the extra Inter weights is an opt-in too. The default page does
    // not gain new font faces merely because a style selector was added.
    if (value === 'compact') void import('@cocoar/vue-ui/fonts/compact');
  });
  onMounted(() => {
    sync();
    window.addEventListener(PRESENTATION_EVENT, sync);
    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);
  });
  onBeforeUnmount(() => {
    window.removeEventListener(PRESENTATION_EVENT, sync);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('message', onMessage);
  });
  return { presentation, choosePresentation: setPresentation };
}
