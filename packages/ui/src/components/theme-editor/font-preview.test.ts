import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import {
  cleanFontFamily, cssFontFamily, fontNotes, fontSources, removeFontPreviews, setFontPreviewEnabled, showFont,
} from './font-preview';
import {
  PRESETS, applyPreset, cleanupThemeEditorState, fontBody, fontTitle, initThemeEditorState, themeFileCss,
} from './theme-editor-state';

const links = () => [...document.head.querySelectorAll<HTMLLinkElement>('[data-coar-font-preview]')];

// A font preview is a stylesheet link, which the test environment would fetch: an
// anchor stands in for it (it resolves `href` the same way and loads nothing).
beforeEach(() => {
  const create = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string, options?: ElementCreationOptions) =>
    create(tag === 'link' ? 'a' : tag, options)) as typeof document.createElement);
});

afterEach(() => {
  cleanupThemeEditorState();
  applyPreset(PRESETS[0]);
  cleanupThemeEditorState();
  removeFontPreviews();
  setFontPreviewEnabled(true);
  vi.restoreAllMocks();
});

describe('font preview of the Theme Editor', () => {
  it('fetches a family the page lacks from Google Fonts, in the weights the roles use', () => {
    showFont('body', 'Fraunces');
    expect(fontSources.body).toBe('loading');
    expect(links().map((link) => link.href)).toEqual([
      'https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&display=swap',
    ]);
    links()[0].dispatchEvent(new Event('load'));
    expect(fontSources.body).toBe('google');
    // The other role showing the same family shares the request.
    showFont('title', 'Fraunces');
    expect(links()).toHaveLength(1);
    expect(fontSources.title).toBe('google');
  });

  it('tries the regular style when the weights are missing, then says the family is unknown', () => {
    showFont('title', 'No Such Font');
    const [link] = links();
    link.dispatchEvent(new Event('error'));
    expect(link.href).toBe('https://fonts.googleapis.com/css2?family=No+Such+Font&display=swap');
    expect(fontSources.title).toBe('loading');
    link.dispatchEvent(new Event('error'));
    expect(fontSources.title).toBe('unknown');
  });

  it('requests nothing for a generic family, and nothing at all when switched off', () => {
    showFont('body', 'system-ui');
    expect(fontSources.body).toBe('generic');
    setFontPreviewEnabled(false);
    showFont('title', 'Fraunces');
    expect(fontSources.title).toBe('off');
    expect(links()).toEqual([]);
  });

  it('keeps a typed name inside one CSS family', () => {
    expect(cleanFontFamily('  Fraunces;} body{display:none} ')).toBe('Fraunces bodydisplaynone');
    expect(cleanFontFamily('"IBM Plex Sans", serif')).toBe('IBM Plex Sans');
    expect(cssFontFamily('IBM Plex Sans')).toBe('IBM Plex Sans');
    expect(cssFontFamily('Source Sans 3')).toBe('"Source Sans 3"');
  });

  it('heads a downloaded theme with what the app has to load', () => {
    expect(fontNotes(['Onest', 'Fraunces', 'system-ui', 'Onest'])).toBe([
      '/*',
      ' * Fonts this theme names. The file does not contain them, and the Theme Editor',
      ' * only previewed them: load each one in your app.',
      " *   Onest: import '@cocoar/vue-ui/fonts/onest'",
      ' *   Fraunces: not part of @cocoar/vue-ui. Load it in your app, self-hosted (for example an @fontsource package) or from your font provider.',
      ' */',
      '',
    ].join('\n'));
    expect(fontNotes(['system-ui', ''])).toBe('');
  });
});

describe('fonts in the editor state', () => {
  it('previews only what somebody chose: nothing on mount, a request on a change', async () => {
    initThemeEditorState(true);
    await nextTick();
    expect(links()).toEqual([]);
    fontTitle.value = 'Fraunces';
    await nextTick();
    expect(links().map((link) => link.getAttribute('data-coar-font-preview'))).toEqual(['Fraunces']);
    // The preview is not in the theme: the file names the font and says to load it.
    const file = themeFileCss('acme');
    expect(file).not.toContain('googleapis');
    expect(file).toContain('Fraunces: not part of @cocoar/vue-ui');
    expect(file).toContain('--coar-font-family-title: Fraunces, ui-sans-serif, system-ui, sans-serif;');
    cleanupThemeEditorState();
    expect(links()).toEqual([]);
  });

  it('leaves a theme that names no font without a note', () => {
    initThemeEditorState(true);
    expect(fontBody.value).toBe('Poppins');
    expect(themeFileCss('acme')).not.toContain('Fonts this theme names');
  });

  it('respects the switch of the component', async () => {
    initThemeEditorState(true, null, { fontPreview: false });
    fontBody.value = 'Fraunces';
    await nextTick();
    expect(links()).toEqual([]);
    expect(fontSources.body).toBe('off');
  });
});
