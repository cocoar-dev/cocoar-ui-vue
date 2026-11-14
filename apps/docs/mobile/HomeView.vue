<script setup lang="ts">
import { computed } from 'vue';
import { CoarIcon } from '@cocoar/vue-ui';
import { DEMOS, GROUPS } from './demos';

const groups = computed(() =>
  GROUPS.map((title) => ({ title, demos: DEMOS.filter((d) => d.group === title) })).filter(
    (g) => g.demos.length,
  ),
);
</script>

<template>
  <p class="m-home__intro">
    The components of Cocoar UI Vue in their mobile presentation. Every demo runs with
    <code>coar-mobile</code> on the page, as in an app.
  </p>

  <section v-for="group in groups" :key="group.title" class="m-home__group">
    <h2 class="m-home__group-title">{{ group.title }}</h2>
    <ul class="m-home__list">
      <li v-for="demo in group.demos" :key="demo.id">
        <RouterLink :to="`/${demo.id}`" class="m-home__row">
          <span class="m-home__text">
            <span class="m-home__title">{{ demo.title }}</span>
            <span class="m-home__description">{{ demo.description }}</span>
          </span>
          <CoarIcon name="chevron-right" class="m-home__chevron" />
        </RouterLink>
      </li>
    </ul>
  </section>

  <p class="m-home__footer"><a href="../">Full documentation</a></p>
</template>

<style scoped>
.m-home__intro {
  margin: 0 0 var(--coar-spacing-l);
  color: var(--coar-text-neutral-secondary);
}

.m-home__group + .m-home__group {
  margin-top: var(--coar-spacing-l);
}

.m-home__group-title {
  margin: 0 0 var(--coar-spacing-xs);
  color: var(--coar-text-neutral-secondary);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.m-home__list {
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--coar-border-neutral-tertiary);
  border-radius: var(--coar-radius-m, 8px);
  overflow: hidden;
}

.m-home__list li + li {
  border-top: 1px solid var(--coar-border-neutral-tertiary);
}

.m-home__row {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-m);
  min-height: 64px;
  padding: var(--coar-spacing-s) var(--coar-spacing-m);
  color: inherit;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}

.m-home__row:active {
  background: var(--coar-background-neutral-secondary);
}

.m-home__row:focus-visible {
  outline: 2px solid var(--coar-border-accent-primary, currentColor);
  outline-offset: -2px;
}

.m-home__text {
  display: grid;
  flex: 1 1 auto;
  gap: 2px;
  min-width: 0;
}

.m-home__title {
  font-size: 16px;
  font-weight: 600;
}

.m-home__description {
  overflow: hidden;
  color: var(--coar-text-neutral-secondary);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-home__chevron {
  flex: none;
  color: var(--coar-text-neutral-tertiary, currentColor);
}

.m-home__footer {
  margin: var(--coar-spacing-xl) 0 0;
  text-align: center;
}
</style>
