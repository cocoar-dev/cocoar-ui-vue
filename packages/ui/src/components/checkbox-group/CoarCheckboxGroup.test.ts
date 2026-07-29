import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import CoarCheckboxGroup from './CoarCheckboxGroup.vue';
import CoarCheckbox from '../checkbox/CoarCheckbox.vue';
import CoarFormField from '../form-field/CoarFormField.vue';

function mountArrayGroup(initial: string[] = []) {
  return mount(
    defineComponent({
      components: { CoarCheckboxGroup, CoarCheckbox },
      setup() {
        const selected = ref<string[]>(initial);
        return { selected };
      },
      template: `
      <CoarCheckboxGroup v-model="selected" name="permissions">
        <CoarCheckbox value="read" label="Read" />
        <CoarCheckbox value="write" label="Write" />
        <CoarCheckbox value="admin" label="Admin" />
      </CoarCheckboxGroup>
    `,
    }),
  );
}

describe('CoarCheckboxGroup', () => {
  it('aggregates checked values into an array in registration order', async () => {
    const wrapper = mountArrayGroup();
    const inputs = wrapper.findAll('input');
    await inputs[2].setValue(true);
    await inputs[0].setValue(true);
    expect(wrapper.vm.selected).toEqual(['read', 'admin']);
  });

  it('reflects external array-model changes in the child checkboxes', async () => {
    const wrapper = mountArrayGroup(['write']);
    expect((wrapper.findAll('input')[1].element as HTMLInputElement).checked).toBe(true);
    wrapper.vm.selected = ['read', 'admin'];
    await nextTick();
    const inputs = wrapper.findAll('input');
    expect((inputs[0].element as HTMLInputElement).checked).toBe(true);
    expect((inputs[1].element as HTMLInputElement).checked).toBe(false);
    expect((inputs[2].element as HTMLInputElement).checked).toBe(true);
  });

  it('emits a complete boolean record in object mode', async () => {
    const wrapper = mount(
      defineComponent({
        components: { CoarCheckboxGroup, CoarCheckbox },
        setup() {
          const selected = ref<Record<string, boolean>>({ read: true });
          return { selected };
        },
        template: `
        <CoarCheckboxGroup v-model="selected" model-type="object">
          <CoarCheckbox value="read" label="Read" />
          <CoarCheckbox value="write" label="Write" />
        </CoarCheckboxGroup>
      `,
      }),
    );
    await nextTick();
    await nextTick();
    expect(wrapper.vm.selected).toEqual({ read: true, write: false });
    await wrapper.findAll('input')[1].setValue(true);
    expect(wrapper.vm.selected).toEqual({ read: true, write: true });
  });

  it('gives every child a unique DOM id', () => {
    const wrapper = mountArrayGroup();
    const ids = wrapper.findAll('input').map((input) => input.attributes('id'));
    expect(new Set(ids).size).toBe(3);
  });

  it('shares the native form name with all children', () => {
    const wrapper = mountArrayGroup();
    wrapper.findAll('input').forEach((input) => {
      expect(input.attributes('name')).toBe('permissions');
    });
  });

  it('applies one inherited size to every child checkbox', () => {
    const wrapper = mount(
      defineComponent({
        components: { CoarCheckboxGroup, CoarCheckbox },
        template: `
        <CoarCheckboxGroup size="s">
          <CoarCheckbox value="read" label="Read" size="l" />
          <CoarCheckbox value="write" label="Write" />
        </CoarCheckboxGroup>
      `,
      }),
    );
    wrapper.findAll('.coar-checkbox-host').forEach((checkbox) => {
      expect(checkbox.classes()).toContain('coar-checkbox--s');
      expect(checkbox.classes()).not.toContain('coar-checkbox--l');
    });
  });

  it('is labelled and described by its wrapping CoarFormField', () => {
    const wrapper = mount(
      defineComponent({
        components: { CoarFormField, CoarCheckboxGroup, CoarCheckbox },
        template: `
        <CoarFormField
          id="permissions"
          label="Permissions"
          hint="Choose at least one"
        >
            <CoarCheckboxGroup>
              <CoarCheckbox value="read" label="Read" />
            </CoarCheckboxGroup>
        </CoarFormField>
      `,
      }),
    );
    const group = wrapper.find('[role="group"]');
    expect(group.attributes('id')).toBe('permissions');
    expect(group.attributes('aria-labelledby')).toBe('permissions-label');
    expect(group.attributes('aria-describedby')).toBe('permissions-hint');
  });
});
