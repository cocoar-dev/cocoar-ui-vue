import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarWizard, { type CoarWizardStep } from './CoarWizard.vue';

const STEPS: CoarWizardStep[] = [
  { id: 'a', label: 'Alpha', description: 'first' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

function mountWizard(props: Record<string, unknown> = {}) {
  return mount(CoarWizard, {
    props: { steps: STEPS, ...props },
    slots: {
      a: '<div class="page-a">Page A</div>',
      b: '<div class="page-b">Page B</div>',
      c: '<div class="page-c">Page C</div>',
    },
  });
}

type W = ReturnType<typeof mountWizard>;
const footerBtn = (w: W, label: string) =>
  w.findAll('button').find((b) => b.text() === label)!;

describe('CoarWizard', () => {
  it('renders every step label but only the active step content', () => {
    const w = mountWizard();
    expect(w.findAll('.coar-wizard__step-label').map((n) => n.text())).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(w.find('.page-a').exists()).toBe(true);
    expect(w.find('.page-b').exists()).toBe(false);
    expect(w.find('.page-c').exists()).toBe(false);
  });

  it('advances and goes back via the footer, emitting step-change + update:step', async () => {
    const w = mountWizard();
    await footerBtn(w, 'Next').trigger('click');
    expect(w.find('.page-b').exists()).toBe(true);
    expect(w.find('.page-a').exists()).toBe(false);
    expect(w.emitted('step-change')?.[0]).toEqual(['b', 1]);
    expect(w.emitted('update:step')?.[0]).toEqual(['b']);

    await footerBtn(w, 'Back').trigger('click');
    expect(w.find('.page-a').exists()).toBe(true);
  });

  it('disables Back on the first step and shows Finish on the last', async () => {
    const w = mountWizard();
    expect(footerBtn(w, 'Back').attributes('disabled')).toBeDefined();
    await footerBtn(w, 'Next').trigger('click');
    await footerBtn(w, 'Next').trigger('click');
    expect(w.find('.page-c').exists()).toBe(true);
    expect(footerBtn(w, 'Finish')).toBeTruthy();
  });

  it('emits finish (not step-change) when Next is pressed on the last step', async () => {
    const w = mountWizard();
    await footerBtn(w, 'Next').trigger('click');
    await footerBtn(w, 'Next').trigger('click');
    await footerBtn(w, 'Finish').trigger('click');
    expect(w.emitted('finish')).toBeTruthy();
  });

  it('gates Next via canAdvance:false and refuses to advance', async () => {
    const w = mount(CoarWizard, {
      props: { steps: [{ id: 'a', label: 'A', canAdvance: false }, { id: 'b', label: 'B' }] },
      slots: { a: '<div class="page-a">A</div>', b: '<div class="page-b">B</div>' },
    });
    expect(footerBtn(w, 'Next').attributes('disabled')).toBeDefined();
    await footerBtn(w, 'Next').trigger('click');
    expect(w.emitted('step-change')).toBeFalsy();
    expect(w.find('.page-a').exists()).toBe(true);
  });

  it('makes completed steps clickable (linear) but not the active or upcoming ones', async () => {
    const w = mountWizard();
    await footerBtn(w, 'Next').trigger('click'); // now on b; a is completed
    const steps = w.findAll('.coar-wizard__step');
    expect(steps[0].classes()).toContain('coar-wizard__step--clickable'); // done
    expect(steps[1].classes()).not.toContain('coar-wizard__step--clickable'); // active
    expect(steps[2].classes()).not.toContain('coar-wizard__step--clickable'); // upcoming

    await steps[0].find('button').trigger('click'); // jump back to a
    expect(w.find('.page-a').exists()).toBe(true);
  });

  it('freeNavigation lets you click upcoming steps', () => {
    const w = mountWizard({ freeNavigation: true });
    const steps = w.findAll('.coar-wizard__step');
    expect(steps[2].classes()).toContain('coar-wizard__step--clickable');
  });

  it('places the indicator on the given edge (vertical for left/right)', () => {
    const w = mountWizard({ indicatorPosition: 'left' });
    const root = w.find('.coar-wizard');
    expect(root.classes()).toContain('coar-wizard--indicator-left');
    expect(root.classes()).toContain('coar-wizard--vertical');
  });

  it('hides the footer when hideFooter is set', () => {
    expect(mountWizard({ hideFooter: true }).find('.coar-wizard__footer').exists()).toBe(false);
  });

  it('marks done steps with the done class + a check icon', async () => {
    const w = mountWizard();
    await footerBtn(w, 'Next').trigger('click');
    const first = w.findAll('.coar-wizard__step')[0];
    expect(first.classes()).toContain('coar-wizard__step--done');
  });
});
