<script setup lang="ts">
// One demo of the mobile documentation (apps/docs/mobile) in a real small viewport:
// `<PhoneFrame src="form" title="…" />` shows #/form of the app in an iframe of 390×844 CSS px
// (`size="tablet"`: 810×1080), scaled down as a whole when the content column is narrower. Only
// inside such a viewport do bottom sheets dock at its bottom edge, teleported overlays stay inside
// it and width-dependent rules see its width. `?embed` hides the app's own header.
//
// The frame follows the docs' colour scheme; its Light/Dark buttons override that for this frame
// only, sent to the app by postMessage (no reload, the demo keeps its state). On a narrow docs
// viewport — a real phone — the frame would only shrink the demo, so it shows a link to the
// mobile docs instead.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useData, withBase } from 'vitepress';
import { SCHEME_MESSAGE, mobileDocsPath, type Scheme } from '../../mobile/embed';

const props = withDefaults(
  defineProps<{
    /** The id of a demo in apps/docs/mobile/demos/index.ts, e.g. `form`. */
    src: string;
    /** What the demo shows; the iframe's accessible name and the caption. */
    title: string;
    size?: 'phone' | 'tablet';
  }>(),
  { size: 'phone' },
);

const SIZES = {
  phone: { width: 390, height: 844 },
  tablet: { width: 810, height: 1080 },
} as const;
/** The frame's border around the viewport, each side (px). */
const BEZEL = 10;
/** Below this docs width the frame gives way to a plain link (see .coar-phone-frame__narrow). */
const NARROW_QUERY = '(max-width: 639px)';

const SCHEMES: Scheme[] = ['light', 'dark'];
const SCHEME_LABELS: Record<Scheme, string> = { light: 'Light', dark: 'Dark' };

const { isDark } = useData();

const viewport = computed(() => SIZES[props.size]);
const outer = computed(() => ({
  width: viewport.value.width + 2 * BEZEL,
  height: viewport.value.height + 2 * BEZEL,
}));

/** The demo in the full mobile docs, with header and navigation. */
const appUrl = computed(() => withBase(mobileDocsPath(props.src)));

const docsScheme = computed<Scheme>(() => (isDark.value ? 'dark' : 'light'));
const override = ref<Scheme | null>(null);
const scheme = computed<Scheme>(() => override.value ?? docsScheme.value);

function choose(value: Scheme) {
  override.value = value === docsScheme.value ? null : value;
}

// Client-only state: the server render knows neither the docs' scheme nor the width, so the
// iframe appears after mount (and then loads lazily). Its address carries the scheme of that
// moment and stays fixed; later changes go by message, so the demo is not reloaded.
const mounted = ref(false);
const frameUrl = ref('');
const narrow = ref(false);
const stage = ref<HTMLElement | null>(null);
const frame = ref<HTMLIFrameElement | null>(null);
const available = ref(0);

const scale = computed(() =>
  available.value > 0 ? Math.min(1, available.value / outer.value.width) : 1,
);

function sendScheme() {
  frame.value?.contentWindow?.postMessage(
    { type: SCHEME_MESSAGE, scheme: scheme.value },
    window.location.origin,
  );
}
watch(scheme, sendScheme);

let media: MediaQueryList | null = null;
let observer: ResizeObserver | null = null;
const onMedia = () => (narrow.value = media?.matches ?? false);

onMounted(() => {
  media = window.matchMedia(NARROW_QUERY);
  onMedia();
  media.addEventListener('change', onMedia);
  observer = new ResizeObserver(([entry]) => (available.value = entry.contentRect.width));
  if (stage.value) observer.observe(stage.value);
  frameUrl.value = withBase(mobileDocsPath(props.src, { embed: true, scheme: scheme.value }));
  mounted.value = true;
});

onBeforeUnmount(() => {
  media?.removeEventListener('change', onMedia);
  observer?.disconnect();
});
</script>

<template>
  <figure class="coar-phone-frame">
    <div class="coar-phone-frame__bar">
      <figcaption class="coar-phone-frame__title">{{ title }}</figcaption>
      <div class="coar-phone-frame__schemes" role="group" aria-label="Colour scheme of the demo">
        <button
          v-for="s in SCHEMES"
          :key="s"
          type="button"
          class="coar-phone-frame__scheme"
          :aria-pressed="mounted && scheme === s"
          @click="choose(s)"
        >
          {{ SCHEME_LABELS[s] }}
        </button>
      </div>
      <a class="coar-phone-frame__open" :href="appUrl" target="_blank" rel="noopener">
        Open in the mobile docs
      </a>
    </div>

    <div ref="stage" class="coar-phone-frame__stage">
      <div
        class="coar-phone-frame__scaler"
        :style="{ width: `${outer.width * scale}px`, height: `${outer.height * scale}px` }"
      >
        <div
          class="coar-phone-frame__device"
          :style="{
            width: `${outer.width}px`,
            height: `${outer.height}px`,
            padding: `${BEZEL}px`,
            transform: scale < 1 ? `scale(${scale})` : undefined,
          }"
        >
          <iframe
            v-if="mounted && !narrow"
            ref="frame"
            class="coar-phone-frame__viewport"
            :src="frameUrl"
            :title="title"
            :width="viewport.width"
            :height="viewport.height"
            loading="lazy"
            @load="sendScheme"
          />
        </div>
      </div>
    </div>

    <p class="coar-phone-frame__narrow">
      <a class="coar-phone-frame__narrow-link" :href="appUrl" target="_self"
        >Open “{{ title }}” in the mobile docs</a
      >
      On a phone the demo runs at the full size of your screen.
    </p>
  </figure>
</template>

<style scoped>
.coar-phone-frame {
  margin: 16px 0;
}

.coar-phone-frame__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-bottom: 12px;
  font-size: 14px;
}

.coar-phone-frame__title {
  flex: 1 1 auto;
  font-weight: 600;
}

.coar-phone-frame__schemes {
  display: inline-flex;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.coar-phone-frame__scheme {
  padding: 2px 12px;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

.coar-phone-frame__scheme + .coar-phone-frame__scheme {
  border-left: 1px solid var(--vp-c-divider);
}

.coar-phone-frame__scheme[aria-pressed='true'] {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}

.coar-phone-frame__open {
  font-size: 13px;
}

.coar-phone-frame__stage {
  overflow: hidden;
}

.coar-phone-frame__scaler {
  margin: 0 auto;
}

.coar-phone-frame__device {
  box-sizing: border-box;
  transform-origin: top left;
  border-radius: 36px;
  background: var(--vp-c-gray-1);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
}

.coar-phone-frame__viewport {
  display: block;
  border: 0;
  border-radius: 26px;
  background: var(--vp-c-bg);
}

.coar-phone-frame__narrow {
  display: none;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.coar-phone-frame__narrow-link {
  display: block;
  margin-bottom: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--vp-c-brand-soft);
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
}

/* Keep in step with NARROW_QUERY. */
@media (max-width: 639px) {
  .coar-phone-frame__schemes,
  .coar-phone-frame__open,
  .coar-phone-frame__stage {
    display: none;
  }

  .coar-phone-frame__narrow {
    display: block;
  }
}
</style>
