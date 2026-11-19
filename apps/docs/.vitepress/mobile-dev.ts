// `vitepress dev` serves the mobile documentation (apps/docs/mobile) on the same origin as the
// docs, so a <PhoneFrame> works in dev as in the built site (where `pnpm build` writes the app to
// .vitepress/dist/mobile). The app gets a Vite server of its own in middleware mode, with its own
// config and HMR, mounted into the docs' dev server.
//
// It is mounted at <base>__mobile/, not at <base>mobile/: apps/docs/mobile is also a folder of the
// docs, and a docs page that imports one of its demos (foundations/compact-presentation.md) asks
// VitePress for <base>mobile/demos/…. Served by the app's server, that module would run on a second
// copy of Vue. So a page opened at <base>mobile/… (a PhoneFrame, a link) is sent to <base>__mobile/…,
// and every other request under <base>mobile/ stays with VitePress.
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

export function mobileDocsDev(siteBase: string): Plugin {
  const pages = `${siteBase}mobile`;
  const base = `${siteBase}__mobile/`;
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
        const url = req.url ?? '';
        const [path] = url.split('?');
        const dest = req.headers['sec-fetch-dest'];
        // The entry of the app always; a page under it only when the request opens a page (a module
        // of a docs page under <base>mobile/ is no page). Without Sec-Fetch-Dest (plain http on a LAN
        // address, curl) a page asks for HTML.
        const entry = path === pages || path === `${pages}/`;
        const page = dest === 'document' || dest === 'iframe' || (!dest && /text\/html/.test(req.headers.accept ?? ''));
        if (entry || (page && path.startsWith(`${pages}/`))) {
          // <base>mobile, <base>mobile/ and <base>mobile/?embed=1 keep their query; the hash stays in the browser.
          res.writeHead(302, { Location: `${base}${url.slice(pages.length).replace(/^\//, '')}` }).end();
        } else if (url.startsWith(base)) {
          mobile.middlewares(req, res, next);
        } else {
          next();
        }
      });
      server.httpServer?.once('close', () => void mobile.close());
    },
  };
}
