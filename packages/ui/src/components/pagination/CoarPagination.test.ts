import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarPagination from './CoarPagination.vue';

function mountPagination(props: Record<string, unknown> = {}) {
  return mount(CoarPagination, {
    props: { totalItems: 100, pageSize: 10, ...props },
    attachTo: document.body,
  });
}

describe('CoarPagination', () => {
  describe('rendering', () => {
    it('renders nav with aria-label', () => {
      const wrapper = mountPagination();
      expect(wrapper.find('nav[aria-label="Pagination"]').exists()).toBe(true);
    });

    it('renders correct number of page buttons for small total', () => {
      const wrapper = mountPagination({ totalItems: 30, pageSize: 10 });
      const pageButtons = wrapper.findAll('.coar-pagination-button--page');
      expect(pageButtons).toHaveLength(3);
    });

    it('renders ellipsis for many pages', () => {
      const wrapper = mountPagination({ totalItems: 200, pageSize: 10, modelValue: 10 });
      const ellipses = wrapper.findAll('.coar-pagination-ellipsis');
      expect(ellipses.length).toBeGreaterThan(0);
    });

    it('shows first/last buttons by default', () => {
      const wrapper = mountPagination();
      const navButtons = wrapper.findAll('.coar-pagination-button--nav');
      expect(navButtons).toHaveLength(4); // first, prev, next, last
    });

    it('hides first/last buttons when showFirstLast is false', () => {
      const wrapper = mountPagination({ showFirstLast: false });
      const navButtons = wrapper.findAll('.coar-pagination-button--nav');
      expect(navButtons).toHaveLength(2); // prev, next only
    });
  });

  describe('page navigation', () => {
    it('emits update:modelValue when clicking a page', async () => {
      const wrapper = mountPagination({ modelValue: 1 });

      // Click page 3
      const page3 = wrapper.findAll('.coar-pagination-button--page').find(
        (btn) => btn.text() === '3',
      );
      expect(page3).toBeTruthy();
      await page3!.trigger('click');

      expect(wrapper.emitted('update:modelValue')).toBeTruthy();
      const lastEmit = wrapper.emitted('update:modelValue')!.at(-1);
      expect(lastEmit).toEqual([3]);
    });

    it('emits pageChanged event', async () => {
      const wrapper = mountPagination({ modelValue: 1 });

      const page2 = wrapper.findAll('.coar-pagination-button--page').find(
        (btn) => btn.text() === '2',
      );
      await page2!.trigger('click');

      expect(wrapper.emitted('pageChanged')).toBeTruthy();
      expect(wrapper.emitted('pageChanged')![0]).toEqual([2]);
    });

    it('prev button navigates back', async () => {
      const wrapper = mountPagination({ modelValue: 3 });

      const prevBtn = wrapper.find('[aria-label="Go to previous page"]');
      await prevBtn.trigger('click');

      expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([2]);
    });

    it('next button navigates forward', async () => {
      const wrapper = mountPagination({ modelValue: 1 });

      const nextBtn = wrapper.find('[aria-label="Go to next page"]');
      await nextBtn.trigger('click');

      expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([2]);
    });

    it('first button goes to page 1', async () => {
      const wrapper = mountPagination({ modelValue: 5 });

      const firstBtn = wrapper.find('[aria-label="Go to first page"]');
      await firstBtn.trigger('click');

      expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([1]);
    });

    it('last button goes to last page', async () => {
      const wrapper = mountPagination({ modelValue: 5 });

      const lastBtn = wrapper.find('[aria-label="Go to last page"]');
      await lastBtn.trigger('click');

      expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([10]);
    });
  });

  describe('disabled state', () => {
    it('does not emit on click when disabled', async () => {
      const wrapper = mountPagination({ modelValue: 1, disabled: true });

      const page2 = wrapper.findAll('.coar-pagination-button--page').find(
        (btn) => btn.text() === '2',
      );
      await page2!.trigger('click');

      // pageChanged should not be emitted (update:modelValue might still fire
      // because the button is HTML-disabled, not JS-guarded for model updates)
      expect(wrapper.emitted('pageChanged')).toBeFalsy();
    });

    it('adds disabled class to container', () => {
      const wrapper = mountPagination({ disabled: true });
      expect(wrapper.find('.coar-pagination--disabled').exists()).toBe(true);
    });
  });

  describe('boundary behavior', () => {
    it('prev is disabled on first page', () => {
      const wrapper = mountPagination({ modelValue: 1 });
      const prevBtn = wrapper.find('[aria-label="Go to previous page"]');
      expect((prevBtn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('next is disabled on last page', () => {
      const wrapper = mountPagination({ modelValue: 10 });
      const nextBtn = wrapper.find('[aria-label="Go to next page"]');
      expect((nextBtn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('active page has aria-current="page"', () => {
      const wrapper = mountPagination({ modelValue: 1 });
      const activeBtn = wrapper.find('.coar-pagination-button--active');
      expect(activeBtn.attributes('aria-current')).toBe('page');
    });
  });

  describe('page calculation', () => {
    it('calculates totalPages correctly', () => {
      const wrapper = mountPagination({ totalItems: 95, pageSize: 10 });
      // 95 items / 10 per page = 10 pages
      const lastPageBtn = wrapper.findAll('.coar-pagination-button--page').at(-1);
      expect(lastPageBtn!.text()).toBe('10');
    });

    it('handles 0 total items', () => {
      const wrapper = mountPagination({ totalItems: 0, pageSize: 10 });
      const pageButtons = wrapper.findAll('.coar-pagination-button--page');
      expect(pageButtons).toHaveLength(1);
      expect(pageButtons[0].text()).toBe('1');
    });
  });
});
