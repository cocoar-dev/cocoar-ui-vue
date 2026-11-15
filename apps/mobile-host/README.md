# Mobile host (NeoAstra)

A minimal iOS and Android app that shows the **mobile documentation** of `apps/docs/mobile` in a native
WebView, so the components can be tried with a real keyboard, safe areas and touch. It is a test host,
not a product: it is never published and reuses the documentation's pages.

- **One page, no copy.** [`neoastra.json`](neoastra.json) points the NeoAstra frontend pipeline at
  `apps/docs/mobile`. The host's Vite config extends that app's config with its own keyboard bridge
  and builds into `apps/mobile-host/obj/mobile-docs`; no page is copied and the browser docs never
  load the native adapter.
- **Offline by default.** A normal start loads the page packaged into the app. `dev-ios`/`dev-android` run
  `dotnet neoastra dev` instead: the page comes live from Vite on `127.0.0.1:5178` (the docs keep 5177),
  with hot reload, and an agent can drive it over MCP.
- **Native like the app it stands in for.** iOS: keyboard over the page (`NeoAstraIOSKeyboardOverlay`),
  `focus()` opens it (`NeoAstraIOSKeyboardWithoutUserAction`), no form bar (`NeoAstraIOSHideFormAccessoryBar`).
  Android: edge to edge with `env(safe-area-inset-*)` (`NeoAstraAndroidEdgeToEdge`) and the keyboard over the
  page (`NeoAstraAndroidKeyboardOverlay`). iOS 17 and Android 8 (API 26) or later.
- **Nothing else.** Bundle ID / package `dev.cocoar.ui.mobilehost`, no permissions, no capabilities, no RPC
  services, no sign-in, push or accounts. `NeoAstra.Mcp` is referenced and registered in Debug builds only.

## Prerequisites

- The **.NET 11 SDK** (`global.json` asks for 11.0.100 or a later feature band) with the **`ios`** and
  **`android`** workloads. If `dotnet` on your `PATH` is another SDK, set `DOTNET_ROOT` to the folder of the
  .NET 11 SDK; the script puts its `dotnet` first on `PATH`. This folder installs nothing: install the SDK and
  the workloads yourself (`dotnet workload install ios android`).
- **iOS:** Xcode that matches the iOS workload, and a simulator.
- **Android:** the Android SDK with `adb` on `PATH`, and an emulator or a phone with USB debugging.
- **The repository's Node and pnpm** (`package.json`), with `pnpm install` run at the root. The page is built
  by `node ../node_modules/vite/bin/vite.js` from `apps/docs/mobile`, the Vite of the docs; NeoAstra does
  not install npm packages for pnpm workspaces.

The NeoAstra tool is pinned in `.config/dotnet-tools.json`; the script runs `dotnet tool restore` before it
uses it. NuGet packages come from nuget.org only (`nuget.config`).

## Commands

Run from the repository root:

| Command | What it does |
| --- | --- |
| `node apps/mobile-host/scripts/mobile-host.mjs ios` | Builds the Debug app with the packaged docs and runs it in a simulator (offline) |
| `node apps/mobile-host/scripts/mobile-host.mjs android` | The same on an Android phone or emulator (offline) |
| `node apps/mobile-host/scripts/mobile-host.mjs dev-ios` | `dotnet neoastra dev --platform ios`: live docs from Vite, relay for agents |
| `node apps/mobile-host/scripts/mobile-host.mjs dev-android` | `dotnet neoastra dev --platform android` |
| `node apps/mobile-host/scripts/mobile-host.mjs mcp` | `dotnet neoastra mcp`, the MCP server an agent starts (stdout is MCP only) |
| `node --test "apps/mobile-host/scripts/*.test.mjs"` | Checks paths, configuration, versions and that MCP stays out of Release |

Root aliases are `pnpm mobile:ios`, `pnpm mobile:android`, `pnpm mobile:dev:ios`,
`pnpm mobile:dev:android`, and `pnpm test:mobile-host`. For the MCP server use the Node command above or
`pnpm --silent mobile:mcp`: without `--silent`, pnpm prints a banner to stdout, which breaks the protocol.
The host's Node tests also run as part of the normal root `pnpm test`; native builds remain opt-in.

Stop a run with Ctrl+C; `dotnet neoastra dev` then stops Vite and the app's log and, on Android, removes the
port forwarding and the development address.

### Choosing a device

Add `--device <id>` to any command but `mcp`:

- iOS simulator: the UDID from `xcrun simctl list devices`. Without it, `ios` lets .NET pick a simulator and
  `dev-ios` uses the booted one.
- Android: the serial from `adb devices` (`emulator-5554`, a phone's serial). Needed only when several are
  connected.
- A connected iPhone (`dev-ios --device <udid>` with the UDID from `xcrun devicectl list devices`): NeoAstra
  builds for `ios-arm64` and signs with your local `Apple Development` identity; this folder sets no team or
  identity. When the iPhone should reach the relay on another address than the default (a VPN is up), add
  `--mcp-address <IPv4 of this Mac>`.

Android builds one ABI, `android-arm64` (phones and emulators on Apple silicon). For an x64 emulator build by
hand with `-r android-x64` (see [Building only](#building-only)). NeoAstra 1.13.2 would otherwise prepare the
page in the parallel build of every ABI into the one output folder, which fails.

### Offline or live

- `ios` and `android` package the page that `dotnet build` produced: NeoAstra runs the Vite build when
  `apps/docs/mobile`, the sources of `@cocoar/vue-ui` and `@cocoar/vue-localization`, `apps/docs/package.json`
  or the lockfile changed, validates the output and adds it to the app. The app makes no network request.
  `android` first removes the development address an interrupted dev session may have left on the device.
- `dev-ios` and `dev-android` build the Debug app, start Vite with the config of `apps/docs/mobile` on
  `http://127.0.0.1:5178/` (`--strictPort`: a busy port fails instead of moving), and start the app against it.
  Changes to the docs page and keyboard bridge arrive by hot reload; native host changes need a new session.

## Agents (MCP, Debug only)

1. Start a session: `node apps/mobile-host/scripts/mobile-host.mjs dev-ios` (or `dev-android`).
2. Give your agent the MCP server in **your own** agent configuration, not in a file of this repository (this
   folder adds none and changes no MCP configuration at the root). Its working directory is the repository
   root:

   ```json
   {
     "mcpServers": {
       "cocoar-mobile-host": {
         "command": "node",
         "args": ["apps/mobile-host/scripts/mobile-host.mjs", "mcp"]
       }
     }
   }
   ```

   Add `"env": { "DOTNET_ROOT": "<folder of the .NET 11 SDK>" }` when the default `dotnet` is another SDK.
3. The agent gets the tools of Chrome DevTools MCP (`take_snapshot`, `click`, `fill`, `take_screenshot`, …) plus
   `list_apps` and `select_app`. Without a session a call says so instead of waiting.

If CodeAlta listed the server's tools before the app connected, refresh them with
`alta mcp tool search --server cocoar-mobile-host --refresh`, then
`alta mcp activate cocoar-mobile-host`.

The app connects out to the relay of the session with a token that changes per session; a Release build has
neither the package nor the registration (`App.cs`, `CocoarMobileHost.csproj`, checked by the tests).

## Building only

From `apps/mobile-host` (so that `global.json` applies):

```sh
dotnet build -f net11.0-ios -c Debug -r iossimulator-arm64
dotnet build -f net11.0-android -c Debug            # android-arm64; add -r android-x64 for an x64 emulator
dotnet build -f net11.0-android -c Release
```

When the iOS workload refuses your Xcode version, add `-p:ValidateXcodeVersion=false` to that one command, or
export `ValidateXcodeVersion=false` for one session of the script; do not set it in the project.

## Keyboard adapter and native acceptance

The host builds and packages the page; whether the keyboard, the safe areas and the bottom sheet behave right
on a real iOS and Android device is a separate acceptance check. `keyboard-bridge.mjs` reads NeoAstra's
`--neoastra-keyboard-height` on `<html>`, initially and on `neoastrakeyboard`, and passes it to the
host-neutral `setCoarKeyboardInset()` API. This matches this host's keyboard-overlay configuration, where
the layout viewport stays unchanged. Missing/closed keyboards report 0; HMR cleanup resets the inset and
removes the listener. A host that resizes its WebView must instead report only the remaining occlusion,
not the full native keyboard height.

`vite.config.ts` adds `main.ts` only to this host's dev and packaged builds. The ordinary browser docs
continue to use `apps/docs/mobile/vite.config.ts` with no NeoAstra code. The UI library neither knows
NeoAstra's CSS variable nor listens to its events.

## Versions and licenses

- NeoAstra **1.13.2**: the `NeoAstra` and `NeoAstra.Mcp` packages (`NeoAstraVersion` in the project) and the
  `neoastra.tool` (`.config/dotnet-tools.json`) stay on the same version. .NET SDK 11.0.100 (`global.json`),
  `Xamarin.AndroidX.WebKit` 1.17.1 as in the NeoAstra template.
- `App.cs`, `Info.plist` and the files under `Platforms/` are adapted from the `neoastra-mobile` template of
  NeoAstra, which is under the BSD 2-Clause license below. The rest of this folder is under the license of this
  repository (Apache-2.0).

```text
Copyright (c) 2026, Alexandre Mutel
All rights reserved.

Redistribution and use in source and binary forms, with or without modification
, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```
