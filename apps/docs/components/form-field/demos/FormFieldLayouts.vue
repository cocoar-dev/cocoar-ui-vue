<template>
  <div class="layout-demo">
    <section>
      <h4>Inline — label after</h4>
      <CoarFormField
        label="User active"
        hint="Disabled users cannot sign in."
        layout="inline"
        label-position="after"
      >
        <CoarCheckbox v-model="active" />
      </CoarFormField>
    </section>

    <section>
      <h4>Inline — label before</h4>
      <CoarFormField
        label="User active"
        hint="Disabled users cannot sign in."
        layout="inline"
        label-position="before"
      >
        <CoarCheckbox v-model="active" />
      </CoarFormField>
    </section>

    <section>
      <h4>Text input — inline after</h4>
      <CoarFormField
        label="Name"
        hint="This intentionally demonstrates that every prop combination has an effect."
        layout="inline"
        label-position="after"
      >
        <CoarTextInput v-model="name" placeholder="Ada Lovelace" />
      </CoarFormField>
    </section>

    <section>
      <h4>Text input — stacked after</h4>
      <CoarFormField
        label="Name"
        hint="The label can also deliberately follow the control."
        layout="stacked"
        label-position="after"
      >
        <CoarTextInput v-model="name" placeholder="Ada Lovelace" />
      </CoarFormField>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox, CoarFormField, CoarTextInput } from '@cocoar/vue-ui';

const active = ref(false);
const name = ref('');
</script>

<style scoped>
.layout-demo {
  display: grid;
  gap: 24px;
}

.layout-demo section {
  display: grid;
  gap: 8px;
}

.layout-demo h4 {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: 12px;
  font-weight: 500;
}
</style>
