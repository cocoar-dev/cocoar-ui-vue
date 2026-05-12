import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import CoarOtpInput from './CoarOtpInput.vue';

describe('CoarOtpInput', () => {
  const mountOtp = (props = {}) => mount(CoarOtpInput, { props });

  // ─── Cell rendering ────────────────────────────────────────────

  it('renders 6 cells by default', () => {
    const w = mountOtp();
    expect(w.findAll('input.coar-otp-input__cell').length).toBe(6);
  });

  it('renders `length` cells', () => {
    const w = mountOtp({ length: 4 });
    expect(w.findAll('input.coar-otp-input__cell').length).toBe(4);
  });

  it('applies size class', () => {
    const w = mountOtp({ size: 'l' });
    expect(w.find('.coar-otp-input--l').exists()).toBe(true);
  });

  it('uses inputmode="numeric" for numeric type', () => {
    const w = mountOtp({ type: 'numeric' });
    const cell = w.find('input');
    expect(cell.attributes('inputmode')).toBe('numeric');
  });

  it('renders cells as password inputs when mask=true', () => {
    const w = mountOtp({ mask: true });
    const cells = w.findAll('input');
    expect(cells.every((c) => c.attributes('type') === 'password')).toBe(true);
  });

  it('marks group as role="group" with a verification-code label', () => {
    const w = mountOtp();
    const group = w.find('[role="group"]');
    expect(group.exists()).toBe(true);
    expect(group.attributes('aria-label')).toContain('6');
  });

  // ─── v-model: external → cells ─────────────────────────────────

  it('spreads initial v-model across cells', () => {
    const w = mountOtp({ modelValue: '123456' });
    const cells = w.findAll('input');
    expect(cells.map((c) => (c.element as HTMLInputElement).value)).toEqual([
      '1', '2', '3', '4', '5', '6',
    ]);
  });

  it('partial v-model fills only the first cells', () => {
    const w = mountOtp({ modelValue: '12' });
    const cells = w.findAll('input');
    expect(cells.map((c) => (c.element as HTMLInputElement).value)).toEqual([
      '1', '2', '', '', '', '',
    ]);
  });

  it('drops excess chars beyond `length` from external value', async () => {
    const w = mountOtp({ modelValue: '12345', length: 4 });
    await nextTick();
    const cells = w.findAll('input');
    expect(cells.map((c) => (c.element as HTMLInputElement).value)).toEqual([
      '1', '2', '3', '4',
    ]);
  });

  // ─── Numeric filtering ─────────────────────────────────────────

  it('numeric filter rejects letters', async () => {
    const w = mountOtp({ type: 'numeric' });
    const cells = w.findAll('input');
    const first = cells[0].element as HTMLInputElement;
    first.value = 'a';
    await cells[0].trigger('input');
    expect(first.value).toBe('');
    expect(w.emitted('update:modelValue')).toBeFalsy();
  });

  it('numeric filter accepts digits', async () => {
    const w = mountOtp({ type: 'numeric' });
    const cells = w.findAll('input');
    const first = cells[0].element as HTMLInputElement;
    first.value = '7';
    await cells[0].trigger('input');
    await nextTick();
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['7']);
  });

  it('alphanumeric accepts both letters and digits', async () => {
    const w = mountOtp({ type: 'alphanumeric' });
    const cells = w.findAll('input');
    const first = cells[0].element as HTMLInputElement;
    first.value = 'A';
    await cells[0].trigger('input');
    await nextTick();
    expect(w.emitted('update:modelValue')?.[0]).toEqual(['A']);
  });

  // ─── Backspace / Delete ────────────────────────────────────────

  it('Backspace on empty cell jumps to and clears previous', async () => {
    const w = mountOtp({ modelValue: '12' });
    await nextTick();
    const cells = w.findAll('input');
    // Cell index 2 is empty; Backspace should clear cell 1.
    await cells[2].trigger('keydown', { key: 'Backspace' });
    await nextTick();
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['1']);
  });

  it('Delete on filled cell clears it without jumping', async () => {
    const w = mountOtp({ modelValue: '123' });
    await nextTick();
    const cells = w.findAll('input');
    await cells[1].trigger('keydown', { key: 'Delete' });
    await nextTick();
    // Cell 1 was '2'; deleting it leaves '1' '' '3'.
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['13']);
  });

  // ─── Paste spread ─────────────────────────────────────────────

  it('paste spreads characters across cells', async () => {
    const w = mountOtp({ length: 6 });
    const cells = w.findAll('input');
    const dataTransfer = {
      getData: (t: string) => (t === 'text' ? '123456' : ''),
    };
    await cells[0].trigger('paste', { clipboardData: dataTransfer });
    await nextTick();
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['123456']);
  });

  it('paste in cell i starts spreading from i', async () => {
    const w = mountOtp({ length: 6 });
    const cells = w.findAll('input');
    const dataTransfer = {
      getData: (t: string) => (t === 'text' ? '99' : ''),
    };
    await cells[2].trigger('paste', { clipboardData: dataTransfer });
    await nextTick();
    // Empty cells contribute empty strings to the join — model is
    // ''+''+'9'+'9'+''+'' = '99'. Verify the actual DOM cell values
    // to pin the per-cell placement.
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['99']);
    const values = w.findAll('input').map((c) => (c.element as HTMLInputElement).value);
    expect(values).toEqual(['', '', '9', '9', '', '']);
  });

  it('paste of non-numeric in numeric mode strips non-digits', async () => {
    const w = mountOtp({ length: 6, type: 'numeric' });
    const cells = w.findAll('input');
    const dataTransfer = {
      getData: (t: string) => (t === 'text' ? '1a2b3c' : ''),
    };
    await cells[0].trigger('paste', { clipboardData: dataTransfer });
    await nextTick();
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['123']);
  });

  // ─── Complete event ───────────────────────────────────────────

  it('emits complete when all cells filled', async () => {
    const w = mountOtp({ length: 4 });
    const cells = w.findAll('input');
    for (let i = 0; i < 4; i++) {
      const el = cells[i].element as HTMLInputElement;
      el.value = String(i + 1);
      await cells[i].trigger('input');
    }
    await nextTick();
    expect(w.emitted('complete')?.[0]).toEqual(['1234']);
  });

  it('does not emit complete on partial fill', async () => {
    const w = mountOtp({ length: 4 });
    const cells = w.findAll('input');
    const el = cells[0].element as HTMLInputElement;
    el.value = '1';
    await cells[0].trigger('input');
    expect(w.emitted('complete')).toBeFalsy();
  });

  it('emits complete via paste-spread filling all cells', async () => {
    const w = mountOtp({ length: 4 });
    const cells = w.findAll('input');
    const dataTransfer = {
      getData: (t: string) => (t === 'text' ? '4321' : ''),
    };
    await cells[0].trigger('paste', { clipboardData: dataTransfer });
    await nextTick();
    expect(w.emitted('complete')?.[0]).toEqual(['4321']);
  });

  // ─── Disabled / readonly ─────────────────────────────────────

  it('disabled blocks input events', async () => {
    const w = mountOtp({ disabled: true });
    const cells = w.findAll('input');
    expect(cells.every((c) => c.attributes('disabled') !== undefined)).toBe(true);
  });

  it('readonly cells render as readonly', () => {
    const w = mountOtp({ readonly: true });
    const cells = w.findAll('input');
    expect(cells.every((c) => c.attributes('readonly') !== undefined)).toBe(true);
  });

  // ─── Error state ─────────────────────────────────────────────

  it('error prop adds the error class', () => {
    const w = mountOtp({ error: true });
    expect(w.find('.coar-otp-input--error').exists()).toBe(true);
  });

  it('error sets aria-invalid on cells', () => {
    const w = mountOtp({ error: true });
    const cells = w.findAll('input');
    expect(cells.every((c) => c.attributes('aria-invalid') === 'true')).toBe(true);
  });

  // ─── transform & accept hooks ──────────────────────────────────

  it('transform: c => c.toUpperCase() uppercases typed chars', async () => {
    const w = mountOtp({
      type: 'alphanumeric',
      length: 4,
      transform: (c: string) => c.toUpperCase(),
    });
    const cells = w.findAll('input');
    (cells[0].element as HTMLInputElement).value = 'a';
    await cells[0].trigger('input');
    await nextTick();
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['A']);
    expect((cells[0].element as HTMLInputElement).value).toBe('A');
  });

  it('transform applied to paste spread', async () => {
    const w = mountOtp({
      type: 'alphanumeric',
      length: 6,
      transform: (c: string) => c.toUpperCase(),
    });
    const cells = w.findAll('input');
    const dataTransfer = {
      getData: (t: string) => (t === 'text' ? 'abc123' : ''),
    };
    await cells[0].trigger('paste', { clipboardData: dataTransfer });
    await nextTick();
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['ABC123']);
  });

  it('accept predicate rejects matching chars', async () => {
    const w = mountOtp({
      type: 'alphanumeric',
      length: 4,
      accept: (c: string) => !/[O0]/.test(c),
    });
    const cells = w.findAll('input');
    (cells[0].element as HTMLInputElement).value = '0';
    await cells[0].trigger('input');
    await nextTick();
    // Rejected — no update:modelValue emitted, cell stays empty.
    expect(w.emitted('update:modelValue')).toBeFalsy();
    expect((cells[0].element as HTMLInputElement).value).toBe('');
  });

  it('accept runs AFTER transform — block uppercase O', async () => {
    const w = mountOtp({
      type: 'alphanumeric',
      length: 4,
      transform: (c: string) => c.toUpperCase(),
      accept: (c: string) => c !== 'O',
    });
    const cells = w.findAll('input');
    (cells[0].element as HTMLInputElement).value = 'o';
    await cells[0].trigger('input');
    await nextTick();
    // 'o' → transform → 'O' → accept → rejected
    expect(w.emitted('update:modelValue')).toBeFalsy();
  });

  it('transform returning empty string drops the char', async () => {
    const w = mountOtp({
      type: 'text',
      length: 4,
      transform: (c: string) => (c === ' ' ? '' : c),
    });
    const cells = w.findAll('input');
    const dataTransfer = {
      getData: (t: string) => (t === 'text' ? 'a b c' : ''),
    };
    await cells[0].trigger('paste', { clipboardData: dataTransfer });
    await nextTick();
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['abc']);
  });
});
