<script setup lang="ts">
/** The family calendar design on a phone, each view at its width in the design. */
import FamilyPeople from '../family-design/FamilyPeople.vue';
import FamilyYear from '../family-design/FamilyYear.vue';
import PhoneMonth from '../family-design/PhoneMonth.vue';
import PhoneWeek from '../family-design/PhoneWeek.vue';
import PhoneWho from '../family-design/PhoneWho.vue';
</script>

<template>
  <div style="display: grid; grid-template-columns: repeat(3, 350px); gap: 32px; align-items: start">
    <section data-family-frame="phoneWeek"><PhoneWeek /></section>
    <section data-family-frame="phoneWho"><PhoneWho /></section>
    <section data-family-frame="phoneRaster">
      <FamilyPeople :width="350" :from="13" :to="22" :hour-height="54" :names="false" />
    </section>
    <section data-family-frame="phoneMonth"><PhoneMonth /></section>
    <section data-family-frame="phoneFree"><PhoneMonth finder /></section>
    <section data-family-frame="phoneYear">
      <FamilyYear :width="350" :height="497" :label-width="28" :titles="false" :every-day="false" />
    </section>
  </div>
</template>
