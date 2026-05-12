import { onMounted, onBeforeUnmount, type Ref } from 'vue';

/**
 * Body-teleported overlays (CoarSelect/MultiSelect/TagSelect dropdowns,
 * date-picker panels) live outside AG Grid's cell DOM. When the user clicks
 * into such an overlay, two events fire in sequence:
 *
 *   1. `mousedown` — the browser's default action would shift focus to the
 *      click target.
 *   2. `focusout` on the editor root (relatedTarget = overlay element). AG
 *      Grid's `stopEditingWhenCellsLoseFocus` sees this and commits + unmounts
 *      the editor, which destroys the overlay mid-interaction.
 *
 * This composable installs two guards:
 *
 *   - `mousedown` (capture, document) — `preventDefault` for targets inside
 *     `.coar-overlay-host`. Tries to keep focus on the cell editor so step 2
 *     never fires. Belt.
 *   - `focusout` (on the editor root) — `stopPropagation` when the
 *     `relatedTarget` is inside `.coar-overlay-host`. If focus DID shift
 *     despite the mousedown guard (some browsers / element types ignore the
 *     `preventDefault`), AG Grid never sees the focusout bubble through the
 *     cell root. Suspenders.
 *
 * Apply in any cell editor whose UI extends into a body-teleported overlay
 * (the date-picker panels, the select dropdowns). The text + number editors
 * don't need it — their input is in-cell, no body teleport.
 */
export function usePopupEditorFocusGuard(
  rootRef: Readonly<Ref<HTMLElement | null>>,
): void {
  function preserveFocusOnMousedown(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('.coar-overlay-host')) {
      e.preventDefault();
    }
  }

  function suppressOverlayFocusout(e: FocusEvent): void {
    const next = e.relatedTarget as HTMLElement | null;
    if (next?.closest('.coar-overlay-host')) {
      e.stopPropagation();
    }
  }

  onMounted(() => {
    document.addEventListener('mousedown', preserveFocusOnMousedown, true);
    rootRef.value?.addEventListener('focusout', suppressOverlayFocusout);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('mousedown', preserveFocusOnMousedown, true);
    rootRef.value?.removeEventListener('focusout', suppressOverlayFocusout);
  });
}
