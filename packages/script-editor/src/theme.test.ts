import { afterEach, describe, expect, it } from 'vitest';
import {
  COAR_THEME_DARK,
  COAR_THEME_LIGHT,
  detectAutoTheme,
  resolveTheme,
  watchAutoTheme,
} from './theme';

describe('resolveTheme (explicit values)', () => {
  it('returns the dark theme for "dark"', () => {
    expect(resolveTheme('dark')).toBe(COAR_THEME_DARK);
  });

  it('returns the light theme for "light"', () => {
    expect(resolveTheme('light')).toBe(COAR_THEME_LIGHT);
  });
});

describe('detectAutoTheme', () => {
  afterEach(() => {
    document.documentElement.className = '';
    document.body.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.body.removeAttribute('data-theme');
  });

  it('returns light by default (no signals set)', () => {
    expect(detectAutoTheme()).toBe(COAR_THEME_LIGHT);
  });

  it('detects `.dark-mode` on html (Cocoar convention)', () => {
    document.documentElement.classList.add('dark-mode');
    expect(detectAutoTheme()).toBe(COAR_THEME_DARK);
  });

  it('detects `.dark-mode` on body', () => {
    document.body.classList.add('dark-mode');
    expect(detectAutoTheme()).toBe(COAR_THEME_DARK);
  });

  it('detects plain `.dark` class too', () => {
    document.documentElement.classList.add('dark');
    expect(detectAutoTheme()).toBe(COAR_THEME_DARK);
  });

  it('explicit `.light-mode` wins over the default', () => {
    document.documentElement.classList.add('light-mode');
    expect(detectAutoTheme()).toBe(COAR_THEME_LIGHT);
  });

  it('detects `data-theme="dark"`', () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    expect(detectAutoTheme()).toBe(COAR_THEME_DARK);
  });
});

describe('watchAutoTheme', () => {
  afterEach(() => {
    document.documentElement.className = '';
    document.body.className = '';
  });

  it('fires the callback when html class toggles', async () => {
    let fires = 0;
    const dispose = watchAutoTheme(() => {
      fires++;
    });

    document.documentElement.classList.add('dark-mode');
    // MutationObserver is microtask-based; wait one tick.
    await new Promise((r) => setTimeout(r, 0));
    expect(fires).toBeGreaterThan(0);

    dispose();
  });

  it('stops firing after dispose', async () => {
    let fires = 0;
    const dispose = watchAutoTheme(() => {
      fires++;
    });
    document.documentElement.classList.add('dark-mode');
    await new Promise((r) => setTimeout(r, 0));
    const fireCountBeforeDispose = fires;

    dispose();

    document.documentElement.classList.remove('dark-mode');
    await new Promise((r) => setTimeout(r, 0));
    expect(fires).toBe(fireCountBeforeDispose);
  });
});
