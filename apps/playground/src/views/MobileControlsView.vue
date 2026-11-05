<script setup lang="ts">
import { ref } from 'vue';
import {
  CoarButton,
  CoarCheckbox,
  CoarFormField,
  CoarNumberInput,
  CoarPasswordInput,
  CoarRadioButton,
  CoarRadioGroup,
  CoarSwitch,
  CoarTextInput,
  CoarThemeScope,
} from '@cocoar/vue-ui';

const mobile = ref(true);
const dark = ref(false);
const clicks = ref(0);
const notes = ref('A multiline value');
const mobileHeights = { xs: 44, s: 48, m: 52, l: 56 };
const desktopHeights = { xs: 27, s: 32, m: 40, l: 48 };
const controls = ref(
  (['xs', 's', 'm', 'l'] as const).map((size) => ({
    size,
    text: 'Example',
    password: 'Secret123',
    number: 1 as number | null,
    checked: false,
    enabled: false,
  })),
);
</script>

<template>
  <div class="mobile-controls-demo">
    <h1>Mobile controls</h1>
    <p>The same components, with an explicit mobile presentation on a local parent.</p>
    <div class="demo-options">
      <label><input v-model="mobile" type="checkbox" /> Mobile presentation</label>
      <label><input v-model="dark" type="checkbox" /> Dark theme</label>
    </div>

    <section data-testid="desktop-sibling">
      <h2>Unchanged desktop sibling (xs)</h2>
      <CoarButton size="xs">Desktop</CoarButton>
      <CoarTextInput size="xs" placeholder="Desktop input" />
    </section>

    <div data-testid="mobile-scope" :class="{ 'coar-mobile': mobile }">
      <CoarThemeScope :mode="dark ? 'dark' : 'light'">
        <section v-for="control in controls" :key="control.size" :data-size="control.size">
          <h2>
            {{ control.size }} —
            {{ mobile ? mobileHeights[control.size] : desktopHeights[control.size] }}px
          </h2>
          <div class="demo-buttons">
            <CoarButton :size="control.size" @click="clicks++">Save</CoarButton>
            <CoarButton :size="control.size" icon-start="plus" aria-label="Add" />
            <CoarButton :size="control.size" to="#mobile-controls">Link</CoarButton>
            <CoarButton :size="control.size" loading>Loading</CoarButton>
          </div>
          <CoarFormField label="Name">
            <CoarTextInput v-model="control.text" :size="control.size" clearable />
          </CoarFormField>
          <CoarFormField label="Password">
            <CoarPasswordInput v-model="control.password" :size="control.size" clearable />
          </CoarFormField>
          <CoarFormField label="Quantity">
            <CoarNumberInput
              v-model="control.number"
              :size="control.size"
              stepper-buttons="both"
              clearable
            />
          </CoarFormField>
          <CoarCheckbox v-model="control.checked" :size="control.size">Accept</CoarCheckbox>
          <CoarSwitch v-model="control.enabled" :size="control.size">Enable</CoarSwitch>
          <CoarRadioGroup :name="`choice-${control.size}`" :size="control.size" label="Choice">
            <CoarRadioButton value="first">First</CoarRadioButton>
            <CoarRadioButton value="second">Second</CoarRadioButton>
          </CoarRadioGroup>
        </section>

        <section data-testid="extra-controls">
          <h2>Multiline and non-editable states</h2>
          <CoarFormField label="Notes">
            <CoarTextInput v-model="notes" size="xs" :rows="3" clearable />
          </CoarFormField>
          <CoarTextInput model-value="Disabled" disabled clearable />
          <CoarPasswordInput model-value="Readonly" readonly />
          <CoarNumberInput :model-value="2" disabled />
          <CoarButton disabled>Disabled</CoarButton>
          <CoarCheckbox size="xs">
            <span class="sr-only">Visually unlabeled checkbox</span>
          </CoarCheckbox>
          <CoarSwitch size="xs">
            <span class="sr-only">Visually unlabeled switch</span>
          </CoarSwitch>
          <CoarRadioGroup name="unlabeled" size="xs" label="Unlabeled radio">
            <CoarRadioButton value="only">
              <span class="sr-only">Only option</span>
            </CoarRadioButton>
          </CoarRadioGroup>
        </section>
      </CoarThemeScope>
    </div>
    <output data-testid="click-count">{{ clicks }}</output>
  </div>
</template>

<style scoped>
.mobile-controls-demo {
  max-width: 640px;
  margin: 0 auto;
}

.demo-options,
.demo-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--coar-spacing-m);
}

section {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--coar-spacing-m);
  padding-block: var(--coar-spacing-l);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
