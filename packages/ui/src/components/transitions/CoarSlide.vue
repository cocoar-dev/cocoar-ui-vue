<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Slide direction */
    direction?: 'up' | 'down' | 'left' | 'right';
    /** Animation duration token */
    duration?: 'fast' | 'normal' | 'slow';
    /** Whether to animate on initial render */
    appear?: boolean;
  }>(),
  { direction: 'down', duration: 'normal', appear: false },
);

const durationVar: Record<string, string> = {
  fast: 'var(--coar-duration-fast)',
  normal: 'var(--coar-duration-normal)',
  slow: 'var(--coar-duration-slow)',
};

const translateFrom: Record<string, string> = {
  down: 'translateY(-8px)',
  up: 'translateY(8px)',
  left: 'translateX(8px)',
  right: 'translateX(-8px)',
};

function onEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement;
  const dur = durationVar[props.duration];
  htmlEl.style.opacity = '0';
  htmlEl.style.transform = translateFrom[props.direction];
  void htmlEl.offsetHeight;
  htmlEl.style.transition = `transform ${dur} var(--coar-ease-out), opacity ${dur} var(--coar-ease-out)`;
  htmlEl.style.opacity = '1';
  htmlEl.style.transform = '';
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
  htmlEl.style.transform = translateFrom[props.direction];
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
