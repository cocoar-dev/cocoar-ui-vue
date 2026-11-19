import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';

const themeUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/theme/role-theme.ts')}`;
const compactUrl = `/@fs${resolve(import.meta.dirname, '../../../packages/ui/src/theme/compact-theme.ts')}`;

for (const outerMobile of [false, true]) {
  test(`explicit theme roles survive scheme, mobile and reset boundaries (outer mobile=${outerMobile}) @touch`, async ({ page }) => {
    await page.goto('/design-review?kind=fields');
    const values = await page.evaluate(async ({ themeUrl, compactUrl, outerMobile }) => {
      const { serializeRoleTheme } = await import(/* @vite-ignore */ themeUrl);
      const { COMPACT_THEME } = await import(/* @vite-ignore */ compactUrl);
      const style = document.createElement('style');
      style.textContent = `@layer cocoar.tokens {\n${serializeRoleTheme('.coar-theme--roles-test', {
        tokens: { ...COMPACT_THEME.tokens, '--coar-panel-radius': '6px' },
        mobileTokens: { ...COMPACT_THEME.mobileTokens, '--coar-panel-radius': '10px' },
        roles: {
          '--coar-menu-radius': 'var(--coar-panel-radius)',
          '--coar-text-neutral-primary': 'light-dark(#123456, #abcdef)',
        },
      })}}`;
      document.head.appendChild(style);
      const wrapper = document.createElement('section');
      wrapper.className = outerMobile ? 'coar-mobile' : '';
      wrapper.innerHTML = `<div class="coar-theme--roles-test">
        <i data-case="root"></i>
        <div class="dark-mode"><i data-case="dark"></i>
          <div class="coar-theme-none"><i data-case="reset"></i></div>
        </div>
        <div class="coar-mobile"><i data-case="mobile"></i>
          <div class="coar-theme-scope dark-mode"><i data-case="nested"></i></div>
        </div>
        <div class="coar-theme-scope" style="--coar-menu-radius:22px;--coar-text-neutral-primary:#ff00ff">
          <i data-case="app"></i>
        </div>
      </div>`;
      document.body.appendChild(wrapper);
      const result = Array.from(wrapper.querySelectorAll<HTMLElement>('[data-case]')).map((probe) => {
        probe.style.borderRadius = 'var(--coar-menu-radius)';
        probe.style.color = 'var(--coar-text-neutral-primary)';
        const computed = getComputedStyle(probe);
        return { name: probe.dataset.case, radius: computed.borderRadius, color: computed.color };
      });
      wrapper.remove();
      style.remove();
      return result;
    }, { themeUrl, compactUrl, outerMobile });
    const radius = outerMobile ? '10px' : '6px';
    expect(values).toEqual([
      { name: 'root', radius, color: 'rgb(18, 52, 86)' },
      { name: 'dark', radius, color: 'rgb(171, 205, 239)' },
      { name: 'reset', radius, color: 'rgb(18, 52, 86)' },
      { name: 'mobile', radius: '10px', color: 'rgb(18, 52, 86)' },
      { name: 'nested', radius: '10px', color: 'rgb(171, 205, 239)' },
      { name: 'app', radius: '22px', color: 'rgb(255, 0, 255)' },
    ]);
  });
}

test('mobile values override explicit roles inside nested boundaries @touch', async ({ page }) => {
  await page.goto('/design-review?kind=fields');
  const radii = await page.evaluate(async ({ themeUrl, compactUrl }) => {
    const { serializeRoleTheme } = await import(/* @vite-ignore */ themeUrl);
    const { COMPACT_THEME } = await import(/* @vite-ignore */ compactUrl);
    const style = document.createElement('style');
    style.textContent = `@layer cocoar.tokens {\n${serializeRoleTheme('.coar-theme--mobile-roles-test', {
      tokens: COMPACT_THEME.tokens,
      mobileTokens: { ...COMPACT_THEME.mobileTokens, '--coar-menu-radius': '10px' },
      roles: { '--coar-menu-radius': '6px' },
    })}}`;
    document.head.appendChild(style);
    const wrapper = document.createElement('section');
    wrapper.innerHTML = `<div class="coar-theme--mobile-roles-test">
      <i></i><div class="coar-mobile"><i></i><div class="dark-mode"><i></i></div></div>
    </div><div class="coar-mobile"><div class="coar-theme--mobile-roles-test">
      <i></i><div class="coar-theme-none"><i></i></div>
    </div></div><div class="coar-theme--mobile-roles-test coar-mobile">
      <i></i><div class="coar-theme-scope"><i></i></div>
    </div>`;
    document.body.appendChild(wrapper);
    const result = Array.from(wrapper.querySelectorAll('i')).map((probe) => {
      probe.style.borderRadius = 'var(--coar-menu-radius)';
      return getComputedStyle(probe).borderRadius;
    });
    wrapper.remove();
    style.remove();
    return result;
  }, { themeUrl, compactUrl });
  expect(radii).toEqual(['6px', '10px', '10px', '10px', '10px', '10px', '10px']);
});

test('roles override inputs on the document root and reset without losing mobile values @touch', async ({ page }) => {
  await page.goto('/design-review?kind=fields');
  const radii = await page.evaluate(async ({ themeUrl, compactUrl }) => {
    const { serializeRoleTheme } = await import(/* @vite-ignore */ themeUrl);
    const { COMPACT_THEME } = await import(/* @vite-ignore */ compactUrl);
    const style = document.createElement('style');
    style.textContent = `@layer cocoar.tokens {\n${serializeRoleTheme('.coar-theme--root-roles-test', {
      tokens: { ...COMPACT_THEME.tokens, '--coar-menu-radius': '3px' },
      mobileTokens: { ...COMPACT_THEME.mobileTokens, '--coar-menu-radius': '10px' },
      roles: { '--coar-menu-radius': '6px' },
    })}}`;
    document.head.appendChild(style);
    const root = document.documentElement;
    const originalClass = root.className;
    root.classList.add('coar-theme--root-roles-test');
    const wrapper = document.createElement('section');
    wrapper.innerHTML = '<i></i><div class="coar-theme-none"><i></i></div>';
    document.body.appendChild(wrapper);
    const result = [false, true].flatMap((mobile) => {
      root.classList.toggle('coar-mobile', mobile);
      return Array.from(wrapper.querySelectorAll('i')).map((probe) => {
        probe.style.borderRadius = 'var(--coar-menu-radius)';
        return getComputedStyle(probe).borderRadius;
      });
    });
    wrapper.remove();
    root.className = originalClass;
    style.remove();
    return result;
  }, { themeUrl, compactUrl });
  expect(radii).toEqual(['6px', '6px', '10px', '10px']);
});
