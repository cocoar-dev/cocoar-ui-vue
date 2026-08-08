import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';

const artifactsDirectory = resolve(process.argv[2] ?? '../../artifacts');
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'coar-page-builder-consumer-'));
const consumerBasePath = '/consumer-app/';
const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const requiresCommandShell = process.platform === 'win32';

function fileDependency(path) {
  return `file:${path.replaceAll('\\', '/')}`;
}

function assertTemporaryDirectory(path) {
  const resolvedTempRoot = resolve(tmpdir()) + sep;
  const resolvedPath = resolve(path);
  if (
    !isAbsolute(resolvedPath) ||
    !resolvedPath.startsWith(resolvedTempRoot) ||
    !basename(resolvedPath).startsWith('coar-page-builder-consumer-')
  ) {
    throw new Error(`Refusing to remove unexpected fixture path: ${resolvedPath}`);
  }
}

async function findTarball(fragment) {
  const files = await readdir(artifactsDirectory);
  const matches = files.filter((file) => file.endsWith('.tgz') && file.includes(fragment));
  if (matches.length !== 1) {
    throw new Error(
      `Expected one ${fragment} tarball in ${artifactsDirectory}, found ${matches.length}.`,
    );
  }
  return join(artifactsDirectory, matches[0]);
}

async function run(command, args, options = {}) {
  await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: temporaryDirectory,
      env: process.env,
      shell: requiresCommandShell,
      stdio: 'inherit',
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${command} ${args.join(' ')} exited with ${code ?? signal}.`));
    });
  });
}

async function availablePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolvePromise);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not allocate fixture port.');
  await new Promise((resolvePromise, reject) =>
    server.close((error) => (error ? reject(error) : resolvePromise())),
  );
  return address.port;
}

async function waitForServer(url, processOutput) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Preview has not started yet.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw new Error(`Timed out waiting for ${url}.\n${processOutput.join('')}`);
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    await new Promise((resolvePromise) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
      });
      killer.once('exit', resolvePromise);
      killer.once('error', resolvePromise);
    });
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
}

let previewProcess;
let developmentProcess;
let browser;

try {
  const tarballs = {
    pageBuilder: await findTarball('vue-page-builder'),
    ui: await findTarball('vue-ui'),
    localization: await findTarball('vue-localization'),
    scriptEditor: await findTarball('vue-script-editor'),
  };

  const dependencies = {
    '@cocoar/vue-page-builder': fileDependency(tarballs.pageBuilder),
    '@cocoar/vue-ui': fileDependency(tarballs.ui),
    '@cocoar/vue-localization': fileDependency(tarballs.localization),
    '@cocoar/vue-script-editor': fileDependency(tarballs.scriptEditor),
    'monaco-editor': '^0.55.1',
    vue: '^3.5.0',
  };

  await mkdir(join(temporaryDirectory, 'src'), { recursive: true });
  await writeFile(
    join(temporaryDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: 'packed-page-builder-consumer-fixture',
        private: true,
        type: 'module',
        scripts: { build: 'vite build' },
        dependencies,
        devDependencies: { vite: '^8.0.0' },
        pnpm: {
          overrides: {
            '@cocoar/vue-localization': fileDependency(tarballs.localization),
            '@cocoar/vue-script-editor': fileDependency(tarballs.scriptEditor),
            '@cocoar/vue-ui': fileDependency(tarballs.ui),
          },
        },
      },
      null,
      2,
    )}\n`,
  );

  await writeFile(
    join(temporaryDirectory, 'index.html'),
    `<!doctype html>
<html lang="en">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>PageBuilder packed consumer</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>\n`,
  );

  await writeFile(
    join(temporaryDirectory, 'vite.config.mjs'),
    `import { defineConfig } from 'vite';

const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:";

export default defineConfig({
  base: ${JSON.stringify(consumerBasePath)},
  // Vite does not relocate import.meta.url assets while pre-bundling a
  // dependency. Only the tiny worker entry stays in its normal transform
  // graph; the PageBuilder and all UI dependencies remain optimized.
  optimizeDeps: { exclude: ['@cocoar/vue-page-builder/runtime-worker'] },
  plugins: [{
    name: 'fixture-html-csp',
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.headers.accept?.includes('text/html')) {
          response.setHeader('Content-Security-Policy', csp);
        }
        next();
      });
    },
  }],
});\n`,
  );

  await writeFile(
    join(temporaryDirectory, 'src', 'main.ts'),
    `import { createApp, h, ref } from 'vue';
import {
  CURRENT_PAGE_SCHEMA_VERSION,
  definePageRuntimeHost,
  usePageCodeRuntime,
  type PageNode,
} from '@cocoar/vue-page-builder';

const runtimeHost = definePageRuntimeHost({});

createApp({
  setup() {
    const schema = ref<PageNode>({
      id: 'fixture-page',
      type: 'page',
      schemaVersion: CURRENT_PAGE_SCHEMA_VERSION,
      stateCode: 'definePageState({ ready: true })',
      children: [],
    });
    const context = ref<Record<string, unknown>>({});
    const viewport = ref({ width: 800, breakpoint: 'tablet' });
    const runtime = usePageCodeRuntime({
      pageId: ref('consumer:packed-page'),
      tenantId: 'fixture-tenant',
      schema,
      context,
      viewport,
      runtimeHost,
    });

    return () => h('main', [
      h('div', { id: 'runtime-status' }, runtime.pageCodeValues.value?.state.ready === true ? 'ready' : 'booting'),
    ]);
  },
}).mount('#app');\n`,
  );

  await run(pnpmCommand, ['install', '--no-frozen-lockfile']);

  // Vite's forced dependency optimizer exercises a different code path than
  // production bundling. This specifically protects Windows consumers from
  // query-bearing worker source imports becoming unloadable dependencies.
  const developmentPort = await availablePort();
  const developmentOutput = [];
  developmentProcess = spawn(
    pnpmCommand,
    ['exec', 'vite', '--force', '--host', '127.0.0.1', '--port', String(developmentPort), '--strictPort'],
    {
      cwd: temporaryDirectory,
      env: process.env,
      detached: process.platform !== 'win32',
      shell: requiresCommandShell,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  developmentProcess.stdout.on('data', (chunk) => developmentOutput.push(chunk.toString()));
  developmentProcess.stderr.on('data', (chunk) => developmentOutput.push(chunk.toString()));
  const developmentUrl = `http://127.0.0.1:${developmentPort}${consumerBasePath}`;
  await waitForServer(developmentUrl, developmentOutput);
  browser = await chromium.launch({ headless: true });
  const developmentPage = await browser.newPage();
  const developmentErrors = [];
  developmentPage.on('pageerror', (error) => developmentErrors.push(error.message));
  developmentPage.on('console', (message) => {
    if (message.type() === 'error') developmentErrors.push(message.text());
  });
  try {
    await developmentPage.goto(developmentUrl, { waitUntil: 'domcontentloaded' });
    await developmentPage.locator('#runtime-status').filter({ hasText: 'ready' }).waitFor({ timeout: 20_000 });
  } catch (error) {
    throw new Error(`Forced Vite development consumer did not boot.\n${developmentOutput.join('')}`, { cause: error });
  }
  if (developmentErrors.length > 0) {
    throw new Error(`Forced Vite development consumer failed:\n${developmentErrors.join('\n')}\n${developmentOutput.join('')}`);
  }
  await developmentPage.close();
  await stopProcess(developmentProcess);
  developmentProcess = undefined;

  await run(pnpmCommand, ['run', 'build']);

  const assetsDirectory = join(temporaryDirectory, 'dist', 'assets');
  const javascriptAssets = (await readdir(assetsDirectory)).filter((file) => file.endsWith('.js'));
  const pageRuntimeWorkerAssets = javascriptAssets.filter((file) =>
    /^pageScriptRuntime\.worker-.+\.js$/u.test(file),
  );
  const bundledSource = (
    await Promise.all(javascriptAssets.map((file) => readFile(join(assetsDirectory, file), 'utf8')))
  ).join('\n');
  if (pageRuntimeWorkerAssets.length !== 1) {
    const workerReferences = bundledSource.match(/.{0,120}pageScriptRuntime.{0,200}/gu) ?? [];
    throw new Error(
      `Expected one emitted Page Runtime worker, found ${JSON.stringify(pageRuntimeWorkerAssets)}. References: ${JSON.stringify(workerReferences.slice(0, 5))}`,
    );
  }
  if (/new URL\(["']\/assets\/pageScriptRuntime\.worker-/u.test(bundledSource)) {
    throw new Error(
      'Packed consumer still contains an unresolved root-relative Page Runtime worker URL.',
    );
  }

  const port = await availablePort();
  const previewOutput = [];
  previewProcess = spawn(
    pnpmCommand,
    ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: temporaryDirectory,
      env: process.env,
      detached: process.platform !== 'win32',
      shell: requiresCommandShell,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  previewProcess.stdout.on('data', (chunk) => previewOutput.push(chunk.toString()));
  previewProcess.stderr.on('data', (chunk) => previewOutput.push(chunk.toString()));

  const fixtureUrl = `http://127.0.0.1:${port}${consumerBasePath}`;
  await waitForServer(fixtureUrl, previewOutput);

  const page = await browser.newPage();
  const failedRequests = [];
  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const workers = [];
  const workerResponses = [];
  page.on('requestfailed', (request) =>
    failedRequests.push(`${request.url()}: ${request.failure()?.errorText ?? 'unknown'}`),
  );
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('worker', (worker) => workers.push(worker.url()));
  page.on('response', (workerResponse) => {
    if (workerResponse.url().includes('/pageScriptRuntime.worker-')) {
      workerResponses.push({
        url: workerResponse.url(),
        csp: workerResponse.headers()['content-security-policy'] ?? '',
      });
    }
  });

  const response = await page.goto(fixtureUrl, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`Fixture returned HTTP ${response?.status() ?? 'unknown'}.`);
  const csp = response.headers()['content-security-policy'] ?? '';
  if (!csp.includes("worker-src 'self' blob:"))
    throw new Error(`Fixture CSP was not applied: ${csp}`);
  if (csp.includes("'unsafe-eval'"))
    throw new Error(`Document CSP unexpectedly enables unsafe-eval: ${csp}`);
  try {
    await page.locator('#runtime-status').filter({ hasText: 'ready' }).waitFor({ timeout: 20_000 });
  } catch (error) {
    const status = await page
      .locator('#runtime-status')
      .textContent()
      .catch(() => '<missing>');
    throw new Error(
      [
        `Packed runtime did not become ready (status: ${status}).`,
        `Workers: ${JSON.stringify(workers)}`,
        `Failed requests: ${JSON.stringify(failedRequests)}`,
        `Console errors: ${JSON.stringify(consoleErrors)}`,
        `Console warnings: ${JSON.stringify(consoleWarnings)}`,
        `Page errors: ${JSON.stringify(pageErrors)}`,
        `Worker responses: ${JSON.stringify(workerResponses)}`,
      ].join('\n'),
      { cause: error },
    );
  }

  if (workers.length !== 1 || !workers[0].includes(`${consumerBasePath}assets/${pageRuntimeWorkerAssets[0]}`)) {
    throw new Error(
      `Expected one emitted Page Runtime worker under ${consumerBasePath}, received ${JSON.stringify(workers)}.`,
    );
  }
  if (workerResponses.length !== 1 || workerResponses[0].csp) {
    throw new Error(
      `Worker must have its own unrestricted response CSP context: ${JSON.stringify(workerResponses)}.`,
    );
  }
  if (failedRequests.length > 0)
    throw new Error(`Fixture requests failed:\n${failedRequests.join('\n')}`);
  if (consoleErrors.length > 0)
    throw new Error(`Fixture console errors:\n${consoleErrors.join('\n')}`);

  console.log(`Packed PageBuilder consumer verified at ${fixtureUrl}`);
  console.log(`Worker booted from ${pageRuntimeWorkerAssets[0]} under non-root base ${consumerBasePath}.`);
} finally {
  if (browser) await browser.close();
  if (developmentProcess) await stopProcess(developmentProcess);
  if (previewProcess) await stopProcess(previewProcess);
  assertTemporaryDirectory(temporaryDirectory);
  await rm(temporaryDirectory, { recursive: true, force: true });
}
