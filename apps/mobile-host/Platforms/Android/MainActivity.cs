// Adapted from the neoastra-mobile template of NeoAstra 1.13.2, Copyright (c) 2026, Alexandre Mutel, BSD-2-Clause (see README.md).
using Android.Content.PM;
using NeoAstra;

namespace Cocoar.MobileHost;

/// <summary>Shows the host in the activity, which a window of NeoAstra fills.</summary>
[Activity(Label = "Cocoar UI Mobile", MainLauncher = true, LaunchMode = LaunchMode.SingleTask, Theme = "@android:style/Theme.DeviceDefault.Light.NoActionBar",
    ConfigurationChanges = ConfigChanges.Orientation | ConfigChanges.ScreenSize | ConfigChanges.ScreenLayout | ConfigChanges.UiMode | ConfigChanges.Keyboard | ConfigChanges.KeyboardHidden)]
public sealed class MainActivity : Activity
{
    protected override async void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);
        try
        {
            await NeoApp.AttachAsync(App.Configure);
        }
        catch (Exception exception)
        {
            Android.Util.Log.Error("CocoarMobileHost", $"The mobile host could not start: {exception}");
        }
    }
}
