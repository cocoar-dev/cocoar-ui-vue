<template>
  <div class="long-label-demo">
    <section>
      <h4>Label after</h4>
      <CoarCheckbox
        v-model="after"
        label="Send me a weekly summary of activity, security events, and account changes"
      />
    </section>

    <section>
      <h4>Label before</h4>
      <CoarCheckbox
        v-model="before"
        label="Send me a weekly summary of activity, security events, and account changes"
        label-position="before"
      />
    </section>

    <section>
      <h4>Inside a group</h4>
      <CoarCheckboxGroup v-model="selected">
        <CoarCheckbox
          value="security"
          label="Notify me when a security-sensitive setting is changed by another administrator"
        />
        <CoarCheckbox value="product" label="Receive occasional product announcements" />
      </CoarCheckboxGroup>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarCheckbox, CoarCheckboxGroup } from '@cocoar/vue-ui';

const after = ref(false);
const before = ref(false);
const selected = ref<string[]>([]);
</script>

<style scoped>
.long-label-demo {
  display: grid;
  gap: var(--coar-spacing-l);
  width: min(100%, 320px);
}

.long-label-demo section {
  display: grid;
  gap: var(--coar-spacing-xs);
}

.long-label-demo h4 {
  margin: 0;
  color: var(--coar-text-neutral-secondary);
  font-size: 12px;
  font-weight: 500;
}
</style>
