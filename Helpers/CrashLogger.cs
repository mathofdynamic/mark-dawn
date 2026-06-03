using System.IO;
using System.Windows;

namespace MarkDawn.Helpers;

internal static class CrashLogger
{
    private static readonly string LogDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "Programs", "mark-dawn", "logs");

    // One-shot guards — once set, no more writing or dialogs.
    private static volatile bool _written  = false;
    private static volatile bool _dialogUp = false;

    public static void Register()
    {
        AppDomain.CurrentDomain.UnhandledException += OnUnhandled;

        System.Windows.Threading.Dispatcher.CurrentDispatcher.UnhandledException +=
            (_, e) =>
            {
                e.Handled = true;          // keep dispatcher alive
                OnException(e.Exception);
            };
    }

    private static void OnUnhandled(object sender, UnhandledExceptionEventArgs e)
    {
        var ex = e.ExceptionObject as Exception
                 ?? new Exception(e.ExceptionObject?.ToString() ?? "Unknown error");
        OnException(ex);
    }

    private static void OnException(Exception ex)
    {
        // Silently swallow known rendering errors that are recoverable.
        // (AvalonEdit syntax highlight rules; caller must disable highlighting.)
        if (ex.Message.Contains("highlighting rule matched 0 characters"))
            return;

        if (!_written)
        {
            _written = true;
            Write(ex);
        }

        if (!_dialogUp)
        {
            _dialogUp = true;
            ShowDialog(ex);
        }
    }

    public static void Write(Exception ex)
    {
        try
        {
            Directory.CreateDirectory(LogDir);
            var stamp   = DateTime.Now.ToString("yyyy-MM-dd_HH-mm-ss-fff");
            var logPath = Path.Combine(LogDir, $"crash_{stamp}.log");

            var lines = new[]
            {
                "mark-dawn crash report",
                $"Time    : {DateTime.Now:yyyy-MM-dd HH:mm:ss}",
                $"Runtime : {System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription}",
                "",
                $"[{ex.GetType().FullName}]",
                ex.Message,
                ex.StackTrace ?? "(no stack trace)"
            };
            File.WriteAllLines(logPath, lines);
            LastLogPath = logPath;
        }
        catch { /* never crash the crash handler */ }
    }

    public static string? LastLogPath { get; private set; }

    private static void ShowDialog(Exception ex)
    {
        try
        {
            var logInfo = LastLogPath is not null
                ? $"\n\nCrash log:\n{LastLogPath}"
                : "";

            MessageBox.Show(
                $"mark-dawn encountered an error and needs to close.\n\n" +
                $"{ex.GetType().Name}: {ex.Message}" +
                logInfo,
                "mark-dawn — Error",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
        finally
        {
            try { Application.Current?.Dispatcher.Invoke(
                () => Application.Current?.Shutdown()); } catch { }
        }
    }
}
