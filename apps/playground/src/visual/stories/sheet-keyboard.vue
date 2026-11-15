<script setup lang="ts">
// A simulated overlay keyboard exercises the public host contract. It does not stand in
// for native keyboard acceptance. Reuse the unchanged long-form story and its footer.
// Readiness requires a real scroll followed by the scrollbar's visible -> hidden cycle.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { setCoarKeyboardInset } from '@cocoar/vue-ui';
import SheetForm from './sheet-form.vue';

const props = withDefaults(defineProps<{ inset?: number }>(), { inset: 328 });
const keyboardReady = ref(false);
let scrollbarObserver: MutationObserver | null = null;

function trackFocusScroll(event: Event) {
  const viewport = event.target;
  if (!(viewport instanceof HTMLElement) || viewport.scrollTop <= 0 || scrollbarObserver) return;
  const scrollbar = viewport.closest('.coar-sheet-body')?.querySelector('.os-scrollbar-vertical');
  if (!scrollbar) return;

  let wasVisible = false;
  const check = () => {
    if (!scrollbar.classList.contains('os-scrollbar-auto-hide-hidden')) wasVisible = true;
    else if (wasVisible) {
      keyboardReady.value = true;
      scrollbarObserver?.disconnect();
    }
  };
  scrollbarObserver = new MutationObserver(check);
  scrollbarObserver.observe(scrollbar, { attributes: true, attributeFilter: ['class'] });
  check();
}

setCoarKeyboardInset(props.inset);
onMounted(() => document.addEventListener('scroll', trackFocusScroll, true));
onBeforeUnmount(() => {
  document.removeEventListener('scroll', trackFocusScroll, true);
  scrollbarObserver?.disconnect();
  setCoarKeyboardInset(0);
});
</script>

<template>
  <SheetForm />
  <div
    class="keyboard-fixture"
    :data-keyboard-ready="keyboardReady || undefined"
    :style="{ height: `${inset}px` }"
    aria-hidden="true"
  >
    Overlay keyboard · {{ inset }} CSS px
  </div>
</template>

<style scoped>
.keyboard-fixture {
  position: fixed;
  inset: auto 0 0;
  display: grid;
  place-items: center;
  background: var(--coar-background-neutral-secondary);
  color: var(--coar-text-neutral-secondary);
  /* This is the occluding host surface, not CSS that repairs the sheet. */
  z-index: 2147483647;
}
</style>
