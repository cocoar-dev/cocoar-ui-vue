<script setup lang="ts">
/** The family calendar design on a tablet in landscape, each view at its size in the design. */
import FamilyMonth from '../family-design/FamilyMonth.vue';
import FamilyPeople from '../family-design/FamilyPeople.vue';
import FamilyWeek from '../family-design/FamilyWeek.vue';
import FamilyYear from '../family-design/FamilyYear.vue';
</script>

<template>
  <div style="display: flex; flex-direction: column; gap: 32px">
    <section data-family-frame="tabletWeek"><FamilyWeek :width="1054" :height="717" /></section>
    <section data-family-frame="tabletDay"><FamilyPeople :width="716" /></section>
    <section data-family-frame="tabletMonth"><FamilyMonth :width="754" :height="717" /></section>
    <section data-family-frame="tabletYear"><FamilyYear :width="1020" :height="665" /></section>
  </div>
</template>
