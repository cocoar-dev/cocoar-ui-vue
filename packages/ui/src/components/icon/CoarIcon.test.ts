import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CoarIcon from './CoarIcon.vue';
import {
  CoarIconService,
  CoarIconMapSource,
  COAR_ICON_SERVICE_KEY,
  COAR_BUILTIN_ICON_SOURCE_KEY,
} from './icon-service';

// Helper to mount with an icon service provided
function mountIcon(
  props: Record<string, unknown> = {},
  service?: CoarIconService,
  slots?: Record<string, string>,
) {
  return mount(CoarIcon, {
    props,
    slots,
    global: service
      ? { provide: { [COAR_ICON_SERVICE_KEY as symbol]: service } }
      : undefined,
  });
}

describe('CoarIcon', () => {
  it('should render', () => {
    const wrapper = mountIcon({ name: 'plus' });
    expect(wrapper.find('.coar-icon-host').exists()).toBe(true);
  });

  describe('icon loading', () => {
    it('should render a built-in icon', async () => {
      const service = new CoarIconService();
      service.registerSource('test', new CoarIconMapSource({
        settings: '<svg id="test-icon"><circle /></svg>',
      }));
      service.setDefaultSource('test');

      const wrapper = mountIcon({ name: 'settings' }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.exists()).toBe(true);
      expect(iconEl.html()).toContain('id="test-icon"');
    });

    it('should not render .coar-icon when name is empty', () => {
      const wrapper = mountIcon();
      expect(wrapper.find('.coar-icon').exists()).toBe(false);
    });

    it('should handle icon not found gracefully', async () => {
      const service = new CoarIconService();
      service.registerSource(COAR_BUILTIN_ICON_SOURCE_KEY, new CoarIconMapSource({}));

      const wrapper = mountIcon({ name: 'nonexistent' }, service);
      await flushPromises();

      expect(wrapper.find('.coar-icon').exists()).toBe(false);
      expect(wrapper.find('.coar-icon--loading').exists()).toBe(false);
    });

    it('should use the default built-in source when no plugin is installed', async () => {
      // No service provided — should fall back to default built-in
      const wrapper = mountIcon({ name: 'plus' });
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.exists()).toBe(true);
      expect(iconEl.html()).toContain('svg');
    });

    it('should show loading state for async sources', async () => {
      const service = new CoarIconService();
      let resolveIcon!: (value: string | null) => void;
      const asyncSource = {
        getIcon: () => new Promise<string | null>((resolve) => { resolveIcon = resolve; }),
      };
      service.registerSource('async', asyncSource);
      service.setDefaultSource('async');

      const wrapper = mountIcon({ name: 'test' }, service);
      await flushPromises();

      expect(wrapper.find('.coar-icon--loading').exists()).toBe(true);

      resolveIcon('<svg id="async-result"></svg>');
      await flushPromises();

      expect(wrapper.find('.coar-icon--loading').exists()).toBe(false);
      expect(wrapper.html()).toContain('id="async-result"');
    });

    it('should cancel previous load when name changes', async () => {
      const service = new CoarIconService();
      let resolveFirst!: (value: string | null) => void;
      let resolveSecond!: (value: string | null) => void;

      const source = {
        getIcon: vi.fn().mockImplementation((name: string) => {
          if (name === 'first') return new Promise<string | null>((r) => { resolveFirst = r; });
          if (name === 'second') return new Promise<string | null>((r) => { resolveSecond = r; });
          return null;
        }),
      };
      service.registerSource('test', source);
      service.setDefaultSource('test');

      const wrapper = mountIcon({ name: 'first' }, service);
      await flushPromises();

      await wrapper.setProps({ name: 'second' });
      await flushPromises();

      // Resolve the first (should be ignored)
      resolveFirst('<svg id="first"></svg>');
      await flushPromises();
      expect(wrapper.html()).not.toContain('id="first"');

      // Resolve the second (should render)
      resolveSecond('<svg id="second"></svg>');
      await flushPromises();
      expect(wrapper.html()).toContain('id="second"');
    });
  });

  describe('sizes', () => {
    let service: CoarIconService;

    beforeEach(() => {
      service = new CoarIconService();
      service.registerSource(COAR_BUILTIN_ICON_SOURCE_KEY, new CoarIconMapSource({
        settings: '<svg><circle /></svg>',
      }));
    });

    it.each(['xs', 's', 'm', 'l', 'xl', 'auto'] as const)(
      'should apply %s size class',
      async (size) => {
        const wrapper = mountIcon({ name: 'settings', size }, service);
        await flushPromises();

        expect(wrapper.find(`.coar-icon--${size}`).exists()).toBe(true);
      },
    );

    it('should default to m size', async () => {
      const wrapper = mountIcon({ name: 'settings' }, service);
      await flushPromises();

      expect(wrapper.find('.coar-icon--m').exists()).toBe(true);
    });

    it('should apply custom size as inline style', async () => {
      const wrapper = mountIcon({ name: 'settings', size: '42px' }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.attributes('style')).toContain('width: 42px');
      expect(iconEl.attributes('style')).toContain('height: 42px');
    });

    it('should not apply preset class for custom size', async () => {
      const wrapper = mountIcon({ name: 'settings', size: '3rem' }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.classes()).not.toContain('coar-icon--3rem');
    });
  });

  describe('rotation', () => {
    let service: CoarIconService;

    beforeEach(() => {
      service = new CoarIconService();
      service.registerSource(COAR_BUILTIN_ICON_SOURCE_KEY, new CoarIconMapSource({
        settings: '<svg><circle /></svg>',
      }));
    });

    it('should apply rotation transform', async () => {
      const wrapper = mountIcon({ name: 'settings', rotate: 90 }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.attributes('style')).toContain('rotate(90deg)');
    });

    it('should apply 180 degree rotation', async () => {
      const wrapper = mountIcon({ name: 'settings', rotate: 180 }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.attributes('style')).toContain('rotate(180deg)');
    });

    it('should apply rotation transition as number (ms)', async () => {
      const wrapper = mountIcon({ name: 'settings', rotateTransition: 300 }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.attributes('style')).toContain('transform 300ms ease-in-out');
    });

    it('should apply rotation transition as string without transform prefix', async () => {
      const wrapper = mountIcon({ name: 'settings', rotateTransition: '0.5s ease' }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.attributes('style')).toContain('transform 0.5s ease');
    });

    it('should apply rotation transition as full string', async () => {
      const wrapper = mountIcon({ name: 'settings', rotateTransition: 'transform 0.3s ease-out' }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.attributes('style')).toContain('transform 0.3s ease-out');
    });

    it('should default to 0 rotation', async () => {
      const wrapper = mountIcon({ name: 'settings' }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.attributes('style')).toContain('rotate(0deg)');
    });
  });

  describe('spin animation', () => {
    let service: CoarIconService;

    beforeEach(() => {
      service = new CoarIconService();
      service.registerSource(COAR_BUILTIN_ICON_SOURCE_KEY, new CoarIconMapSource({
        settings: '<svg><circle /></svg>',
      }));
    });

    it('should apply spin class when enabled', async () => {
      const wrapper = mountIcon({ name: 'settings', spin: true }, service);
      await flushPromises();

      expect(wrapper.find('.coar-icon--spin').exists()).toBe(true);
    });

    it('should not apply spin class when disabled', async () => {
      const wrapper = mountIcon({ name: 'settings', spin: false }, service);
      await flushPromises();

      expect(wrapper.find('.coar-icon--spin').exists()).toBe(false);
    });
  });

  describe('color', () => {
    let service: CoarIconService;

    beforeEach(() => {
      service = new CoarIconService();
      service.registerSource(COAR_BUILTIN_ICON_SOURCE_KEY, new CoarIconMapSource({
        settings: '<svg><circle /></svg>',
      }));
    });

    it('should default color to inherit', async () => {
      const wrapper = mountIcon({ name: 'settings' }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.attributes('style')).toContain('color: inherit');
    });

    it('should apply custom color', async () => {
      const wrapper = mountIcon({ name: 'settings', color: 'red' }, service);
      await flushPromises();

      const iconEl = wrapper.find('.coar-icon');
      expect(iconEl.attributes('style')).toContain('color: red');
    });
  });

  describe('label', () => {
    let service: CoarIconService;

    beforeEach(() => {
      service = new CoarIconService();
      service.registerSource(COAR_BUILTIN_ICON_SOURCE_KEY, new CoarIconMapSource({
        settings: '<svg><circle /></svg>',
      }));
    });

    it('should render label when provided', async () => {
      const wrapper = mountIcon({ name: 'settings', label: 'Settings' }, service);
      await flushPromises();

      const labelEl = wrapper.find('.coar-icon__label');
      expect(labelEl.text()).toContain('Settings');
    });

    it('should render numeric label', async () => {
      const wrapper = mountIcon({ name: 'settings', label: 5 }, service);
      await flushPromises();

      const labelEl = wrapper.find('.coar-icon__label');
      expect(labelEl.text()).toContain('5');
    });

    it('should render slot content when no label prop', async () => {
      const wrapper = mountIcon(
        { name: 'settings' },
        service,
        { default: 'Slot Text' },
      );
      await flushPromises();

      const labelEl = wrapper.find('.coar-icon__label');
      expect(labelEl.text()).toContain('Slot Text');
    });
  });

  describe('host attributes', () => {
    it('should set icon-name attribute', async () => {
      const wrapper = mountIcon({ name: 'settings' });
      await flushPromises();

      expect(wrapper.find('.coar-icon-host').attributes('icon-name')).toBe('settings');
    });
  });

  describe('icon service', () => {
    it('should use injected service over default', async () => {
      const service = new CoarIconService();
      service.registerSource('custom', new CoarIconMapSource({
        custom: '<svg id="custom-icon"></svg>',
      }));
      service.setDefaultSource('custom');

      const wrapper = mountIcon({ name: 'custom' }, service);
      await flushPromises();

      expect(wrapper.html()).toContain('id="custom-icon"');
    });

    it('should support targeting specific source', async () => {
      const service = new CoarIconService();
      service.registerSource(COAR_BUILTIN_ICON_SOURCE_KEY, new CoarIconMapSource({}));
      service.registerSource('extra', new CoarIconMapSource({
        special: '<svg id="extra-icon"></svg>',
      }));

      const wrapper = mountIcon({ name: 'special', source: 'extra' }, service);
      await flushPromises();

      expect(wrapper.html()).toContain('id="extra-icon"');
    });
  });

  describe('fallback chain', () => {
    it('should fall back to second source when first returns null', async () => {
      const service = new CoarIconService();
      service.registerSource('primary', new CoarIconMapSource({}));
      service.registerSource('fallback', new CoarIconMapSource({
        'rare-icon': '<svg id="from-fallback"></svg>',
      }));
      service.setDefaultSource('primary');

      const wrapper = mountIcon({ name: 'rare-icon' }, service);
      await flushPromises();

      expect(wrapper.html()).toContain('id="from-fallback"');
    });

    it('should use first source when it has the icon', async () => {
      const service = new CoarIconService();
      service.registerSource('primary', new CoarIconMapSource({
        check: '<svg id="from-primary"></svg>',
      }));
      service.registerSource('fallback', new CoarIconMapSource({
        check: '<svg id="from-fallback"></svg>',
      }));
      service.setDefaultSource('primary');

      const wrapper = mountIcon({ name: 'check' }, service);
      await flushPromises();

      expect(wrapper.html()).toContain('id="from-primary"');
      expect(wrapper.html()).not.toContain('id="from-fallback"');
    });

    it('should fall back through async sources', async () => {
      const service = new CoarIconService();
      service.registerSource('bundled', new CoarIconMapSource({}));

      let resolveHttp!: (value: string | null) => void;
      service.registerSource('http', {
        getIcon: () => new Promise<string | null>((r) => { resolveHttp = r; }),
      });
      service.setDefaultSource('bundled');

      const wrapper = mountIcon({ name: 'cloud' }, service);
      await flushPromises();

      // Should be loading while http resolves
      expect(wrapper.find('.coar-icon--loading').exists()).toBe(true);

      resolveHttp('<svg id="from-http"></svg>');
      await flushPromises();

      expect(wrapper.html()).toContain('id="from-http"');
      expect(wrapper.find('.coar-icon--loading').exists()).toBe(false);
    });

    it('should skip explicit source and not fall back', async () => {
      const service = new CoarIconService();
      service.registerSource('primary', new CoarIconMapSource({}));
      service.registerSource('fallback', new CoarIconMapSource({
        check: '<svg id="from-fallback"></svg>',
      }));

      const wrapper = mountIcon({ name: 'check', source: 'primary' }, service);
      await flushPromises();

      // Explicit source, no fallback — icon not found
      expect(wrapper.find('.coar-icon').exists()).toBe(false);
    });

    it('should return null when no source has the icon', async () => {
      const service = new CoarIconService();
      service.registerSource('a', new CoarIconMapSource({}));
      service.registerSource('b', new CoarIconMapSource({}));

      const wrapper = mountIcon({ name: 'nonexistent' }, service);
      await flushPromises();

      expect(wrapper.find('.coar-icon').exists()).toBe(false);
    });
  });

  describe('strokeWidth', () => {
    let service: CoarIconService;

    beforeEach(() => {
      service = new CoarIconService();
      service.registerSource(COAR_BUILTIN_ICON_SOURCE_KEY, new CoarIconMapSource({
        'test-stroke': '<svg stroke="currentColor" stroke-width="2"><path stroke-width="2" d="M1 1" /></svg>',
      }));
    });

    it('should override stroke-width when prop is set', async () => {
      const wrapper = mountIcon({ name: 'test-stroke', strokeWidth: 1.5 }, service);
      await flushPromises();

      const html = wrapper.find('.coar-icon').html();
      expect(html).toContain('stroke-width="1.5"');
      expect(html).not.toContain('stroke-width="2"');
    });

    it('should not modify SVG when strokeWidth is not set', async () => {
      const wrapper = mountIcon({ name: 'test-stroke' }, service);
      await flushPromises();

      expect(wrapper.find('.coar-icon').html()).toContain('stroke-width="2"');
    });
  });
});
