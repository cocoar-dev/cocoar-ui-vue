import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import CoarCodeBlock from './CoarCodeBlock.vue';

function mountCodeBlock(props: Record<string, unknown> = {}) {
  return mount(CoarCodeBlock, { props: { code: 'const x = 1;', ...props } });
}

describe('CoarCodeBlock', () => {
  describe('rendering', () => {
    it('should create', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-block').exists()).toBe(true);
    });

    it('should render code block', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-content').exists()).toBe(true);
    });

    it('should render header', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-header').exists()).toBe(true);
    });

    it('should display code', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code').element.innerHTML).toBeTruthy();
    });
  });

  describe('defaults', () => {
    it('should have default language of html', () => {
      const wrapper = mountCodeBlock({ code: '<div>hello</div>' });
      expect(wrapper.find('.coar-code-language').text()).toBe('html');
    });

    it('should have default collapsible of true', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-toggle').exists()).toBe(true);
    });

    it('should have default showCopy of true', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-copy-btn').exists()).toBe(true);
    });

    it('should have default showLineNumbers of false', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-line-number').exists()).toBe(false);
    });

    it('should not set max-height by default', () => {
      const wrapper = mountCodeBlock();
      const content = wrapper.find('.coar-code-content');
      expect(content.attributes('style')).toBeUndefined();
    });
  });

  describe('title and language', () => {
    it('should show language when no title provided', () => {
      const wrapper = mountCodeBlock({ language: 'typescript' });
      expect(wrapper.find('.coar-code-language').text()).toBe('typescript');
      expect(wrapper.find('.coar-code-title').exists()).toBe(false);
    });

    it('should show title when provided', () => {
      const wrapper = mountCodeBlock({ title: 'Example Code' });
      expect(wrapper.find('.coar-code-title').text()).toBe('Example Code');
      expect(wrapper.find('.coar-code-language').exists()).toBe(false);
    });
  });

  describe('syntax highlighting', () => {
    it('should highlight TypeScript code', () => {
      const wrapper = mountCodeBlock({
        code: 'const message: string = "hello";',
        language: 'typescript',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toContain('class=');
    });

    it('should handle JavaScript', () => {
      const wrapper = mountCodeBlock({
        code: 'function test() { return true; }',
        language: 'javascript',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toBeTruthy();
    });

    it('should handle HTML/markup', () => {
      const wrapper = mountCodeBlock({
        code: '<div class="test">Hello</div>',
        language: 'html',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toBeTruthy();
    });

    it('should handle CSS', () => {
      const wrapper = mountCodeBlock({
        code: '.test { color: red; }',
        language: 'css',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toBeTruthy();
    });

    it('should handle JSON', () => {
      const wrapper = mountCodeBlock({
        code: '{"key": "value"}',
        language: 'json',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toBeTruthy();
    });

    it('should handle unknown language gracefully', () => {
      const wrapper = mountCodeBlock({
        code: 'some unknown code',
        language: 'unknownlang',
      });
      expect(wrapper.find('.coar-code').text()).toContain('some unknown code');
    });
  });

  describe('collapsible behavior', () => {
    it('should show toggle button when collapsible', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-toggle').exists()).toBe(true);
    });

    it('should hide toggle button when not collapsible', () => {
      const wrapper = mountCodeBlock({ collapsible: false });
      expect(wrapper.find('.coar-code-toggle').exists()).toBe(false);
    });

    it('should show code content when not collapsed', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-content').exists()).toBe(true);
    });

    it('should toggle collapsed state on button click', async () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-content').exists()).toBe(true);

      await wrapper.find('.coar-code-toggle').trigger('click');
      expect(wrapper.find('.coar-code-content').exists()).toBe(false);

      await wrapper.find('.coar-code-toggle').trigger('click');
      expect(wrapper.find('.coar-code-content').exists()).toBe(true);
    });

    it('should set aria-expanded attribute correctly', async () => {
      const wrapper = mountCodeBlock();
      const toggle = wrapper.find('.coar-code-toggle');
      expect(toggle.attributes('aria-expanded')).toBe('true');

      await toggle.trigger('click');
      expect(toggle.attributes('aria-expanded')).toBe('false');
    });
  });

  describe('copy button', () => {
    it('should show copy button when showCopy is true', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-copy-btn').exists()).toBe(true);
    });

    it('should hide copy button when showCopy is false', () => {
      const wrapper = mountCodeBlock({ showCopy: false });
      expect(wrapper.find('.coar-code-copy-btn').exists()).toBe(false);
    });

    it('should have accessible label', () => {
      const wrapper = mountCodeBlock();
      expect(wrapper.find('.coar-code-copy-btn').attributes('aria-label')).toBe('Copy code');
    });
  });

  describe('line numbers', () => {
    it('should render line numbers when enabled', () => {
      const wrapper = mountCodeBlock({
        code: 'line 1\nline 2\nline 3',
        showLineNumbers: true,
      });
      const lineNumbers = wrapper.findAll('.coar-code-line-number');
      expect(lineNumbers.length).toBe(3);
      expect(lineNumbers[0].text()).toBe('1');
      expect(lineNumbers[2].text()).toBe('3');
    });
  });

  describe('max height', () => {
    it('should not set max-height when maxHeight is 0', () => {
      const wrapper = mountCodeBlock();
      const content = wrapper.find('.coar-code-content');
      expect(content.attributes('style')).toBeUndefined();
    });

    it('should set max-height when maxHeight is provided', () => {
      const wrapper = mountCodeBlock({ maxHeight: 200 });
      const content = wrapper.find('.coar-code-content');
      expect(content.attributes('style')).toContain('max-height: 200px');
    });
  });

  describe('language aliases', () => {
    it('should map ts to typescript', () => {
      const wrapper = mountCodeBlock({
        code: 'const x: number = 1;',
        language: 'ts',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toContain('class=');
    });

    it('should map js to javascript', () => {
      const wrapper = mountCodeBlock({
        code: 'const x = 1;',
        language: 'js',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toBeTruthy();
    });

    it('should map xml to markup', () => {
      const wrapper = mountCodeBlock({
        code: '<root><child/></root>',
        language: 'xml',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toBeTruthy();
    });

    it('should map sh to bash', () => {
      const wrapper = mountCodeBlock({
        code: 'echo "hello"',
        language: 'sh',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toBeTruthy();
    });

    it('should map vue to markup for Prism highlighting', () => {
      const wrapper = mountCodeBlock({
        code: '<template>\n  <div class="app">{{ message }}</div>\n</template>',
        language: 'vue',
      });
      // Prism should treat vue as markup and produce syntax-highlighted tokens
      const html = wrapper.find('.coar-code').element.innerHTML;
      expect(html).toContain('class=');
      expect(html).toContain('token');
    });

    it('should display "vue" as the language label even though it maps to markup internally', () => {
      const wrapper = mountCodeBlock({
        code: '<div>hello</div>',
        language: 'vue',
      });
      // The language label should show the original language name, not the mapped one
      expect(wrapper.find('.coar-code-language').text()).toBe('vue');
    });

    it('should map svg to markup', () => {
      const wrapper = mountCodeBlock({
        code: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>',
        language: 'svg',
      });
      const html = wrapper.find('.coar-code').element.innerHTML;
      expect(html).toContain('class=');
      expect(html).toContain('token');
    });

    it('should map shell to bash', () => {
      const wrapper = mountCodeBlock({
        code: 'npm install vue',
        language: 'shell',
      });
      expect(wrapper.find('.coar-code').element.innerHTML).toBeTruthy();
    });
  });

  describe('copy functionality', () => {
    let writeTextMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      writeTextMock = vi.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });
    });

    it('should copy code to clipboard successfully', async () => {
      writeTextMock.mockResolvedValue(undefined);
      const wrapper = mountCodeBlock({ code: 'console.log("test");' });

      await wrapper.vm.copyCode();
      expect(writeTextMock).toHaveBeenCalledWith('console.log("test");');
    });

    it('should show copied feedback after successful copy', async () => {
      writeTextMock.mockResolvedValue(undefined);
      const wrapper = mountCodeBlock({ code: 'test code' });

      await wrapper.vm.copyCode();
      expect(wrapper.vm.copyFeedback).toBe('copied');
    });

    it('should show error feedback when copy fails', async () => {
      writeTextMock.mockRejectedValue(new Error('Copy failed'));
      const wrapper = mountCodeBlock({ code: 'test code' });

      await wrapper.vm.copyCode();
      expect(wrapper.vm.copyFeedback).toBe('error');
    });

    it('should reset feedback after timeout', async () => {
      vi.useFakeTimers();
      writeTextMock.mockResolvedValue(undefined);
      const wrapper = mountCodeBlock({ code: 'test code' });

      await wrapper.vm.copyCode();
      expect(wrapper.vm.copyFeedback).toBe('copied');

      vi.advanceTimersByTime(2100);
      expect(wrapper.vm.copyFeedback).toBe('idle');

      vi.useRealTimers();
    });
  });

  describe('variant classes', () => {
    it.each(['neutral', 'success', 'warning', 'error', 'info', 'accent'] as const)(
      'should apply %s variant class',
      (variant) => {
        const wrapper = mountCodeBlock({ variant });
        expect(wrapper.find(`.coar-code-block--${variant}`).exists()).toBe(true);
      },
    );
  });

  describe('lines calculation', () => {
    it('should calculate lines correctly', () => {
      const wrapper = mountCodeBlock({ code: 'line1\nline2\nline3' });
      expect(wrapper.vm.lines).toEqual([1, 2, 3]);
    });
  });
});
