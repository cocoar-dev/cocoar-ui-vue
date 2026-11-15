// The contract of the mobile host: apps/docs/mobile with a host-only keyboard bridge, built into
// the host's obj folder; its dev server stays off the docs' port; NeoAstra.Mcp
// exists in debug builds only; and the versions and identifiers agree. Run: node --test "apps/mobile-host/scripts/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';

import {
  ANDROID_DEVELOPMENT_FILES,
  APPLICATION_ID,
  HOST_DIR,
  childEnvironment,
  parseArgs,
  plan,
} from './mobile-host.mjs';

const read = (...path) => readFileSync(join(HOST_DIR, ...path), 'utf8');
const config = JSON.parse(read('neoastra.json'));
const csproj = read('CocoarMobileHost.csproj');
const frontendRoot = resolve(HOST_DIR, config.frontend.root);
const option = (command, name) => command[command.indexOf(name) + 1];

test('the page is the mobile docs app with a host-only extension of its config, not a copy', () => {
  assert.equal(frontendRoot, resolve(HOST_DIR, '../docs/mobile'));
  assert.ok(existsSync(join(frontendRoot, 'vite.config.ts')));
  assert.ok(existsSync(join(frontendRoot, 'index.html')));
  for (const command of [config.frontend.devCommand, config.frontend.buildCommand]) {
    assert.equal(resolve(frontendRoot, option(command, '--config')), join(HOST_DIR, 'vite.config.ts'));
    // The commands run in frontend.root; the vite of apps/docs is the one the docs build uses.
    assert.ok(existsSync(join(frontendRoot, command[1])), `${command[1]} from ${frontendRoot}`);
  }
  assert.match(read('vite.config.ts'), /import mobileDocs from '\.\.\/docs\/mobile\/vite\.config'/);
  assert.match(csproj, /NeoAstraFrontendInput Include="vite\.config\.ts;main\.ts;keyboard-bridge\.mjs"/);
});

test('the build writes into the host obj folder that neoastra.json packages', () => {
  const { buildCommand, dist } = config.frontend;
  // Vite resolves --outDir from the root of the config, which is apps/docs/mobile.
  const outDir = resolve(frontendRoot, option(buildCommand, '--outDir'));
  assert.equal(outDir, resolve(HOST_DIR, dist));
  assert.equal(outDir, join(HOST_DIR, 'obj', 'mobile-docs'));
  assert.ok(buildCommand.includes('--emptyOutDir'));
  const gitignore = readFileSync(resolve(HOST_DIR, '../../.gitignore'), 'utf8');
  assert.match(gitignore, /^apps\/mobile-host\/obj\/$/m);
  assert.match(gitignore, /^apps\/mobile-host\/bin\/$/m);
});

test('the dev server is loopback on a port of its own, not the docs port', () => {
  const { devCommand, devUrl } = config.frontend;
  const url = new URL(devUrl);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(option(devCommand, '--host'), '127.0.0.1');
  assert.equal(option(devCommand, '--port'), url.port);
  assert.ok(devCommand.includes('--strictPort'));
  const docsPort = readFileSync(resolve(HOST_DIR, '../docs/.vitepress/config.ts'), 'utf8').match(
    /port:\s*(\d+)/,
  )?.[1];
  assert.ok(docsPort, 'the docs config names its port');
  assert.notEqual(url.port, docsPort);
});

test('the lockfile is the workspace pnpm lockfile', () => {
  assert.equal(config.frontend.packageManager, 'pnpm');
  assert.equal(
    resolve(HOST_DIR, config.frontend.lockfile),
    resolve(HOST_DIR, '../../pnpm-lock.yaml'),
  );
});

test('NeoAstra.Mcp is referenced and registered in debug builds only', () => {
  const references = [...csproj.matchAll(/<PackageReference Include="NeoAstra\.Mcp"[^>]*\/>/g)];
  assert.equal(references.length, 1);
  assert.match(references[0][0], /Condition="'\$\(Configuration\)' == 'Debug'"/);
  const app = read('App.cs');
  for (const pattern of [/using NeoAstra\.Mcp;/, /AddNeoAstraMcp\(\)/]) {
    const index = app.search(pattern);
    assert.ok(index > 0);
    const before = app.slice(0, index);
    assert.ok(
      before.lastIndexOf('#if DEBUG') > before.lastIndexOf('#endif'),
      `${pattern} under #if DEBUG`,
    );
  }
});

test('the conventional host registers an empty RPC contract so it can start', () => {
  const app = read('App.cs');
  assert.match(
    app,
    /ConfigureGeneratedRpc\("cocoar-mobile-host-empty-v1", \[\], static _ => \{ \}\)/,
  );
  assert.doesNotMatch(app, /\[NeoRpcService/);
});

test('package, tool and identifiers agree', () => {
  const version = csproj.match(/<NeoAstraVersion>([^<]+)<\/NeoAstraVersion>/)?.[1];
  assert.match(version ?? '', /^\d+\.\d+\.\d+$/);
  const tools = JSON.parse(read('.config', 'dotnet-tools.json'));
  assert.equal(tools.tools['neoastra.tool'].version, version);
  assert.equal(tools.tools['neoastra.tool'].rollForward, false);
  assert.match(JSON.parse(read('global.json')).sdk.version, /^11\./);
  assert.match(
    csproj,
    new RegExp(`<ApplicationId>${APPLICATION_ID.replaceAll('.', '\\.')}</ApplicationId>`),
  );
  assert.equal(config.app.identifier, APPLICATION_ID);
  assert.deepEqual(config.capabilities, []);
});

test('no machine-specific paths in the host files', () => {
  for (const file of [
    'neoastra.json',
    'CocoarMobileHost.csproj',
    'README.md',
    'global.json',
    'nuget.config',
  ]) {
    assert.doesNotMatch(read(file), /\/Users\/|\/home\/|[A-Z]:\\\\/, file);
  }
});

test('commands', () => {
  assert.deepEqual(plan(parseArgs(['ios'])), [
    {
      args: [
        'build',
        'CocoarMobileHost.csproj',
        '-t:Run',
        '-f',
        'net11.0-ios',
        '-c',
        'Debug',
        '-r',
        'iossimulator-arm64',
      ],
    },
  ]);
  assert.ok(
    plan(parseArgs(['ios', '--device', 'ABC']))[0].args.includes('-p:_DeviceName=:v2:udid=ABC'),
  );
  const android = plan(parseArgs(['android', '--device', 'emulator-5554']));
  assert.deepEqual(android[0], {
    tool: 'adb',
    args: [
      '-s',
      'emulator-5554',
      'shell',
      'run-as',
      APPLICATION_ID,
      'rm',
      '-f',
      ...ANDROID_DEVELOPMENT_FILES,
    ],
    optional: true,
  });
  assert.ok(android[1].args.includes('-p:AdbTarget=-s emulator-5554'));
  assert.ok(android[1].args.includes('Debug'));
  const devIos = plan(parseArgs(['dev-ios', '--device', 'U', '--mcp-address', '192.168.1.20']));
  assert.deepEqual(devIos[1].args, ['restore', 'CocoarMobileHost.csproj']);
  assert.deepEqual(devIos[2].args, [
    'neoastra',
    'dev',
    '--platform',
    'ios',
    '--device',
    'U',
    '--mcp-address',
    '192.168.1.20',
  ]);
  assert.deepEqual(plan(parseArgs(['dev-android']))[2].args, [
    'neoastra',
    'dev',
    '--platform',
    'android',
  ]);
  assert.deepEqual(plan(parseArgs(['mcp'])), [
    { args: ['tool', 'restore'] },
    { args: ['neoastra', 'mcp'] },
  ]);
});

test('arguments that make no sense are refused', () => {
  assert.throws(() => parseArgs([]), /Usage/);
  assert.throws(() => parseArgs(['web']), /Usage/);
  assert.throws(() => parseArgs(['ios', '--device']), /incomplete/);
  assert.throws(() => parseArgs(['ios', '--release']), /Unknown/);
  assert.throws(() => parseArgs(['android', '--mcp-address', '10.0.0.2']), /dev-ios/);
  assert.throws(() => parseArgs(['mcp', '--device', 'X']), /no device/);
});

test('DOTNET_ROOT goes first on PATH', () => {
  assert.equal(
    childEnvironment({ DOTNET_ROOT: '/sdk', PATH: '/bin' }).PATH,
    ['/sdk', '/bin'].join(delimiter),
  );
  assert.equal(childEnvironment({ PATH: '/bin' }).PATH, '/bin');
});
