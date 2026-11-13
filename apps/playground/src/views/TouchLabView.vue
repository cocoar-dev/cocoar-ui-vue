<script setup lang="ts">
/**
 * Touch lab: one small, static instance of each interactive component, every one with a
 * visible result line. `e2e/touch-lab.spec.ts` operates them by tap only (Chromium with
 * touch, and WebKit with an iPad profile) and reads the result lines.
 */
import { computed, ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarButton,
  CoarCheckbox,
  CoarMenu,
  CoarMenuItem,
  CoarMultiSelect,
  CoarNumberInput,
  CoarPlainDatePicker,
  CoarPopover,
  CoarSegmentedControl,
  CoarSelect,
  CoarSubFlyout,
  CoarSwitch,
  CoarTab,
  CoarTabGroup,
  CoarTag,
  CoarTextInput,
  useDialog,
} from '@cocoar/vue-ui';

const cities = [
  { value: 'vie', label: 'Vienna' },
  { value: 'grz', label: 'Graz' },
  { value: 'ber', label: 'Berlin' },
  { value: 'muc', label: 'Munich' },
];

const city = ref<string | null>(null);
const cityList = ref<string[]>([]);
const menuAction = ref('none');

const popover = ref<InstanceType<typeof CoarPopover> | null>(null);
const popoverAction = ref('none');
const popoverState = computed(() => (popover.value?.isOpen ? 'open' : 'closed'));

const dialog = useDialog();
const dialogResult = ref('none');
async function track(result: Promise<unknown>) {
  dialogResult.value = 'open';
  dialogResult.value = String(await result);
}
function openNotice() {
  // `alert` has a close button in the header and an OK button in the footer.
  void track(dialog.alert('Draft saved', 'The draft is saved on this device.').result);
}
function openConfirm() {
  const confirm = dialog.confirm({
    title: 'Delete the draft?',
    message: 'The draft is removed for everyone.',
    confirmText: 'Delete',
    cancelText: 'Keep',
    confirmVariant: 'danger',
  });
  void track(confirm.result);
}

const dateFormat = { pattern: 'dd.mm.yyyy', firstDayOfWeek: 1 } as const;
const date = ref<Temporal.PlainDate | null>(Temporal.PlainDate.from('2026-03-14'));

const tab = ref('overview');
const view = ref('week');
const views = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const accepted = ref(false);
const notifications = ref(false);
const text = ref<string | undefined>('Hello');
const tagOpen = ref(true);
const count = ref<number | null>(1);
</script>

<template>
  <div class="touch-lab">
    <h1>Touch lab</h1>
    <p>Each part is operated by tap in <code>e2e/touch-lab.spec.ts</code>.</p>

    <section data-testid="select">
      <h2>Select</h2>
      <CoarSelect v-model="city" :options="cities" placeholder="Choose a city" />
      <p data-testid="select-result">Select: {{ city ?? 'none' }}</p>
    </section>

    <section data-testid="multi-select">
      <h2>Multi-select</h2>
      <CoarMultiSelect v-model="cityList" :options="cities" placeholder="Choose cities" />
      <p data-testid="multi-select-result">
        Multi-select: {{ cityList.length ? cityList.join(',') : 'none' }}
      </p>
    </section>

    <section data-testid="menu">
      <h2>Menu with a submenu</h2>
      <CoarPopover mode="click">
        <CoarButton variant="secondary">Actions</CoarButton>
        <template #content>
          <CoarMenu>
            <CoarMenuItem @clicked="menuAction = 'Rename'">Rename</CoarMenuItem>
            <CoarSubFlyout label="Move to">
              <CoarMenuItem @clicked="menuAction = 'Projects'">Projects</CoarMenuItem>
              <CoarMenuItem @clicked="menuAction = 'Archive'">Archive</CoarMenuItem>
            </CoarSubFlyout>
          </CoarMenu>
        </template>
      </CoarPopover>
      <p data-testid="menu-result">Menu: {{ menuAction }}</p>
    </section>

    <section data-testid="popover">
      <h2>Popover (click mode)</h2>
      <CoarPopover ref="popover" mode="click" interactive>
        <CoarButton variant="secondary">Details</CoarButton>
        <template #content>
          <div class="touch-lab__popover">
            <p>Shared with 3 people.</p>
            <CoarButton size="s" variant="tertiary" @click="popoverAction = 'manage'">
              Manage access
            </CoarButton>
          </div>
        </template>
      </CoarPopover>
      <p data-testid="popover-result">Popover: {{ popoverState }}, action {{ popoverAction }}</p>
    </section>

    <section data-testid="dialog">
      <h2>Dialog</h2>
      <CoarButton variant="secondary" @click="openNotice">Show notice</CoarButton>
      <CoarButton variant="secondary" @click="openConfirm">Delete draft</CoarButton>
      <p data-testid="dialog-result">Dialog: {{ dialogResult }}</p>
    </section>

    <section data-testid="date-picker">
      <h2>Date picker</h2>
      <CoarPlainDatePicker
        v-model="date"
        close-on-select
        :date-format="dateFormat"
        locale="en-US"
      />
      <p data-testid="date-picker-result">Date: {{ date?.toString() ?? 'none' }}</p>
    </section>

    <section data-testid="tabs">
      <h2>Tabs</h2>
      <CoarTabGroup v-model="tab">
        <CoarTab id="overview">Overview</CoarTab>
        <CoarTab id="members">Members</CoarTab>
        <CoarTab id="billing">Billing</CoarTab>
      </CoarTabGroup>
      <p data-testid="tabs-result">Tab: {{ tab }}</p>
    </section>

    <section data-testid="segmented">
      <h2>Segmented control</h2>
      <CoarSegmentedControl v-model="view" :options="views" aria-label="View" />
      <p data-testid="segmented-result">View: {{ view }}</p>
    </section>

    <section data-testid="checkbox">
      <h2>Checkbox and switch</h2>
      <CoarCheckbox v-model="accepted" label="Accept the terms" />
      <p data-testid="checkbox-result">Checkbox: {{ accepted }}</p>
      <CoarSwitch v-model="notifications" label="Notifications" />
      <p data-testid="switch-result">Switch: {{ notifications }}</p>
    </section>

    <section data-testid="text-input">
      <h2>Clearable text input</h2>
      <CoarTextInput v-model="text" clearable />
      <p data-testid="text-input-result">Text: "{{ text ?? '' }}"</p>
    </section>

    <section data-testid="tag">
      <h2>Closable tag</h2>
      <CoarTag v-if="tagOpen" closable @closed="tagOpen = false">Draft</CoarTag>
      <p data-testid="tag-result">Tag: {{ tagOpen ? 'shown' : 'closed' }}</p>
    </section>

    <section data-testid="number-input">
      <h2>Number input with steppers</h2>
      <CoarNumberInput v-model="count" stepper-buttons="both" />
      <p data-testid="number-input-result">Number: {{ count ?? 'none' }}</p>
    </section>
  </div>
</template>

<style scoped>
.touch-lab {
  padding: 24px;
  max-width: 560px;
}

.touch-lab section {
  margin-bottom: 20px;
}

.touch-lab h2 {
  font-size: 15px;
  margin: 0 0 8px;
}

.touch-lab section p {
  margin: 8px 0 0;
}

.touch-lab__popover {
  width: 240px;
  padding: 12px;
}
</style>
