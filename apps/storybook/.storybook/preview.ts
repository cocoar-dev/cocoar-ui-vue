import type { Preview } from '@storybook/vue3';
import '@cocoar/vue-ui/styles';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (story, context) => {
      const theme = context.globals.theme || 'light';
      const isDark = theme === 'dark';
      // Apply to iframe document (where stories render)
      document.documentElement.classList.toggle('dark-mode', isDark);
      document.body.style.backgroundColor = isDark ? 'var(--coar-background-neutral-primary)' : '';
      document.body.style.color = isDark ? 'var(--coar-text-neutral-primary)' : '';
      return story();
    },
  ],
  parameters: {
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Getting Started', 'Design Principles', 'Colors', 'Typography', 'Spacing & Effects', 'Icons', 'Motion', 'Localization'],
          'General',
          'Form Controls',
          'Navigation',
          'Data Display',
          'Date & Time',
          'Overlay',
          'Utilities',
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
