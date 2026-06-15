<template>
  <div class="wiz-demo">
    <div class="wiz-demo__controls">
      <span class="wiz-demo__label">Indicator:</span>
      <CoarSegmentedControl v-model="pos" :options="positions" size="xs" />
    </div>

    <!-- A bounded frame standing in for a routed modal. The wizard resizes it
         per step (animated); the indicator scrolls inside its own width. -->
    <div class="wiz-modal">
      <div class="wiz-modal__header">Create OAuth API</div>
      <div class="wiz-modal__body">
        <CoarWizard
          :steps="steps"
          v-model:step="step"
          :indicator-position="pos"
          finish-label="Create"
          @finish="created = true"
        >
          <template #basics>
            <div class="wiz-page">
              <p class="wiz-page__hint">Name your API client. Next is blocked until a name is entered.</p>
              <CoarTextInput v-model="form.name" placeholder="My API client" />
              <CoarTextInput v-model="form.desc" placeholder="Description (optional)" />
            </div>
          </template>

          <template #type>
            <div class="wiz-page">
              <p class="wiz-page__hint">What kind of client is this?</p>
              <label v-for="t in types" :key="t.id" class="wiz-radio">
                <input type="radio" :value="t.id" v-model="form.type" />
                <span><strong>{{ t.label }}</strong><br /><small>{{ t.desc }}</small></span>
              </label>
            </div>
          </template>

          <template #redirects>
            <div class="wiz-page">
              <p class="wiz-page__hint">Allowed redirect URIs (this step is intentionally tall).</p>
              <CoarTextInput
                v-for="(_, i) in form.redirects"
                :key="i"
                v-model="form.redirects[i]"
                placeholder="https://app.example.com/callback"
              />
              <button class="wiz-add" type="button" @click="form.redirects.push('')">+ Add URI</button>
            </div>
          </template>

          <template #scopes>
            <div class="wiz-page">
              <p class="wiz-page__hint">Pick the scopes this client may request.</p>
              <label v-for="s in scopeList" :key="s" class="wiz-check">
                <input type="checkbox" :value="s" v-model="form.scopes" /> {{ s }}
              </label>
            </div>
          </template>

          <template #review>
            <div class="wiz-page">
              <p class="wiz-page__hint">Review — a short step again, so the modal shrinks back.</p>
              <ul class="wiz-review">
                <li><b>Name:</b> {{ form.name || '—' }}</li>
                <li><b>Type:</b> {{ form.type }}</li>
                <li><b>Redirects:</b> {{ form.redirects.filter(Boolean).length }}</li>
                <li><b>Scopes:</b> {{ form.scopes.length }}</li>
              </ul>
              <p v-if="created" class="wiz-done">✓ Created!</p>
            </div>
          </template>
        </CoarWizard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import {
  CoarWizard,
  CoarSegmentedControl,
  CoarTextInput,
  type CoarWizardStep,
  type WizardIndicatorPosition,
  type CoarSegmentedControlOption,
} from '@cocoar/vue-ui';

const pos = ref<WizardIndicatorPosition>('top');
const positions: CoarSegmentedControlOption<WizardIndicatorPosition>[] = [
  { value: 'top', label: 'Top' },
  { value: 'right', label: 'Right' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
];

const step = ref('basics');
const created = ref(false);

const form = reactive({
  name: '',
  desc: '',
  type: 'spa',
  redirects: ['', '', ''],
  scopes: [] as string[],
});

const types = [
  { id: 'spa', label: 'Single-page app', desc: 'Public client, PKCE' },
  { id: 'web', label: 'Web server', desc: 'Confidential client with a secret' },
  { id: 'machine', label: 'Machine-to-machine', desc: 'Client credentials grant' },
];
const scopeList = ['openid', 'profile', 'email', 'offline_access', 'api:read', 'api:write', 'admin'];

// `canAdvance` on the first step gates Next until a name is typed.
const steps = computed<CoarWizardStep[]>(() => [
  { id: 'basics', label: 'Basics', description: 'Name', canAdvance: form.name.trim().length > 0 },
  { id: 'type', label: 'Client type' },
  { id: 'redirects', label: 'Redirect URIs', optional: true },
  { id: 'scopes', label: 'Scopes' },
  { id: 'review', label: 'Review' },
]);
</script>

<style scoped>
.wiz-demo { display: flex; flex-direction: column; gap: 12px; }
.wiz-demo__controls { display: flex; align-items: center; gap: 8px; }
.wiz-demo__label { font-size: 13px; color: var(--coar-text-neutral-secondary); }

/* Modal stand-in: fixed width, content-driven height (so the resize shows). */
.wiz-modal {
  width: 460px;
  max-width: 100%;
  border: 1px solid var(--coar-border-neutral);
  border-radius: var(--coar-radius-xl);
  background: var(--coar-background-neutral-primary);
  box-shadow: var(--coar-shadow-m, 0 8px 24px rgba(0, 0, 0, 0.12));
  overflow: hidden;
}
.wiz-modal__header {
  padding: 14px 18px;
  font-weight: 600;
  border-bottom: 1px solid var(--coar-border-neutral);
}
.wiz-modal__body { padding: 18px; }

.wiz-page { display: flex; flex-direction: column; gap: 10px; }
.wiz-page__hint { margin: 0; font-size: 13px; color: var(--coar-text-neutral-secondary); }

.wiz-radio, .wiz-check {
  display: flex; gap: 8px; align-items: flex-start;
  font-size: 14px; cursor: pointer;
}
.wiz-check { align-items: center; }
.wiz-add {
  align-self: flex-start; border: none; background: transparent; cursor: pointer;
  color: var(--coar-text-accent-primary); font: inherit; padding: 2px 0;
}
.wiz-review { margin: 0; padding-left: 1.1em; font-size: 14px; line-height: 1.7; }
.wiz-done { margin: 4px 0 0; color: var(--coar-text-semantic-success-bold, #16a34a); font-weight: 600; }
</style>
