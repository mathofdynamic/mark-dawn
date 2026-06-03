using System.IO;
using System.Windows;
using MarkDawn.Helpers;

namespace MarkDawn;

public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        CrashLogger.Register();
        ThemeManager.Init();      // detect system theme and load resource dict

        base.OnStartup(e);

        var window = new MainWindow();
        window.Show();

        if (e.Args.Length > 0 && File.Exists(e.Args[0]))
            window.OpenFile(e.Args[0]);
    }
}
