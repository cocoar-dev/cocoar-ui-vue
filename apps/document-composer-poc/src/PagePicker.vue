<script setup lang="ts">
import { completePageReference, pages } from './page-store';
</script>

<template>
  <div class="picker-backdrop" @mousedown.self="completePageReference()">
    <section class="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <header>
        <div>
          <span>Page library</span>
          <h2 id="picker-title">Choose a structured island</h2>
        </div>
        <button type="button" aria-label="Close" @click="completePageReference()">×</button>
      </header>
      <div class="picker__grid">
        <button v-for="page in pages" :key="page.id" type="button" class="picker-card" @click="completePageReference(page.id)">
          <div class="picker-card__preview" :class="`picker-card__preview--${page.id}`">
            <i /><i /><i />
          </div>
          <strong>{{ page.name }}</strong>
          <span>{{ page.description }}</span>
          <small>{{ page.versions.length }} published version{{ page.versions.length === 1 ? '' : 's' }} · latest v{{ page.versions.at(-1)?.version }}</small>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.picker-backdrop { position: fixed; inset: 0; z-index: 20000; display: grid; place-items: center; padding: 24px; background: rgba(22, 29, 25, .52); backdrop-filter: blur(4px); }
.picker { width: min(850px, 100%); max-height: min(680px, calc(100vh - 48px)); overflow: auto; border: 1px solid #cbd5cd; border-radius: 12px; background: #f7f8f5; box-shadow: 0 30px 80px rgba(20, 30, 24, .28); }
.picker > header { display: flex; justify-content: space-between; gap: 24px; padding: 22px 24px 18px; border-bottom: 1px solid #d9dfda; }
.picker header span { color: #55705a; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.picker h2 { margin: 3px 0 0; color: #202522; font-size: 23px; }
.picker header button { align-self: flex-start; border: 0; background: transparent; color: #56615a; font-size: 30px; line-height: 1; cursor: pointer; }
.picker__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 24px; }
.picker-card { display: grid; gap: 7px; padding: 14px; border: 1px solid #d1d9d3; border-radius: 9px; background: #fff; color: #202522; text-align: left; cursor: pointer; transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease; }
.picker-card:hover { transform: translateY(-2px); border-color: #55705a; box-shadow: 0 10px 24px rgba(43, 65, 50, .1); }
.picker-card > span { min-height: 40px; color: #5e6a62; font-size: 13px; }
.picker-card small { color: #758078; font-size: 11px; }
.picker-card__preview { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 18px 58px; gap: 7px; height: 94px; margin-bottom: 4px; padding: 10px; border-radius: 6px; background: #edf3ed; }
.picker-card__preview i { display: block; border-radius: 3px; background: #c7d5c9; }
.picker-card__preview i:first-child { grid-column: 1 / -1; width: 43%; background: #6f8874; }
.picker-card__preview--decision-panel { grid-template-columns: 1fr 90px; }
.picker-card__preview--decision-panel i:nth-child(2) { grid-column: 1 / -1; }
@media (max-width: 680px) { .picker__grid { grid-template-columns: 1fr; } }
</style>
