using Microsoft.Win32;

namespace MarkDawn.Helpers;

/// <summary>Registers mark-dawn as the default opener for .md and .markdown files.</summary>
internal static class FileAssociation
{
    private const string ProgId = "MarkDawn.mdfile";

    public static void Register()
    {
        var exe = Environment.ProcessPath
                  ?? System.Reflection.Assembly.GetExecutingAssembly().Location;

        // 1. Register the ProgID
        using (var progId = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ProgId}"))
        {
            progId.SetValue("", "Markdown Document");
            using var icon = progId.CreateSubKey("DefaultIcon");
            icon.SetValue("", $"\"{exe}\",0");

            using var open   = progId.CreateSubKey(@"shell\open");
            open.SetValue("", "Open with mark-dawn");
            using var cmd = open.CreateSubKey("command");
            cmd.SetValue("", $"\"{exe}\" \"%1\"");
        }

        // 2. Associate .md
        AssociateExtension(".md");
        AssociateExtension(".markdown");

        // 3. Notify the shell
        NativeMethods.SHChangeNotify(0x08000000, 0x0000, IntPtr.Zero, IntPtr.Zero);
    }

    private static void AssociateExtension(string ext)
    {
        using var extKey = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{ext}");
        extKey.SetValue("", ProgId);
    }
}

internal static class NativeMethods
{
    [System.Runtime.InteropServices.DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
