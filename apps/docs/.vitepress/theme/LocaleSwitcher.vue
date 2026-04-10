<script setup lang="ts">
import { ref, watch } from 'vue';
import { useLocalization } from '@cocoar/vue-localization';
import { CoarSelect } from '@cocoar/vue-ui';
import type { CoarSelectOption } from '@cocoar/vue-ui';

const service = useLocalization();
const locale = ref(service?.language.value ?? 'en');

watch(locale, async (code) => {
  if (code) await service?.setLanguage(code);
});

const options: CoarSelectOption<string>[] = [
  { value: 'en-US', label: 'en-US' },
  { value: 'en-GB', label: 'en-GB' },
  { value: 'de-DE', label: 'de-DE' },
  { value: 'de-AT', label: 'de-AT' },
  { value: 'fr-FR', label: 'fr-FR' },
  { value: 'ja-JP', label: 'ja-JP' },
];
</script>

<template>
  <CoarSelect
    v-model="locale"
    :options="options"
    size="s"
    appearance="ghost"
    placeholder="Locale"
    class="locale-switcher"
  />
</template>

<style>
.locale-switcher {
  margin-left: 8px;
  width: 100px;
}
</style>
