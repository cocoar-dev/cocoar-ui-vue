import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, type Component } from 'vue';
import CoarToastContainerRaw from './CoarToastContainer.vue';
import {
  createToastService,
  registerToastService,
  _resetToastServiceModule,
} from './toast-service';

const CoarToastContainer = CoarToastContainerRaw as Component;

afterEach(() => _resetToastServiceModule());

describe('CoarToastContainer — default service (#2)', () => {
  it('renders without :service by defaulting to the registered singleton', async () => {
    const svc = createToastService();
    registerToastService(svc);
    // Previously this threw `Cannot read properties of undefined (reading 'position')`.
    const wrapper = mount(CoarToastContainer);
    expect(wrapper.find('.coar-toast-container').exists()).toBe(true);
    // The crash site was reading `service.position.value` — assert it resolved.
    expect(wrapper.find('.coar-toast-container--top-right').exists()).toBe(true);

    svc.success('Saved');
    await nextTick();
    expect(wrapper.findAll('.coar-toast').length).toBeGreaterThan(0);
  });

  it('an explicit :service still wins over the default', () => {
    registerToastService(createToastService()); // a singleton is present…
    const explicit = createToastService();
    explicit.setPosition('bottom-left');
    const wrapper = mount(CoarToastContainer, { props: { service: explicit } });
    // …but the explicitly-passed service drives the rendered position.
    expect(wrapper.find('.coar-toast-container--bottom-left').exists()).toBe(true);
  });

  it('throws a clear "install CoarOverlayPlugin" error when neither :service nor plugin is present', () => {
    _resetToastServiceModule();
    expect(() => mount(CoarToastContainer)).toThrow(/CoarOverlayPlugin/);
  });
});
