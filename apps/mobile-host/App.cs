// Adapted from the neoastra-mobile template of NeoAstra 1.13.2, Copyright (c) 2026, Alexandre Mutel, BSD-2-Clause (see README.md).
using NeoAstra;
#if DEBUG
using NeoAstra.Mcp;
#endif

namespace Cocoar.MobileHost;

/// <summary>
/// The host, the same on iOS and Android: one window with the mobile documentation. It offers the page no RPC services and
/// no capabilities; the page is the unchanged web app of apps/docs/mobile.
/// </summary>
internal static class App
{
    public static void Configure(NeoAppBuilder app)
    {
        app.Title = "Cocoar UI Mobile";
        // NeoApp requires a contract even for a page with no RPC services. No generator runs for an
        // empty contract, so register it explicitly without handlers or permissions.
        app.ConfigureGeneratedRpc("cocoar-mobile-host-empty-v1", [], static _ => { });
#if DEBUG
        // In a `dotnet neoastra dev` session, an agent reaches the page through `dotnet neoastra mcp`; outside a session the
        // plugin does nothing. Release builds neither reference nor register it.
        app.UsePlugins((_, plugins) => plugins.AddNeoAstraMcp());
#endif
    }
}
