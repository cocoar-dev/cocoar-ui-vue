/**
 * Only this optional test host knows NeoAstra. Its keyboard-overlay configuration leaves
 * the layout viewport unchanged; NeoAstra's height is the occluded bottom part in CSS px.
 * @param {(inset: number) => void} setInset
 * @param {Window} target
 */
export function connectNeoAstraKeyboard(setInset, target = window) {
  const update = () => {
    const height = parseFloat(
      target
        .getComputedStyle(target.document.documentElement)
        .getPropertyValue('--neoastra-keyboard-height'),
    );
    setInset(Number.isFinite(height) ? Math.max(0, height) : 0);
  };
  target.addEventListener('neoastrakeyboard', update);
  update();
  return () => {
    target.removeEventListener('neoastrakeyboard', update);
    setInset(0);
  };
}
