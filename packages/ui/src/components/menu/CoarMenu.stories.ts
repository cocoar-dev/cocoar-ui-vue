import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import {
  CoarMenu,
  CoarMenuItem,
  CoarMenuDivider,
  CoarMenuHeading,
  CoarSubExpand,
  CoarSubmenuItem,
} from '@cocoar/vue-ui';

const meta: Meta = {
  title: 'Components/Menu',
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

export const BasicMenu: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarMenuDivider },
    setup() {
      const lastAction = ref('');
      const onAction = (action: string) => { lastAction.value = action; };
      return { lastAction, onAction };
    },
    template: `
      <div style="padding: 24px;">
        <CoarMenu>
          <CoarMenuItem icon="copy" label="Copy" @clicked="onAction('Copy')" />
          <CoarMenuItem icon="clipboard" label="Paste" @clicked="onAction('Paste')" />
          <CoarMenuDivider />
          <CoarMenuItem icon="trash" label="Delete" @clicked="onAction('Delete')" />
        </CoarMenu>
        <p v-if="lastAction" style="margin-top: 12px; color: var(--coar-text-neutral-secondary); font-size: 14px;">
          Last action: {{ lastAction }}
        </p>
      </div>
    `,
  }),
};

export const WithHeadings: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarMenuHeading },
    template: `
      <div style="padding: 24px;">
        <CoarMenu>
          <CoarMenuHeading label="Edit" />
          <CoarMenuItem icon="copy" label="Copy" />
          <CoarMenuItem icon="clipboard" label="Paste" />
          <CoarMenuItem icon="scissors" label="Cut" />
          <CoarMenuHeading label="File" />
          <CoarMenuItem icon="save" label="Save" />
          <CoarMenuItem icon="download" label="Export" />
        </CoarMenu>
      </div>
    `,
  }),
};

export const DisabledItems: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarMenuDivider },
    template: `
      <div style="padding: 24px;">
        <CoarMenu>
          <CoarMenuItem icon="copy" label="Copy" />
          <CoarMenuItem icon="clipboard" label="Paste" :disabled="true" />
          <CoarMenuDivider />
          <CoarMenuItem icon="trash" label="Delete" :disabled="true" />
          <CoarMenuItem icon="settings" label="Settings" />
        </CoarMenu>
      </div>
    `,
  }),
};

export const NoIconColumn: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarMenuDivider },
    template: `
      <div style="padding: 24px;">
        <CoarMenu :show-icon-column="false">
          <CoarMenuItem label="Profile" />
          <CoarMenuItem label="Settings" />
          <CoarMenuDivider />
          <CoarMenuItem label="Sign out" />
        </CoarMenu>
      </div>
    `,
  }),
};

export const Borderless: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarMenuHeading, CoarMenuDivider },
    template: `
      <div style="padding: 24px;">
        <div style="width: 240px; background: var(--coar-background-neutral-primary); border: 1px solid var(--coar-border-neutral-tertiary); border-radius: 8px; padding: 8px 0;">
          <CoarMenu borderless :show-icon-column="false">
            <CoarMenuHeading label="Navigation" />
            <CoarMenuItem label="Dashboard" />
            <CoarMenuItem label="Projects" />
            <CoarMenuItem label="Team" />
            <CoarMenuHeading label="Account" />
            <CoarMenuItem label="Settings" />
            <CoarMenuItem label="Sign out" />
          </CoarMenu>
        </div>
      </div>
    `,
  }),
};

export const AccordionSubmenu: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarSubExpand, CoarMenuDivider },
    setup() {
      const filtersOpen = ref(true);
      return { filtersOpen };
    },
    template: `
      <div style="padding: 24px;">
        <CoarMenu>
          <CoarSubExpand label="Filters" icon="settings" v-model:open="filtersOpen">
            <CoarMenu borderless>
              <CoarMenuItem icon="plus" label="Add Filter" />
              <CoarMenuItem icon="trash" label="Clear All" />
            </CoarMenu>
          </CoarSubExpand>
          <CoarSubExpand label="Sort By" icon="arrow-up">
            <CoarMenu borderless>
              <CoarMenuItem label="Name" />
              <CoarMenuItem label="Date" />
              <CoarMenuItem label="Size" />
            </CoarMenu>
          </CoarSubExpand>
          <CoarMenuDivider />
          <CoarMenuItem icon="download" label="Export" />
        </CoarMenu>
      </div>
    `,
  }),
};

export const FlyoutSubmenu: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarSubmenuItem, CoarMenuDivider },
    template: `
      <div style="padding: 24px;">
        <CoarMenu>
          <CoarMenuItem icon="copy" label="Copy" />
          <CoarMenuItem icon="clipboard" label="Paste" />
          <CoarMenuDivider />
          <CoarSubmenuItem label="Share" icon="share">
            <CoarMenu>
              <CoarMenuItem icon="mail" label="Email" />
              <CoarMenuItem icon="link" label="Copy Link" />
              <CoarSubmenuItem label="Social" icon="globe">
                <CoarMenu>
                  <CoarMenuItem label="Twitter" />
                  <CoarMenuItem label="LinkedIn" />
                </CoarMenu>
              </CoarSubmenuItem>
            </CoarMenu>
          </CoarSubmenuItem>
          <CoarMenuItem icon="trash" label="Delete" />
        </CoarMenu>
      </div>
    `,
  }),
};

export const KeepMenuOpen: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarMenuDivider },
    setup() {
      const darkMode = ref(false);
      const notifications = ref(true);
      const toggleDark = (event: { keepMenuOpen: () => void }) => {
        event.keepMenuOpen();
        darkMode.value = !darkMode.value;
      };
      const toggleNotif = (event: { keepMenuOpen: () => void }) => {
        event.keepMenuOpen();
        notifications.value = !notifications.value;
      };
      return { darkMode, notifications, toggleDark, toggleNotif };
    },
    template: `
      <div style="padding: 24px;">
        <CoarMenu :show-icon-column="false">
          <CoarMenuItem :label="'Dark Mode: ' + (darkMode ? 'ON' : 'OFF')" @clicked="toggleDark($event)" />
          <CoarMenuItem :label="'Notifications: ' + (notifications ? 'ON' : 'OFF')" @clicked="toggleNotif($event)" />
          <CoarMenuDivider />
          <CoarMenuItem label="Close Menu (default)" />
        </CoarMenu>
        <p style="margin-top: 12px; color: var(--coar-text-neutral-secondary); font-size: 14px;">
          Click toggle items — menu stays open. Click "Close Menu" — it would close the menu tree.
        </p>
      </div>
    `,
  }),
};

export const MixedSubmenus: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarSubExpand, CoarSubmenuItem },
    setup() {
      const lastAction = ref('');
      const onAction = (action: string) => { lastAction.value = action; };
      return { lastAction, onAction };
    },
    template: `
      <div style="padding: 24px;">
        <CoarMenu>
          <CoarSubExpand label="Filters" icon="settings">
            <CoarMenu borderless>
              <CoarMenuItem icon="plus" label="Add Filter" @clicked="onAction('addFilter')" />
              <CoarMenuItem icon="copy" label="Duplicate Filter" @clicked="onAction('duplicateFilter')" />
              <CoarMenuItem icon="trash" label="Clear Filters" @clicked="onAction('clearFilters')" />

              <CoarSubExpand label="Date Range" icon="calendar">
                <CoarMenu borderless>
                  <CoarMenuItem label="Today" @clicked="onAction('dateToday')" />
                  <CoarMenuItem label="Last 7 days" @clicked="onAction('dateLast7')" />
                  <CoarMenuItem label="Last 30 days" @clicked="onAction('dateLast30')" />
                </CoarMenu>
              </CoarSubExpand>

              <CoarSubmenuItem label="Advanced" icon="settings">
                <CoarMenu>
                  <CoarMenuItem icon="link" label="Manage saved filters" @clicked="onAction('manageSavedFilters')" />
                  <CoarMenuItem icon="copy" label="Copy filters" @clicked="onAction('copyFilters')" />
                  <CoarMenuItem icon="trash" label="Reset to defaults" @clicked="onAction('resetFilters')" />
                  <CoarSubExpand label="Quick Presets" icon="plus">
                    <CoarMenu borderless>
                      <CoarMenuItem label="Open items" @clicked="onAction('presetOpenItems')" />
                      <CoarMenuItem label="Overdue" @clicked="onAction('presetOverdue')" />
                      <CoarMenuItem label="Assigned to me" @clicked="onAction('presetAssignedToMe')" />
                    </CoarMenu>
                  </CoarSubExpand>
                </CoarMenu>
              </CoarSubmenuItem>
            </CoarMenu>
          </CoarSubExpand>

          <CoarSubExpand label="View" icon="eye">
            <CoarMenu borderless>
              <CoarMenuItem icon="plus" label="Save current view" @clicked="onAction('saveView')" />
              <CoarMenuItem icon="copy" label="Duplicate view" @clicked="onAction('duplicateView')" />
              <CoarSubmenuItem label="Load View" icon="download">
                <CoarMenu>
                  <CoarMenuItem label="Default" @clicked="onAction('loadViewDefault')" />
                  <CoarMenuItem label="Compact" @clicked="onAction('loadViewCompact')" />
                  <CoarMenuItem label="Detailed" @clicked="onAction('loadViewDetailed')" />
                </CoarMenu>
              </CoarSubmenuItem>
            </CoarMenu>
          </CoarSubExpand>

          <CoarMenuDivider />
          <CoarMenuItem icon="refresh" label="Refresh" @clicked="onAction('refresh')" />
        </CoarMenu>
        <p v-if="lastAction" style="margin-top: 12px; color: var(--coar-text-neutral-secondary); font-size: 14px;">
          Last action: {{ lastAction }}
        </p>
      </div>
    `,
  }),
};

export const ContextMenu: Story = {
  render: () => ({
    components: { CoarMenu, CoarMenuItem, CoarMenuDivider, CoarSubmenuItem },
    setup() {
      const showMenu = ref(false);
      const menuX = ref(0);
      const menuY = ref(0);
      const lastAction = ref('');

      function onContextMenu(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        menuX.value = event.clientX;
        menuY.value = event.clientY;
        showMenu.value = true;
      }

      function onBackdropClick() {
        showMenu.value = false;
      }

      function onBackdropContextMenu(event: MouseEvent) {
        // Reposition menu at new right-click location instead of closing
        menuX.value = event.clientX;
        menuY.value = event.clientY;
      }

      function onAction(action: string) {
        lastAction.value = action;
        showMenu.value = false;
      }

      return { showMenu, menuX, menuY, lastAction, onContextMenu, onBackdropClick, onBackdropContextMenu, onAction };
    },
    template: `
      <div style="padding: 24px;">
        <div
          @contextmenu.prevent="onContextMenu"
          style="
            width: 100%; max-width: 500px; height: 200px;
            border: 2px dashed var(--coar-border-neutral-tertiary, #ccc);
            border-radius: 8px; display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            background: var(--coar-background-neutral-secondary, #f5f5f5);
            user-select: none; cursor: context-menu;
          "
        >
          <p style="margin: 0; color: var(--coar-text-neutral-primary); font-weight: 500;">Right-click anywhere in this area</p>
          <p style="margin: 4px 0 0; color: var(--coar-text-neutral-tertiary, #999); font-size: 13px;">Context menu with flyout submenus will appear</p>
        </div>

        <Teleport to="body">
          <div
            v-if="showMenu"
            @click.self="onBackdropClick"
            @contextmenu.prevent="onBackdropContextMenu"
            style="position: fixed; inset: 0; z-index: 999;"
          >
            <div :style="{ position: 'absolute', left: menuX + 'px', top: menuY + 'px' }">
              <CoarMenu>
                <CoarMenuItem icon="minus" label="Cut" @clicked="onAction('cut')" />
                <CoarMenuItem icon="copy" label="Copy" @clicked="onAction('copy')" />
                <CoarMenuItem icon="clipboard" label="Paste" @clicked="onAction('paste')" />
                <CoarMenuDivider />
                <CoarSubmenuItem label="Share" icon="users">
                  <CoarMenu>
                    <CoarMenuItem label="Email" @clicked="onAction('email')" />
                    <CoarMenuItem label="Microsoft Teams" @clicked="onAction('teams')" />
                    <CoarMenuItem label="Slack" @clicked="onAction('slack')" />
                    <CoarSubmenuItem label="Social Media" icon="share">
                      <CoarMenu>
                        <CoarMenuItem label="Twitter" @clicked="onAction('twitter')" />
                        <CoarMenuItem label="LinkedIn" @clicked="onAction('linkedin')" />
                        <CoarMenuItem label="Facebook" @clicked="onAction('facebook')" />
                      </CoarMenu>
                    </CoarSubmenuItem>
                  </CoarMenu>
                </CoarSubmenuItem>
                <CoarSubmenuItem label="Export" icon="download">
                  <CoarMenu>
                    <CoarMenuItem label="Export as PDF" @clicked="onAction('exportPdf')" />
                    <CoarSubmenuItem label="Export Image">
                      <CoarMenu>
                        <CoarMenuItem label="PNG" @clicked="onAction('exportPng')" />
                        <CoarMenuItem label="JPG" @clicked="onAction('exportJpg')" />
                        <CoarMenuItem label="SVG" @clicked="onAction('exportSvg')" />
                      </CoarMenu>
                    </CoarSubmenuItem>
                    <CoarMenuItem label="Export as CSV" @clicked="onAction('exportCsv')" />
                  </CoarMenu>
                </CoarSubmenuItem>
                <CoarMenuDivider />
                <CoarMenuItem icon="trash" label="Delete" @clicked="onAction('delete')" />
              </CoarMenu>
            </div>
          </div>
        </Teleport>

        <p v-if="lastAction" style="margin-top: 12px; color: var(--coar-text-neutral-secondary); font-size: 14px;">
          Last action: {{ lastAction }}
        </p>
      </div>
    `,
  }),
};
