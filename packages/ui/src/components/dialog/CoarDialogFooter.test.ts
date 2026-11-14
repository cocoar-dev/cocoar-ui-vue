import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { defineComponent, h, nextTick, ref } from 'vue';
import CoarOverlayHost from '../overlay/CoarOverlayHost.vue';
import { CoarOverlayPlugin, _resetOverlayServiceForTests } from '../overlay/useOverlay';
import { useDialog } from './useDialog';
import CoarDialogFooter from './CoarDialogFooter.vue';

/**
 * `CoarDialogFooter` with the real overlay service: its buttons move into the shell's fixed
 * footer, the footer element exists only while one is mounted, and outside a shell it renders
 * in place.
 */
describe('CoarDialogFooter', () => {
  const wrappers: VueWrapper[] = [];
  const nodes: Element[] = [];

  afterEach(async () => {
    wrappers.splice(0).forEach((w) => w.unmount());
    _resetOverlayServiceForTests();
    document.querySelectorAll('.coar-overlay-host, .coar-overlay-backdrop').forEach((n) => n.remove());
    nodes.splice(0).forEach((n) => n.remove());
    document.documentElement.style.overflow = '';
    await settle();
  });

  async function settle() {
    for (let i = 0; i < 4; i++) await nextTick();
  }

  function mountHost() {
    let dialog!: ReturnType<typeof useDialog>;
    const Owner = defineComponent({
      setup() {
        dialog = useDialog();
        return () => h('div', 'owner');
      },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    nodes.push(root);
    wrappers.push(mount(CoarOverlayHost, { global: { plugins: [CoarOverlayPlugin] }, attachTo: root }));
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    nodes.push(parent);
    wrappers.push(mount(Owner, { attachTo: parent }));
    return dialog;
  }

  const showFooter = ref(true);
  const FormBody = defineComponent({
    props: { close: { type: Function, default: undefined } },
    setup: (props) => () =>
      h('div', { class: 'form' }, [
        h('input', { class: 'field' }),
        showFooter.value
          ? h(CoarDialogFooter, null, () => [
              h('button', { class: 'cancel', onClick: () => props.close?.() }, 'Cancel'),
              h('button', { class: 'save', onClick: () => props.close?.('saved') }, 'Save'),
            ])
          : null,
      ]),
  });
  const PlainBody = defineComponent({ setup: () => () => h('p', { class: 'plain' }, 'text') });

  for (const presentation of ['dialog', 'sheet'] as const) {
    const shell = presentation === 'sheet' ? '.coar-sheet' : '.coar-dialog';
    const footerSel = presentation === 'sheet' ? '.coar-sheet-footer' : '.coar-dialog-footer';
    const bodySel = presentation === 'sheet' ? '.coar-sheet-body' : '.coar-dialog-body';

    describe(presentation, () => {
      it('moves the buttons into the fixed footer, out of the scrolling body', async () => {
        showFooter.value = true;
        const dialog = mountHost();
        dialog.open(FormBody, { title: 'Edit', presentation });
        await settle();
        const footer = document.querySelector(`${shell} ${footerSel}`)!;
        expect(footer).not.toBeNull();
        expect([...footer.children].map((c) => c.className)).toEqual(['cancel', 'save']);
        expect(document.querySelector(`${bodySel} .save`)).toBeNull();
        expect(document.querySelector(`${bodySel} .field`)).not.toBeNull();
      });

      it('the buttons still close with their result', async () => {
        showFooter.value = true;
        const dialog = mountHost();
        const ref = dialog.open<string>(FormBody, { title: 'Edit', presentation });
        await settle();
        (document.querySelector(`${footerSel} .save`) as HTMLElement).click();
        await expect(ref.result).resolves.toBe('saved');
        await settle();
        expect(document.querySelector(shell)).toBeNull();
      });

      it('renders no footer element without it', async () => {
        const dialog = mountHost();
        dialog.open(PlainBody, { title: 'Info', presentation });
        await settle();
        expect(document.querySelector(shell)).not.toBeNull();
        expect(document.querySelector(footerSel)).toBeNull();
      });

      it('removes the footer element when it unmounts', async () => {
        showFooter.value = true;
        const dialog = mountHost();
        dialog.open(FormBody, { title: 'Edit', presentation });
        await settle();
        expect(document.querySelector(footerSel)).not.toBeNull();
        showFooter.value = false;
        await settle();
        expect(document.querySelector(footerSel)).toBeNull();
        showFooter.value = true;
        await settle();
        expect(document.querySelector(`${footerSel} .save`)).not.toBeNull();
      });
    });
  }

  it('leaves the DOM of a centered dialog without it exactly as before', async () => {
    const dialog = mountHost();
    dialog.open(PlainBody, { title: 'Info' });
    await settle();
    const el = document.querySelector('.coar-dialog')!;
    expect([...el.children].map((c) => c.className)).toEqual(['coar-dialog-header', 'coar-dialog-body']);
  });

  it('renders its slot in place outside a dialog or sheet', () => {
    const w = mount(defineComponent({
      setup: () => () => h('div', { class: 'page' }, [h(CoarDialogFooter, null, () => h('button', { class: 'save' }, 'Save'))]),
    }));
    wrappers.push(w);
    expect(w.find('.page > .save').exists()).toBe(true);
  });
});
