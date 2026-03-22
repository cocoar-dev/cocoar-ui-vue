<template>
  <div style="display: flex; flex-direction: column; gap: 16px;">
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Default (striped)</p>
      <CoarTable>
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Alpha</td><td>1</td></tr>
          <tr><td>Beta</td><td>2</td></tr>
          <tr><td>Gamma</td><td>3</td></tr>
        </tbody>
      </CoarTable>
    </div>
    <div>
      <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Bordered</p>
      <CoarTable variant="bordered">
        <thead><tr><th>Name</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Alpha</td><td>1</td></tr>
          <tr><td>Beta</td><td>2</td></tr>
          <tr><td>Gamma</td><td>3</td></tr>
        </tbody>
      </CoarTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CoarTable } from '@cocoar/vue-ui';
</script>
