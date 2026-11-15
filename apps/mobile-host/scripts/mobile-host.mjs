#!/usr/bin/env node
// Starts the NeoAstra mobile host (apps/mobile-host) from anywhere in the repository. It only picks the
// dotnet commands and runs them in the host folder, where global.json pins the .NET 11 SDK and
// .config/dotnet-tools.json the NeoAstra tool; building and serving the page is NeoAstra's work
// (neoastra.json), and `dotnet neoastra dev` manages the development server, the app and the relay.
//
//   node apps/mobile-host/scripts/mobile-host.mjs <command> [--device <id>] [--mcp-address <IPv4>]
//
//   ios          builds the debug app with the packaged docs and runs it in a simulator (offline)
//   android      the same on an Android device or emulator (offline)
//   dev-ios      `dotnet neoastra dev --platform ios`: live docs from Vite, the relay for agents
//   dev-android  `dotnet neoastra dev --platform android`
//   mcp          `dotnet neoastra mcp`, the MCP server an agent starts (stdout carries MCP alone)
//
// DOTNET_ROOT, when set, selects the .NET 11 SDK (its dotnet goes first on PATH for the children).
import { spawn } from 'node:child_process';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HOST_DIR = fileURLToPath(new URL('..', import.meta.url));
export const PROJECT = 'CocoarMobileHost.csproj';
export const APPLICATION_ID = 'dev.cocoar.ui.mobilehost';
export const IOS_TFM = 'net11.0-ios';
export const IOS_SIMULATOR_RID = 'iossimulator-arm64';
export const ANDROID_TFM = 'net11.0-android';
// What a `dotnet neoastra dev` session leaves in the private files of a debuggable Android build;
// without them the app loads its packaged assets.
export const ANDROID_DEVELOPMENT_FILES = [
  'files/neoastra-development-url',
  'files/neoastra-development-mcp',
];

const USAGE = `Usage: node apps/mobile-host/scripts/mobile-host.mjs <ios|android|dev-ios|dev-android|mcp> [--device <id>] [--mcp-address <IPv4>]`;

/** Parses the arguments after the script name. Throws on anything it does not know. */
export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = { command, device: undefined, mcpAddress: undefined };
  for (let i = 0; i < rest.length; i++) {
    const name = rest[i];
    const value = rest[i + 1];
    if ((name !== '--device' && name !== '--mcp-address') || !value || value.startsWith('--')) {
      throw new Error(`Unknown or incomplete option "${name}".\n${USAGE}`);
    }
    if (name === '--device') options.device = value;
    else options.mcpAddress = value;
    i++;
  }
  if (!['ios', 'android', 'dev-ios', 'dev-android', 'mcp'].includes(command)) {
    throw new Error(USAGE);
  }
  if (options.mcpAddress && command !== 'dev-ios') {
    throw new Error('--mcp-address is for dev-ios with a connected iPhone only.');
  }
  if (options.device && command === 'mcp') {
    throw new Error('mcp takes no device: it follows the dev session of this project.');
  }
  return options;
}

/**
 * The steps of a command, run in HOST_DIR one after the other: `{ args }` for dotnet, or
 * `{ tool: 'adb', args }`; a step with `optional` may fail.
 */
export function plan({ command, device, mcpAddress }) {
  const restoreTool = { args: ['tool', 'restore'] };
  switch (command) {
    case 'ios':
      return [
        {
          args: [
            'build',
            PROJECT,
            '-t:Run',
            '-f',
            IOS_TFM,
            '-c',
            'Debug',
            '-r',
            IOS_SIMULATOR_RID,
            ...(device ? [`-p:_DeviceName=:v2:udid=${device}`] : []),
          ],
        },
      ];
    case 'android': {
      const adb = device ? ['-s', device] : [];
      return [
        // Forget a development server that an interrupted dev session left behind (none: nothing to do).
        {
          tool: 'adb',
          args: [
            ...adb,
            'shell',
            'run-as',
            APPLICATION_ID,
            'rm',
            '-f',
            ...ANDROID_DEVELOPMENT_FILES,
          ],
          optional: true,
        },
        {
          args: [
            'build',
            PROJECT,
            '-t:Run',
            '-f',
            ANDROID_TFM,
            '-c',
            'Debug',
            ...(device ? [`-p:AdbTarget=-s ${device}`] : []),
          ],
        },
      ];
    }
    case 'dev-ios':
    case 'dev-android':
      return [
        restoreTool,
        // `dotnet neoastra dev` builds with --no-restore; after a Release restore the Debug-only
        // NeoAstra.Mcp would be missing, so restore for Debug (the default configuration) first.
        { args: ['restore', PROJECT] },
        {
          args: [
            'neoastra',
            'dev',
            '--platform',
            command === 'dev-ios' ? 'ios' : 'android',
            ...(device ? ['--device', device] : []),
            ...(mcpAddress ? ['--mcp-address', mcpAddress] : []),
          ],
        },
      ];
    case 'mcp':
      return [restoreTool, { args: ['neoastra', 'mcp'] }];
    default:
      throw new Error(USAGE);
  }
}

/** The environment of the children: DOTNET_ROOT's dotnet first on PATH, when DOTNET_ROOT is set. */
export function childEnvironment(env = process.env) {
  if (!env.DOTNET_ROOT) return { ...env };
  return { ...env, PATH: [env.DOTNET_ROOT, env.PATH].filter(Boolean).join(delimiter) };
}

function dotnetExecutable(env) {
  return env.DOTNET_ROOT ? join(env.DOTNET_ROOT, 'dotnet') : 'dotnet';
}

let current;
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  // An agent or a closing terminal stops the script: the dev session tears its children down itself.
  process.on(signal, () => (current ? current.kill(signal) : process.exit(1)));
}

function run(step, env, mcp) {
  // For the MCP server, stdout belongs to the protocol: what the steps before it print goes to stderr.
  const server = step.args[0] === 'neoastra' && step.args[1] === 'mcp';
  const stdio = mcp && !server ? ['ignore', process.stderr, 'inherit'] : 'inherit';
  return new Promise((resolve, reject) => {
    current = spawn(step.tool ?? dotnetExecutable(env), step.args, { cwd: HOST_DIR, env, stdio });
    current.on('error', (error) => (step.optional ? resolve(0) : reject(error)));
    current.on('exit', (code, signal) => {
      current = undefined;
      resolve(step.optional ? 0 : (code ?? (signal ? 1 : 0)));
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = childEnvironment();
  for (const step of plan(options)) {
    const code = await run(step, env, options.command === 'mcp');
    if (code !== 0) process.exit(code);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
