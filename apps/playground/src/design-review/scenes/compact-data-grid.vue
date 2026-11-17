<script setup lang="ts">
/**
 * `<CoarDataGrid>` (profile-neutral; the profile class comes from an ancestor): bordered grid with the
 * search toolbar, AG Grid's selection checkboxes (accent), the custom header with a sort
 * indicator, and the text, date, currency, number, tag, checkbox and icon renderers.
 * Fixed data; the locale (en-US) and zone (UTC) are fixed by the harness.
 */
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Employee {
  name: string;
  joinDate: string;
  salary: number;
  hours: number;
  status: 'active' | 'inactive' | 'pending';
  remote: boolean;
  icon: string;
}

const data: Employee[] = [
  { name: 'Alice Johnson', joinDate: '2022-03-15', salary: 95000, hours: 1420.5, status: 'active', remote: true, icon: 'user' },
  { name: 'Bob Smith', joinDate: '2021-07-01', salary: 85000, hours: 1105, status: 'active', remote: false, icon: 'palette' },
  { name: 'Carol Williams', joinDate: '2020-01-20', salary: 110000, hours: 2250.75, status: 'inactive', remote: true, icon: 'users' },
  { name: 'David Brown', joinDate: '2023-06-10', salary: 90000, hours: 870.25, status: 'pending', remote: false, icon: 'user' },
  { name: 'Eve Davis — Überstunden-Koordination', joinDate: '2022-11-05', salary: 88000, hours: 1680, status: 'active', remote: true, icon: 'palette' },
];

const builder = CoarGridBuilder.create<Employee>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).sortable(),
    (col) => col.date('joinDate').header('Joined').width(130),
    (col) => col.currency('salary', { currencyCode: 'EUR' }).header('Salary').width(120),
    (col) => col.number('hours', { decimals: 1 }).header('Hours').width(90),
    (col) =>
      col
        .tag('status', { variantMap: { active: 'success', inactive: 'error', pending: 'warning' } })
        .header('Status')
        .width(120),
    (col) => col.checkbox('remote').header('Remote').width(90),
    (col) => col.icon('icon', { size: 's' }).header('Type').fixedWidth(64),
  ])
  .rowData(data)
  .rowSelection('multiple', { checkboxes: true });
</script>

<template>
  <div style="height: 360px; display: flex">
    <CoarDataGrid :builder="builder" show-search search-placeholder="Search employees" bordered />
  </div>
</template>
