import type { InjectionKey, Ref } from 'vue';
import type { CoarIconSize } from '../icon/icon-service';

/** Injection key for sidebar collapsed state. Provided by CoarSidebar, consumed by sidebar items. */
export const SIDEBAR_COLLAPSED_KEY: InjectionKey<Ref<boolean>> = Symbol('sidebar-collapsed');

/** Injection key for sidebar icon size. Provided by CoarSidebar, consumed by sidebar items. */
export const SIDEBAR_ICON_SIZE_KEY: InjectionKey<Ref<CoarIconSize>> = Symbol('sidebar-icon-size');

/** Injection key for flyout icon-only mode. Provided by CoarSidebarGroup flyout, inherited by nested groups. */
export const SIDEBAR_FLYOUT_ICON_ONLY_KEY: InjectionKey<Ref<boolean>> = Symbol('sidebar-flyout-icon-only');

/** Injection key for parent flyout close control. Allows child flyouts to keep parent open. */
export interface SidebarFlyoutParent {
  cancelClose: () => void;
  scheduleClose: () => void;
}
export const SIDEBAR_FLYOUT_PARENT_KEY: InjectionKey<SidebarFlyoutParent | null> = Symbol('sidebar-flyout-parent');
