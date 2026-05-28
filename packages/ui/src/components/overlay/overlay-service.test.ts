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

  it('outside-click dismisses an anchored panel stacked above a modal', () => {
    const service = createOverlayService();

    // Modal-like overlay whose content the user will click inside.
    const modalHost = document.createElement('div');
    const modalPanel = document.createElement('div');
    modalHost.appendChild(modalPanel);
    document.body.appendChild(modalHost);
    const modal = service.open({ spec: modalPreset, content: { kind: 'slot' } });
    service.onPanelMounted(service.instances.value[0], modalPanel, modalHost);

    // Anchored panel (e.g. date picker) opened from inside the modal — teleported
    // to body, stacked above the modal, NOT a tree-child of it.
    const pickerHost = document.createElement('div');
    const pickerPanel = document.createElement('div');
    pickerHost.appendChild(pickerPanel);
    document.body.appendChild(pickerHost);
    const picker = service.open({ spec: selectPreset, content: { kind: 'slot' } });
    service.onPanelMounted(service.instances.value[1], pickerPanel, pickerHost);

    expect(service.instances.value).toHaveLength(2);

    // Click inside the modal content but outside the picker panel.
    const clickTarget = document.createElement('button');
    modalPanel.appendChild(clickTarget);
    clickTarget.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));

    // Picker dismisses; modal stays open.
    expect(picker.isClosed).toBe(true);
    expect(modal.isClosed).toBe(false);

    service.closeAll();
    document.body.removeChild(modalHost);
    document.body.removeChild(pickerHost);
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
    // role intentionally unset — the select panels render their own inner `role="listbox"`
    // element; adding it on the host would duplicate and misplace aria-multiselectable.
    expect(selectPreset.a11y?.role).toBeUndefined();
    expect(selectPreset.size?.minWidth).toBe('anchor');
    expect(selectPreset.dismiss?.escapeKey).toBe(true);
  });
});
