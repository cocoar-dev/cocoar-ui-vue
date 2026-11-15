import { fileURLToPath } from 'node:url';
import { mergeConfig } from 'vite';
import mobileDocs from '../docs/mobile/vite.config';

export default mergeConfig(mobileDocs, {
  plugins: [
    {
      name: 'cocoar-mobile-host-keyboard',
      transformIndexHtml: {
        order: 'pre',
        handler: () => [
          {
            tag: 'script',
            attrs: {
              type: 'module',
              src: `/@fs/${fileURLToPath(new URL('./main.ts', import.meta.url))}`,
            },
            injectTo: 'head',
          },
        ],
      },
    },
  ],
});
