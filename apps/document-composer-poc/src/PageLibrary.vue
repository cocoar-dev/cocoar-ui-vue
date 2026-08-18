<script setup lang="ts">
import { pages, requestedBuilderPageId } from './page-store';

defineEmits<{ back: [] }>();
</script>

<template>
  <section class="library-screen">
    <header class="screen-header">
      <div>
        <span>Page definitions</span>
        <h1>Reusable structured islands</h1>
        <p>Pages are edited with the full-size builder and referenced from Markdown by id and immutable version.</p>
      </div>
      <button type="button" class="secondary-button" @click="$emit('back')">Back to document</button>
    </header>
    <div class="library-grid">
      <article v-for="page in pages" :key="page.id" class="library-card">
        <div class="library-card__index">{{ String(pages.indexOf(page) + 1).padStart(2, '0') }}</div>
        <div class="library-card__copy">
          <span>{{ page.id }}</span>
          <h2>{{ page.name }}</h2>
          <p>{{ page.description }}</p>
        </div>
        <dl>
          <div><dt>Latest</dt><dd>v{{ page.versions.at(-1)?.version }}</dd></div>
          <div><dt>Height</dt><dd>{{ page.canvasHeight }} px</dd></div>
          <div><dt>Versions</dt><dd>{{ page.versions.length }}</dd></div>
        </dl>
        <button type="button" class="primary-button" @click="requestedBuilderPageId = page.id">Open full builder</button>
      </article>
    </div>
  </section>
</template>
