<script setup lang="ts">
/**
 * Input family showcase — every field-family control now built on the internal
 * CoarInputFrame shell, all on one page. Open the Theme Editor (palette FAB,
 * bottom-right) → Inputs → Field padding / Corner radius to watch padding +
 * radius drive every control from one place.
 */
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarTextInput,
  CoarPasswordInput,
  CoarNumberInput,
  CoarSelect,
  CoarMultiSelect,
  CoarTagSelect,
  CoarPlainDatePicker,
  CoarPlainDateTimePicker,
  CoarZonedDateTimePicker,
  type CoarSelectOption,
} from '@cocoar/vue-ui';

const sizes = ['xs', 's', 'm', 'l'] as const;

const text = ref('Hello world');
const multilineText = ref('Line one\nLine two\nLine three');
const pwd = ref('hunter2');
const num = ref<number | null>(42);
const single = ref<string | null>('b');
const multi = ref<string[]>(['a', 'c']);
const tags = ref<string[]>(['vue', 'frame']);

const options: CoarSelectOption<string>[] = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Date' },
];

// one ref per size cell so the size rows are independently editable
const sizeText = ref('Value');
const sizeNum = ref<number | null>(7);
const sizeSingle = ref<string | null>('a');
const sizeTags = ref<string[]>(['a', 'b']);
// zoned value so the floating TZ caption on the bottom border is visible
const zoned = ref<Temporal.ZonedDateTime | null>(
  Temporal.ZonedDateTime.from('2026-06-25T14:30[Europe/Vienna]'),
);
</script>

<template>
  <div class="showcase">
    <header>
      <h1>Input family — all on CoarInputFrame</h1>
      <p>
        Every control below shares the internal <code>CoarInputFrame</code> shell.
        Open the Theme Editor (palette, bottom-right) → <strong>Inputs → Field padding /
        Corner radius</strong> and watch the box, padding and edge buttons update everywhere
        at once.
      </p>
    </header>

    <!-- ─────────── States per control (size m) ─────────── -->
    <h2>Controls &amp; states (size m)</h2>
    <table class="grid">
      <thead>
        <tr><th>Control</th><th>Default</th><th>Filled</th><th>Error</th><th>Disabled</th></tr>
      </thead>
      <tbody>
        <tr>
          <th>TextInput</th>
          <td><CoarTextInput placeholder="Type…" /></td>
          <td><CoarTextInput v-model="text" clearable /></td>
          <td><CoarTextInput v-model="text" error /></td>
          <td><CoarTextInput v-model="text" disabled /></td>
        </tr>
        <tr>
          <th>PasswordInput</th>
          <td><CoarPasswordInput placeholder="Password…" /></td>
          <td><CoarPasswordInput v-model="pwd" clearable /></td>
          <td><CoarPasswordInput v-model="pwd" error /></td>
          <td><CoarPasswordInput v-model="pwd" disabled /></td>
        </tr>
        <tr>
          <th>NumberInput</th>
          <td><CoarNumberInput placeholder="0" stepper-buttons="both" /></td>
          <td><CoarNumberInput v-model="num" suffix="€" stepper-buttons="both" clearable /></td>
          <td><CoarNumberInput v-model="num" error stepper-buttons="both" /></td>
          <td><CoarNumberInput v-model="num" disabled stepper-buttons="both" /></td>
        </tr>
        <tr>
          <th>Select</th>
          <td><CoarSelect :options="options" placeholder="Pick…" clearable /></td>
          <td><CoarSelect v-model="single" :options="options" clearable /></td>
          <td><CoarSelect v-model="single" :options="options" error clearable /></td>
          <td><CoarSelect v-model="single" :options="options" disabled /></td>
        </tr>
        <tr>
          <th>MultiSelect</th>
          <td><CoarMultiSelect :options="options" placeholder="Pick…" clearable /></td>
          <td><CoarMultiSelect v-model="multi" :options="options" clearable /></td>
          <td><CoarMultiSelect v-model="multi" :options="options" error clearable /></td>
          <td><CoarMultiSelect v-model="multi" :options="options" disabled /></td>
        </tr>
        <tr>
          <th>TagSelect <small>(deferred — own container)</small></th>
          <td><CoarTagSelect :options="options" placeholder="Type…" /></td>
          <td><CoarTagSelect v-model="tags" :options="options" allow-create /></td>
          <td><CoarTagSelect v-model="tags" :options="options" error /></td>
          <td><CoarTagSelect v-model="tags" :options="options" disabled /></td>
        </tr>
        <tr>
          <th>PlainDatePicker</th>
          <td><CoarPlainDatePicker /></td>
          <td><CoarPlainDatePicker /></td>
          <td><CoarPlainDatePicker error /></td>
          <td><CoarPlainDatePicker disabled /></td>
        </tr>
        <tr>
          <th>PlainDateTimePicker</th>
          <td><CoarPlainDateTimePicker /></td>
          <td><CoarPlainDateTimePicker /></td>
          <td><CoarPlainDateTimePicker error /></td>
          <td><CoarPlainDateTimePicker disabled /></td>
        </tr>
        <tr>
          <th>ZonedDateTimePicker</th>
          <td><CoarZonedDateTimePicker /></td>
          <td><CoarZonedDateTimePicker v-model="zoned" clearable /></td>
          <td><CoarZonedDateTimePicker v-model="zoned" error /></td>
          <td><CoarZonedDateTimePicker v-model="zoned" disabled /></td>
        </tr>
      </tbody>
    </table>

    <!-- ─────────── Sizes (xs / s / m / l) ─────────── -->
    <h2>Sizes — xs · s · m · l</h2>
    <table class="grid">
      <thead>
        <tr><th>Control</th><th v-for="s in sizes" :key="s">{{ s }}</th></tr>
      </thead>
      <tbody>
        <tr>
          <th>TextInput</th>
          <td v-for="s in sizes" :key="s"><CoarTextInput v-model="sizeText" :size="s" /></td>
        </tr>
        <tr>
          <th>PasswordInput</th>
          <td v-for="s in sizes" :key="s"><CoarPasswordInput v-model="sizeText" :size="s" /></td>
        </tr>
        <tr>
          <th>NumberInput</th>
          <td v-for="s in sizes" :key="s"><CoarNumberInput v-model="sizeNum" :size="s" suffix="€" stepper-buttons="both" /></td>
        </tr>
        <tr>
          <th>Select</th>
          <td v-for="s in sizes" :key="s"><CoarSelect v-model="sizeSingle" :options="options" :size="s" clearable /></td>
        </tr>
        <tr>
          <th>TagSelect</th>
          <td v-for="s in sizes" :key="s"><CoarTagSelect v-model="sizeTags" :options="options" :size="s" /></td>
        </tr>
        <tr>
          <th>PlainDatePicker</th>
          <td v-for="s in sizes" :key="s"><CoarPlainDatePicker :size="s" /></td>
        </tr>
        <tr>
          <th>ZonedDateTimePicker</th>
          <td v-for="s in sizes" :key="s"><CoarZonedDateTimePicker :size="s" /></td>
        </tr>
      </tbody>
    </table>

    <!-- ─────────── Multiline (textarea on the frame) ─────────── -->
    <h2>Multiline — textarea on CoarInputFrame</h2>
    <div class="row row--top">
      <CoarTextInput :rows="3" placeholder="Type multiple lines…" />
      <CoarTextInput v-model="multilineText" :rows="3" />
      <CoarTextInput v-model="multilineText" :rows="3" error />
      <CoarTextInput v-model="multilineText" :rows="3" disabled />
    </div>

    <!-- ─────────── Affixes / appearance ─────────── -->
    <h2>Affixes &amp; appearance</h2>
    <div class="row">
      <CoarTextInput placeholder="Search…">
        <template #prefix>🔍</template>
      </CoarTextInput>
      <CoarTextInput v-model="text" placeholder="Amount" prefix="$" suffix="USD" />
      <CoarNumberInput v-model="num" prefix="€" stepper-buttons="increment" />
      <CoarSelect v-model="single" :options="options" appearance="inline" clearable />
      <CoarSelect v-model="single" :options="options" searchable clearable />
    </div>
  </div>
</template>

<style scoped>
.showcase {
  padding: 24px;
  max-width: 1100px;
  font-family: var(--coar-body-base-family);
  color: var(--coar-text-neutral-primary);
}
header h1 { font-size: 20px; margin-bottom: 4px; }
header p { color: var(--coar-text-neutral-secondary); font-size: 13px; max-width: 720px; }
h2 {
  font-size: 13px;
  color: var(--coar-text-neutral-tertiary);
  margin: 32px 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
code { font-family: var(--coar-code-family, monospace); font-size: 0.9em; }

.grid {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 8px;
}
.grid thead th {
  text-align: left;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--coar-text-neutral-tertiary);
  font-weight: 600;
  padding: 0 8px;
}
.grid tbody th {
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  padding-right: 16px;
  vertical-align: middle;
}
.grid tbody th small { font-weight: 400; color: var(--coar-text-neutral-tertiary); }
.grid td {
  padding: 0 8px;
  vertical-align: middle;
  width: 220px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}
.row > * { width: 220px; }
.row--top { align-items: flex-start; }
</style>
