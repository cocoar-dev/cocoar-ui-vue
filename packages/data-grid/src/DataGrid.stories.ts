import type { Meta, StoryObj } from '@storybook/vue3';
import { ref, onMounted, onUnmounted } from 'vue';
import { CoarDataGrid, CoarGridBuilder } from '@cocoar/vue-data-grid';

interface SampleRow {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  salary: number;
  joinDate: string;
  icon: string;
}

const sampleData: SampleRow[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineer', status: 'active', salary: 95000, joinDate: '2022-03-15', icon: 'user' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Designer', status: 'active', salary: 85000, joinDate: '2021-07-01', icon: 'palette' },
  { id: 3, name: 'Carol Williams', email: 'carol@example.com', role: 'Manager', status: 'inactive', salary: 110000, joinDate: '2020-01-20', icon: 'users' },
  { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Engineer', status: 'pending', salary: 90000, joinDate: '2023-06-10', icon: 'user' },
  { id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'Designer', status: 'active', salary: 88000, joinDate: '2022-11-05', icon: 'palette' },
  { id: 6, name: 'Frank Miller', email: 'frank@example.com', role: 'Engineer', status: 'active', salary: 102000, joinDate: '2019-09-12', icon: 'user' },
  { id: 7, name: 'Grace Wilson', email: 'grace@example.com', role: 'Manager', status: 'active', salary: 115000, joinDate: '2018-04-25', icon: 'users' },
  { id: 8, name: 'Henry Taylor', email: 'henry@example.com', role: 'Designer', status: 'inactive', salary: 78000, joinDate: '2023-01-30', icon: 'palette' },
];

const meta: Meta<typeof CoarDataGrid> = {
  title: 'Data Display/DataGrid',
  component: CoarDataGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;
type Story = StoryObj<typeof CoarDataGrid>;

export const Basic: Story = {
  render: () => ({
    components: { CoarDataGrid },
    setup() {
      const builder = CoarGridBuilder.create<SampleRow>()
        .columns([
          (col) => col.field('name').header('Name').flex(1),
          (col) => col.field('email').header('Email').flex(1),
          (col) => col.field('role').header('Role').width(120),
        ])
        .rowData(sampleData);

      return { builder };
    },
    template: '<div style="height: 400px;"><CoarDataGrid :builder="builder" /></div>',
  }),
};

export const ColumnTypes: Story = {
  render: () => ({
    components: { CoarDataGrid },
    setup() {
      const builder = CoarGridBuilder.create<SampleRow>()
        .columns([
          (col) => col.field('name').header('Name').flex(1).sortable(),
          (col) => col.date('joinDate', 'long').header('Joined').width(180).sortable(),
          (col) => col.number('salary').header('Salary').width(120),
          (col) =>
            col.tag('status', {
              variantMap: {
                active: 'success',
                inactive: 'error',
                pending: 'warning',
              },
            }).header('Status').width(130),
          (col) => col.icon('icon', { size: 's' }).header('Type').fixedWidth(60),
        ])
        .rowData(sampleData);

      return { builder };
    },
    template: '<div style="height: 400px;"><CoarDataGrid :builder="builder" /></div>',
  }),
};

export const SingleRowClickSelection: Story = {
  render: () => ({
    components: { CoarDataGrid },
    setup() {
      const builder = CoarGridBuilder.create<SampleRow>()
        .columns([
          (col) => col.field('name').header('Name').flex(1),
          (col) => col.field('email').header('Email').flex(1),
          (col) => col.field('role').header('Role').width(120),
        ])
        .rowData(sampleData)
        .rowSelection('single');

      return { builder };
    },
    template: '<div style="height: 400px;"><CoarDataGrid :builder="builder" /></div>',
  }),
};

export const MultiRowCheckboxSelection: Story = {
  render: () => ({
    components: { CoarDataGrid },
    setup() {
      const builder = CoarGridBuilder.create<SampleRow>()
        .columns([
          (col) => col.field('name').header('Name').flex(1),
          (col) => col.field('email').header('Email').flex(1),
          (col) => col.field('role').header('Role').width(120),
        ])
        .rowData(sampleData)
        .rowSelection('multiple', { checkboxes: true });

      return { builder };
    },
    template: '<div style="height: 400px;"><CoarDataGrid :builder="builder" /></div>',
  }),
};

export const SortableColumns: Story = {
  render: () => ({
    components: { CoarDataGrid },
    setup() {
      const builder = CoarGridBuilder.create<SampleRow>()
        .columns([
          (col) => col.field('name').header('Name').flex(1).sortable(),
          (col) => col.field('role').header('Role').width(120).sortable(),
          (col) => col.number('salary').header('Salary').width(120).sortable(),
          (col) => col.date('joinDate').header('Join Date').width(150).sortable(),
        ])
        .rowData(sampleData)
        .defaultSort('name', 'asc');

      return { builder };
    },
    template: '<div style="height: 400px;"><CoarDataGrid :builder="builder" /></div>',
  }),
};

export const ReactiveData: Story = {
  render: () => ({
    components: { CoarDataGrid },
    setup() {
      const data = ref<SampleRow[]>(sampleData.slice(0, 3));

      const builder = CoarGridBuilder.create<SampleRow>()
        .columns([
          (col) => col.field('name').header('Name').flex(1),
          (col) => col.field('email').header('Email').flex(1),
          (col) => col.field('role').header('Role').width(120),
        ])
        .rowDataRef(data);

      const addRow = () => {
        const next = sampleData[data.value.length % sampleData.length];
        if (next) {
          data.value = [...data.value, { ...next, id: Date.now() }];
        }
      };

      const reset = () => {
        data.value = sampleData.slice(0, 3);
      };

      return { builder, addRow, reset };
    },
    template: `
      <div>
        <div style="padding: 12px; display: flex; gap: 8px;">
          <button @click="addRow">Add Row</button>
          <button @click="reset">Reset</button>
        </div>
        <div style="height: 400px;">
          <CoarDataGrid :builder="builder" />
        </div>
      </div>
    `,
  }),
};

export const StyledRows: Story = {
  render: () => ({
    components: { CoarDataGrid },
    setup() {
      const builder = CoarGridBuilder.create<SampleRow>()
        .columns([
          (col) => col.field('name').header('Name').flex(1),
          (col) => col.field('email').header('Email').flex(1),
          (col) =>
            col.tag('status', {
              variantMap: {
                active: 'success',
                inactive: 'error',
                pending: 'warning',
              },
            }).header('Status').width(130),
        ])
        .rowData(sampleData)
        .rowClassRules({
          'row-inactive': (params) => params.data?.status === 'inactive',
          'row-pending': (params) => params.data?.status === 'pending',
        });

      let styleEl: HTMLStyleElement;
      onMounted(() => {
        styleEl = document.createElement('style');
        styleEl.textContent = `
          .ag-theme-cocoar .row-inactive { opacity: 0.5; }
          .ag-theme-cocoar .row-pending { background-color: #fef9c3 !important; }
          .dark-mode .ag-theme-cocoar .row-pending { background-color: #422006 !important; }
        `;
        document.head.appendChild(styleEl);
      });
      onUnmounted(() => styleEl?.remove());

      return { builder };
    },
    template: `
      <div style="height: 400px;">
        <CoarDataGrid :builder="builder" />
      </div>
    `,
  }),
};
