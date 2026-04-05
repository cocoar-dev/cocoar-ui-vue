import { useRouter } from 'vue-router';

/**
 * Composable for navigating via URL fragments.
 * Provides helpers to open/close fragment-based modals by manipulating the URL hash.
 *
 * @example
 * ```ts
 * const { navigateToModal, closeModal } = useFragmentNavigation();
 *
 * navigateToModal('todo-42', { tab: 2 });
 * // URL: /todos#todo-42?tab=2
 *
 * closeModal('todo-42');
 * // URL: /todos
 * ```
 */
export function useFragmentNavigation() {
  const router = useRouter();

  /**
   * Navigate to a fragment-based modal.
   *
   * @param path - Fragment path (e.g., 'todo-1' or 'details/123')
   * @param params - Optional query parameters appended to the fragment
   * @param options.append - If `true`, appends to existing fragments (multi-modal).
   *                         If `false` (default), replaces the current fragment.
   */
  function navigateToModal(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
    options?: { append?: boolean },
  ) {
    const queryString = params
      ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join('&')
      : '';

    const fragment = `${path}${queryString}`;

    if (options?.append) {
      const currentHash = router.currentRoute.value.hash.replace(/^#/, '');
      const newHash = currentHash ? `${currentHash}#${fragment}` : fragment;
      router.push({ ...router.currentRoute.value, hash: `#${newHash}` });
    } else {
      router.push({ ...router.currentRoute.value, hash: `#${fragment}` });
    }
  }

  /**
   * Close a fragment-based modal by removing its fragment from the URL hash.
   * Creates a new history entry so browser Back reopens the modal.
   *
   * @param fragmentPath - The path portion of the fragment to remove (e.g., 'todo-1')
   */
  function closeModal(fragmentPath: string) {
    const currentHash = router.currentRoute.value.hash.replace(/^#/, '');
    // Already gone (e.g., browser back navigated away) — nothing to do
    if (!currentHash) return;

    const parts = currentHash.split('#');
    const filtered = parts.filter((part) => {
      const pathPart = part.split('?')[0];
      return pathPart !== fragmentPath;
    });

    // Nothing changed — fragment wasn't in hash
    if (filtered.length === parts.length) return;

    if (filtered.length > 0) {
      router.push({ ...router.currentRoute.value, hash: `#${filtered.join('#')}` });
    } else {
      const { path, query } = router.currentRoute.value;
      router.push({ path, query });
    }
  }

  return { navigateToModal, closeModal };
}
