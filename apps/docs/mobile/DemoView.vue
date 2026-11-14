<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { findDemo } from './demos';
import { embedded } from './scheme';

const props = defineProps<{ id: string }>();

const demo = computed(() => findDemo(props.id));
const view = computed(() => (demo.value ? defineAsyncComponent(demo.value.component) : null));

// `/components/select` → ../components/select.html: the docs site next to the mobile app,
// under whatever base the docs are deployed to.
const docsHref = computed(() => {
  const path = demo.value?.docs;
  if (!path) return null;
  const [page, fragment] = path.split('#');
  return `..${page}.html${fragment ? `#${fragment}` : ''}`;
});
</script>

<template>
  <component :is="view" v-if="view" />
  <p v-if="docsHref && !embedded" class="m-demo__docs">
    <a :href="docsHref">Documentation</a>
  </p>
</template>

<style scoped>
.m-demo__docs {
  margin: var(--coar-spacing-xl) 0 0;
  text-align: center;
}
</style>
