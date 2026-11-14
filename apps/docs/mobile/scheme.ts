// The colour scheme of the app: `?scheme=` first, then (on its own, not framed) the reader's last
// choice, then the system's. Inside a PhoneFrame the frame sends changes by postMessage and
// nothing is stored. Applied as the library expects it: the `dark-mode` class on <html>.
import { ref, watchEffect } from 'vue';
import { EMBED_PARAM, SCHEME_MESSAGE, SCHEME_PARAM, isScheme, type Scheme } from './embed';

const STORAGE_KEY = 'coar-mobile-docs-scheme';
const query = new URLSearchParams(window.location.search);

export const embedded = query.has(EMBED_PARAM);

function stored(): string | null {
  try {
    return embedded ? null : window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function initial(): Scheme {
  const fromQuery = query.get(SCHEME_PARAM);
  if (isScheme(fromQuery)) return fromQuery;
  const saved = stored();
  if (isScheme(saved)) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const scheme = ref<Scheme>(initial());

export function setScheme(value: Scheme) {
  scheme.value = value;
  if (embedded) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit.
  }
}

watchEffect(() => {
  const root = document.documentElement;
  root.classList.toggle('dark-mode', scheme.value === 'dark');
  root.style.colorScheme = scheme.value;
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data as { type?: unknown; scheme?: unknown } | null;
  if (data?.type === SCHEME_MESSAGE && isScheme(data.scheme)) scheme.value = data.scheme;
});
