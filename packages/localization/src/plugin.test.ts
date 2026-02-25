import { describe, it, expect } from 'vitest';
import { createApp, defineComponent, h } from 'vue';
import { createCoarLocalization } from './plugin';
import { COAR_LOCALIZATION_KEY } from './injection-keys';
import type { CoarLocalizationService } from './localization-service';

describe('createCoarLocalization', () => {
  it('creates a plugin with service', () => {
    const plugin = createCoarLocalization({ defaultLanguage: 'de' });
    expect(plugin.service).toBeDefined();
    expect(plugin.service.getDefaultLanguage()).toBe('de');
    expect(plugin.install).toBeInstanceOf(Function);
  });

  it('provides service via injection key', () => {
    const plugin = createCoarLocalization();
    let injected: CoarLocalizationService | undefined;

    const TestComponent = defineComponent({
      setup() {
        const { inject } = require('vue');
        injected = inject(COAR_LOCALIZATION_KEY);
        return () => h('div');
      },
    });

    const app = createApp(TestComponent);
    app.use(plugin);
    const el = document.createElement('div');
    app.mount(el);

    expect(injected).toBe(plugin.service);
    app.unmount();
  });

  it('defaults to "en" language', () => {
    const plugin = createCoarLocalization();
    expect(plugin.service.getDefaultLanguage()).toBe('en');
  });
});
