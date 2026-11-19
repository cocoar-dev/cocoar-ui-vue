// The theme the docs' Theme Editor shows, carried into an embedded demo (PhoneFrame.vue).
import { onBeforeUnmount, onMounted } from 'vue';
import { THEME_MESSAGE } from './embed';

const STYLE_ID = 'coar-docs-editor-theme';
/** The class the editor's stylesheet is written for (CoarThemeEditor). */
const EDITOR_CLASS = 'coar-theme-editor';
/**
 * The editor marks each live change with this inline value on its scope: overlays and
 * renderers watch the attributes of their ancestors, not the text of a stylesheet.
 */
const REVISION = '--theme-editor-revision';
let revision = 0;

function applyTheme(css: string) {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!css) {
    style?.remove();
    document.documentElement.classList.remove(EDITOR_CLASS);
    document.documentElement.style.removeProperty(REVISION);
    return;
  }
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent === css) return;
  style.textContent = css;
  document.documentElement.classList.add(EDITOR_CLASS);
  document.documentElement.style.setProperty(REVISION, String(++revision));
  // The weights a preset such as Compact names, only once a theme arrives.
  void import('@cocoar/vue-ui/fonts/compact');
}

/** Applies the theme the parent frame sends; same origin only. */
export function useEmbeddedTheme() {
  const onMessage = (event: MessageEvent) => {
    if (window.parent === window || event.source !== window.parent
      || event.origin !== window.location.origin) return;
    const data = event.data as { type?: unknown; css?: unknown } | null;
    if (data?.type === THEME_MESSAGE && typeof data.css === 'string') applyTheme(data.css);
  };
  onMounted(() => window.addEventListener('message', onMessage));
  onBeforeUnmount(() => window.removeEventListener('message', onMessage));
}
