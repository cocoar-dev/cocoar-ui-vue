<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  CoarButton,
  CoarCard,
  CoarCheckbox,
  CoarFormField,
  CoarNotice,
  CoarPasswordInput,
  CoarTextInput,
} from '@cocoar/vue-ui';
import {
  AUTH_PAGE_COPY as AUTH_LAB_COPY,
  type AuthPageLocale as AuthLabLocale,
  type AuthPageSlot as AuthLabSlot,
} from './authPageConfig';
import type { AuthLabProvider } from './authLabRuntime';
import { postAuthLab } from './authLabClient';

const props = defineProps<{
  pageSlot: AuthLabSlot;
  locale: AuthLabLocale;
  productName: string;
  showLegal: boolean;
  internalLogin: boolean;
  passwordless: boolean;
  magicLink: boolean;
  registration: boolean;
  providers: AuthLabProvider[];
}>();

const copy = computed(() => AUTH_LAB_COPY[props.locale]);
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const submitting = ref(false);
const error = ref('');
const result = ref('');
const resetSent = ref(false);

watch(
  () => props.pageSlot,
  () => {
    error.value = '';
    result.value = '';
    resetSent.value = false;
  },
);

async function submitLogin() {
  if (!username.value.trim() || !password.value || submitting.value) return;
  submitting.value = true;
  error.value = '';
  result.value = '';
  try {
    const response = await postAuthLab('login', {
      username: username.value,
      password: password.value,
      rememberMe: rememberMe.value,
    });
    result.value = response.message;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Request failed.';
  } finally {
    submitting.value = false;
  }
}

async function submitForgot() {
  if (!username.value.trim() || submitting.value) return;
  submitting.value = true;
  error.value = '';
  result.value = '';
  try {
    const response = await postAuthLab('forgot-password', { username: username.value });
    result.value = response.message;
    resetSent.value = true;
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Request failed.';
  } finally {
    submitting.value = false;
  }
}

function localAction(message: string) {
  error.value = '';
  result.value = `${message} (demo navigation suppressed).`;
}
</script>

<template>
  <section class="reference-page" data-testid="reference-surface">
    <div class="language-chip">{{ locale.toUpperCase() }}</div>
    <div class="auth-frame" :class="{ 'auth-frame--logout': pageSlot === 'logout' }">
      <div class="brand" data-testid="reference-brand">
        <div class="brand__mark" aria-hidden="true">M</div>
        <h1>{{ productName || 'Modgud' }}</h1>
        <div v-if="showLegal" class="brand__legal">
          <a href="#terms" @click.prevent>Terms</a>
          <a href="#privacy" @click.prevent>Privacy</a>
        </div>
        <p v-if="pageSlot === 'login'">{{ copy.subtitle }}</p>
        <p v-else-if="pageSlot === 'password-forgot'">{{ copy.resetTitle }}</p>
      </div>

      <CoarCard v-if="pageSlot === 'login'" elevated>
        <form class="form-stack" @submit.prevent="submitLogin">
          <template v-if="internalLogin && !passwordless">
            <CoarFormField :label="copy.username">
              <CoarTextInput
                v-model="username"
                :placeholder="copy.username"
                autocomplete="username"
                required
              />
            </CoarFormField>
            <CoarFormField :label="copy.password">
              <CoarPasswordInput
                v-model="password"
                :placeholder="copy.password"
                autocomplete="current-password"
                required
              />
            </CoarFormField>
            <CoarCheckbox v-model="rememberMe" :label="copy.remember" />
            <CoarNotice v-if="error" variant="error">{{ error }}</CoarNotice>
            <CoarNotice v-if="result" variant="success">{{ result }}</CoarNotice>
            <CoarButton
              type="submit"
              :disabled="!username.trim() || !password"
              :loading="submitting"
              full-width
            >
              {{ copy.signIn }}
            </CoarButton>
          </template>

          <CoarNotice v-if="internalLogin && passwordless" variant="info">
            {{
              locale === 'de'
                ? 'Diese Anwendung verwendet eine passwortlose Anmeldung.'
                : 'This application uses passwordless login.'
            }}
          </CoarNotice>
          <CoarNotice v-if="internalLogin && passwordless && error" variant="error">{{
            error
          }}</CoarNotice>
          <CoarNotice v-if="internalLogin && passwordless && result" variant="success">{{
            result
          }}</CoarNotice>

          <div class="or-divider" aria-hidden="true">
            <span />
            <small v-if="internalLogin">{{ copy.or }}</small>
            <span />
          </div>

          <CoarButton
            v-if="internalLogin"
            type="button"
            variant="secondary"
            full-width
            @click="localAction(copy.passkey)"
          >
            {{ copy.passkey }}
          </CoarButton>
          <CoarButton
            v-if="magicLink"
            type="button"
            variant="secondary"
            full-width
            @click="localAction(copy.magic)"
          >
            {{ copy.magic }}
          </CoarButton>
          <CoarButton
            v-for="provider in providers"
            :key="provider.id"
            type="button"
            variant="secondary"
            full-width
            :style="{ borderColor: provider.color, color: provider.color }"
            @click="localAction(`${copy.externalPrefix} ${provider.name}`)"
          >
            {{ copy.externalPrefix }} {{ provider.name }}
          </CoarButton>
          <button
            v-if="internalLogin && !passwordless"
            class="text-link"
            type="button"
            @click="localAction(copy.forgot)"
          >
            {{ copy.forgot }}
          </button>
          <button
            v-if="registration"
            class="text-link"
            type="button"
            @click="localAction(copy.register)"
          >
            {{ copy.register }}
          </button>
        </form>
      </CoarCard>

      <CoarCard v-else-if="pageSlot === 'password-forgot'" elevated>
        <div v-if="passwordless" class="form-stack">
          <CoarNotice variant="info">
            {{
              locale === 'de'
                ? 'Passwort-Zurücksetzen ist nicht verfügbar. Diese Anwendung verwendet eine passwortlose Anmeldung.'
                : 'Password reset is not available. This application uses passwordless login.'
            }}
          </CoarNotice>
          <button class="text-link" type="button" @click="localAction(copy.back)">
            {{ copy.back }}
          </button>
        </div>
        <div v-else-if="resetSent" class="form-stack">
          <CoarNotice variant="success">{{ result }}</CoarNotice>
          <button class="text-link" type="button" @click="localAction(copy.back)">
            {{ copy.back }}
          </button>
        </div>
        <form v-else class="form-stack" @submit.prevent="submitForgot">
          <p class="instructions">{{ copy.resetInstructions }}</p>
          <CoarFormField :label="copy.username">
            <CoarTextInput
              v-model="username"
              :placeholder="copy.username"
              autocomplete="username"
              required
            />
          </CoarFormField>
          <CoarNotice v-if="error" variant="error">{{ error }}</CoarNotice>
          <CoarButton type="submit" :disabled="!username.trim()" :loading="submitting" full-width>
            {{ copy.sendLink }}
          </CoarButton>
          <button class="text-link" type="button" @click="localAction(copy.back)">
            {{ copy.back }}
          </button>
        </form>
      </CoarCard>

      <template v-else>
        <CoarCard elevated>
          <div class="logout-card">
            <h1>{{ copy.signedOut }}</h1>
            <p>{{ copy.signedOutHint }}</p>
            <CoarNotice v-if="result" variant="success">{{ result }}</CoarNotice>
            <CoarButton full-width @click="localAction(copy.signInAgain)">{{
              copy.signInAgain
            }}</CoarButton>
          </div>
        </CoarCard>
      </template>
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
  z-index: 1;
  top: 1rem;
  right: 1rem;
  color: var(--coar-text-neutral-tertiary, #777b86);
  font-size: 0.75rem;
}

.auth-frame {
  display: grid;
  width: min(24rem, 100%);
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
.logout-card h1 {
  margin: 0;
  color: var(--coar-text-neutral-primary, #1d2433);
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.brand p,
.logout-card p,
.instructions {
  margin: 0;
  color: var(--coar-text-neutral-secondary, #626773);
  font-size: 0.875rem;
}

.brand__legal {
  display: flex;
  gap: 0.75rem;
  font-size: 0.7rem;
}

.brand__legal a,
.text-link {
  color: var(--coar-text-neutral-tertiary, #737784);
}

.form-stack,
.logout-card {
  display: grid;
  gap: 1rem;
}

.logout-card {
  justify-items: center;
  text-align: center;
}

.or-divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
  color: var(--coar-text-neutral-tertiary, #737784);
}

.or-divider span {
  border-top: 1px solid var(--coar-border-neutral-secondary, #dfe1e7);
}

.text-link {
  justify-self: center;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 0.875rem;
  text-decoration: none;
  cursor: pointer;
}

.text-link:hover {
  text-decoration: underline;
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
