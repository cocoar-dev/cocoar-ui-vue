import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';
import { CoarOverlayPlugin, _resetOverlayServiceForTests } from '../overlay/useOverlay';
import { useDialog } from './useDialog';
import { setCoarKeyboardInset } from '../_internal/keyboardInset';

/**
 * End to end with the real overlay service: `presentation: 'sheet'` opens the sheet shell,
 * every way of closing resolves the promise, the page scroll lock follows the sheets.
 */
describe('useDialog — presentation sheet', () => {
  const wrappers: VueWrapper[] = [];
  const nodes: Element[] = [];
  const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')!.get!;
  let clock = 0;
  let frameHeight = window.innerHeight;

  beforeEach(() => {
    clock = 0;
    frameHeight = window.innerHeight;
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hasAttribute('data-coar-viewport-frame') ? frameHeight : offsetHeight.call(this);
    });
  });

  afterEach(async () => {
    wrappers.splice(0).forEach((w) => w.unmount());
    _resetOverlayServiceForTests();
    document.querySelectorAll('.coar-overlay-host, .coar-overlay-backdrop').forEach((n) => n.remove());
    nodes.splice(0).forEach((n) => n.remove());
    document.documentElement.style.overflow = '';
    setCoarKeyboardInset(0);
    vi.restoreAllMocks();
    await settle();
  });

  async function settle() {
    for (let i = 0; i < 3; i++) await nextTick();
  }

  function mountIn(parent: Element = document.body) {
    let dialog!: ReturnType<typeof useDialog>;
    const Owner = defineComponent({
      setup() {
        dialog = useDialog();
        return () => h('button', { class: 'opener' }, 'open');
      },
    });
    const hostRoot = document.createElement('div');
    document.body.appendChild(hostRoot);
    nodes.push(hostRoot);
    wrappers.push(mount(CoarOverlayHost, { global: { plugins: [CoarOverlayPlugin] }, attachTo: hostRoot }));
    wrappers.push(mount(Owner, { attachTo: parent }));
    return dialog;
  }

  const Body = defineComponent({
    props: { close: { type: Function, default: undefined } },
    setup: () => () => h('div', [h('input', { class: 'field' }), h('button', { class: 'inner' }, 'x')]),
  });

  const sheets = () => document.querySelectorAll('.coar-sheet');
  const locked = () => document.documentElement.style.overflow === 'hidden';

  it('shrinks a sheet above a native keyboard, reveals the focused field and resets on dismissal', async () => {
    frameHeight = 874;
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(874);
    const dialog = mountIn();
    dialog.open(Body, { title: 'Edit', presentation: 'sheet' });
    await settle();
    const sheet = sheets()[0] as HTMLElement;
    const field = sheet.querySelector<HTMLInputElement>('.field')!;
    const scroller = field.parentElement!;
    Object.defineProperties(scroller, {
      scrollHeight: { value: 900, configurable: true },
      clientHeight: { value: 200, configurable: true },
    });
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({ top: 100, bottom: 400 } as DOMRect);
    vi.spyOn(field, 'getBoundingClientRect').mockReturnValue({ top: 450, bottom: 502 } as DOMRect);
    field.focus();
    await settle();
    scroller.scrollTop = 0;
    setCoarKeyboardInset(328);
    await settle();
    expect(sheet.style.bottom).toBe('328px');
    expect(sheet.style.maxHeight).toContain('546px');
    expect(scroller.scrollTop).toBe(102);
    expect(locked()).toBe(true);
    setCoarKeyboardInset(0);
    await settle();
    expect(sheet.style.bottom).toBe('');
    expect(sheet.style.maxHeight).toBe('');
  });

  it('does not apply the native keyboard inset to the default centered presentation', async () => {
    setCoarKeyboardInset(328);
    const dialog = mountIn();
    dialog.open(Body, { title: 'Edit' });
    await settle();
    const centered = document.querySelector<HTMLElement>('.coar-dialog')!;
    expect(centered.style.bottom).toBe('');
    expect(sheets()).toHaveLength(0);
    expect(locked()).toBe(false);
  });

  function pointer(target: Element, type: string, clientY: number) {
    const event = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', clientY });
    target.dispatchEvent(event);
  }

  describe('choice of shell', () => {
    it('opens the centered dialog without presentation, and leaves page scroll alone', async () => {
      const dialog = mountIn();
      dialog.open(Body, { title: 'Edit' });
      await settle();
      expect(document.querySelector('.coar-dialog')).not.toBeNull();
      expect(sheets()).toHaveLength(0);
      expect(locked()).toBe(false);
    });

    it('opens a sheet for open, confirm and alert', async () => {
      const dialog = mountIn();
      dialog.open(Body, { title: 'Edit', presentation: 'sheet' });
      dialog.confirm({ title: 'Delete?', message: 'Sure?', presentation: 'sheet' });
      dialog.alert('Saved', 'Done', { presentation: 'sheet' });
      await settle();
      expect(sheets()).toHaveLength(3);
      expect(document.querySelector('.coar-dialog')).toBeNull();
      const sheet = sheets()[0];
      expect(sheet.getAttribute('role')).toBe('dialog');
      expect(sheet.getAttribute('aria-modal')).toBe('true');
    });

    it('renders no cancel button in an alert sheet', async () => {
      const dialog = mountIn();
      dialog.alert('Saved', 'Done', { presentation: 'sheet' });
      await settle();
      const buttons = document.querySelectorAll('.coar-sheet-footer button');
      expect(Array.from(buttons).map((b) => b.textContent?.trim())).toEqual(['OK']);
    });

    it('takes the local .coar-mobile area along', async () => {
      const area = document.createElement('div');
      area.className = 'coar-mobile';
      document.body.appendChild(area);
      nodes.push(area);
      const dialog = mountIn(area);
      dialog.confirm({ title: 'Delete?', message: 'Sure?', presentation: 'sheet' });
      await settle();
      const host = sheets()[0].closest('.coar-overlay-host')!;
      expect(host.classList.contains('coar-mobile')).toBe(true);
    });
  });

  describe('ways of closing', () => {
    it('confirm resolves true and false from its buttons', async () => {
      const dialog = mountIn();
      const yes = dialog.confirm({ title: 'Delete?', message: 'Sure?', presentation: 'sheet' });
      await settle();
      // Confirming button is last in the markup, shown on top.
      const [cancel, confirm] = document.querySelectorAll<HTMLButtonElement>('.coar-sheet-footer button');
      expect(cancel.textContent?.trim()).toBe('Cancel');
      confirm.click();
      expect(await yes.result).toBe(true);

      const no = dialog.confirm({ title: 'Delete?', message: 'Sure?', presentation: 'sheet' });
      await settle();
      document.querySelectorAll<HTMLButtonElement>('.coar-sheet-footer button')[0].click();
      expect(await no.result).toBe(false);
      await settle();
      expect(sheets()).toHaveLength(0);
    });

    it('the close button resolves undefined', async () => {
      const dialog = mountIn();
      const ref = dialog.open(Body, { title: 'Edit', presentation: 'sheet' });
      await settle();
      document.querySelector<HTMLButtonElement>('.coar-sheet-close')!.click();
      expect(await ref.result).toBeUndefined();
    });

    it('a tap on the backdrop resolves undefined', async () => {
      const dialog = mountIn();
      const ref = dialog.open(Body, { presentation: 'sheet' });
      await settle();
      pointer(document.querySelector('.coar-overlay-backdrop')!, 'pointerdown', 10);
      expect(await ref.result).toBeUndefined();
      await settle();
      expect(sheets()).toHaveLength(0);
    });

    it('Escape resolves undefined', async () => {
      const dialog = mountIn();
      const ref = dialog.open(Body, { presentation: 'sheet' });
      await settle();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(await ref.result).toBeUndefined();
    });

    it('dragging the header down far enough resolves undefined', async () => {
      // happy-dom lays nothing out: the sheet is 400 px tall, the drag 300 px slow.
      vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(400);
      const dialog = mountIn();
      const ref = dialog.open(Body, { title: 'Edit', presentation: 'sheet' });
      await settle();
      const header = document.querySelector('.coar-sheet-header')!;
      pointer(header, 'pointerdown', 100);
      clock = 500;
      pointer(header, 'pointermove', 400);
      clock = 1000;
      pointer(header, 'pointerup', 400);
      expect(await ref.result).toBeUndefined();
      await settle();
      expect(sheets()).toHaveLength(0);
    });

    it('a short, slow drag at the handle springs back', async () => {
      const dialog = mountIn();
      dialog.open(Body, { presentation: 'sheet' });
      await settle();
      const handle = document.querySelector('.coar-sheet-handle-area')!;
      pointer(handle, 'pointerdown', 100);
      clock = 500;
      pointer(handle, 'pointermove', 105);
      await settle();
      expect((sheets()[0] as HTMLElement).style.translate).toBe('0 5px');
      clock = 1000;
      pointer(handle, 'pointerup', 105);
      await settle();
      expect(sheets()).toHaveLength(1);
      expect((sheets()[0] as HTMLElement).style.translate).toBe('');
    });

    it('dragging the content does not close it', async () => {
      const dialog = mountIn();
      dialog.open(Body, { presentation: 'sheet' });
      await settle();
      const body = document.querySelector('.coar-sheet-body')!;
      pointer(body, 'pointerdown', 100);
      clock = 50;
      pointer(body, 'pointerup', 600);
      await settle();
      expect(sheets()).toHaveLength(1);
    });
  });

  describe('dragToClose', () => {
    async function dragFar() {
      const handle = document.querySelector('.coar-sheet-handle-area')!;
      pointer(handle, 'pointerdown', 100);
      clock += 50;
      pointer(handle, 'pointerup', 600);
      await settle();
    }

    it('false keeps the sheet open on drag but not on a backdrop tap', async () => {
      const dialog = mountIn();
      const ref = dialog.open(Body, { presentation: 'sheet', dragToClose: false });
      await settle();
      expect(document.querySelector('.coar-sheet-handle')).toBeNull();
      await dragFar();
      expect(sheets()).toHaveLength(1);
      pointer(document.querySelector('.coar-overlay-backdrop')!, 'pointerdown', 10);
      expect(await ref.result).toBeUndefined();
    });

    it('follows closeOnBackdropClick: false', async () => {
      const dialog = mountIn();
      dialog.open(Body, { presentation: 'sheet', closeOnBackdropClick: false });
      await settle();
      await dragFar();
      pointer(document.querySelector('.coar-overlay-backdrop')!, 'pointerdown', 10);
      await settle();
      expect(sheets()).toHaveLength(1);
    });

    it('true overrides closeOnBackdropClick: false', async () => {
      const dialog = mountIn();
      const ref = dialog.open(Body, { presentation: 'sheet', closeOnBackdropClick: false, dragToClose: true });
      await settle();
      await dragFar();
      expect(await ref.result).toBeUndefined();
    });
  });

  describe('focus', () => {
    it('moves focus in, wraps Tab inside, and returns it on close', async () => {
      const dialog = mountIn();
      const opener = document.querySelector<HTMLButtonElement>('.opener')!;
      opener.focus();
      const ref = dialog.open(Body, { title: 'Edit', presentation: 'sheet' });
      await settle();
      const sheet = sheets()[0];
      expect(sheet.contains(document.activeElement)).toBe(true);

      const last = sheet.querySelector<HTMLButtonElement>('.inner')!;
      last.focus();
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      document.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(sheet.querySelector('.coar-sheet-close'));

      ref.close();
      await settle();
      expect(document.activeElement).toBe(opener);
    });
  });

  describe('page scroll lock', () => {
    it('is set while a sheet is open and released on close', async () => {
      const dialog = mountIn();
      const ref = dialog.open(Body, { presentation: 'sheet' });
      await settle();
      expect(locked()).toBe(true);
      ref.close();
      await settle();
      expect(locked()).toBe(false);
    });

    it('stays set until the last of two sheets closes', async () => {
      const dialog = mountIn();
      const first = dialog.open(Body, { presentation: 'sheet' });
      const second = dialog.confirm({ title: 'Sure?', message: '', presentation: 'sheet' });
      await settle();
      expect(locked()).toBe(true);
      first.close();
      await settle();
      expect(locked()).toBe(true);
      second.close(false);
      await settle();
      expect(locked()).toBe(false);
    });

    it('is not set by a centered dialog opened over a sheet, and not released by it', async () => {
      const dialog = mountIn();
      const sheet = dialog.open(Body, { presentation: 'sheet' });
      const centered = dialog.confirm({ title: 'Sure?', message: '' });
      await settle();
      centered.close(false);
      await settle();
      expect(locked()).toBe(true);
      sheet.close();
      await settle();
      expect(locked()).toBe(false);
    });
  });
});
