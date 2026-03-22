<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Animation duration token */
    duration?: 'fast' | 'normal' | 'slow';
    /** Whether to animate on initial render */
    appear?: boolean;
  }>(),
  { duration: 'normal', appear: false },
);

const durationVar: Record<string, string> = {
  fast: 'var(--coar-duration-fast)',
  normal: 'var(--coar-duration-normal)',
  slow: 'var(--coar-duration-slow)',
};

function onEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.opacity = '0';
  void htmlEl.offsetHeight;
  htmlEl.style.transition = `opacity ${durationVar[props.duration]} var(--coar-ease-out)`;
  htmlEl.style.opacity = '1';
  htmlEl.addEventListener('transitionend', done, { once: true });
}

function onAfterEnter(el: Element) {
  (el as HTMLElement).style.transition = '';
}

function onLeave(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.transition = `opacity ${durationVar[props.duration]} var(--coar-ease-in)`;
  htmlEl.style.opacity = '0';
  htmlEl.addEventListener('transitionend', done, { once: true });
}

function onAfterLeave(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.opacity = '';
  htmlEl.style.transition = '';
}
</script>

<template>
  <Transition
    :appear="appear"
    :css="false"
    @enter="onEnter"
    @after-enter="onAfterEnter"
    @leave="onLeave"
    @after-leave="onAfterLeave"
  >
    <slot />
  </Transition>
</template>
