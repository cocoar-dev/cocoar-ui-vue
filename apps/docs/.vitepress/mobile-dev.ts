// `vitepress dev` serves the mobile documentation (apps/docs/mobile) at <base>mobile/, on the same
// origin as the docs, so a <PhoneFrame> works in dev as in the built site (where `pnpm build`
// writes the app to .vitepress/dist/mobile). The app gets a Vite server of its own in middleware
// mode, with its own config and HMR, mounted into the docs' dev server.
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

export function mobileDocsDev(siteBase: string): Plugin {
  const base = `${siteBase}mobile/`;
  return {
    name: 'coar-mobile-docs-dev',
    apply: 'serve',
    async configureServer(server) {
      const { createServer } = await import('vite');
      const mobile = await createServer({
        configFile: fileURLToPath(new URL('../mobile/vite.config.ts', import.meta.url)),
        base,
        appType: 'spa',
        server: {
          middlewareMode: true,
          // Its own HMR socket on the docs' HTTP server; the path under `base` keeps it apart.
          hmr: server.httpServer ? { server: server.httpServer } : false,
        },
      });
      server.middlewares.use((req, res, next) => {
        const [path, query] = (req.url ?? '').split('?');
        if (path === base.slice(0, -1)) {
          // <base>mobile without the slash, also with a query (?scheme=dark).
          res.writeHead(302, { Location: query ? `${base}?${query}` : base }).end();
        } else if (req.url?.startsWith(base)) {
          mobile.middlewares(req, res, next);
        } else {
          next();
        }
      });
      server.httpServer?.once('close', () => void mobile.close());
    },
  };
}
