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
  const dur = durationVar[props.duration];
  htmlEl.style.opacity = '0';
  htmlEl.style.transform = 'scale(0.95)';
  void htmlEl.offsetHeight;
  htmlEl.style.transition = `transform ${dur} var(--coar-ease-bounce), opacity ${dur} var(--coar-ease-out)`;
  htmlEl.style.opacity = '1';
  htmlEl.style.transform = 'scale(1)';
  htmlEl.addEventListener('transitionend', done, { once: true });
}

function onAfterEnter(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.transition = '';
  htmlEl.style.transform = '';
}

function onLeave(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement;
  const dur = durationVar[props.duration];
  htmlEl.style.transition = `transform ${dur} var(--coar-ease-in), opacity ${dur} var(--coar-ease-in)`;
  htmlEl.style.opacity = '0';
  htmlEl.style.transform = 'scale(0.95)';
  htmlEl.addEventListener('transitionend', done, { once: true });
}

function onAfterLeave(el: Element) {
  const htmlEl = el as HTMLElement;
  htmlEl.style.opacity = '';
  htmlEl.style.transform = '';
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
