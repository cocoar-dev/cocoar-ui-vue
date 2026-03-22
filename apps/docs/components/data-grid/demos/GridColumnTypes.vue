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
  status: 'active' | 'inactive' | 'pending';
  icon: string;
}

const data: Employee[] = [
  { name: 'Alice Johnson', joinDate: '2022-03-15', salary: 95000, status: 'active', icon: 'user' },
  { name: 'Bob Smith', joinDate: '2021-07-01', salary: 85000, status: 'active', icon: 'palette' },
  { name: 'Carol Williams', joinDate: '2020-01-20', salary: 110000, status: 'inactive', icon: 'users' },
  { name: 'David Brown', joinDate: '2023-06-10', salary: 90000, status: 'pending', icon: 'user' },
  { name: 'Eve Davis', joinDate: '2022-11-05', salary: 88000, status: 'active', icon: 'palette' },
];

const builder = CoarGridBuilder.create<Employee>()
  .columns([
    (col) => col.field('name').header('Name').flex(1).sortable(),
    (col) => col.date('joinDate', 'long').header('Joined').width(180).sortable(),
    (col) => col.number('salary').header('Salary').width(120),
    (col) => col.tag('status', {
      variantMap: { active: 'success', inactive: 'error', pending: 'warning' },
    }).header('Status').width(130),
    (col) => col.icon('icon', { size: 's' }).header('Type').fixedWidth(60),
  ])
  .rowData(data);
</script>
