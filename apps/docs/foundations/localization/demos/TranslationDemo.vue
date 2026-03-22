<template>
  <div class="demo">
    <div class="locale-switcher">
      <button
        v-for="loc in locales"
        :key="loc.code"
        :class="['locale-btn', { active: currentLocale === loc.code }]"
        @click="switchLocale(loc.code)"
      >
        {{ loc.label }}
      </button>
    </div>

    <div class="translated-ui">
      <div class="greeting">{{ t('greeting', { name: 'Alice' }) }}</div>
      <div class="message">{{ t('items.count', { count: 3 }) }}</div>
      <div class="button-row">
        <button class="action-btn primary">{{ t('actions.save') }}</button>
        <button class="action-btn secondary">{{ t('actions.cancel') }}</button>
        <button class="action-btn danger">{{ t('actions.delete') }}</button>
      </div>
      <div class="status">{{ t('status.lastSaved', { time: '14:30' }) }}</div>
    </div>

    <div class="code-hint">
      <code>t('greeting', { name: 'Alice' })</code>
      <span class="arrow">&rarr;</span>
      <code class="result">{{ t('greeting', { name: 'Alice' }) }}</code>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useLocalization, useI18n } from '@cocoar/vue-localization';

const service = useLocalization()!;
const { t } = useI18n();

const locales = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
];

const currentLocale = ref('en');

// Register inline translations for the demo
onMounted(() => {
  service.i18nStore.setTranslations('en', {
    greeting: 'Hello, {name}!',
    items: { count: 'You have {count} items in your cart.' },
    actions: { save: 'Save', cancel: 'Cancel', delete: 'Delete' },
    status: { lastSaved: 'Last saved at {time}' },
  });
  service.i18nStore.setTranslations('de', {
    greeting: 'Hallo, {name}!',
    items: { count: 'Sie haben {count} Artikel im Warenkorb.' },
    actions: { save: 'Speichern', cancel: 'Abbrechen', delete: 'Loeschen' },
    status: { lastSaved: 'Zuletzt gespeichert um {time}' },
  });
  service.i18nStore.setTranslations('fr', {
    greeting: 'Bonjour, {name} !',
    items: { count: 'Vous avez {count} articles dans votre panier.' },
    actions: { save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer' },
    status: { lastSaved: 'Derniere sauvegarde a {time}' },
  });
  service.i18nStore.setTranslations('es', {
    greeting: 'Hola, {name}!',
    items: { count: 'Tienes {count} articulos en tu carrito.' },
    actions: { save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar' },
    status: { lastSaved: 'Guardado por ultima vez a las {time}' },
  });
});

async function switchLocale(code: string) {
  currentLocale.value = code;
  await service.setLanguage(code);
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.locale-switcher {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.locale-btn {
  padding: 6px 14px;
  border: 1px solid var(--coar-border-neutral-primary);
  border-radius: 6px;
  background: var(--coar-bg-neutral-primary);
  color: var(--coar-text-neutral-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.locale-btn:hover {
  border-color: var(--coar-border-accent-primary);
}

.locale-btn.active {
  background: var(--coar-bg-accent-primary);
  color: var(--coar-text-constant-white);
  border-color: var(--coar-bg-accent-primary);
}

.translated-ui {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid var(--coar-border-neutral-primary);
  background: var(--coar-bg-neutral-primary);
}

.greeting {
  font-size: 18px;
  font-weight: 600;
  color: var(--coar-text-neutral-primary);
}

.message {
  font-size: 14px;
  color: var(--coar-text-neutral-secondary);
}

.button-row {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.action-btn.primary {
  background: var(--coar-bg-accent-primary);
  color: var(--coar-text-constant-white);
}

.action-btn.secondary {
  background: var(--coar-bg-neutral-secondary);
  color: var(--coar-text-neutral-primary);
}

.action-btn.danger {
  background: var(--coar-bg-error-primary);
  color: var(--coar-text-constant-white);
}

.status {
  font-size: 12px;
  color: var(--coar-text-neutral-tertiary);
  font-style: italic;
}

.code-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.arrow {
  color: var(--coar-text-neutral-tertiary);
}

.result {
  color: var(--coar-text-accent-primary);
  font-weight: 600;
}
</style>
