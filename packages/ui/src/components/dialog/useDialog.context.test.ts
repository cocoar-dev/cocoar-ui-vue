import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';
import { CoarOverlayPlugin, _resetOverlayServiceForTests, getOverlayService } from '../overlay/useOverlay';
import { useDialog } from './useDialog';
import { useContextMenu } from '../menu/useContextMenu';

/**
 * End to end with the real overlay service (useDialog.test.ts mocks it): a dialog opened
 * by a component inside a local `.coar-mobile` area keeps the mobile presentation.
 */
describe('useDialog — local .coar-mobile area', () => {
  const wrappers: VueWrapper[] = [];
  const nodes: Element[] = [];

  afterEach(() => {
    wrappers.splice(0).forEach((w) => w.unmount());
    _resetOverlayServiceForTests();
    document.querySelectorAll('.coar-overlay-host, .coar-overlay-backdrop').forEach((n) => n.remove());
    nodes.splice(0).forEach((n) => n.remove());
  });

  function mountIn(parent: Element) {
    let dialog!: ReturnType<typeof useDialog>;
    const Owner = defineComponent({
      setup() {
        dialog = useDialog();
        return () => h('div', 'owner');
      },
    });
    const host = document.createElement('div');
    document.body.appendChild(host);
    nodes.push(host);
    wrappers.push(mount(CoarOverlayHost, { global: { plugins: [CoarOverlayPlugin] }, attachTo: host }));
    // No plugin here: a second install would replace the service the host renders.
    wrappers.push(mount(Owner, { attachTo: parent }));
    return dialog;
  }

  async function dialogHost() {
    await nextTick();
    await nextTick();
    return document.querySelector<HTMLElement>('.coar-overlay-host')!;
  }

  it('gives the dialog host the class and the values of the area', async () => {
    const area = document.createElement('div');
    area.className = 'coar-mobile';
    area.style.setProperty('--coar-control-m-height', '60px');
    document.body.appendChild(area);
    nodes.push(area);
    const dialog = mountIn(area);

    dialog.confirm({ title: 'Delete?', message: 'Sure?' });
    const host = await dialogHost();
    expect(host.classList.contains('coar-mobile')).toBe(true);
    expect(host.style.getPropertyValue('--coar-control-m-height')).toBe('60px');
  });

  it('leaves the dialog host untouched outside such an area', async () => {
    const plain = document.createElement('div');
    document.body.appendChild(plain);
    nodes.push(plain);
    const dialog = mountIn(plain);

    dialog.confirm({ title: 'Delete?', message: 'Sure?' });
    const host = await dialogHost();
    expect(host.classList.contains('coar-mobile')).toBe(false);
    expect(host.style.getPropertyValue('--coar-control-m-height')).toBe('');
  });

  it('keeps getters of a config class (the config is not spread)', async () => {
    const plain = document.createElement('div');
    document.body.appendChild(plain);
    nodes.push(plain);
    const dialog = mountIn(plain);
    class Config {
      get title() { return 'Class settings'; }
      get closeOnEscape() { return false; }
    }
    class Options {
      get title() { return 'Delete entry?'; }
      get message() { return 'This cannot be undone'; }
    }
    dialog.open(defineComponent({ render: () => h('div', 'body') }), new Config());
    let instance = getOverlayService().instances.value[0];
    expect(instance.inputs.title).toBe('Class settings');
    expect(instance.spec.dismiss.escapeKey).toBe(false);
    getOverlayService().closeAll();
    dialog.confirm(new Options() as { title: string; message: string });
    instance = getOverlayService().instances.value[0];
    expect(instance.inputs.confirmMessage).toBe('This cannot be undone');
  });

  it('takes no context from a component deactivated by KeepAlive', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    nodes.push(host);
    wrappers.push(mount(CoarOverlayHost, { global: { plugins: [CoarOverlayPlugin] }, attachTo: host }));
    let dialog!: ReturnType<typeof useDialog>;
    const shown = ref(true);
    const Owner = defineComponent({
      name: 'MobileOwner',
      setup() {
        dialog = useDialog();
        return () => h('section', { class: 'coar-mobile', style: { '--coar-control-m-height': '74px' } }, 'mobile');
      },
    });
    const Desktop = defineComponent({ render: () => h('main', 'desktop') });
    const App = defineComponent({
      setup: () => () => h(KeepAlive, null, { default: () => (shown.value ? h(Owner) : h(Desktop)) }),
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    nodes.push(root);
    wrappers.push(mount(App, { attachTo: root }));
    await nextTick();
    shown.value = false;
    await nextTick();
    await nextTick();

    dialog.confirm({ title: 'Background result', message: 'Done' });
    const dialogHostEl = await dialogHost();
    expect(getOverlayService().instances.value[0].contextEl).toBeNull();
    expect(dialogHostEl.classList.contains('coar-mobile')).toBe(false);
  });

  it('opens a context menu by coordinates without a DOM (SSR)', () => {
    const menu = useContextMenu();
    vi.stubGlobal('Element', undefined);
    try {
      expect(() => menu.open({ clientX: 1, clientY: 2 })).not.toThrow();
      expect(menu.target?.value).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
