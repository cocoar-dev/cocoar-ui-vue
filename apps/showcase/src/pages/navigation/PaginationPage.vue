<script setup lang="ts">
import { ref } from 'vue';
import { CoarPagination, CoarCard, CoarCodeBlock } from '@cocoar/vue-ui';

const page1 = ref(1);
const page2 = ref(3);
const page3 = ref(1);

const codeBasic = `<CoarPagination
  v-model="currentPage"
  :total-items="100"
  :page-size="10"
/>`;

const codePageSize = `<CoarPagination
  v-model="currentPage"
  :total-items="500"
  :page-size="25"
/>`;
</script>

<template>
  <div class="component-page">
    <header class="page-header">
      <h1 class="coar-title">Pagination</h1>
      <p class="page-description">A navigation component for moving between pages of content.</p>
    </header>

    <CoarCodeBlock
      variant="info" elevated class="page-import"
      code="import { CoarPagination } from '@cocoar/vue-ui';"
      language="typescript" :collapsible="false"
    />

    <div class="examples-content">
      <div class="examples-grid">
        <CoarCard elevated>
          <h3>Basic Usage</h3>
          <p class="example-description">Pagination with 100 items and 10 per page. Current page: {{ page1 }}</p>
          <div class="example-demo">
            <CoarPagination v-model="page1" :total-items="100" :page-size="10" />
          </div>
          <p class="demo-value">Current page: {{ page1 }}</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codeBasic" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Different Page Size</h3>
          <p class="example-description">500 total items, 25 per page = 20 pages.</p>
          <div class="example-demo">
            <CoarPagination v-model="page2" :total-items="500" :page-size="25" />
          </div>
          <p class="demo-value">Current page: {{ page2 }} / 20</p>
          <CoarCodeBlock coar-card-footer coar-card-inset borderless :code="codePageSize" language="html" :show-line-numbers="false" :collapsed="true" />
        </CoarCard>

        <CoarCard elevated>
          <h3>Large Dataset</h3>
          <p class="example-description">Pagination automatically truncates the page range for large page counts.</p>
          <div class="example-demo">
            <CoarPagination v-model="page3" :total-items="10000" :page-size="10" />
          </div>
          <p class="demo-value">Current page: {{ page3 }} / 1000</p>
        </CoarCard>

        <CoarCard elevated>
          <h3>With Table</h3>
          <p class="example-description">Typical usage pattern with a data table.</p>
          <div class="example-demo">
            <div class="table-with-pagination">
              <table class="mini-table">
                <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
                <tbody>
                  <tr v-for="i in 5" :key="i">
                    <td>User {{ (page1 - 1) * 5 + i }}</td>
                    <td>user{{ (page1 - 1) * 5 + i }}@example.com</td>
                    <td>{{ i % 2 === 0 ? 'Admin' : 'User' }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="pagination-footer">
                <span class="coar-body-small" style="color: var(--coar-text-neutral-secondary)">
                  Showing {{ (page1 - 1) * 5 + 1 }}–{{ Math.min(page1 * 5, 100) }} of 100
                </span>
                <CoarPagination v-model="page1" :total-items="100" :page-size="5" />
              </div>
            </div>
          </div>
        </CoarCard>
      </div>

      <details class="api-section">
        <summary>Pagination API</summary>
        <div class="api-content">
          <table class="api-table">
            <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>v-model</code></td><td><code>number</code></td><td><code>1</code></td><td>Current active page (1-indexed)</td></tr>
              <tr><td><code>totalItems</code></td><td><code>number</code></td><td><code>0</code></td><td>Total number of items</td></tr>
              <tr><td><code>pageSize</code></td><td><code>number</code></td><td><code>10</code></td><td>Items per page</td></tr>
            </tbody>
          </table>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
h3 {
  margin: 0 0 var(--coar-spacing-xs);
  font-size: var(--coar-headings-heading-size);
  font-weight: var(--coar-headings-heading-weight);
}
.page-import { margin-bottom: var(--coar-spacing-l); max-width: 600px; }

.table-with-pagination { display: flex; flex-direction: column; gap: var(--coar-spacing-m); }

.mini-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--coar-body-small-base-size);
}
.mini-table th, .mini-table td {
  padding: var(--coar-spacing-xs) var(--coar-spacing-s);
  text-align: left;
  border-bottom: 1px solid var(--coar-border-neutral-secondary);
}
.mini-table th {
  font-weight: var(--coar-body-base-bold-weight);
  color: var(--coar-text-neutral-secondary);
  background: var(--coar-background-neutral-secondary);
}
.mini-table tr:last-child td { border-bottom: none; }

.pagination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--coar-spacing-s);
}
</style>
