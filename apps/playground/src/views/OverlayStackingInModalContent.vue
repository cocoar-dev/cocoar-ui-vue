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
import {
  CoarPopover,
  CoarButton,
  CoarMenu,
  CoarMenuItem,
  CoarContextMenu,
  CoarSubFlyout,
  useContextMenu,
  vTooltip,
} from '@cocoar/vue-ui';

const contextMenu = useContextMenu();
const lastPopoverAction = ref<string>('—');
const lastMenuAction = ref<string>('—');
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
</style>
