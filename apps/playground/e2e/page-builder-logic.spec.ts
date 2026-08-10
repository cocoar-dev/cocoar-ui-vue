import { expect, test } from '@playwright/test'
import { openBuilderTool } from './helpers'

test.describe('PageBuilder element code authoring', () => {
  test('loads Page State and applies reactive element compute, actions and repeat state', async ({ page }) => {
    await page.goto('/page-builder')
    const builder = page.locator('.pb-builder')

    await builder.getByRole('tab', { name: 'Logic', exact: true }).click()
    const logic = builder.getByRole('tabpanel', { name: 'Logic' })
    await expect(logic.getByText('Page State', { exact: true })).toBeVisible()
    const editor = logic.locator('.coar-script-editor')
    await expect(editor).toBeVisible()
    await expect.poll(async () => (await editor.boundingBox())?.height ?? 0).toBeGreaterThan(300)
    await expect(logic.locator('.coar-script-editor-locked-line')).toHaveCount(2)
    await expect(logic.locator('.coar-script-editor-locked-marker').first()).toHaveCSS('display', 'none')
    await expect(logic.locator('.coar-script-editor-locked-code').first()).toHaveCSS('opacity', '0.42')
    await expect(logic.locator('.coar-script-editor-locked-line').first()).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(logic.getByRole('button', { name: 'Apply state' })).toBeDisabled()

    await builder.getByRole('tab', { name: 'Preview', exact: true }).click()
    const preview = builder.getByRole('tabpanel', { name: 'Preview' })
    await expect(preview.getByRole('heading', { name: 'Element code + Page State' })).toBeVisible()
    await expect(preview.getByText('Runtime items: 1', { exact: true })).toBeVisible()
    await expect(preview.getByText('First runtime item', { exact: true })).toBeVisible()

    await preview.getByRole('button', { name: 'Add array item', exact: true }).click()
    await expect(preview.getByText('Runtime item 1', { exact: true })).toBeVisible()
    await expect(preview.getByText('Runtime items: 2', { exact: true })).toBeVisible()

    const submit = preview.getByRole('button', { name: 'Sign in', exact: true })
    await expect(submit).toBeDisabled()
    await preview.getByRole('textbox', { name: 'Username' }).fill('alice')
    await expect(submit).toBeDisabled()
    await preview.getByRole('textbox', { name: 'Password' }).fill('secret123')
    await expect(submit).toBeEnabled()

    const passwordWidth = await preview.getByRole('textbox', { name: 'Password' }).evaluate((element) =>
      element.closest('.coar-form-field')?.getBoundingClientRect().width,
    )
    expect(passwordWidth).toBe(240)
  })

  test('keeps the Properties panel structural in code mode', async ({ page }) => {
    await page.goto('/page-builder')
    const builder = page.locator('.pb-builder')
    await openBuilderTool(builder, 'Structure')
    await builder.getByRole('treeitem', { name: 'Password password', exact: true }).click()

    const properties = builder.getByRole('complementary', { name: 'Properties' })
    const structure = properties.locator('.pb-props__section').first()
    await expect(properties.getByRole('heading', { name: 'Structure' })).toBeVisible()
    await expect(properties.getByText('Element', { exact: true })).toHaveCount(1)
    await expect(properties.getByText('Name', { exact: true })).toHaveCount(1)
    await expect(properties.getByText('Style', { exact: true })).toHaveCount(0)
    await expect(properties.getByText('Runtime bindings', { exact: true })).toHaveCount(0)
    await expect(properties).toContainText('Code cannot change its type or name')
    await expect(properties.getByRole('button', { name: 'Edit element code' })).toBeVisible()

    await properties.getByRole('button', { name: 'Edit element code' }).click()
    const codeDialog = page.getByRole('dialog', { name: 'Element Code · password' })
    await expect(codeDialog).toBeVisible()
    await expect.poll(async () => (await codeDialog.boundingBox())?.width ?? 0).toBeGreaterThan(1000)
    await expect.poll(async () => (await codeDialog.boundingBox())?.width ?? 0).toBeLessThan(1050)
    await expect(codeDialog.getByText('element', { exact: true }).first()).toBeVisible()
    await expect.poll(async () => (await codeDialog.locator('.coar-script-editor').boundingBox())?.height ?? 0).toBeGreaterThan(350)
    await expect(codeDialog.locator('.coar-script-editor-locked-line')).toHaveCount(12)
    await expect(codeDialog.locator('.coar-script-editor-locked-marker').first()).toHaveCSS('display', 'none')
    await expect(codeDialog.locator('.coar-script-editor-locked-code').first()).toHaveCSS('opacity', '0.42')
    await expect(codeDialog.locator('.view-line').filter({ hasText: 'compute(element, page) {' })).toBeVisible()
    await expect(codeDialog.locator('.view-line').filter({ hasText: 'async click(element, page, action) {' })).toBeVisible()
    await expect(codeDialog).toContainText('element.* is only this element')
    await expect(codeDialog).toContainText('shared inputs live on page.*')

    // A whole-document delete intersects protected lines and must be rolled back.
    await codeDialog.locator('.monaco-editor').click({ position: { x: 220, y: 120 } })
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Backspace')
    await expect(codeDialog.getByText('defineElement({', { exact: false })).toBeVisible()
    await codeDialog.getByRole('button', { name: 'Cancel' }).click()

    const nameField = properties.locator('.coar-form-field').filter({ hasText: 'Name' })
    await expect(nameField.getByText('Password (password)', { exact: true })).toBeVisible()
    await expect(properties.getByRole('textbox', { name: 'Name', exact: true })).toHaveCount(0)

    await nameField.locator('.coar-select-trigger').click()
    await page.getByRole('option', { name: 'Custom name…', exact: true }).click()
    await expect(properties.getByRole('textbox', { name: 'Custom name', exact: true })).toHaveValue('passwordInput')
    await expect(structure.getByRole('textbox', { name: 'Label', exact: true })).toHaveValue('Password')
    await structure.getByRole('textbox', { name: 'Label', exact: true }).fill('Custom password')
    await expect(structure.getByRole('textbox', { name: 'Label', exact: true })).toHaveValue('Custom password')
    await properties.getByRole('textbox', { name: 'Custom name', exact: true }).fill('customPassword')
    await expect(builder.getByRole('treeitem', { name: 'Custom password customPassword', exact: true })).toBeVisible()

    await nameField.locator('.coar-select-trigger').click()
    await page.getByRole('option', { name: 'Password (password)', exact: true }).click()
    await expect(properties.getByRole('textbox', { name: 'Custom name', exact: true })).toHaveCount(0)
    await expect(structure.getByRole('textbox', { name: 'Label', exact: true })).toHaveCount(0)
    await expect(builder.getByRole('treeitem', { name: 'Custom password password', exact: true })).toBeVisible()

    const quick = properties.locator('.pb-props__section').filter({ hasText: 'Quick properties' })
    await quick.getByRole('textbox', { name: 'Label', exact: true }).fill('Quick password')
    await expect(quick.getByRole('button', { name: 'Reset', exact: true }).first()).toBeVisible()
    await properties.getByRole('button', { name: 'Edit element code' }).click()
    const updatedDialog = page.getByRole('dialog', { name: 'Element Code · password' })
    await expect(updatedDialog.locator('.view-lines')).toContainText('i18n.text("page.password.label"')
    await expect(updatedDialog.locator('.coar-script-editor-locked-line')).toHaveCount(12)
    await updatedDialog.getByRole('button', { name: 'Cancel' }).click()
    await builder.getByRole('tab', { name: 'Translations', exact: true }).click()
    const passwordLabel = builder.getByRole('row').filter({ hasText: 'page.password.label' })
    await expect(passwordLabel.getByRole('textbox')).toHaveValue('Quick password')
  })
})
