// Adapted from the neoastra-mobile template of NeoAstra 1.13.2, Copyright (c) 2026, Alexandre Mutel, BSD-2-Clause (see README.md).
using NeoAstra;

namespace Cocoar.MobileHost;

[Register("AppDelegate")]
public sealed class AppDelegate : UIApplicationDelegate
{
    public override bool FinishedLaunching(UIApplication application, NSDictionary? launchOptions) => true;

    public override UISceneConfiguration GetConfiguration(UIApplication application, UISceneSession connectingSceneSession, UISceneConnectionOptions options) =>
        new("Default Configuration", connectingSceneSession.Role);
}

/// <summary>Shows the host in the scene that connects.</summary>
[Register("SceneDelegate")]
public sealed class SceneDelegate : UIResponder, IUIWindowSceneDelegate
{
    [Export("scene:willConnectToSession:options:")]
    public async void WillConnect(UIScene scene, UISceneSession session, UISceneConnectionOptions connectionOptions)
    {
        try
        {
            await NeoApp.AttachAsync(App.Configure);
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"The mobile host could not start: {exception}");
        }
    }
}
