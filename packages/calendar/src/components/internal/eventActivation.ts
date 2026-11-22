/**
 * Enter, Space and a click without a pointer (`element.click()`, a screen
 * reader's activation) on an event with `role="button"`.
 *
 * A pointer on these events goes through the drag runtime, which reports a
 * press without movement as a click. Its `click` has `detail >= 1` and is
 * ignored here, so one press never opens an event twice.
 */
export function isEventActivation(e: KeyboardEvent | MouseEvent): boolean {
  if (e.type === 'click') return (e as MouseEvent).detail === 0;
  const key = (e as KeyboardEvent).key;
  if (key !== 'Enter' && key !== ' ') return false;
  e.preventDefault();
  return !(e as KeyboardEvent).repeat;
}
