// Optional fonts are part of the new scenes, not of the legacy visual page.
import '../../../../../packages/ui/src/compact-fonts';
import './compact-scene.css';

// Mount the new samples only after their actual text faces are ready. Otherwise
// the continuous calendar starts measuring and filling months in a fallback
// font, then reflows thousands of cells when Inter arrives. The existing visual
// page waits for fonts after mount; it intentionally remains untouched.
if (typeof document !== 'undefined') {
  await Promise.all([400, 500, 600, 700].map((weight) =>
    document.fonts.load(`${weight} 14px Inter`, 'Überprüfung 0123456789'),
  ));
}
