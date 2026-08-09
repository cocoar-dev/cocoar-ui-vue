import frauncesItalic from '@fontsource-variable/fraunces/files/fraunces-latin-full-italic.woff2?inline';
import instrumentSans from '@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?inline';
import type {
  ElementNode,
  PageConfig,
  PageNode,
  PageRootNode,
  VisualMarkupNode,
  PageCompositionDefinition,
} from '@cocoar/vue-page-builder';
import { materializePageComposition } from '@cocoar/vue-page-builder';

export const AMZETTEL_VISUAL_HTML = `<div class="auth-brand-inner">
  <h1 class="auth-logo">
    <span class="wordmark"><span class="wm-am">am</span><span class="wm-zettel">Zettel</span></span>
  </h1>
  <p class="auth-tagline">Gemeinsam einkaufen. Einfach abhaken.</p>
  <div class="demo-card">
    <div class="demo-head">
      <span class="demo-tile">W</span>
      <span class="demo-title">Wocheneinkauf</span>
      <svg width="30" height="30" viewBox="0 0 36 36" class="demo-ring" aria-hidden="true">
        <circle cx="18" cy="18" r="15.5" fill="none" class="demo-ring-track" stroke-width="4.5"></circle>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke-width="4.5" stroke-linecap="round" class="demo-ring-fg" transform="rotate(-90 18 18)"></circle>
      </svg>
    </div>
    <ul class="demo-lines">
      <li style="--d:1.2s;--cat:#0284c7"><span class="demo-dot"></span><span class="demo-word">Milch</span><span class="demo-pill">2 L</span></li>
      <li style="--d:2.25s;--cat:#d97706"><span class="demo-dot"></span><span class="demo-word">Brot</span><span class="demo-pill">1 Stk</span></li>
      <li style="--d:3.3s;--cat:#16a34a"><span class="demo-dot"></span><span class="demo-word">Äpfel</span><span class="demo-pill">6 Stk</span></li>
      <li style="--d:4.35s;--cat:#2563eb"><span class="demo-dot"></span><span class="demo-word">Kaffee</span><span class="demo-pill">500 g</span></li>
      <li style="--d:5.4s;--cat:#0284c7"><span class="demo-dot"></span><span class="demo-word">Butter</span><span class="demo-pill">250 g</span></li>
    </ul>
  </div>
</div>`;

// Ported from amZettel's hardcoded AuthShell.vue. It intentionally remains
// ordinary authored CSS: the consumer test proves the generic visual element,
// not a hidden amZettel-specific renderer or preset.
export const AMZETTEL_VISUAL_CSS = `
body {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: var(--ink);
  background:
    radial-gradient(700px 480px at 85% 12%, rgba(139, 92, 246, 0.10), transparent 60%),
    radial-gradient(620px 460px at 0% 100%, rgba(16, 185, 129, 0.13), transparent 55%),
    var(--surface);
  border-right: 1px solid var(--line);
  font-family: var(--font-ui);
}
.auth-brand-inner { width: 100%; max-width: 360px; }
.auth-logo { margin: 0; font-size: clamp(2.6rem, 4.5vw, 3.4rem); animation: rise-in .5s var(--ease-out) both; }
.wordmark { display: inline-flex; align-items: baseline; letter-spacing: -.02em; line-height: 1; white-space: nowrap; }
.wm-am { color: var(--ink); font-family: var(--font-ui); font-weight: 700; }
.wm-zettel { color: var(--brand-deep); font-family: var(--font-display); font-style: italic; font-variation-settings: "opsz" 40, "wght" 520; }
.auth-tagline { margin: 6px 0 40px; color: var(--ink-soft); font-size: 1.06rem; animation: rise-in .5s var(--ease-out) .08s both; }
.demo-card { padding: 20px 22px; border: 1px solid var(--line); border-radius: var(--radius-l); background: var(--surface); box-shadow: var(--shadow-pop); transform: rotate(-1.2deg); animation: rise-in .55s var(--ease-out) .18s both; }
.demo-head { display: flex; align-items: center; gap: 11px; padding-bottom: 14px; margin-bottom: 6px; border-bottom: 1px solid var(--line); }
.demo-tile { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 10px; background: #10b981; color: #fff; font-weight: 700; }
.demo-title { flex: 1; font-size: 1.04rem; font-weight: 700; }
.demo-ring-track { stroke: var(--hover); }
.demo-ring-fg { stroke: var(--brand); stroke-dasharray: 0 97.4; animation: ring-fill 5.5s var(--ease-out) 1.2s both; }
.demo-lines { margin: 0; padding: 0; list-style: none; }
.demo-lines li { display: flex; align-items: center; gap: 12px; padding: 10px 2px; border-bottom: 1px solid var(--line); font-size: .98rem; font-weight: 500; }
.demo-lines li:last-child { border-bottom: 0; }
.demo-dot { width: 19px; height: 19px; flex: 0 0 auto; border: 2px solid color-mix(in srgb, var(--cat) 55%, var(--line-strong)); border-radius: 50%; animation: dot-fill .35s ease var(--d) both; }
.demo-word { flex: 1; animation: word-strike .35s ease var(--d) both; }
.demo-pill { padding: 2px 9px; border-radius: 999px; background: color-mix(in srgb, var(--cat) 13%, var(--surface)); color: var(--ink-soft); font-size: .74rem; font-weight: 700; }
@keyframes rise-in { from { opacity: 0; transform: translateY(14px); } }
@keyframes ring-fill { to { stroke-dasharray: 97.4 97.4; } }
@keyframes dot-fill { to { border-color: var(--cat); background: var(--cat); } }
@keyframes word-strike { to { color: var(--ink-faint); text-decoration: line-through; text-decoration-color: var(--cat); text-decoration-thickness: 2px; } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
`;

export const AMZETTEL_VISUAL_CONFIG: NonNullable<PageConfig['visualMarkup']> = {
  themeVariables: {
    '--surface': '#ffffff',
    '--line': '#e5e8ec',
    '--line-strong': '#c9d0d9',
    '--ink': '#16202e',
    '--ink-soft': '#54606e',
    '--ink-faint': '#6d7885',
    '--brand': '#10b981',
    '--brand-deep': '#0b9268',
    '--hover': 'rgba(16, 24, 40, 0.06)',
    '--radius-l': '20px',
    '--shadow-pop': '0 8px 18px rgba(16,24,40,.08), 0 32px 72px -28px rgba(16,24,40,.34)',
    '--ease-out': 'cubic-bezier(.22,1,.36,1)',
    '--font-ui': '"Instrument Sans Variable", "Segoe UI", sans-serif',
    '--font-display': '"Fraunces Variable", Georgia, serif',
  },
  fonts: [
    { id: 'instrument-sans', family: 'Instrument Sans Variable', source: instrumentSans, format: 'woff2', weight: '100 900' },
    { id: 'fraunces', family: 'Fraunces Variable', source: frauncesItalic, format: 'woff2', weight: '100 900', style: 'italic' },
  ],
};

export const AMZETTEL_BRAND_COMPOSITION: PageCompositionDefinition = {
  id: 'amzettel-brand-panel',
  name: 'amZettel brand panel',
  version: '1',
  root: {
    id: 'amzettel-shopping-visual-template',
    type: 'visual-markup',
    name: 'shoppingListVisual',
    props: { html: AMZETTEL_VISUAL_HTML, css: AMZETTEL_VISUAL_CSS },
    // No height: the shell row is align-items:stretch, which fills this pane
    // top to bottom on its own. An explicit height would opt out of stretching
    // and a percentage cannot resolve against a content-sized row anyway.
    style: { size: 'fixed', width: '44%', minWidth: '380px', hidden: true },
    responsive: { desktop: { hidden: false } },
  } satisfies VisualMarkupNode,
};

/** Applies the same generic linked brand-panel composition to any auth page. */
export function createAmZettelPage(base: PageNode): PageNode {
  if (base.type !== 'page') return base;
  const root = base as PageRootNode;
  const frame = root.children?.[0] as ElementNode | undefined;
  if (!frame || !Array.isArray(frame.children)) return base;

  frame.children = frame.children.filter((child) => !child.id.endsWith('-brand-zone'));
  frame.style = { ...(frame.style ?? {}), size: 'fill', maxWidth: '420px', gap: '20px' };

  const visual = materializePageComposition(AMZETTEL_BRAND_COMPOSITION, { page: root });
  const rightPane: ElementNode = {
    id: 'amzettel-auth-pane',
    type: 'stack',
    name: 'authPane',
    props: { direction: 'column' },
    style: { size: 'fill', minWidth: '0', padding: '48px 32px', justify: 'center', align: 'center' },
    children: [frame],
  };
  const shell: ElementNode = {
    id: 'amzettel-auth-shell',
    type: 'stack',
    name: 'authShell',
    props: { direction: 'row' },
    // The shell sits in the page's column flow, where stretch only governs
    // width. Taking the page's full height is a main-axis concern, so it needs
    // grow rather than a percentage height.
    style: { size: 'grow', minWidth: '0', gap: '0', align: 'stretch' },
    children: [visual, rightPane],
  };
  root.style = { minHeight: '100%', height: '100%', width: '100%', padding: '0', surface: 'default', align: 'stretch', justify: 'start' };
  root.responsive = undefined;
  root.children = [shell];
  return root;
}

/** @deprecated Use createAmZettelPage; retained for old playground links. */
export const createAmZettelLoginPage = createAmZettelPage;
