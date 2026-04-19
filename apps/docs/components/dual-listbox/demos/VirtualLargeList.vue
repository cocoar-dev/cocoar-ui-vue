<template>
  <div style="height: 440px;">
    <CoarDualListbox
      v-model="assigned"
      :options="principals"
      :item-components="{ principal: PrincipalRow }"
      :compare-with="byId"
      :search-by="(i) => `${i.label} ${(i.value as Principal).sub} ${(i.value as Principal).kind}`"
      available-label="Directory"
      selected-label="Assigned"
      virtual
      :item-height="44"
      :group-heading-height="28"
      drag-drop
      @item-remove="onRemove"
    />
    <p style="margin-top: 8px; font-size: 13px; color: #64748b;">
      Directory: {{ principals.length.toLocaleString() }} principals. Assigned: {{ assigned.length }}.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CoarDualListbox } from '@cocoar/vue-ui';
import type { CoarListboxOption } from '@cocoar/vue-ui';
import PrincipalRow, { type Principal } from './PrincipalRow.vue';

// Generate 10k synthetic IPrincipals: 8k users, 1.5k groups, 500 system users.
function makePrincipals(): Principal[] {
  const out: Principal[] = [];
  const firstNames = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Quinn', 'Avery', 'Rowan', 'Maya', 'Leo', 'Nora', 'Ivo', 'Yara', 'Milo', 'Luna', 'Finn', 'Zoe', 'Theo'];
  const lastNames = ['Müller', 'Schmid', 'Meier', 'Weber', 'Keller', 'Huber', 'Fischer', 'Baumann', 'Steiner', 'Brunner', 'Roth', 'Zürcher', 'Frei', 'Hofer', 'Widmer', 'Kaufmann', 'Bosshart', 'Stucki', 'Graf', 'Winkler'];
  for (let i = 0; i < 8000; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 7) % lastNames.length];
    out.push({
      id: `u${i}`,
      kind: 'user',
      name: `${fn} ${ln}`,
      sub: `${fn.toLowerCase()}.${ln.toLowerCase()}@corp.example`,
    });
  }
  const teams = ['Engineering', 'Design', 'Product', 'Sales', 'Marketing', 'Finance', 'Legal', 'HR', 'Support', 'Operations'];
  for (let i = 0; i < 1500; i++) {
    const t = teams[i % teams.length];
    out.push({
      id: `g${i}`,
      kind: 'group',
      name: `${t} #${Math.floor(i / teams.length) + 1}`,
      sub: `${(8 + (i % 24))} members`,
    });
  }
  for (let i = 0; i < 500; i++) {
    out.push({
      id: `s${i}`,
      kind: 'system',
      name: `svc-${String(i).padStart(4, '0')}`,
      sub: 'service account',
    });
  }
  return out;
}

const rawPrincipals = makePrincipals();

const principals = computed<CoarListboxOption<Principal>[]>(() =>
  rawPrincipals.map((p) => ({
    value: p,
    label: p.name,
    kind: 'principal',
  })),
);

const byId = (a: Principal, b: Principal) => a.id === b.id;

const assigned = ref<Principal[]>([rawPrincipals[3], rawPrincipals[42], rawPrincipals[8005]]);

function onRemove(payload: { item: CoarListboxOption<Principal>; side: 'available' | 'selected' }) {
  if (payload.side !== 'selected') return;
  assigned.value = assigned.value.filter((p) => !byId(p, payload.item.value));
}
</script>
