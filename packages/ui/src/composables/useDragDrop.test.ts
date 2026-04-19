import { describe, it, expect } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useDragDrop } from './useDragDrop';

function createDataTransfer(): DataTransfer {
  const store = new Map<string, string>();
  const types: string[] = [];
  return {
    effectAllowed: 'none',
    dropEffect: 'none',
    types,
    setData(t: string, v: string) {
      if (!store.has(t)) types.push(t);
      store.set(t, v);
    },
    getData(t: string) { return store.get(t) ?? ''; },
    clearData() { store.clear(); types.length = 0; },
    setDragImage() {},
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
  } as unknown as DataTransfer;
}

/**
 * Mount two independent surfaces that use `useDragDrop` directly — no Listbox, no
 * CoarListboxOption. Proves the composable is framework-agnostic over arbitrary T.
 */
interface Row { id: string; text: string }

function makeHarness(options: {
  leftDragId?: string;
  rightDragId?: string;
  leftDragGroup?: string;
  rightDragGroup?: string;
  rightDragAccept?: string[];
  rightCanDrop?: (p: { items: readonly Row[] }) => boolean;
}) {
  const Left = defineComponent({
    setup() {
      const items = ref<Row[]>([
        { id: 'a', text: 'Alpha' },
        { id: 'b', text: 'Bravo' },
      ]);
      const removed = ref<Row[][]>([]);
      const dnd = useDragDrop<Row>({
        dragId: options.leftDragId,
        dragGroup: options.leftDragGroup,
        onItemsRemove: ({ items: it }) => {
          removed.value.push([...it]);
          items.value = items.value.filter((r) => !it.some((x) => x.id === r.id));
        },
      });
      return { items, removed, dnd };
    },
    template: `
      <div class="left">
        <div
          v-for="row in items"
          :key="row.id"
          class="row"
          :data-id="row.id"
          draggable="true"
          @dragstart="dnd.startDrag($event, [row])"
          @dragend="dnd.endDrag($event)"
        >{{ row.text }}</div>
      </div>
    `,
  });

  const Right = defineComponent({
    setup() {
      const items = ref<Row[]>([]);
      const added = ref<Row[][]>([]);
      const dnd = useDragDrop<Row>({
        dragId: options.rightDragId,
        dragGroup: options.rightDragGroup,
        dragAccept: options.rightDragAccept,
        canDrop: options.rightCanDrop,
        onDropAccept: ({ items: it }) => {
          added.value.push([...it]);
          items.value = [...items.value, ...it];
        },
      });
      return { items, added, dnd };
    },
    template: `
      <div
        class="right"
        @dragover="dnd.onDragOver"
        @dragleave="dnd.onDragLeave"
        @drop="dnd.onDrop($event)"
      >
        <div v-for="row in items" :key="row.id" class="dest-row">{{ row.text }}</div>
        <span class="over" v-if="dnd.isDragOver.value">OVER</span>
      </div>
    `,
  });

  const Host = defineComponent({
    components: { Left, Right },
    template: `<div><Left ref="left" /><Right ref="right" /></div>`,
  });

  const w = mount(Host);
  return { w };
}

describe('useDragDrop', () => {
  it('accepts a drop when dragGroup matches and no other constraints are set', async () => {
    const { w } = makeHarness({ leftDragGroup: 'rows', rightDragGroup: 'rows' });
    const dt = createDataTransfer();
    await w.find('[data-id="a"]').trigger('dragstart', { dataTransfer: dt });
    const right = w.find('.right');
    await right.trigger('dragover', { dataTransfer: dt });
    expect(right.find('.over').exists()).toBe(true);
    await right.trigger('drop', { dataTransfer: dt });
    expect(w.findAll('.dest-row').map((el) => el.text())).toEqual(['Alpha']);
  });

  it('refuses drops from a different dragGroup', async () => {
    const { w } = makeHarness({ leftDragGroup: 'a', rightDragGroup: 'b' });
    const dt = createDataTransfer();
    await w.find('[data-id="a"]').trigger('dragstart', { dataTransfer: dt });
    const right = w.find('.right');
    await right.trigger('dragover', { dataTransfer: dt });
    expect(right.find('.over').exists()).toBe(false); // no hover highlight
    await right.trigger('drop', { dataTransfer: dt });
    expect(w.findAll('.dest-row').length).toBe(0);
  });

  it('honours dragAccept whitelist', async () => {
    const { w } = makeHarness({
      leftDragId: 'src',
      leftDragGroup: 'g',
      rightDragGroup: 'g',
      rightDragAccept: ['other'],
    });
    const dt = createDataTransfer();
    await w.find('[data-id="a"]').trigger('dragstart', { dataTransfer: dt });
    await w.find('.right').trigger('dragover', { dataTransfer: dt });
    await w.find('.right').trigger('drop', { dataTransfer: dt });
    expect(w.findAll('.dest-row').length).toBe(0);
  });

  it('honours canDrop runtime predicate', async () => {
    const { w } = makeHarness({
      leftDragGroup: 'g',
      rightDragGroup: 'g',
      rightCanDrop: ({ items }) => items.every((i) => i.id !== 'a'),
    });
    const dt1 = createDataTransfer();
    await w.find('[data-id="a"]').trigger('dragstart', { dataTransfer: dt1 });
    await w.find('.right').trigger('drop', { dataTransfer: dt1 });
    expect(w.findAll('.dest-row').length).toBe(0);

    const dt2 = createDataTransfer();
    await w.find('[data-id="b"]').trigger('dragstart', { dataTransfer: dt2 });
    await w.find('.right').trigger('drop', { dataTransfer: dt2 });
    expect(w.findAll('.dest-row').map((el) => el.text())).toEqual(['Bravo']);
  });

  it('fires onItemsRemove on the source after a successful cross-surface drop', async () => {
    const { w } = makeHarness({ leftDragGroup: 'g', rightDragGroup: 'g' });
    const dt = createDataTransfer();
    await w.find('[data-id="a"]').trigger('dragstart', { dataTransfer: dt });
    await w.find('.right').trigger('drop', { dataTransfer: dt });
    // Source items were filtered down in onItemsRemove
    expect(w.findAll('.left .row').map((el) => el.text())).toEqual(['Bravo']);
  });

  it('self-drops pass group check and skip onItemsRemove', async () => {
    const Self = defineComponent({
      setup() {
        const items = ref<Row[]>([{ id: 'a', text: 'Alpha' }]);
        const removed = ref(0);
        const added = ref(0);
        const dnd = useDragDrop<Row>({
          onItemsRemove: () => { removed.value++; },
          onDropAccept: () => { added.value++; },
        });
        return { items, removed, added, dnd };
      },
      template: `
        <div
          class="self"
          @dragover="dnd.onDragOver"
          @dragleave="dnd.onDragLeave"
          @drop="dnd.onDrop($event)"
        >
          <div
            v-for="row in items"
            :key="row.id"
            class="row"
            draggable="true"
            @dragstart="dnd.startDrag($event, [row])"
            @dragend="dnd.endDrag($event)"
          >{{ row.text }}</div>
          <span class="counts">R:{{ removed }} A:{{ added }}</span>
        </div>
      `,
    });
    const w = mount(Self);
    const dt = createDataTransfer();
    await w.find('.row').trigger('dragstart', { dataTransfer: dt });
    await w.find('.self').trigger('drop', { dataTransfer: dt });
    // onItemsRemove only fires on cross-surface drops; self-drop should not.
    expect(w.find('.counts').text()).toBe('R:0 A:1');
  });

  it('dragend emits dropped=true when a target consumed the drag', async () => {
    const ended: { dropped: boolean }[] = [];
    const Left = defineComponent({
      setup() {
        const dnd = useDragDrop<Row>({
          dragGroup: 'g',
          onDragEnd: (p) => ended.push({ dropped: p.dropped }),
        });
        return { dnd };
      },
      template: `
        <div
          class="src"
          draggable="true"
          @dragstart="dnd.startDrag($event, [{ id: 'x', text: 'X' }])"
          @dragend="dnd.endDrag($event)"
        >X</div>
      `,
    });
    const Right = defineComponent({
      setup() {
        const dnd = useDragDrop<Row>({ dragGroup: 'g', onDropAccept: () => {} });
        return { dnd };
      },
      template: `
        <div class="dst" @dragover="dnd.onDragOver" @drop="dnd.onDrop($event)" />
      `,
    });
    const Host = defineComponent({
      components: { Left, Right },
      template: `<div><Left /><Right /></div>`,
    });

    const w = mount(Host);
    const dt = createDataTransfer();
    await w.find('.src').trigger('dragstart', { dataTransfer: dt });
    await w.find('.dst').trigger('drop', { dataTransfer: dt });
    await w.find('.src').trigger('dragend', { dataTransfer: dt });
    expect(ended).toHaveLength(1);
    expect(ended[0]).toEqual({ dropped: true });
  });

  it('dragend emits dropped=false when no target consumed it', async () => {
    const ended: { dropped: boolean }[] = [];
    const Self = defineComponent({
      setup() {
        const dnd = useDragDrop<Row>({
          onDragEnd: (p) => ended.push({ dropped: p.dropped }),
        });
        return { dnd };
      },
      template: `
        <div
          class="src"
          draggable="true"
          @dragstart="dnd.startDrag($event, [{ id: 'x', text: 'X' }])"
          @dragend="dnd.endDrag($event)"
        >X</div>
      `,
    });
    const w = mount(Self);
    const dt = createDataTransfer();
    await w.find('.src').trigger('dragstart', { dataTransfer: dt });
    await w.find('.src').trigger('dragend', { dataTransfer: dt });
    expect(ended).toEqual([{ dropped: false }]);
  });

  it('startDrag returns false and is a no-op when items is empty', async () => {
    const started: unknown[] = [];
    const C = defineComponent({
      setup() {
        const dnd = useDragDrop<Row>({
          onDragStart: (items) => started.push(items),
        });
        return { dnd };
      },
      template: `<div class="src" draggable="true" @dragstart="res = dnd.startDrag($event, [])">x</div>`,
    });
    const w = mount(C);
    const dt = createDataTransfer();
    await w.find('.src').trigger('dragstart', { dataTransfer: dt });
    expect(started).toEqual([]);
    expect(dt.getData('application/x-coar-dnd')).toBe('');
  });

  it('onDrop passes insertIndex to onDropAccept', async () => {
    const accepts: { index: number | null }[] = [];
    const Left = defineComponent({
      setup() {
        const dnd = useDragDrop<Row>({ dragGroup: 'g' });
        return { dnd };
      },
      template: `<div class="src" draggable="true"
        @dragstart="dnd.startDrag($event, [{id:'a', text:'A'}])"
        @dragend="dnd.endDrag($event)" >A</div>`,
    });
    const Right = defineComponent({
      setup() {
        const dnd = useDragDrop<Row>({
          dragGroup: 'g',
          onDropAccept: ({ insertIndex }) => accepts.push({ index: insertIndex }),
        });
        return { dnd };
      },
      template: `<div class="dst" @dragover="dnd.onDragOver"
        @drop="dnd.onDrop($event, { insertIndex: 7 })" />`,
    });
    const Host = defineComponent({
      components: { Left, Right },
      template: `<div><Left /><Right /></div>`,
    });
    const w = mount(Host);
    const dt = createDataTransfer();
    await w.find('.src').trigger('dragstart', { dataTransfer: dt });
    await w.find('.dst').trigger('drop', { dataTransfer: dt });
    expect(accepts).toEqual([{ index: 7 }]);
  });
});
