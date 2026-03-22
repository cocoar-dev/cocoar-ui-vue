<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Animation duration token */
    duration?: 'fast' | 'normal' | 'slow';
  }>(),
  { duration: 'normal' },
);

function onEnter(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '0';
  htmlEl.style.overflow = 'hidden';
  // Force reflow
  void htmlEl.offsetHeight;
  htmlEl.style.height = `${htmlEl.scrollHeight}px`;
}

function onAfterEnter(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '';
  htmlEl.style.overflow = '';
}

function onLeave(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = `${htmlEl.scrollHeight}px`;
  htmlEl.style.overflow = 'hidden';
  // Force reflow
  void htmlEl.offsetHeight;
  htmlEl.style.height = '0';
}

function onAfterLeave(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.height = '';
  htmlEl.style.overflow = '';
}
</script>

<template>
  <Transition
    name="coar-collapse"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
    <slot />
  </Transition>
</template>