import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { CoarOverlayPlugin } from '@cocoar/vue-ui';
import ImageInsertDialog from './ImageInsertDialog.vue';

const globalConfig = { plugins: [CoarOverlayPlugin] };

function buttonByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((b) => b.text() === text)!;
}

describe('ImageInsertDialog', () => {
  it('disables Insert until a URL is entered', async () => {
    const wrapper = mount(ImageInsertDialog, { props: { close: vi.fn() }, global: globalConfig });
    expect(buttonByText(wrapper, 'Insert').attributes('disabled')).toBeDefined();

    await wrapper.find('input').setValue('https://x.test/a.png');
    expect(buttonByText(wrapper, 'Insert').attributes('disabled')).toBeUndefined();
  });

  it('resolves with trimmed url/alt/title on Insert', async () => {
    const close = vi.fn();
    const wrapper = mount(ImageInsertDialog, { props: { close }, global: globalConfig });
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('  https://x.test/a.png  ');
    await inputs[1]!.setValue('  Alt text  ');
    await inputs[2]!.setValue('  My title  ');

    await buttonByText(wrapper, 'Insert').trigger('click');

    expect(close).toHaveBeenCalledWith({
      url: 'https://x.test/a.png',
      alt: 'Alt text',
      title: 'My title',
    });
  });

  it('does not resolve a value on Cancel', async () => {
    const close = vi.fn();
    const wrapper = mount(ImageInsertDialog, { props: { close }, global: globalConfig });
    await wrapper.find('input').setValue('https://x.test/a.png');

    await buttonByText(wrapper, 'Cancel').trigger('click');

    expect(close).toHaveBeenCalledWith();
  });

  it('seeds fields from initial props', async () => {
    const wrapper = mount(ImageInsertDialog, {
      props: { close: vi.fn(), initialUrl: 'https://x.test/seed.png', initialAlt: 'Seed' },
      global: globalConfig,
    });
    await nextTick();
    const inputs = wrapper.findAll('input');
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('https://x.test/seed.png');
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('Seed');
  });
});
