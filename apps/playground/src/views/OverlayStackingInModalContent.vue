<script setup lang="ts">
/**
 * Diagnostic: verify that each overlay-like component (popover, tooltip, submenu,
 * context menu) stacks above a modal and does NOT close the modal when clicked.
 *
 * Use chrome-devtools or manual interaction to:
 *   1. Hover/click each trigger
 *   2. Confirm the resulting popup is visible above the modal body
 *   3. Confirm clicking inside the popup does not close the modal
 */
import { ref } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import {
  CoarPopover,
  CoarButton,
  CoarMenu,
  CoarMenuItem,
  CoarContextMenu,
  CoarSubFlyout,
  CoarSelect,
  CoarMultiSelect,
  CoarTagSelect,
  CoarSidebar,
  CoarSidebarGroup,
  CoarSidebarItem,
  CoarPlainDatePicker,
  CoarPlainDateTimePicker,
  CoarZonedDateTimePicker,
  useContextMenu,
  vTooltip,
} from '@cocoar/vue-ui';

const contextMenu = useContextMenu();
const lastPopoverAction = ref<string>('—');
const lastMenuAction = ref<string>('—');

const selectOptions = [
  { value: 'a', label: 'Apple' },
  { value: 'b', label: 'Banana' },
  { value: 'c', label: 'Cherry' },
  { value: 'd', label: 'Date' },
  { value: 'e', label: 'Elderberry' },
];
const singleValue = ref<string | null>(null);
const multiValue = ref<string[]>([]);
const tagValue = ref<string[]>([]);

const plainDate = ref<Temporal.PlainDate | null>(null);
const plainDateTime = ref<Temporal.PlainDateTime | null>(null);
const zonedDateTime = ref<Temporal.ZonedDateTime | null>(null);
</script>

<template>
  <div class="stacking-test" @contextmenu="contextMenu.open">
    <section>
      <h3>1. CoarPopover inside dialog</h3>
      <p>Click to open the popover. Clicking inside the popover must NOT close the dialog.</p>
      <CoarPopover mode="click">
        <CoarButton>Open popover (click)</CoarButton>
        <template #content>
          <div style="padding: 8px; min-width: 220px;">
            <p>This is popover content.</p>
            <CoarButton @click="lastPopoverAction = 'Action clicked at ' + new Date().toISOString()">
              Click inside popover
            </CoarButton>
            <p style="margin-top: 8px; font-size: 12px; color: #666;">
              Last action: {{ lastPopoverAction }}
            </p>
          </div>
        </template>
      </CoarPopover>
    </section>

    <section>
      <h3>2. Tooltip inside dialog</h3>
      <p>Hover the button — the tooltip should appear above the dialog, not behind it.</p>
      <CoarButton v-tooltip="'Tooltip text — must render above the dialog backdrop'">
        Hover me
      </CoarButton>
    </section>

    <section>
      <h3>3. Menu with submenu (SubFlyout) inside dialog</h3>
      <p>Open the menu, hover "More" to trigger the submenu. Submenu must stack above the dialog.</p>
      <CoarPopover mode="click">
        <CoarButton>Open menu</CoarButton>
        <template #content>
          <CoarMenu>
            <CoarMenuItem @click="lastMenuAction = 'First'">First</CoarMenuItem>
            <CoarMenuItem @click="lastMenuAction = 'Second'">Second</CoarMenuItem>
            <CoarSubFlyout label="More...">
              <CoarMenuItem @click="lastMenuAction = 'Sub A'">Sub A</CoarMenuItem>
              <CoarMenuItem @click="lastMenuAction = 'Sub B'">Sub B</CoarMenuItem>
            </CoarSubFlyout>
          </CoarMenu>
        </template>
      </CoarPopover>
      <p style="margin-top: 8px; font-size: 12px; color: #666;">
        Last menu action: {{ lastMenuAction }}
      </p>
    </section>

    <section>
      <h3>4. Context menu (right-click anywhere in this area)</h3>
      <p>
        Right-click inside this entire modal body — the context menu should appear above
        the dialog and clicking an item should close only the context menu, not the dialog.
      </p>
      <p>(The `@contextmenu` handler sits on the outer wrapper, so right-click anywhere works.)</p>
    </section>

    <section>
      <h3>5. Nested: Dialog → Popover → Tooltip</h3>
      <p>
        Open the popover, then hover the button inside it. The tooltip must appear above
        the popover AND above the dialog backdrop. This tests two-deep parent-injection.
      </p>
      <CoarPopover mode="click">
        <CoarButton>Open nested popover</CoarButton>
        <template #content>
          <div style="padding: 12px; min-width: 260px;">
            <p style="margin-bottom: 8px;">Hover the button below for a tooltip:</p>
            <CoarButton v-tooltip="'Nested tooltip — must stack above the popover'">
              Hover me (inner)
            </CoarButton>
          </div>
        </template>
      </CoarPopover>
    </section>

    <section>
      <h3>6. Nested: Dialog → Popover → Popover</h3>
      <p>
        Two-deep popover nesting. The inner popover must stack above the outer, and both
        clicks must keep the dialog open.
      </p>
      <CoarPopover mode="click">
        <CoarButton>Open outer popover</CoarButton>
        <template #content>
          <div style="padding: 12px; min-width: 280px;">
            <p style="margin-bottom: 8px;">This is the outer popover.</p>
            <CoarPopover mode="click">
              <CoarButton>Open inner popover</CoarButton>
              <template #content>
                <div style="padding: 10px; min-width: 200px;">
                  <p>I am nested two levels deep.</p>
                  <CoarButton @click="lastPopoverAction = 'Deep-nested click'">
                    Click inside inner
                  </CoarButton>
                </div>
              </template>
            </CoarPopover>
          </div>
        </template>
      </CoarPopover>
    </section>

    <section>
      <h3>7. Selects (single / multi / tag) inside dialog</h3>
      <p>
        Each select teleports its dropdown via the overlay-service. The dropdown must
        stack above the dialog, match the trigger width, and clicking outside (on the
        dialog body) must close only the dropdown — not the dialog.
      </p>
      <div class="select-grid">
        <label>
          <span class="select-label">Single</span>
          <CoarSelect v-model="singleValue" :options="selectOptions" placeholder="Pick a fruit" />
        </label>
        <label>
          <span class="select-label">Multi (show select all)</span>
          <CoarMultiSelect
            v-model="multiValue"
            :options="selectOptions"
            show-select-all
            clearable
            placeholder="Pick fruits"
          />
        </label>
        <label>
          <span class="select-label">Tag (allowCreate)</span>
          <CoarTagSelect
            v-model="tagValue"
            :options="selectOptions"
            allow-create
            placeholder="Type to tag"
          />
        </label>
      </div>
      <p style="margin-top: 8px; font-size: 12px; color: #666;">
        Single: <strong>{{ singleValue ?? '—' }}</strong> |
        Multi: <strong>{{ multiValue.join(', ') || '—' }}</strong> |
        Tags: <strong>{{ tagValue.join(', ') || '—' }}</strong>
      </p>
    </section>

    <section>
      <h3>8. Sidebar flyout groups inside dialog</h3>
      <p>
        Collapsed sidebar with <code>mode="flyout"</code> groups. The flyout panels are
        rendered by the overlay-service — they must stack above the dialog, and clicking
        an item must close only the flyout (not the dialog). Nested flyouts (group inside
        flyout) should cascade — hovering the child keeps the parent open.
      </p>
      <div class="sidebar-demo">
        <CoarSidebar collapsed :aria-label="'Sidebar demo'" borderless>
          <CoarSidebarItem label="Home" icon="square-dashed" @click="lastMenuAction = 'SB Home'" />
          <CoarSidebarItem label="Inbox" icon="square-dashed" @click="lastMenuAction = 'SB Inbox'" />
          <CoarSidebarGroup label="Files" icon="square-dashed" mode="flyout">
            <CoarSidebarItem label="Recent" icon="square-dashed" @click="lastMenuAction = 'SB Recent'" />
            <CoarSidebarItem label="Starred" icon="square-dashed" @click="lastMenuAction = 'SB Starred'" />
            <CoarSidebarGroup label="Archive" icon="square-dashed" mode="flyout">
              <CoarSidebarItem label="2024" icon="square-dashed" @click="lastMenuAction = 'SB 2024'" />
              <CoarSidebarItem label="2023" icon="square-dashed" @click="lastMenuAction = 'SB 2023'" />
            </CoarSidebarGroup>
          </CoarSidebarGroup>
          <CoarSidebarGroup label="Settings" icon="square-dashed" mode="flyout" open-on-hover>
            <CoarSidebarItem label="Profile" icon="square-dashed" @click="lastMenuAction = 'SB Profile'" />
            <CoarSidebarItem label="Preferences" icon="square-dashed" @click="lastMenuAction = 'SB Preferences'" />
          </CoarSidebarGroup>
          <CoarSidebarItem label="Trash" icon="square-dashed" @click="lastMenuAction = 'SB Trash'" />
        </CoarSidebar>
        <div class="sidebar-demo__hint">
          Click the "Files" or "Settings" icons on the left ("Settings" opens on hover).
          The flyout panel must render above the dialog backdrop. Nested flyout (Files →
          Archive) exercises the parent-child cascade.
        </div>
      </div>
    </section>

    <section>
      <h3>9. Date pickers inside dialog (outside-click repro)</h3>
      <p>
        Open any picker's calendar panel, then click somewhere on the dialog body (outside
        the panel). The panel must close — exactly like the selects in section 7 — without
        closing the dialog. This is the bug: before the overlay-service fix the panel only
        closed when the calendar icon was clicked again.
      </p>
      <div class="select-grid">
        <label>
          <span class="select-label">PlainDate</span>
          <CoarPlainDatePicker v-model="plainDate" />
        </label>
        <label>
          <span class="select-label">PlainDateTime</span>
          <CoarPlainDateTimePicker v-model="plainDateTime" />
        </label>
        <label>
          <span class="select-label">ZonedDateTime</span>
          <CoarZonedDateTimePicker v-model="zonedDateTime" />
        </label>
      </div>
      <p style="margin-top: 8px; font-size: 12px; color: #666;">
        Date: <strong>{{ plainDate?.toString() ?? '—' }}</strong> |
        DateTime: <strong>{{ plainDateTime?.toString() ?? '—' }}</strong> |
        Zoned: <strong>{{ zonedDateTime?.toString() ?? '—' }}</strong>
      </p>
    </section>

    <CoarContextMenu :menu="contextMenu">
      <CoarMenuItem @click="lastMenuAction = 'Ctx Copy'">Copy</CoarMenuItem>
      <CoarMenuItem @click="lastMenuAction = 'Ctx Paste'">Paste</CoarMenuItem>
    </CoarContextMenu>
  </div>
</template>

<style scoped>
.stacking-test {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px 0;
}

section {
  border: 1px solid var(--coar-border-neutral-tertiary, #e5e7eb);
  border-radius: 6px;
  padding: 16px;
  background: var(--coar-background-neutral-secondary, #fafafa);
}

section h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

section p {
  margin: 0 0 12px;
  font-size: 13px;
  color: #444;
}

.select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.select-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #444;
}

.select-label {
  font-weight: 600;
}

.sidebar-demo {
  display: flex;
  gap: 16px;
  align-items: stretch;
  min-height: 260px;
  border: 1px solid var(--coar-border-neutral-tertiary, #e5e7eb);
  border-radius: 6px;
  padding: 12px;
  background: var(--coar-background-neutral-primary, #fff);
}

.sidebar-demo > :deep(.coar-sidebar) {
  /* Give the sidebar a consistent vertical footprint so the demo reads as a real sidebar
     column rather than a row of three icons. */
  align-self: stretch;
  border: 1px solid var(--coar-border-neutral-tertiary, #e5e7eb);
  border-radius: 4px;
  background: var(--coar-background-neutral-secondary, #f7f7f7);
}

.sidebar-demo__hint {
  flex: 1;
  font-size: 12px;
  color: #555;
  line-height: 1.4;
  padding-top: 8px;
}
</style>
