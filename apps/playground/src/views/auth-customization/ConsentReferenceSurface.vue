<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CoarButton, CoarCard, CoarCheckbox, CoarNotice } from '@cocoar/vue-ui';
import type { AuthLabConsentScope } from './authLabRuntime';
import type { AuthPageLocale as AuthLabLocale } from '@cocoar/vue-page-builder';
import { postAuthLab } from './authLabClient';

const props = defineProps<{
  locale: AuthLabLocale;
  productName: string;
  showLegal: boolean;
  clientName: string;
  clientHostname: string;
  dynamicClient: boolean;
  scopes: AuthLabConsentScope[];
  scenario: string;
}>();

const approved = ref<Record<string, boolean>>({});
const submitting = ref(false);
const error = ref('');
const result = ref('');

const copy = computed(() =>
  props.locale === 'de'
    ? {
        title: `„${props.clientName}“ autorisieren`,
        unverified: 'nicht verifiziert',
        subtitle: 'Prüfen Sie, auf welche Daten diese Anwendung zugreifen möchte.',
        identity: 'App-Identität',
        warning: `Diese App wird durch die Domain ${props.clientHostname} identifiziert. Autorisieren Sie sie nur, wenn Sie dieser Domain vertrauen.`,
        required: 'Erforderlich',
        deny: 'Ablehnen',
        allow: 'Zulassen',
      }
    : {
        title: `Authorise “${props.clientName}”`,
        unverified: 'unverified',
        subtitle: 'Review the access this app is asking for.',
        identity: 'App identity',
        warning: `This app is identified by the domain ${props.clientHostname}. Only authorise it if you trust this domain.`,
        required: 'Required',
        deny: 'Deny',
        allow: 'Allow',
      },
);

watch(
  () => props.scopes,
  (scopes) => {
    approved.value = Object.fromEntries(scopes.map((scope) => [scope.name, true]));
  },
  { immediate: true, deep: true },
);

async function submit(decision: 'allow' | 'deny') {
  if (submitting.value) return;
  submitting.value = true;
  error.value = '';
  result.value = '';
  try {
    const response = await postAuthLab('consent', {
      decision,
      scenario: props.scenario,
      approvedScopes:
        decision === 'allow'
          ? props.scopes.filter((scope) => approved.value[scope.name]).map((scope) => scope.name)
          : [],
    });
    result.value = response.message;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Request failed.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section class="reference-page" data-testid="reference-consent-surface">
    <div class="language-chip">{{ locale.toUpperCase() }}</div>
    <div class="auth-frame">
      <div class="brand">
        <div class="brand__mark" aria-hidden="true">M</div>
        <h1>{{ productName || 'Modgud' }}</h1>
        <div v-if="showLegal" class="brand__legal">
          <a href="#terms" @click.prevent>Terms</a>
          <a href="#privacy" @click.prevent>Privacy</a>
        </div>
      </div>

      <CoarCard elevated>
        <div class="consent-card">
          <header>
            <h2>
              {{ copy.title }}
              <small v-if="dynamicClient">[{{ copy.unverified }}]</small>
            </h2>
            <p>{{ copy.subtitle }}</p>
            <p v-if="clientHostname" class="identity">
              {{ copy.identity }}: <code>{{ clientHostname }}</code>
            </p>
          </header>

          <CoarNotice v-if="dynamicClient && clientHostname" variant="warning" truncate>
            {{ copy.warning }}
          </CoarNotice>

          <div class="scope-list" data-testid="reference-consent-scopes">
            <article v-for="scope in scopes" :key="scope.name">
              <CoarCheckbox
                v-model="approved[scope.name]"
                :disabled="scope.required"
                :label="scope.displayName"
              />
              <p>{{ scope.description }}</p>
              <small v-if="scope.required">{{ copy.required }}</small>
            </article>
          </div>

          <CoarNotice v-if="error" variant="error">{{ error }}</CoarNotice>
          <CoarNotice v-if="result" variant="success">{{ result }}</CoarNotice>

          <div class="actions">
            <CoarButton
              variant="secondary"
              full-width
              :disabled="submitting"
              @click="submit('deny')"
            >
              {{ copy.deny }}
            </CoarButton>
            <CoarButton full-width :loading="submitting" @click="submit('allow')">
              {{ copy.allow }}
            </CoarButton>
          </div>
        </div>
      </CoarCard>
    </div>
  </section>
</template>

<style scoped>
.reference-page {
  position: relative;
  display: flex;
  min-height: 100%;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow: auto;
  background: var(--coar-surface-neutral-subtle, #f7f7f9);
}
.language-chip {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: #777b86;
  font-size: 0.75rem;
}
.auth-frame {
  display: grid;
  width: min(28rem, 100%);
  gap: 2rem;
}
.brand {
  display: grid;
  justify-items: center;
  gap: 0.25rem;
  text-align: center;
}
.brand__mark {
  display: grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  border-radius: 1.1rem;
  background: var(--auth-lab-accent, #1666cc);
  color: white;
  font-size: 1.65rem;
  font-weight: 750;
}
.brand h1,
h2 {
  margin: 0;
  color: var(--coar-text-neutral-primary, #1d2433);
}
.brand h1 {
  font-size: 1.5rem;
}
.brand__legal {
  display: flex;
  gap: 0.75rem;
  font-size: 0.7rem;
}
.brand__legal a {
  color: var(--coar-text-neutral-tertiary, #737784);
}
.consent-card {
  display: grid;
  gap: 1rem;
}
.consent-card header {
  display: grid;
  gap: 0.35rem;
  text-align: center;
}
.consent-card header h2 {
  font-size: 1.05rem;
  overflow-wrap: anywhere;
}
.consent-card header h2 small {
  color: #92400e;
  font-size: 0.68em;
  font-weight: 500;
}
.consent-card header p {
  margin: 0;
  color: #626773;
  font-size: 0.8rem;
}
.identity code {
  overflow-wrap: anywhere;
  color: #1f2937;
  font-weight: 600;
}
.scope-list {
  display: grid;
  gap: 0.5rem;
}
.scope-list article {
  min-width: 0;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--coar-border-neutral, #dfe1e7);
  border-radius: 0.45rem;
}
.scope-list article p,
.scope-list article small {
  margin: 0.25rem 0 0 1.75rem;
  overflow-wrap: anywhere;
  color: #626773;
  font-size: 0.72rem;
}
.scope-list article small {
  color: #7b7f89;
  font-size: 0.65rem;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
@media (max-width: 359px) {
  .reference-page {
    padding: 0.75rem;
  }
  .auth-frame {
    gap: 1.25rem;
  }
  .brand__mark {
    width: 3.25rem;
    height: 3.25rem;
  }
}
</style>
