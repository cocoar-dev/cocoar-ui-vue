import { describe, it, expect } from 'vitest';
import { createOverlayService } from './overlay-service';
import { modalPreset, menuPreset, selectPreset, tooltipPreset } from './overlay-presets';

describe('overlay-service', () => {
  it('creates a service with empty instances', () => {
    const service = createOverlayService();
    expect(service.instances.value).toHaveLength(0);
  });

  it('opens an overlay and adds to instances', () => {
    const service = createOverlayService();
    const ref = service.open({
      spec: { ...menuPreset, anchor: { kind: 'virtual', placement: 'center' } },
      content: { kind: 'slot' },
    });
    expect(service.instances.value).toHaveLength(1);
    expect(ref.isClosed).toBe(false);
  });

  it('closes an overlay and removes from instances', () => {
    const service = createOverlayService();
    const ref = service.open({
      spec: { ...menuPreset, anchor: { kind: 'virtual', placement: 'center' } },
      content: { kind: 'slot' },
    });
    ref.close('ok');
    expect(service.instances.value).toHaveLength(0);
    expect(ref.isClosed).toBe(true);
  });

  it('afterClosed resolves with result', async () => {
    const service = createOverlayService();
    const ref = service.open({
      spec: { anchor: { kind: 'virtual', placement: 'center' } },
      content: { kind: 'slot' },
    });
    ref.close('done');
    const result = await ref.afterClosed;
    expect(result).toBe('done');
  });

  it('closeAll closes all overlays', () => {
    const service = createOverlayService();
    service.open({
      spec: { anchor: { kind: 'virtual', placement: 'center' } },
      content: { kind: 'slot' },
    });
    service.open({
      spec: { anchor: { kind: 'virtual', placement: 'center' } },
      content: { kind: 'slot' },
    });
    expect(service.instances.value).toHaveLength(2);
    service.closeAll();
    expect(service.instances.value).toHaveLength(0);
  });

  it('resolves spec defaults', () => {
    const service = createOverlayService();
    service.open({
      spec: {},
      content: { kind: 'slot' },
    });
    const instance = service.instances.value[0];
    expect(instance.spec.backdrop.kind).toBe('none');
    expect(instance.spec.dismiss.escapeKey).toBe(true);
    expect(instance.spec.scroll.strategy).toBe('reposition');
  });

  it('applies preset spec', () => {
    const service = createOverlayService();
    service.open({
      spec: modalPreset,
      content: { kind: 'slot' },
    });
    const instance = service.instances.value[0];
    expect(instance.spec.backdrop.kind).toBe('modal');
    expect(instance.spec.focus.trap).toBe(true);
    expect(instance.spec.a11y.role).toBe('dialog');
  });

  it('passes inputs to instance', () => {
    const service = createOverlayService();
    service.open({
      spec: { anchor: { kind: 'virtual', placement: 'center' } },
      content: { kind: 'slot' },
      inputs: { title: 'Hello', count: 42 },
    });
    const instance = service.instances.value[0];
    expect(instance.inputs).toEqual({ title: 'Hello', count: 42 });
  });

  it('assigns unique IDs', () => {
    const service = createOverlayService();
    service.open({
      spec: { anchor: { kind: 'virtual', placement: 'center' } },
      content: { kind: 'slot' },
    });
    service.open({
      spec: { anchor: { kind: 'virtual', placement: 'center' } },
      content: { kind: 'slot' },
    });
    const ids = service.instances.value.map((i) => i.id);
    expect(ids[0]).not.toBe(ids[1]);
    service.closeAll();
  });

  it('double close is safe', () => {
    const service = createOverlayService();
    const ref = service.open({
      spec: { anchor: { kind: 'virtual', placement: 'center' } },
      content: { kind: 'slot' },
    });
    ref.close();
    ref.close(); // should not throw
    expect(ref.isClosed).toBe(true);
  });

  it('parent-child overlay tree', () => {
    const service = createOverlayService();
    const parent = service.open({
      spec: menuPreset,
      content: { kind: 'slot' },
    });
    const child = service.open({
      spec: menuPreset,
      content: { kind: 'slot' },
      parent,
    });
    expect(service.instances.value).toHaveLength(2);
    // Closing parent should also close child
    parent.close();
    expect(service.instances.value).toHaveLength(0);
    expect(child.isClosed).toBe(true);
  });
});

describe('overlay-presets', () => {
  it('tooltipPreset has correct config', () => {
    expect(tooltipPreset.a11y?.role).toBe('tooltip');
    expect(tooltipPreset.dismiss?.outsideClick).toBe(false);
    expect(tooltipPreset.focus?.trap).toBe(false);
  });

  it('modalPreset has correct config', () => {
    expect(modalPreset.a11y?.role).toBe('dialog');
    expect(modalPreset.backdrop?.kind).toBe('modal');
    expect(modalPreset.focus?.trap).toBe(true);
  });

  it('menuPreset has correct config', () => {
    expect(menuPreset.a11y?.role).toBe('menu');
    expect(menuPreset.scroll?.strategy).toBe('close');
    expect(menuPreset.dismiss?.outsideClick).toBe(true);
  });

  it('selectPreset has correct config', () => {
    expect(selectPreset.a11y?.role).toBe('listbox');
    expect(selectPreset.size?.minWidth).toBe('anchor');
    expect(selectPreset.dismiss?.escapeKey).toBe(true);
  });
});
