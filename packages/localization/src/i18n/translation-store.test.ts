import { describe, it, expect, beforeEach } from 'vitest';
import { CoarTranslationStore } from './translation-store';

describe('CoarTranslationStore', () => {
  let store: CoarTranslationStore;

  beforeEach(() => {
    store = new CoarTranslationStore();
  });

  it('starts empty', () => {
    expect(store.hasLanguage('en')).toBe(false);
    expect(store.getTranslation('en', 'key')).toBeUndefined();
  });

  it('stores flat translations', () => {
    store.setTranslations('en', { hello: 'Hello', bye: 'Goodbye' });
    expect(store.getTranslation('en', 'hello')).toBe('Hello');
    expect(store.getTranslation('en', 'bye')).toBe('Goodbye');
  });

  it('flattens nested translations', () => {
    store.setTranslations('en', {
      app: {
        title: 'My App',
        nav: {
          home: 'Home',
          about: 'About',
        },
      },
    });
    expect(store.getTranslation('en', 'app.title')).toBe('My App');
    expect(store.getTranslation('en', 'app.nav.home')).toBe('Home');
    expect(store.getTranslation('en', 'app.nav.about')).toBe('About');
  });

  it('updates translations without overwriting existing', () => {
    store.setTranslations('en', { hello: 'Hello' });
    store.updateTranslations('en', { bye: 'Goodbye' });
    expect(store.getTranslation('en', 'hello')).toBe('Hello');
    expect(store.getTranslation('en', 'bye')).toBe('Goodbye');
  });

  it('sets single translation', () => {
    store.setTranslation('en', 'key', 'value');
    expect(store.getTranslation('en', 'key')).toBe('value');
    expect(store.hasLanguage('en')).toBe(true);
  });

  it('returns all translations for a language', () => {
    store.setTranslations('en', { a: '1', b: '2' });
    const map = store.getTranslations('en');
    expect(map?.size).toBe(2);
    expect(map?.get('a')).toBe('1');
  });

  it('clears all data', () => {
    store.setTranslations('en', { a: '1' });
    store.setTranslations('de', { b: '2' });
    store.clear();
    expect(store.hasLanguage('en')).toBe(false);
    expect(store.hasLanguage('de')).toBe(false);
  });

  it('increments version on changes', () => {
    const v0 = store.version.value;
    store.setTranslations('en', { a: '1' });
    expect(store.version.value).toBe(v0 + 1);
    store.updateTranslations('en', { b: '2' });
    expect(store.version.value).toBe(v0 + 2);
  });

  it('tracks loaded languages', () => {
    expect(store.loadedLanguages.value.size).toBe(0);
    store.setTranslations('en', { a: '1' });
    expect(store.loadedLanguages.value.has('en')).toBe(true);
    store.setTranslations('de', { b: '2' });
    expect(store.loadedLanguages.value.has('de')).toBe(true);
    expect(store.loadedLanguages.value.size).toBe(2);
  });

  it('clears loadedLanguages on clear()', () => {
    store.setTranslations('en', { a: '1' });
    store.clear();
    expect(store.loadedLanguages.value.size).toBe(0);
  });
});
