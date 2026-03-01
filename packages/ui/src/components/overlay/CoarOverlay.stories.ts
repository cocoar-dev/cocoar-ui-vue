/* eslint-disable vue/one-component-per-file */
import type { Meta, StoryObj } from '@storybook/vue3';
import { defineComponent, h, ref, provide } from 'vue';
import CoarOverlayHost from './CoarOverlayHost.vue';
import { OVERLAY_SERVICE_KEY } from './useOverlay';
import { createOverlayService } from './overlay-service';
import { menuPreset, modalPreset, tooltipPreset } from './overlay-presets';
import type { OverlayRef } from './overlay-types';

const meta: Meta = {
  title: 'Overlay/Overlay System',
  tags: ['autodocs'],
};

export default meta;

export const MenuDropdown: StoryObj = {
  render: () => ({
    components: { CoarOverlayHost },
    setup() {
      const service = createOverlayService();
      provide(OVERLAY_SERVICE_KEY, service);

      const buttonRef = ref<HTMLElement | null>(null);
      const overlayRef = ref<OverlayRef | null>(null);

      function toggle() {
        if (overlayRef.value && !overlayRef.value.isClosed) {
          overlayRef.value.close();
          overlayRef.value = null;
          return;
        }

        const DropdownContent = defineComponent({
          setup() {
            const items = ['Edit', 'Duplicate', 'Archive', 'Delete'];
            return () =>
              h('div', {
                style: {
                  background: 'var(--coar-background-neutral-primary)',
                  border: '1px solid var(--coar-border-neutral)',
                  borderRadius: 'var(--coar-radius-s)',
                  boxShadow: 'var(--coar-shadow-m)',
                  padding: 'var(--coar-spacing-xs) 0',
                  minWidth: '160px',
                },
              }, items.map((item) =>
                h('div', {
                  style: {
                    padding: 'var(--coar-spacing-s) var(--coar-spacing-m)',
                    cursor: 'pointer',
                    fontFamily: 'var(--coar-body-small-base-family)',
                    fontSize: 'var(--coar-body-small-base-size)',
                    color: item === 'Delete'
                      ? 'var(--coar-text-semantic-error-bold)'
                      : 'var(--coar-text-neutral-primary)',
                  },
                  onMouseenter: (e: MouseEvent) => {
                    (e.target as HTMLElement).style.background = 'var(--coar-background-neutral-tertiary)';
                  },
                  onMouseleave: (e: MouseEvent) => {
                    (e.target as HTMLElement).style.background = '';
                  },
                  onClick: () => {
                    overlayRef.value?.close(item);
                    overlayRef.value = null;
                  },
                }, item),
              ));
          },
        });

        overlayRef.value = service.open({
          spec: {
            ...menuPreset,
            anchor: { kind: 'element', element: buttonRef.value! },
          },
          content: { kind: 'component', component: DropdownContent },
        });
      }

      return { buttonRef, toggle };
    },
    template: `
      <div style="padding: 80px;">
        <button ref="buttonRef" @click="toggle" style="
          padding: 8px 16px;
          border: 1px solid var(--coar-border-input);
          border-radius: var(--coar-radius-xs);
          background: var(--coar-surface-input);
          color: var(--coar-text-neutral-primary);
          cursor: pointer;
          font-family: var(--coar-body-small-base-family);
        ">
          Open Menu ▾
        </button>
        <CoarOverlayHost />
      </div>
    `,
  }),
};

export const ModalDialog: StoryObj = {
  render: () => ({
    components: { CoarOverlayHost },
    setup() {
      const service = createOverlayService();
      provide(OVERLAY_SERVICE_KEY, service);

      function openModal() {
        const DialogContent = defineComponent({
          props: { title: { type: String, default: '' } },
          emits: ['close'],
          setup(props) {
            return () =>
              h('div', {
                style: {
                  background: 'var(--coar-background-neutral-primary)',
                  borderRadius: 'var(--coar-radius-m)',
                  padding: 'var(--coar-spacing-l)',
                  minWidth: '400px',
                  maxWidth: '500px',
                  boxShadow: 'var(--coar-shadow-l)',
                },
              }, [
                h('h2', {
                  style: {
                    margin: '0 0 var(--coar-spacing-m)',
                    fontFamily: 'var(--coar-heading-h4-family)',
                    fontSize: 'var(--coar-heading-h4-size)',
                    fontWeight: 'var(--coar-heading-h4-weight)',
                    color: 'var(--coar-text-neutral-primary)',
                  },
                }, props.title ?? 'Dialog'),
                h('p', {
                  style: {
                    margin: '0 0 var(--coar-spacing-l)',
                    fontFamily: 'var(--coar-body-small-base-family)',
                    fontSize: 'var(--coar-body-small-base-size)',
                    color: 'var(--coar-text-neutral-secondary)',
                  },
                }, 'This is a modal dialog rendered using the overlay system. It has a backdrop, focus trapping, and dismisses on Escape.'),
                h('div', { style: { display: 'flex', gap: 'var(--coar-spacing-s)', justifyContent: 'flex-end' } }, [
                  h('button', {
                    style: 'padding: 8px 16px; border: 1px solid var(--coar-border-input); border-radius: var(--coar-radius-xs); background: transparent; color: var(--coar-text-neutral-primary); cursor: pointer;',
                    onClick: () => ref?.close('cancel'),
                  }, 'Cancel'),
                  h('button', {
                    style: 'padding: 8px 16px; border: none; border-radius: var(--coar-radius-xs); background: var(--coar-background-accent-primary); color: var(--coar-text-always-light); cursor: pointer;',
                    onClick: () => ref?.close('confirm'),
                  }, 'Confirm'),
                ]),
              ]);
          },
        });

        const ref = service.open({
          spec: modalPreset,
          content: { kind: 'component', component: DialogContent },
          inputs: { title: 'Confirm Action' },
        });

        ref.afterClosed.then((result) => {
          console.log('Dialog closed with:', result);
        });
      }

      return { openModal };
    },
    template: `
      <div style="padding: 80px;">
        <button @click="openModal" style="
          padding: 8px 16px;
          border: none;
          border-radius: var(--coar-radius-xs);
          background: var(--coar-background-accent-primary);
          color: var(--coar-text-always-light);
          cursor: pointer;
          font-family: var(--coar-body-small-base-family);
        ">
          Open Modal
        </button>
        <CoarOverlayHost />
      </div>
    `,
  }),
};

export const TooltipStyle: StoryObj = {
  render: () => ({
    components: { CoarOverlayHost },
    setup() {
      const service = createOverlayService();
      provide(OVERLAY_SERVICE_KEY, service);
      let ref: OverlayRef | null = null;

      function show(el: HTMLElement) {
        if (ref && !ref.isClosed) return;

        const TooltipContent = defineComponent({
          setup() {
            return () => h('div', {
              style: {
                background: 'var(--coar-background-neutral-inverted, #333)',
                color: 'var(--coar-text-always-light, #fff)',
                padding: 'var(--coar-spacing-xs) var(--coar-spacing-s)',
                borderRadius: 'var(--coar-radius-xs)',
                fontFamily: 'var(--coar-body-caption-family)',
                fontSize: 'var(--coar-body-caption-size)',
                maxWidth: '200px',
              },
            }, 'This is a tooltip positioned with the overlay system');
          },
        });

        ref = service.open({
          spec: {
            ...tooltipPreset,
            anchor: { kind: 'element', element: el },
            position: { placement: ['top', 'bottom'], offset: 8, flip: true, shift: true },
          },
          content: { kind: 'component', component: TooltipContent },
        });
      }

      function hide() {
        ref?.close();
        ref = null;
      }

      return { show, hide };
    },
    template: `
      <div style="padding: 120px; text-align: center;">
        <span
          @mouseenter="show($event.target)"
          @mouseleave="hide"
          style="
            padding: 8px 16px;
            border: 1px dashed var(--coar-border-neutral);
            border-radius: var(--coar-radius-xs);
            cursor: help;
            font-family: var(--coar-body-small-base-family);
            color: var(--coar-text-neutral-primary);
          "
        >
          Hover me for tooltip
        </span>
        <CoarOverlayHost />
      </div>
    `,
  }),
};
