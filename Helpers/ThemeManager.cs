using System.Windows;
using ICSharpCode.AvalonEdit;
using ICSharpCode.AvalonEdit.Highlighting;
using ICSharpCode.AvalonEdit.Highlighting.Xshd;
using Microsoft.Win32;
using System.Windows.Media;
using System.Xml;

namespace MarkDawn.Helpers;

public static class ThemeManager
{
    private static bool _isDark = true;
    public static bool IsDark => _isDark;

    public static event Action? ThemeChanged;

    // ── initialise once on startup ────────────────────────────────────────────
    public static void Init()
    {
        _isDark = DetectSystemDark();
        ApplyTheme(_isDark);

        // Listen for Windows theme changes
        SystemEvents.UserPreferenceChanged += (_, e) =>
        {
            if (e.Category == UserPreferenceCategory.General)
            {
                Application.Current?.Dispatcher.Invoke(() =>
                {
                    var dark = DetectSystemDark();
                    if (dark != _isDark)
                    {
                        _isDark = dark;
                        ApplyTheme(_isDark);
                        ThemeChanged?.Invoke();
                    }
                });
            }
        };
    }

    // ── apply a ResourceDictionary swap ───────────────────────────────────────
    public static void ApplyTheme(bool dark)
    {
        _isDark = dark;
        var uri = new Uri(dark
            ? "pack://application:,,,/Themes/Dark.xaml"
            : "pack://application:,,,/Themes/Light.xaml");

        var dict = Application.Current.Resources.MergedDictionaries;
        // Remove any existing theme dict
        var existing = dict.FirstOrDefault(d => d.Source?.OriginalString.Contains("/Themes/") == true);
        if (existing is not null) dict.Remove(existing);
        dict.Insert(0, new ResourceDictionary { Source = uri });
    }

    // ── update AvalonEdit colours on theme change ─────────────────────────────
    public static void ApplyEditorTheme(TextEditor editor)
    {
        if (_isDark)
        {
            editor.Background            = new SolidColorBrush(Color.FromRgb(0x1E, 0x1E, 0x1E));
            editor.Foreground            = new SolidColorBrush(Color.FromRgb(0xD4, 0xD4, 0xD4));
            editor.LineNumbersForeground = new SolidColorBrush(Color.FromRgb(0x85, 0x85, 0x85));
        }
        else
        {
            editor.Background            = new SolidColorBrush(Color.FromRgb(0xFA, 0xFA, 0xFA));
            editor.Foreground            = new SolidColorBrush(Color.FromRgb(0x1E, 0x1E, 0x1E));
            editor.LineNumbersForeground = new SolidColorBrush(Color.FromRgb(0xAA, 0xAA, 0xAA));
        }

        // Reload syntax highlighting for this theme
        editor.SyntaxHighlighting = LoadSyntaxHighlighting(_isDark);
    }

    public static IHighlightingDefinition? LoadSyntaxHighlighting(bool dark)
    {
        // We share one XSHD file but pick colour set based on theme
        try
        {
            var uri    = new Uri("pack://application:,,,/Syntax/Markdown.xshd");
            var stream = Application.GetResourceStream(uri)?.Stream;
            if (stream is null) return null;
            using var reader = new XmlTextReader(stream);
            var def = HighlightingLoader.Load(reader, HighlightingManager.Instance);

            // Re-colour the named colours for light mode
            if (!dark)
            {
                SetColor(def, "Heading",        "#0550AE", bold: true);
                SetColor(def, "Bold",           "#953800", bold: true);
                SetColor(def, "Italic",         "#953800", italic: true);
                SetColor(def, "BoldItalic",     "#953800", bold: true, italic: true);
                SetColor(def, "InlineCode",     "#0067A3", bg: "#EEF2FF");
                SetColor(def, "CodeBlock",      "#0067A3", bg: "#F5F7FF");
                SetColor(def, "Link",           "#067A6F");
                SetColor(def, "Image",          "#067A6F");
                SetColor(def, "BlockQuote",     "#4B5563", italic: true);
                SetColor(def, "ListItem",       "#6639BA");
                SetColor(def, "HorizontalRule", "#AAAAAA");
                SetColor(def, "Strikethrough",  "#888888");
                SetColor(def, "HtmlComment",    "#5C7A29", italic: true);
            }

            return def;
        }
        catch { return null; }
    }

    private static void SetColor(IHighlightingDefinition def, string name,
        string fg, string? bg = null, bool bold = false, bool italic = false)
    {
        var color = def.GetNamedColor(name);
        if (color is null) return;
        color.Foreground = new SimpleHighlightingBrush(ParseColor(fg));
        color.Background = bg is not null ? new SimpleHighlightingBrush(ParseColor(bg)) : null;
        color.FontWeight = bold   ? System.Windows.FontWeights.Bold   : null;
        color.FontStyle  = italic ? System.Windows.FontStyles.Italic  : null;
    }

    private static Color ParseColor(string hex)
    {
        hex = hex.TrimStart('#');
        return Color.FromRgb(
            Convert.ToByte(hex[0..2], 16),
            Convert.ToByte(hex[2..4], 16),
            Convert.ToByte(hex[4..6], 16));
    }

    // ── Windows registry dark-mode detection ──────────────────────────────────
    public static bool DetectSystemDark()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            var val = key?.GetValue("AppsUseLightTheme");
            return val is int v && v == 0;
        }
        catch { return true; } // default to dark
    }
}
