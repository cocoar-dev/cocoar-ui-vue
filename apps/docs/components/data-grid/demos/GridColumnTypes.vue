<template>
  <div style="height: 350px;">
    <CoarDataGrid :builder="builder" />
  </div>
</template>

<script setup lang="ts">
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface Employee {
  name: string;
  joinDate: string;
  salary: number;
  hours: number;
  status: 'active' | 'inactive' | 'pending';
  icon: string;
}

const data: Employee[] = [
  { name: 'Alice Johnson', joinDate: '2022-03-15', salary: 95000, hours: 1420.5, status: 'active', icon: 'user' },
  { name: 'Bob Smith', joinDate: '2021-07-01', salary: 85000, hours: 1105, status: 'active', icon: 'palette' },
  { name: 'Carol Williams', joinDate: '2020-01-20', salary: 110000, hours: 2250.75, status: 'inactive', icon: 'users' },
  { name: 'David Brown', joinDate: '2023-06-10', salary: 90000, hours: 870.25, status: 'pending', icon: 'user' },
  { name: 'Eve Davis', joinDate: '2022-11-05', salary: 88000, hours: 1680, status: 'active', icon: 'palette' },
];

const builder = CoarGridBuilder.create<Employee>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).sortable(),
    (col) => col.date('joinDate').header('Joined').width(150),
    (col) => col.currency('salary', { currencyCode: 'EUR' }).header('Salary').width(140),
    (col) => col.number('hours', { decimals: 1 }).header('Hours').width(110),
    (col) => col.tag('status', {
      variantMap: { active: 'success', inactive: 'error', pending: 'warning' },
    }).header('Status').width(130),
    (col) => col.icon('icon', { size: 's' }).header('Type').fixedWidth(60),
  ])
  .rowData(data);
</script>
