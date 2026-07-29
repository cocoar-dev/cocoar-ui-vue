import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, inject } from 'vue';
import CoarFormField from './CoarFormField.vue';
import { FORM_FIELD_INJECTION_KEY } from './constants';

// Helper child component that exposes injected FormField context
const InjectionProbe = defineComponent({
  setup() {
    const formField = inject(FORM_FIELD_INJECTION_KEY, undefined);
    return { formField };
  },
  template: `<div>
    <span class="probe-id">{{ formField?.inputId.value }}</span>
    <span class="probe-msg-id">{{ formField?.messageId.value }}</span>
    <span class="probe-error">{{ formField?.hasError.value }}</span>
    <span class="probe-disabled">{{ formField?.disabled.value }}</span>
  </div>`,
});

function mountField(props: Record<string, unknown> = {}, slotContent = '<input />') {
  return mount(CoarFormField, {
    props,
    slots: { default: slotContent },
    attachTo: document.body,
  });
}

describe('CoarFormField', () => {
  describe('rendering', () => {
    it('renders default slot content', () => {
      const wrapper = mountField({}, '<input class="my-input" />');
      expect(wrapper.find('.my-input').exists()).toBe(true);
    });

    it('renders label when provided', () => {
      const wrapper = mountField({ label: 'Email' });
      const label = wrapper.find('.coar-form-field__label');
      expect(label.exists()).toBe(true);
      expect(label.text()).toContain('Email');
    });

    it('does not render label when not provided', () => {
      const wrapper = mountField();
      expect(wrapper.find('.coar-form-field__label').exists()).toBe(false);
    });

    it('shows required asterisk when required is true', () => {
      const wrapper = mountField({ label: 'Name', required: true });
      expect(wrapper.find('.coar-form-field__required').exists()).toBe(true);
      expect(wrapper.find('.coar-form-field__required').text()).toBe('*');
    });

    it('does not show required asterisk when not required', () => {
      const wrapper = mountField({ label: 'Name' });
      expect(wrapper.find('.coar-form-field__required').exists()).toBe(false);
    });

    it.each([
      ['stacked', 'before'],
      ['stacked', 'after'],
      ['inline', 'before'],
      ['inline', 'after'],
    ] as const)('renders layout=%s with labelPosition=%s', (layout, labelPosition) => {
      const wrapper = mountField({ label: 'Name', layout, labelPosition });
      const host = wrapper.find('.coar-form-field');
      expect(host.classes()).toContain(`coar-form-field--${layout}`);
      expect(host.classes()).toContain(`coar-form-field--label-${labelPosition}`);
    });

    it('defaults to stacked with the label before the control', () => {
      const host = mountField({ label: 'Name' }).find('.coar-form-field');
      expect(host.classes()).toContain('coar-form-field--stacked');
      expect(host.classes()).toContain('coar-form-field--label-before');
    });

    it('places the status trigger before or after the native label to match labelPosition', () => {
      const before = mountField({ label: 'Name', hint: 'Help', labelPosition: 'before' });
      const after = mountField({ label: 'Name', hint: 'Help', labelPosition: 'after' });
      const beforeChildren = Array.from(
        before.find('.coar-form-field__label-cluster').element.children,
      );
      const afterChildren = Array.from(
        after.find('.coar-form-field__label-cluster').element.children,
      );
      expect(beforeChildren[0]?.classList.contains('coar-form-field__status-popover')).toBe(true);
      expect(afterChildren.at(-1)?.classList.contains('coar-form-field__status-popover')).toBe(
        true,
      );
      expect(before.find('label .coar-form-field__status-popover').exists()).toBe(false);
      expect(after.find('label .coar-form-field__status-popover').exists()).toBe(false);
    });
  });

  describe('status icon — severity selection', () => {
    it('does NOT render the icon when no status is set', () => {
      const wrapper = mountField({ label: 'Email' });
      expect(wrapper.find('.coar-form-field__status-icon').exists()).toBe(false);
    });

    it('renders a grey info icon when only hint is set', () => {
      const wrapper = mountField({ label: 'Email', hint: 'We never share your email.' });
      const icon = wrapper.find('.coar-form-field__status-icon');
      expect(icon.exists()).toBe(true);
      expect(icon.classes()).toContain('coar-form-field__status-icon--hint');
    });

    it('renders an orange triangle-alert icon when only warning is set', () => {
      const wrapper = mountField({ label: 'Email', warning: 'Looks unusual.' });
      const icon = wrapper.find('.coar-form-field__status-icon');
      expect(icon.exists()).toBe(true);
      expect(icon.classes()).toContain('coar-form-field__status-icon--warning');
    });

    it('renders a red circle-alert icon when error is set', () => {
      const wrapper = mountField({ label: 'Email', error: 'Required' });
      const icon = wrapper.find('.coar-form-field__status-icon');
      expect(icon.exists()).toBe(true);
      expect(icon.classes()).toContain('coar-form-field__status-icon--error');
    });

    it('error severity wins over warning + hint combined', () => {
      const wrapper = mountField({
        label: 'Email',
        hint: 'h',
        warning: 'w',
        error: 'e',
      });
      expect(wrapper.find('.coar-form-field__status-icon').classes()).toContain(
        'coar-form-field__status-icon--error',
      );
    });

    it('warning severity wins over hint when no error', () => {
      const wrapper = mountField({
        label: 'Email',
        hint: 'h',
        warning: 'w',
      });
      expect(wrapper.find('.coar-form-field__status-icon').classes()).toContain(
        'coar-form-field__status-icon--warning',
      );
    });

    it('rules with only unfulfilled pending items → grey hint icon', () => {
      // No success items in the popover yet (nothing's fulfilled), only
      // pending ○ entries → grey info. Same whether or not the user has
      // started typing (the icon's color is "what the popover looks like",
      // not "have you interacted yet").
      const wrapper = mountField({
        label: 'Password',
        rules: [{ label: 'At least 8 chars', fulfilled: false }],
      });
      const icon = wrapper.find('.coar-form-field__status-icon');
      expect(icon.exists()).toBe(true);
      expect(icon.classes()).toContain('coar-form-field__status-icon--hint');
    });

    it('any fulfilled checklist rule → green success icon (popover has a ✓)', () => {
      // The severity model is "highest severity visible in the popover".
      // Once a ✓ shows up, the icon flips green even if other rules are
      // still pending. Positive reinforcement — the hover popover still
      // reveals the unfulfilled rules as ○ for "could do more".
      const wrapper = mountField({
        label: 'Password',
        rules: [
          { label: 'At least 8 chars', fulfilled: true },
          { label: 'Has uppercase', fulfilled: false },
        ],
      });
      expect(wrapper.find('.coar-form-field__status-icon').classes()).toContain(
        'coar-form-field__status-icon--success',
      );
    });

    it('all rules fulfilled → green success icon', () => {
      const wrapper = mountField({
        label: 'Password',
        rules: [
          { label: 'At least 8 chars', fulfilled: true },
          { label: 'Has uppercase', fulfilled: true },
        ],
      });
      expect(wrapper.find('.coar-form-field__status-icon').classes()).toContain(
        'coar-form-field__status-icon--success',
      );
    });

    it('error severity wins over success — even if some rules are fulfilled', () => {
      const wrapper = mountField({
        label: 'Password',
        rules: [{ label: 'At least 8 chars', fulfilled: true }],
        error: 'Server rejected this password',
      });
      expect(wrapper.find('.coar-form-field__status-icon').classes()).toContain(
        'coar-form-field__status-icon--error',
      );
    });

    it('rule with whenFail=error + unfulfilled → red error severity', () => {
      // Live-validation pattern: max-length check that flips to error the
      // moment the user types past the limit.
      const wrapper = mountField({
        label: 'Title',
        rules: [{ label: 'Max 20 characters', fulfilled: false, whenFail: 'error' }],
      });
      expect(wrapper.find('.coar-form-field__status-icon').classes()).toContain(
        'coar-form-field__status-icon--error',
      );
    });

    it('rule with whenFail=warning + unfulfilled → orange warning severity', () => {
      const wrapper = mountField({
        label: 'URL',
        rules: [{ label: 'Tracking params detected', fulfilled: false, whenFail: 'warning' }],
      });
      expect(wrapper.find('.coar-form-field__status-icon').classes()).toContain(
        'coar-form-field__status-icon--warning',
      );
    });

    it('rule with whenPass=hide that is fulfilled does NOT trigger success', () => {
      // Pure live-validation: when satisfied, no popover item, no icon
      // ("no problem" is the natural state — nothing to celebrate).
      const wrapper = mountField({
        label: 'Title',
        rules: [{ label: 'Max 20 chars', fulfilled: true, whenPass: 'hide', whenFail: 'error' }],
      });
      expect(wrapper.find('.coar-form-field__status-icon').exists()).toBe(false);
    });

    it('mixing checklist + live-error rules: error wins over success', () => {
      const wrapper = mountField({
        label: 'Password',
        rules: [
          { label: 'At least 8 chars', fulfilled: true }, // checklist, fulfilled → ✓
          { label: 'No spaces', fulfilled: false, whenFail: 'error' }, // live error
        ],
      });
      expect(wrapper.find('.coar-form-field__status-icon').classes()).toContain(
        'coar-form-field__status-icon--error',
      );
    });

    it('rule with whenFail=error contributes to hasError injection (drives aria-invalid)', () => {
      const wrapper = mount(CoarFormField, {
        props: {
          label: 'Title',
          rules: [{ label: 'Max 20 chars', fulfilled: false, whenFail: 'error' }],
        },
        slots: { default: InjectionProbe },
        attachTo: document.body,
      });
      expect(wrapper.find('.probe-error').text()).toBe('true');
    });

    it('X-of-Y pattern: aggregate fulfilled + some pending unfulfilled → green (any ✓ wins)', () => {
      // The aggregate validity-gate passes (hidden via whenPass='hide').
      // 3 individual rules fulfilled, 1 unfulfilled. Popover has 3 ✓ + 1 ○.
      // Severity: highest visible = success → green icon. The ○ still
      // shows in the popover for "could do more" detail.
      const wrapper = mountField({
        label: 'Password',
        rules: [
          { label: 'Uppercase', fulfilled: true },
          { label: 'Lowercase', fulfilled: true },
          { label: 'Digit', fulfilled: true },
          { label: 'Symbol', fulfilled: false },
          {
            label: 'At least 3 of these',
            fulfilled: true,
            whenPass: 'hide',
            whenFail: 'error',
          },
        ],
      });
      expect(wrapper.find('.coar-form-field__status-icon').classes()).toContain(
        'coar-form-field__status-icon--success',
      );
    });
  });

  // The popover panel is its own component (CoarFormFieldStatusPanel) so the
  // section layout is testable without the overlay service. CoarFormField
  // just feeds it the same props it normalizes for the SR-only spans.
  describe('CoarFormFieldStatusPanel — popover content', () => {
    it('renders only a hint section when only hint is set', async () => {
      const Panel = (await import('./CoarFormFieldStatusPanel.vue')).default;
      const wrapper = mount(Panel, {
        props: { hint: 'Help', rules: [], errors: [], warnings: [] },
      });
      const sections = wrapper.findAll('.coar-form-field__status-section');
      expect(sections.length).toBe(1);
      expect(sections[0].classes()).toContain('coar-form-field__status-section--hint');
      expect(sections[0].find('.coar-form-field__status-section-icon').exists()).toBe(true);
      expect(sections[0].text()).toContain('Help');
    });

    it('renders an error section that lists every error', async () => {
      const Panel = (await import('./CoarFormFieldStatusPanel.vue')).default;
      const wrapper = mount(Panel, {
        props: {
          hint: '',
          rules: [],
          errors: ['Too short', 'Needs an uppercase letter'],
          warnings: [],
        },
      });
      const errorSection = wrapper.find('.coar-form-field__status-section--error');
      expect(errorSection.exists()).toBe(true);
      expect(errorSection.find('.coar-form-field__status-section-icon').exists()).toBe(true);
      const items = errorSection.findAll('.coar-form-field__status-section-body > p');
      expect(items.length).toBe(2);
      expect(items[0].text()).toBe('Too short');
      expect(items[1].text()).toBe('Needs an uppercase letter');
    });

    it('renders a warning section that lists every warning', async () => {
      const Panel = (await import('./CoarFormFieldStatusPanel.vue')).default;
      const wrapper = mount(Panel, {
        props: {
          hint: '',
          rules: [],
          errors: [],
          warnings: ['Heads up', 'Also note this'],
        },
      });
      const warningSection = wrapper.find('.coar-form-field__status-section--warning');
      expect(warningSection.exists()).toBe(true);
      expect(warningSection.find('.coar-form-field__status-section-icon').exists()).toBe(true);
      const items = warningSection.findAll('.coar-form-field__status-section-body > p');
      expect(items.length).toBe(2);
    });

    it('renders hint → error → warning sections in priority DOM order when all three are set', async () => {
      const Panel = (await import('./CoarFormFieldStatusPanel.vue')).default;
      const wrapper = mount(Panel, {
        props: {
          hint: 'Help',
          rules: [],
          errors: ['Bad'],
          warnings: ['Uneasy'],
        },
      });
      const sections = wrapper.findAll('.coar-form-field__status-section');
      expect(sections.length).toBe(3);
      expect(sections[0].classes()).toContain('coar-form-field__status-section--hint');
      expect(sections[1].classes()).toContain('coar-form-field__status-section--error');
      expect(sections[2].classes()).toContain('coar-form-field__status-section--warning');
    });

    it('section icons have aria-hidden so the popover text is read once, not twice', async () => {
      const Panel = (await import('./CoarFormFieldStatusPanel.vue')).default;
      const wrapper = mount(Panel, {
        props: { hint: '', rules: [], errors: ['Bad'], warnings: [] },
      });
      const icon = wrapper.find('.coar-form-field__status-section-icon');
      expect(icon.attributes('aria-hidden')).toBe('true');
    });

    it('renders nothing when all three are empty', async () => {
      const Panel = (await import('./CoarFormFieldStatusPanel.vue')).default;
      const wrapper = mount(Panel, {
        props: { hint: '', rules: [], errors: [], warnings: [] },
      });
      expect(wrapper.findAll('.coar-form-field__status-section').length).toBe(0);
      expect(wrapper.findAll('.coar-form-field__status-rules').length).toBe(0);
    });

    it('renders a rules checklist with check/circle per item', async () => {
      const Panel = (await import('./CoarFormFieldStatusPanel.vue')).default;
      const wrapper = mount(Panel, {
        props: {
          hint: '',
          rules: [
            { label: 'At least 8 chars', fulfilled: true },
            { label: 'Has uppercase', fulfilled: false },
          ],
          errors: [],
          warnings: [],
        },
      });
      const items = wrapper.findAll('.coar-form-field__status-rule');
      expect(items.length).toBe(2);
      expect(items[0].classes()).toContain('coar-form-field__status-rule--fulfilled');
      expect(items[1].classes()).not.toContain('coar-form-field__status-rule--fulfilled');
      expect(items[0].text()).toContain('At least 8 chars');
      expect(items[1].text()).toContain('Has uppercase');
    });

    it('rules section sits between hint and errors in DOM order', async () => {
      const Panel = (await import('./CoarFormFieldStatusPanel.vue')).default;
      const wrapper = mount(Panel, {
        props: {
          hint: 'Help',
          rules: [{ label: 'r', fulfilled: false }],
          errors: ['e'],
          warnings: ['w'],
        },
      });
      // Order in panel children: hint section, rules ul, error section, warning section.
      const panel = wrapper.find('.coar-form-field__status-panel').element;
      const directChildren = Array.from(panel.children);
      expect(directChildren[0]?.classList.contains('coar-form-field__status-section--hint')).toBe(
        true,
      );
      expect(directChildren[1]?.classList.contains('coar-form-field__status-rules')).toBe(true);
      expect(directChildren[2]?.classList.contains('coar-form-field__status-section--error')).toBe(
        true,
      );
      expect(
        directChildren[3]?.classList.contains('coar-form-field__status-section--warning'),
      ).toBe(true);
    });
  });

  describe('error/warning — string and array forms', () => {
    it('accepts a single string error', () => {
      const wrapper = mountField({ label: 'Email', error: 'Required' });
      const srSpans = wrapper.findAll('.coar-form-field__sr-only[role="alert"]');
      expect(srSpans.length).toBe(1);
      expect(srSpans[0].text()).toBe('Required');
    });

    it('accepts an array of errors', () => {
      const wrapper = mountField({
        label: 'Password',
        error: ['Too short', 'Needs an uppercase letter'],
      });
      const srSpans = wrapper.findAll('.coar-form-field__sr-only[role="alert"]');
      expect(srSpans.length).toBe(2);
      expect(srSpans[0].text()).toBe('Too short');
      expect(srSpans[1].text()).toBe('Needs an uppercase letter');
    });

    it('treats an empty string error as no error', () => {
      const wrapper = mountField({ label: 'Email', error: '' });
      expect(wrapper.find('.coar-form-field__status-icon').exists()).toBe(false);
    });

    it('treats an empty array error as no error', () => {
      const wrapper = mountField({ label: 'Email', error: [] });
      expect(wrapper.find('.coar-form-field__status-icon').exists()).toBe(false);
    });

    it('filters empty strings out of an array error', () => {
      const wrapper = mountField({ label: 'Email', error: ['Required', ''] });
      const srSpans = wrapper.findAll('.coar-form-field__sr-only[role="alert"]');
      expect(srSpans.length).toBe(1);
    });

    it('accepts warning in both string and array forms', () => {
      const a = mountField({ label: 'A', warning: 'Heads up' });
      const b = mountField({ label: 'B', warning: ['Heads up', 'Also note'] });
      // Warnings are not role=alert — they render as plain sr-only spans.
      expect(
        a.findAll('.coar-form-field__sr-only').filter((s) => s.attributes('role') !== 'alert')
          .length,
      ).toBe(1);
      expect(
        b.findAll('.coar-form-field__sr-only').filter((s) => s.attributes('role') !== 'alert')
          .length,
      ).toBe(2);
    });
  });

  describe('hint', () => {
    it('does not render the hint sr-only span when no hint is set', () => {
      const wrapper = mountField({ label: 'Email' });
      // No sr-only spans at all when nothing is set.
      expect(wrapper.findAll('.coar-form-field__sr-only').length).toBe(0);
    });

    it('renders a sr-only span for the hint (no role=alert)', () => {
      const wrapper = mountField({ label: 'Email', hint: 'Help text' });
      const spans = wrapper.findAll('.coar-form-field__sr-only');
      expect(spans.length).toBe(1);
      expect(spans[0].text()).toBe('Help text');
      expect(spans[0].attributes('role')).toBeUndefined();
    });

    it('does NOT render an inline hint row below the input (moved to popover)', () => {
      const wrapper = mountField({ label: 'Email', hint: 'Help text' });
      expect(wrapper.find('.coar-form-field__hint').exists()).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('label has for attribute pointing to inputId', () => {
      const wrapper = mountField({ label: 'Email' });
      const label = wrapper.find('.coar-form-field__label');
      const forAttr = label.attributes('for');
      expect(forAttr).toBeTruthy();
      expect(forAttr).toContain('coar-field-');
    });

    it('label has id for aria-labelledby', () => {
      const wrapper = mountField({ label: 'Email' });
      const label = wrapper.find('.coar-form-field__label');
      expect(label.attributes('id')).toContain('-label');
    });

    it('messageId aggregates hint + every error + every warning id (space-separated)', () => {
      const wrapper = mount(CoarFormField, {
        props: {
          label: 'Email',
          hint: 'Help',
          error: ['e1', 'e2'],
          warning: ['w1'],
          id: 'my-field',
        },
        slots: { default: InjectionProbe },
        attachTo: document.body,
      });
      const msgId = wrapper.find('.probe-msg-id').text();
      expect(msgId).toBe('my-field-hint my-field-error-0 my-field-error-1 my-field-warning-0');
    });

    it('messageId is empty when no status is set', () => {
      const wrapper = mount(CoarFormField, {
        props: { id: 'my-field' },
        slots: { default: InjectionProbe },
        attachTo: document.body,
      });
      expect(wrapper.find('.probe-msg-id').text()).toBe('');
    });

    it('hasError injection reflects errors only (not warnings)', () => {
      const errorOnly = mount(CoarFormField, {
        props: { error: 'oops' },
        slots: { default: InjectionProbe },
        attachTo: document.body,
      });
      expect(errorOnly.find('.probe-error').text()).toBe('true');

      const warningOnly = mount(CoarFormField, {
        props: { warning: 'heads up' },
        slots: { default: InjectionProbe },
        attachTo: document.body,
      });
      expect(warningOnly.find('.probe-error').text()).toBe('false');
    });

    it('required asterisk is aria-hidden', () => {
      const wrapper = mountField({ label: 'Name', required: true });
      expect(wrapper.find('.coar-form-field__required').attributes('aria-hidden')).toBe('true');
    });
  });

  describe('provide/inject', () => {
    it('provides inputId to child components', () => {
      const wrapper = mount(CoarFormField, {
        props: { label: 'Test', id: 'my-field' },
        slots: { default: InjectionProbe },
        attachTo: document.body,
      });
      expect(wrapper.find('.probe-id').text()).toBe('my-field');
    });

    it('provides disabled state', () => {
      const wrapper = mount(CoarFormField, {
        props: { disabled: true },
        slots: { default: InjectionProbe },
        attachTo: document.body,
      });
      expect(wrapper.find('.probe-disabled').text()).toBe('true');
    });

    it('uses custom id when provided', () => {
      const wrapper = mount(CoarFormField, {
        props: { id: 'my-field', label: 'Test' },
        slots: { default: InjectionProbe },
        attachTo: document.body,
      });
      expect(wrapper.find('.probe-id').text()).toBe('my-field');
      expect(wrapper.find('.coar-form-field__label').attributes('for')).toBe('my-field');
    });
  });

  describe('disabled state', () => {
    it('applies disabled class', () => {
      const wrapper = mountField({ disabled: true });
      expect(wrapper.find('.coar-form-field--disabled').exists()).toBe(true);
    });

    it('does not apply disabled class by default', () => {
      const wrapper = mountField();
      expect(wrapper.find('.coar-form-field--disabled').exists()).toBe(false);
    });
  });
});
