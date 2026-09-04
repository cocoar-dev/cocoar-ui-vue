<template>
  <CoarDataList
    v-model:search="search"
    :items="contacts"
    :item-key="(contact) => contact.email"
    :group-by="(contact) => contact.team"
    :sort-options="[{ key: 'name', label: 'Name' }]"
    :sort="{ key: 'name', direction: 'asc' }"
    selection="single"
    show-search
    density="s"
    bordered
    height="20rem"
  >
    <template #group-header="{ group, count }">
      <CoarIcon name="users" size="s" />
      <span>{{ group }}</span>
      <CoarBadge variant="neutral">{{ count }}</CoarBadge>
    </template>

    <template #item="{ item, selected }">
      <div class="contact">
        <CoarAvatar :name="item.name" size="s" />
        <div class="contact__text">
          <span class="contact__name">{{ item.name }}</span>
          <span class="contact__email">{{ item.email }}</span>
        </div>
        <CoarIcon v-if="selected" name="check" size="s" class="contact__check" />
      </div>
    </template>
  </CoarDataList>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CoarAvatar, CoarBadge, CoarDataList, CoarIcon } from '@cocoar/vue-ui';

interface Contact {
  name: string;
  email: string;
  team: string;
}

const teams = ['Platform', 'Design', 'Support', 'Sales'];
const first = ['Ada', 'Grace', 'Linus', 'Margaret', 'Tim', 'Barbara', 'Ken', 'Dennis', 'Radia', 'Vint'];
const last = ['Lovelace', 'Hopper', 'Torvalds', 'Hamilton', 'Berners-Lee', 'Liskov', 'Thompson', 'Ritchie', 'Perlman', 'Cerf'];

const contacts: Contact[] = first.flatMap((givenName, i) =>
  last.slice(0, 3).map((familyName, j) => ({
    name: `${givenName} ${familyName}`,
    email: `${givenName}.${familyName}@example.com`.toLowerCase(),
    team: teams[(i + j) % teams.length],
  })),
);

const search = ref('');
</script>

<style scoped>
.contact {
  display: flex;
  align-items: center;
  gap: var(--coar-spacing-s);
  min-width: 0;
}

.contact__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.contact__name {
  font-weight: var(--coar-font-weight-medium);
}

.contact__email {
  font-size: var(--coar-body-caption-size);
  color: var(--coar-text-neutral-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact__check {
  color: var(--coar-icon-accent-primary);
}
</style>
