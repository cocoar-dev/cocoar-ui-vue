<script setup lang="ts">
import './compact-fonts';
/**
 * Compact profile (`.coar-compact`, Preview): navigation — navbar, breadcrumb, tabs,
 * segmented control, pagination and the wizard indicator, horizontal and vertical.
 */
import { ref } from 'vue';
import {
  CoarAvatar,
  CoarBreadcrumb,
  CoarBreadcrumbItem,
  CoarButton,
  CoarNavbar,
  CoarPagination,
  CoarSegmentedControl,
  CoarTab,
  CoarTabGroup,
  CoarWizard,
  type CoarWizardStep,
} from '@cocoar/vue-ui';

const tab = ref('overview');
const view = ref('week');
const views = [
  { value: 'day', label: 'Tag' },
  { value: 'week', label: 'Woche' },
  { value: 'month', label: 'Monat' },
  { value: 'year', label: 'Jahr', disabled: true },
];
const page = ref(4);
const step = ref('type');
const steps: CoarWizardStep[] = [
  { id: 'basics', label: 'Basics', description: 'Name' },
  { id: 'type', label: 'Client type' },
  { id: 'redirects', label: 'Redirect URIs', optional: true },
  { id: 'review', label: 'Review' },
];
</script>

<template>
  <div class="coar-compact">
    <section class="vs-section">
      <h2 class="vs-title">Navbar (bordered) with breadcrumb</h2>
      <CoarNavbar bordered :elevated="false">
        <template #start>
          <strong>cocoar</strong>
          <CoarBreadcrumb>
            <CoarBreadcrumbItem href="#">Projekte</CoarBreadcrumbItem>
            <CoarBreadcrumbItem href="#">Website-Relaunch</CoarBreadcrumbItem>
            <CoarBreadcrumbItem active>Einstellungen</CoarBreadcrumbItem>
          </CoarBreadcrumb>
        </template>
        <template #end>
          <CoarButton variant="tertiary" size="s">Hilfe</CoarButton>
          <CoarAvatar name="Ada Lovelace" size="s" />
        </template>
      </CoarNavbar>
    </section>

    <section class="vs-section">
      <h2 class="vs-title">Tabs (active, disabled), segmented control, pagination</h2>
      <div class="vs-stack" style="align-items: stretch">
        <CoarTabGroup v-model="tab">
          <CoarTab id="overview">Übersicht</CoarTab>
          <CoarTab id="members">Mitglieder</CoarTab>
          <CoarTab id="billing">Abrechnung</CoarTab>
          <CoarTab id="audit" disabled>Audit-Protokoll</CoarTab>
        </CoarTabGroup>
        <div class="vs-row">
          <CoarSegmentedControl v-model="view" :options="views" size="s" />
          <CoarSegmentedControl v-model="view" :options="views" size="m" />
        </div>
        <CoarPagination v-model="page" :total-items="240" :page-size="20" />
      </div>
    </section>

    <section class="vs-section">
      <h2 class="vs-title">Wizard indicator: top and left</h2>
      <div class="vs-stack" style="align-items: stretch">
        <CoarWizard v-model:step="step" :steps="steps">
          <template #type><p style="margin: 0">Welche Art von Client ist das?</p></template>
        </CoarWizard>
        <CoarWizard v-model:step="step" :steps="steps" indicator-position="left">
          <template #type><p style="margin: 0">Welche Art von Client ist das?</p></template>
        </CoarWizard>
      </div>
    </section>
  </div>
</template>
