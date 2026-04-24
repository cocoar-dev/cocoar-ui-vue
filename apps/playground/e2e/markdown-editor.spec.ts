import { expect, test, type Page } from '@playwright/test';

/**
 * Hooks exposed by `MarkdownEditorView.vue` on `window.__playground`. The
 * playground page registers them in `onMounted`. Keep in sync with the type
 * declaration in that component.
 */
interface MarkdownPlaygroundHooks {
  getMarkdown(): string;
  setMarkdown(md: string): void;
  setToolbarMode(m: 'floating' | 'fixed' | 'both'): void;
  setToolsPreset(p: 'all' | 'minimal' | 'no-tables'): void;
  setReadonly(r: boolean): void;
}

async function gotoMarkdownEditor(page: Page) {
  await page.goto('/markdown-editor');
  // Editor's contenteditable mounts as `.ProseMirror` once Milkdown is ready.
  await page.locator('.coar-md-area .ProseMirror').waitFor();
  // The hooks are attached in onMounted — wait so test bodies don't race.
  await page.waitForFunction(() => '__playground' in window);
}

async function getMarkdown(page: Page): Promise<string> {
  return page.evaluate(() => {
    const p = (window as unknown as { __playground: MarkdownPlaygroundHooks }).__playground;
    return p.getMarkdown();
  });
}

async function setMarkdown(page: Page, md: string): Promise<void> {
  await page.evaluate((v) => {
    const p = (window as unknown as { __playground: MarkdownPlaygroundHooks }).__playground;
    p.setMarkdown(v);
  }, md);
  // Yield so the editor's externalValue watcher dispatches replaceAll
  await page.waitForTimeout(80);
}

async function setToolbarMode(page: Page, mode: 'floating' | 'fixed' | 'both') {
  await page.evaluate((m) => {
    const p = (window as unknown as { __playground: MarkdownPlaygroundHooks }).__playground;
    p.setToolbarMode(m);
  }, mode);
  await page.waitForTimeout(50);
}

async function setToolsPreset(page: Page, preset: 'all' | 'minimal' | 'no-tables') {
  await page.evaluate((p) => {
    const hooks = (window as unknown as { __playground: MarkdownPlaygroundHooks }).__playground;
    hooks.setToolsPreset(p);
  }, preset);
  await page.waitForTimeout(50);
}

async function setReadonly(page: Page, ro: boolean) {
  await page.evaluate((v) => {
    const p = (window as unknown as { __playground: MarkdownPlaygroundHooks }).__playground;
    p.setReadonly(v);
  }, ro);
  await page.waitForTimeout(50);
}

/**
 * Triple-click the first text matching `selector` to select the entire word/line
 * via real mouse events. ProseMirror picks this up natively (unlike synthetic
 * MouseEvent dispatch, which fails the `isTrusted` gate).
 */
async function selectTextOf(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.click({ clickCount: 3 });
}

test.describe('Markdown editor — basic rendering', () => {
  test.beforeEach(async ({ page }) => {
    await gotoMarkdownEditor(page);
  });

  test('mounts and renders the seed markdown', async ({ page }) => {
    // The seed contains a top-level H1 "Hello CoarMarkdownEditor"
    await expect(page.locator('.coar-md-area .ProseMirror h1').first()).toContainText(
      'Hello CoarMarkdownEditor',
    );
    // Plus a GFM table (header "Feature")
    await expect(page.locator('.coar-md-area .ProseMirror table th').first()).toBeVisible();
  });

  test('round-trips an externally set markdown value', async ({ page }) => {
    await setMarkdown(page, '# Round trip\n\nplain text\n');
    await expect(page.locator('.coar-md-area .ProseMirror h1')).toContainText('Round trip');
    expect(await getMarkdown(page)).toContain('# Round trip');
  });
});

test.describe('Markdown editor — floating toolbar visibility', () => {
  test.beforeEach(async ({ page }) => {
    await gotoMarkdownEditor(page);
    await setMarkdown(page, '# Heading\n\nThis is plain text to format.\n');
  });

  test('appears when text is selected', async ({ page }) => {
    await selectTextOf(page, '.coar-md-area .ProseMirror p');
    await expect(page.locator('.coar-md-floating-toolbar')).toBeVisible();
  });

  test('hides when selection collapses', async ({ page }) => {
    await selectTextOf(page, '.coar-md-area .ProseMirror p');
    await expect(page.locator('.coar-md-floating-toolbar')).toBeVisible();
    // Collapse selection by clicking elsewhere
    await page.locator('.coar-md-area .ProseMirror h1').click();
    await expect(page.locator('.coar-md-floating-toolbar')).toHaveCount(0);
  });
});

test.describe('Markdown editor — mark commands (via sidebar)', () => {
  // The sidebar buttons are reliably positioned (fixed left strip) — Playwright
  // can click them without the viewport-check problems of the floating toolbar.
  test.beforeEach(async ({ page }) => {
    await gotoMarkdownEditor(page);
    await setMarkdown(page, '# Heading\n\nThis is plain text to format.\n');
    await setToolbarMode(page, 'fixed');
  });

  test('Bold wraps the selection in **strong**', async ({ page }) => {
    await selectTextOf(page, '.coar-md-area .ProseMirror p');
    await page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Bold' }).click();
    await expect.poll(() => getMarkdown(page)).toContain('**This is plain text to format.**');
  });

  test('Italic wraps the selection in *em*', async ({ page }) => {
    await selectTextOf(page, '.coar-md-area .ProseMirror p');
    await page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Italic' }).click();
    await expect.poll(() => getMarkdown(page)).toContain('*This is plain text to format.*');
  });
});

test.describe('Markdown editor — sidebar toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await gotoMarkdownEditor(page);
    await setToolbarMode(page, 'fixed');
  });

  test('shows the full set of 17 buttons by default', async ({ page }) => {
    const labels = await page.locator('.coar-md-sidebar-wrap [role="menuitem"]').allTextContents();
    const trimmed = labels.map((l) => l.trim());
    expect(trimmed).toEqual([
      'Bold', 'Italic', 'Strikethrough', 'Inline Code',
      'Headings',
      'Bullet List', 'Ordered List', 'Task List',
      'Outdent', 'Indent',
      'Blockquote', 'Horizontal Rule',
      'Code Block', 'Insert Table',
      'Clear Formatting',
      'Undo', 'Redo',
    ]);
  });

  test('minimal preset reduces to the 7 expected buttons', async ({ page }) => {
    await setToolsPreset(page, 'minimal');
    const labels = await page.locator('.coar-md-sidebar-wrap [role="menuitem"]').allTextContents();
    expect(labels.map((l) => l.trim())).toEqual([
      'Bold', 'Italic', 'Bullet List', 'Ordered List', 'Outdent', 'Indent', 'Clear Formatting',
    ]);
  });

  test('no-tables preset hides Insert Table', async ({ page }) => {
    await setToolsPreset(page, 'no-tables');
    const labels = await page.locator('.coar-md-sidebar-wrap [role="menuitem"]').allTextContents();
    const trimmed = labels.map((l) => l.trim());
    expect(trimmed).not.toContain('Insert Table');
    expect(trimmed).toContain('Bold');
  });
});

test.describe('Markdown editor — list toggle + indent / outdent', () => {
  test.beforeEach(async ({ page }) => {
    await gotoMarkdownEditor(page);
    await setMarkdown(page, '- one\n- two\n- three\n');
    await setToolbarMode(page, 'fixed');
  });

  test('Indent nests the second list item under the first', async ({ page }) => {
    // Click into the second item to position the PM cursor there
    await page.locator('.coar-md-area .ProseMirror ul li').nth(1).click();
    await page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Indent' }).click();
    // Milkdown's serializer indents nested items with whitespace. The exact
    // marker depends on serializer config, so match either `*` or `-`.
    await expect.poll(() => getMarkdown(page)).toMatch(/[*-] one\n\s+[*-] two/);
  });

  test('Outdent lifts a previously-indented item back to the top level', async ({ page }) => {
    // Build the nested state via the same Indent command we just verified —
    // avoids timing races between setMarkdown's replaceAll and PM's internal
    // resolution of nested list_item positions.
    await page.locator('.coar-md-area .ProseMirror ul li').nth(1).click();
    await page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Indent' }).click();
    await expect.poll(() => getMarkdown(page)).toMatch(/[*-] one\n\s+[*-] two/);
    // Now lift it back
    await page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Outdent' }).click();
    // After outdent, "two" must no longer be indented under another bullet
    // (looks for horizontal whitespace before a bullet marker — `\s+` would
    // also match CRLF and produce false positives on Windows).
    await expect.poll(() => getMarkdown(page)).not.toMatch(/\n[ \t]+[*-] two/);
  });

  test('Bullet List button on plain text wraps it as a bullet item', async ({ page }) => {
    await setMarkdown(page, 'plain paragraph\n');
    // Click into the paragraph to focus + position cursor
    await page.locator('.coar-md-area .ProseMirror p').click();
    await page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Bullet List' }).click();
    await expect.poll(() => getMarkdown(page)).toMatch(/[*-] plain paragraph/);
  });

  test('Indent + Outdent are both disabled outside a list', async ({ page }) => {
    await setMarkdown(page, 'just a paragraph\n');
    await page.locator('.coar-md-area .ProseMirror p').click();
    const indent = page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Indent' });
    const outdent = page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Outdent' });
    await expect(indent).toHaveClass(/coar-sidebar-item--disabled/);
    await expect(outdent).toHaveClass(/coar-sidebar-item--disabled/);
  });

  test('Outdent is disabled at the top list level (use the list button to leave the list)', async ({ page }) => {
    await page.locator('.coar-md-area .ProseMirror ul li').first().click();
    const outdent = page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Outdent' });
    const indent = page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Indent' });
    await expect(outdent).toHaveClass(/coar-sidebar-item--disabled/);
    // Indent should still be available — sinks the item one level deeper
    await expect(indent).not.toHaveClass(/coar-sidebar-item--disabled/);
  });
});

test.describe('Markdown editor — clear formatting', () => {
  test.beforeEach(async ({ page }) => {
    await gotoMarkdownEditor(page);
    await setMarkdown(page, '# Heading line\n\n**bold word** in a paragraph.\n');
    await setToolbarMode(page, 'fixed');
  });

  test('strips the bold mark from the selection', async ({ page }) => {
    // Select the paragraph (contains the bold word)
    await selectTextOf(page, '.coar-md-area .ProseMirror p');
    await page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Clear Formatting' }).click();
    // The bold-marker `**` must have been stripped
    await expect.poll(() => getMarkdown(page)).not.toContain('**bold word**');
    await expect.poll(() => getMarkdown(page)).toContain('bold word');
  });

  test('turns a heading back into a paragraph', async ({ page }) => {
    await page.locator('.coar-md-area .ProseMirror h1').click();
    await page.locator('.coar-md-sidebar-wrap [role="menuitem"]', { hasText: 'Clear Formatting' }).click();
    // The H1 must be gone (no `#` prefix on that line)
    await expect.poll(() => getMarkdown(page)).not.toMatch(/^# Heading line/m);
  });
});

test.describe('Markdown editor — task list checkboxes', () => {
  test.beforeEach(async ({ page }) => {
    await gotoMarkdownEditor(page);
    await setMarkdown(page, '- [ ] open task\n- [x] done task\n');
  });

  test('clicking the open checkbox flips it to checked', async ({ page }) => {
    const li = page.locator('.coar-md-area .ProseMirror li[data-item-type="task"]').first();
    const box = await li.boundingBox();
    if (!box) throw new Error('no task li bbox');
    // Click within the first 14px of the li — that's the ::before pseudo
    await page.mouse.click(box.x + 6, box.y + box.height / 2);
    // Milkdown serializes bullets as `*`, accept either marker
    await expect.poll(() => getMarkdown(page)).toMatch(/[*-] \[x\] open task/);
  });

  test('clicking the checked checkbox flips it to open', async ({ page }) => {
    const li = page.locator('.coar-md-area .ProseMirror li[data-item-type="task"]').nth(1);
    const box = await li.boundingBox();
    if (!box) throw new Error('no task li bbox');
    await page.mouse.click(box.x + 6, box.y + box.height / 2);
    await expect.poll(() => getMarkdown(page)).toMatch(/[*-] \[ \] done task/);
  });
});

test.describe('Markdown editor — readonly mode', () => {
  test('contenteditable goes false and floating toolbar is suppressed', async ({ page }) => {
    await gotoMarkdownEditor(page);
    await setReadonly(page, true);
    await expect(page.locator('.coar-md-area .ProseMirror')).toHaveAttribute(
      'contenteditable',
      'false',
    );
    // Selecting text in readonly mode should not surface the floating toolbar
    await selectTextOf(page, '.coar-md-area .ProseMirror h1');
    await expect(page.locator('.coar-md-floating-toolbar')).toHaveCount(0);
  });
});

test.describe('Markdown editor — code-block view/edit toggle', () => {
  // The seed markdown contains a fenced ```typescript ...``` block. The NodeView
  // renders it as `CoarCodeBlock` (Prism-highlighted) when the cursor sits
  // elsewhere, and swaps to a plain editable view + language selector when the
  // cursor lands inside.
  test.beforeEach(async ({ page }) => {
    await gotoMarkdownEditor(page);
    await setMarkdown(page, '# Heading\n\n```typescript\nconst x = 1;\n```\n');
    // Wait for the code-block NodeView to mount.
    await page.locator('.coar-md-code-host').waitFor();
    // After `replaceAll`, PM may leave the cursor inside the new code block,
    // which would put us in edit mode immediately. Click the heading to move
    // the selection out so each test starts in render mode.
    await page.locator('.coar-md-area .ProseMirror h1').click();
    await page.waitForTimeout(50);
  });

  test('starts in render mode (CoarCodeBlock visible, edit chrome hidden)', async ({ page }) => {
    const host = page.locator('.coar-md-code-host');
    await expect(host).not.toHaveClass(/coar-md-code-host--editing/);
    // CoarCodeBlock always renders a `.coar-code-block-host` wrapper.
    await expect(host.locator('.coar-code-block-host')).toBeVisible();
    // Edit chrome (language select) should be display:none.
    await expect(host.locator('.coar-md-code-edit')).toBeHidden();
  });

  test('clicking the Edit button switches to edit mode', async ({ page }) => {
    const host = page.locator('.coar-md-code-host');
    // Hover-revealed Edit button — `force: true` because Playwright stability
    // checks struggle with opacity transitions on hover-only buttons.
    await host.locator('.coar-md-code-edit-btn').click({ force: true });
    await expect(host).toHaveClass(/coar-md-code-host--editing/);
    await expect(host.locator('.coar-md-code-edit')).toBeVisible();
    await expect(host.locator('.coar-md-code-render')).toBeHidden();
  });

  test('clicking outside the code block switches back to render mode', async ({ page }) => {
    // Enter edit mode first
    const host = page.locator('.coar-md-code-host');
    await host.locator('.coar-md-code-edit-btn').click({ force: true });
    await expect(host).toHaveClass(/coar-md-code-host--editing/);

    // Click the heading above to move PM selection out of the code block.
    await page.locator('.coar-md-area .ProseMirror h1').click();
    await expect(host).not.toHaveClass(/coar-md-code-host--editing/);
  });

  test('language selector updates the markdown source', async ({ page }) => {
    const host = page.locator('.coar-md-code-host');
    await host.locator('.coar-md-code-edit-btn').click({ force: true });
    await expect(host).toHaveClass(/coar-md-code-host--editing/);

    // Open the CoarSelect and pick "JSON".
    await host.locator('.coar-md-code-lang-row [role="combobox"]').click();
    await page.locator('[role="option"]', { hasText: 'JSON' }).click();

    // The persisted markdown's fence info-string should now read `json`.
    await expect.poll(() => getMarkdown(page)).toMatch(/```json\n/);
  });
});
