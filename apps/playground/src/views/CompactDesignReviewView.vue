<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { CoarThemeScope } from '@cocoar/vue-ui';
import '../../../../packages/ui/src/compact-fonts';
import CorePresentationSamples from '../design-review/CorePresentationSamples.vue';
import { libraryScene, libraryScenes } from '../design-review/library-scenes';

const route = useRoute();
const kinds = ['typography', 'fields', 'selection', 'dates', 'states'] as const;
type CoreKind = typeof kinds[number];
const isCore = (value: unknown): value is CoreKind => kinds.includes(value as CoreKind);
// `scene` is an alias of `kind` for the library scenes.
const requested = route.query.kind ?? route.query.scene;
const kind = ref<string>(isCore(requested) || libraryScene(requested) ? String(requested) : 'typography');
const mobile = ref(route.query.mobile === 'true');
const mode = ref<'light' | 'dark'>(route.query.mode === 'dark' ? 'dark' : 'light');
const fonts = ['Inter', 'Poppins', 'System'] as const;
const font = ref<string>(fonts.find((value) => value === route.query.font) ?? 'Inter');
const families: Record<string, string> = {
  Inter: 'Inter, ui-sans-serif, system-ui, sans-serif',
  Poppins: 'Poppins, ui-sans-serif, system-ui, sans-serif',
  System: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};
const family = computed(() => families[font.value] ?? families.Inter);
const profiles = computed(() => route.query.profile === 'compact' ? ['compact']
  : route.query.profile === 'legacy' ? ['legacy'] : ['legacy', 'compact']);

const scene = computed(() => libraryScene(kind.value));
const isolated = computed(() => !!scene.value
  && (scene.value.isolation === 'frame' || route.query.isolate === 'true'));
const compactStyle = computed(() => ({
  '--coar-font-family-body': family.value,
  '--coar-font-family-title': family.value,
}));

// A frame page (`frame=1`) shows one profile of one library scene and carries the
// profile, mode and mobile on <html>: the document-global renderers (Monaco, Mermaid)
// read their theme there. The parent gallery embeds one such frame per profile.
const frame = route.query.frame === '1';
const frameClasses = frame ? [
  'design-review-frame',
  mode.value === 'dark' ? 'dark-mode' : 'light-mode',
  ...(profiles.value[0] === 'compact' ? ['coar-compact'] : []),
  ...(mobile.value ? ['coar-mobile'] : []),
] : [];
onMounted(() => {
  if (!frame) return;
  const html = document.documentElement;
  html.classList.add(...frameClasses);
  if (profiles.value[0] === 'compact') {
    for (const [name, value] of Object.entries(compactStyle.value)) html.style.setProperty(name, value);
  }
});
onBeforeUnmount(() => {
  if (!frame) return;
  const html = document.documentElement;
  html.classList.remove(...frameClasses);
  for (const name of Object.keys(compactStyle.value)) html.style.removeProperty(name);
});

function frameSrc(profile: string) {
  const query = new URLSearchParams({
    frame: '1',
    kind: kind.value,
    profile,
    mode: mode.value,
    mobile: String(mobile.value),
    font: font.value,
  });
  return `${route.path}?${query}`;
}
</script>

<template>
  <main v-if="frame" class="compact-review compact-review--frame" :data-review-frame-page="profiles[0]">
    <CoarThemeScope :mode="mode">
      <section
        class="compact-review__scene"
        :class="{ 'coar-compact': profiles[0] === 'compact', 'coar-mobile': mobile }"
        :style="profiles[0] === 'compact' ? compactStyle : undefined"
        :data-review-profile="profiles[0]"
        :data-review-scene="kind"
      >
        <component :is="scene.component" v-if="scene" />
        <CorePresentationSamples v-else-if="isCore(kind)" :kind="kind" />
      </section>
    </CoarThemeScope>
  </main>
  <main v-else class="compact-review">
    <header class="compact-review__header">
      <h1>Designvergleich · Preview</h1>
      <p>Identische synthetische Daten. Keine Änderung der Standarddarstellung.</p>
      <div class="compact-review__controls">
        <label>Bereich
          <select v-model="kind" data-review-kind>
            <optgroup label="Core (ui)"><option v-for="item in kinds" :key="item">{{ item }}</option></optgroup>
            <optgroup label="Bibliotheken">
              <option v-for="item in libraryScenes" :key="item.id" :value="item.id">{{ item.label }}</option>
            </optgroup>
          </select>
        </label>
        <label>Modus <select v-model="mode" data-review-mode><option>light</option><option>dark</option></select></label>
        <label>Neue Schrift <select v-model="font" data-review-font><option v-for="item in fonts" :key="item">{{ item }}</option></select></label>
        <label><input v-model="mobile" type="checkbox" data-review-mobile> Mobile</label>
      </div>
      <p v-if="scene" class="compact-review__note" data-review-scene-note>
        Pakete: {{ scene.packages.join(', ') }}<template v-if="isolated"> · je Gestaltung ein eigenes Dokument (iframe): der Renderer hält sein Theme seitenweit</template>
      </p>
    </header>
    <div class="compact-review__profiles">
      <CoarThemeScope v-for="profile in profiles" :key="profile" :mode="mode">
        <section
          class="compact-review__profile"
          :class="{ 'coar-compact': profile === 'compact' && !isolated, 'coar-mobile': mobile && !isolated }"
          :style="profile === 'compact' && !isolated ? compactStyle : undefined"
          :data-review-profile="profile"
          :data-review-scene="scene?.id"
        >
          <h2 class="compact-review__profile-title">{{ profile === 'compact' ? 'Neue Gestaltung' : 'Bisherige Gestaltung' }}</h2>
          <iframe
            v-if="scene && isolated"
            :key="frameSrc(profile)"
            class="compact-review__frame"
            :src="frameSrc(profile)"
            :title="`${scene.label} · ${profile}`"
            :style="{ height: `${scene.frameHeight}px` }"
            :data-review-frame="profile"
          />
          <div v-else-if="scene" :key="`${kind}-${mode}-${mobile}`" class="compact-review__scene">
            <component :is="scene.component" />
          </div>
          <CorePresentationSamples v-else-if="isCore(kind)" :key="kind" :kind="kind" />
        </section>
      </CoarThemeScope>
    </div>
  </main>
</template>

<style scoped>
.compact-review { padding: 24px; }
.compact-review--frame { padding: 0; }
.compact-review__header { margin-bottom: 24px; }
.compact-review__header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 600; }
.compact-review__header p { margin: 0 0 16px; }
.compact-review__header .compact-review__note { margin: 12px 0 0; font-size: 13px; }
.compact-review__controls { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
.compact-review__controls label { display: flex; gap: 8px; align-items: center; }
.compact-review__controls select { min-height: 32px; font: inherit; }
.compact-review__profiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 560px), 1fr)); gap: 24px; }
.compact-review__profile { padding: 20px; min-width: 0; background: var(--coar-background-neutral-primary); color: var(--coar-text-neutral-primary); border: 1px solid var(--coar-border-neutral-tertiary); }
.compact-review__profile-title { margin: 0 0 20px; font-size: var(--coar-headings-heading-size); font-weight: var(--coar-headings-heading-weight); }
.compact-review__frame { display: block; width: 100%; border: 0; }
.compact-review--frame .compact-review__scene { padding: 16px; min-height: 100vh; box-sizing: border-box; background: var(--coar-background-neutral-primary); color: var(--coar-text-neutral-primary); }
@media (max-width: 600px) {
  .compact-review { padding: 8px; }
  .compact-review__profile { padding: 8px; }
  .compact-review--frame .compact-review__scene { padding: 8px; }
}
</style>

<style>
/* Plain layout for the library scenes (the same classes the visual stories get from
   src/visual/story.css, which this page does not load). No tokens: the frame around a
   scene must not change with the profile. */
.compact-review__scene .vs-section + .vs-section { margin-top: 24px; }
.compact-review__scene .vs-title { margin: 0 0 12px; font-size: 13px; font-weight: 600; }
.compact-review__scene .vs-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.compact-review__scene .vs-stack { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
/* A frame page is a bare document of the gallery: no playground navigation. */
html.design-review-frame .app-nav,
html.design-review-frame .te-fab { display: none; }
html.design-review-frame .app-main { padding: 0; }
html.design-review-frame,
html.design-review-frame body { background: var(--coar-background-neutral-primary); }
</style>
