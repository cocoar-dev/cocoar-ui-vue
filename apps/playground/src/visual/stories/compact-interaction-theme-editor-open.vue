<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): the theme editor (`CoarThemeEditor`) inside the
 * profile, its panel opened by the floating button. The editor reads and writes the
 * profile's container, not `<html>`. Imported from source: the package entry
 * `@cocoar/vue-ui/theme-editor` has no alias in the visual page.
 */
import CoarThemeEditor from '../../../../../packages/ui/src/components/theme-editor/CoarThemeEditor.vue';
import { CoarButton, CoarTextInput } from '@cocoar/vue-ui';
</script>

<template>
  <div class="coar-compact" data-interaction="theme-editor">
    <section class="vs-section">
      <h2 class="vs-title">Theme editor panel over a compact sample</h2>
      <div class="vs-row" style="width: 320px">
        <CoarTextInput model-value="Überprüfung" />
        <CoarButton>Speichern</CoarButton>
      </div>
      <CoarThemeEditor />
    </section>
  </div>
</template>
