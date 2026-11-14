import { afterEach, describe, expect, it } from 'vitest';
import { lockPageScroll } from './pageScrollLock';

function touchMove(target: Element): TouchEvent {
  const event = new Event('touchmove', { bubbles: true, cancelable: true }) as TouchEvent;
  target.dispatchEvent(event);
  return event;
}

describe('lockPageScroll', () => {
  const nodes: Element[] = [];
  afterEach(() => {
    nodes.splice(0).forEach((n) => n.remove());
    document.documentElement.style.overflow = '';
  });

  it('hides the page overflow until released, restoring what was there', () => {
    document.documentElement.style.overflow = 'clip';
    const release = lockPageScroll();
    expect(document.documentElement.style.overflow).toBe('hidden');
    release();
    expect(document.documentElement.style.overflow).toBe('clip');
  });

  it('stays locked until the last of two locks is released, in any order', () => {
    const first = lockPageScroll();
    const second = lockPageScroll();
    first();
    expect(document.documentElement.style.overflow).toBe('hidden');
    first(); // a second call of the same release counts nothing
    expect(document.documentElement.style.overflow).toBe('hidden');
    second();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('cancels touch moves on the page but not inside an overlay', () => {
    const page = document.createElement('div');
    const host = document.createElement('div');
    host.className = 'coar-overlay-host';
    const inner = document.createElement('div');
    host.appendChild(inner);
    document.body.append(page, host);
    nodes.push(page, host);

    const release = lockPageScroll();
    expect(touchMove(page).defaultPrevented).toBe(true);
    expect(touchMove(inner).defaultPrevented).toBe(false);
    release();
    expect(touchMove(page).defaultPrevented).toBe(false);
  });
});
