import type { Preview } from '@storybook/vue3';
import '@cocoar/vue-ui/styles';

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          'Foundations',
          ['Getting Started', 'Design Principles', 'Colors', 'Typography', 'Spacing & Effects', 'Icons', 'Motion'],
          'Components',
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
