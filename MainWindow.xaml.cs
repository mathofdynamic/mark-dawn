using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Threading;
using ICSharpCode.AvalonEdit.Search;
using MarkDawn.Helpers;
using Microsoft.Win32;

namespace MarkDawn;

public partial class MainWindow : Window
{
    // ── state ──────────────────────────────────────────────────────────────────
    private string? _filePath;
    private bool    _isModified;
    private bool    _previewVisible = true;
    private bool    _editorVisible  = true;
    private bool    _webViewReady   = false;

    private ICSharpCode.AvalonEdit.Search.SearchPanel _searchPanel = null!;

    private readonly DispatcherTimer _previewTimer;

    // ── constructor ────────────────────────────────────────────────────────────
    public MainWindow()
    {
        InitializeComponent();

        Editor.SyntaxHighlighting = ThemeManager.LoadSyntaxHighlighting(ThemeManager.IsDark);
        ThemeManager.ApplyEditorTheme(Editor);

        _searchPanel = SearchPanel.Install(Editor);

        SetupEditorEvents();

        _previewTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(280) };
        _previewTimer.Tick += (_, _) => { _previewTimer.Stop(); _ = UpdatePreviewAsync(); };

        ThemeManager.ThemeChanged += () =>
        {
            ThemeManager.ApplyEditorTheme(Editor);
            _ = UpdatePreviewAsync();
        };

        ContentGrid.SizeChanged += ContentGrid_SizeChanged;

        Loaded += async (_, _) =>
        {
            try
            {
                await Preview.EnsureCoreWebView2Async();
                _webViewReady = true;

                // Log diagnostic state for debugging.
                WriteDiag($"WebView2 ready. Preview.Actual=({Preview.ActualWidth:F0}x{Preview.ActualHeight:F0})  " +
                          $"Editor.Actual=({Editor.ActualWidth:F0}x{Editor.ActualHeight:F0})");

                await UpdatePreviewAsync();
            }
            catch (Exception ex)
            {
                CrashLogger.Write(ex);
                Preview.Visibility = Visibility.Collapsed;
                PreviewErrorBorder.Visibility = Visibility.Visible;
                PreviewErrorMsg.Text          = ex.Message;
            }
            Editor.Focus();
        };
    }

    // ── editor events ──────────────────────────────────────────────────────────
    private void SetupEditorEvents()
    {
        Editor.TextChanged += (_, _) =>
        {
            _isModified = true;
            ModifiedBadge.Visibility = Visibility.Visible;
            TxtModified.Text         = "modified";
            UpdateTitleBar();
            UpdateStatusBar();
            _previewTimer.Stop();
            _previewTimer.Start();
        };

        Editor.TextArea.Caret.PositionChanged += (_, _) => UpdateStatusBar();

        AddEditorKey(Key.B, ModifierKeys.Control, () => InsertWrap("**", "**", "bold text"));
        AddEditorKey(Key.I, ModifierKeys.Control, () => InsertWrap("*",  "*",  "italic text"));
        AddEditorKey(Key.S, ModifierKeys.Control, () => Save_Click(this, null!));
        AddEditorKey(Key.S, ModifierKeys.Control | ModifierKeys.Shift, () => SaveAs_Click(this, null!));
        AddEditorKey(Key.O, ModifierKeys.Control, () => Open_Click(this, null!));
        AddEditorKey(Key.N, ModifierKeys.Control, () => New_Click(this, null!));
        AddEditorKey(Key.Z, ModifierKeys.Alt, () =>
        {
            MenuWordWrap.IsChecked = !MenuWordWrap.IsChecked;
            Editor.WordWrap = MenuWordWrap.IsChecked;
        });
    }

    private void AddEditorKey(Key key, ModifierKeys mod, Action action) =>
        Editor.TextArea.InputBindings.Add(
            new KeyBinding(new RelayCommand(_ => action()), key, mod));

    // ── diagnostics ──────────────────────────────────────────────────────────
    private void WriteDiag(string msg)
    {
        try
        {
            var dir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs", "mark-dawn", "logs");
            Directory.CreateDirectory(dir);
            File.AppendAllText(Path.Combine(dir, "hwnd-diag.txt"),
                $"[{DateTime.Now:HH:mm:ss.fff}] {msg}\n");
        }
        catch { }
    }

    // ── window-level key handling (F5/F6/F11/F12) ────────────────────────────
    private void Window_KeyDown(object s, KeyEventArgs e)
    {
        switch (e.Key)
        {
            case Key.F5:  TogglePreview_Click(s, null!); e.Handled = true; break;
            case Key.F6:  ToggleEditor_Click(s, null!);  e.Handled = true; break;
            case Key.F11: ToggleFocusMode();              e.Handled = true; break;
            case Key.F12: ShowDiagnosticPopup();          e.Handled = true; break;
        }
    }

    /// <summary>F12 — popup showing live layout state for debugging.</summary>
    private void ShowDiagnosticPopup()
    {
        var msg =
            $"Editor:\n" +
            $"  ActualSize = {Editor.ActualWidth:F0} x {Editor.ActualHeight:F0}\n" +
            $"  Visibility = {Editor.Visibility}\n" +
            $"  Text.Length = {Editor.Text.Length}\n" +
            $"  Foreground = {Editor.Foreground}\n" +
            $"  Background = {Editor.Background}\n\n" +
            $"Preview:\n" +
            $"  ActualSize = {Preview.ActualWidth:F0} x {Preview.ActualHeight:F0}\n" +
            $"  Visibility = {Preview.Visibility}\n" +
            $"  _webViewReady = {_webViewReady}\n\n" +
            $"Columns:\n" +
            $"  ColEditor  = {ColEditor.Width}\n" +
            $"  ColSplitter = {ColSplitter.Width}\n" +
            $"  ColPreview = {ColPreview.Width}\n\n" +
            $"Window: {ActualWidth:F0} x {ActualHeight:F0}\n" +
            $"ContentGrid: {ContentGrid.ActualWidth:F0} x {ContentGrid.ActualHeight:F0}";

        WriteDiag("F12 diagnostic:\n" + msg);
        MessageBox.Show(msg, "mark-dawn — F12 Diagnostic", MessageBoxButton.OK, MessageBoxImage.Information);
    }

    // ── preview ────────────────────────────────────────────────────────────────
    private Task UpdatePreviewAsync()
    {
        if (!_previewVisible || !_webViewReady) return Task.CompletedTask;
        try
        {
            var html = HtmlTemplate.Build(Editor.Text, _filePath, ThemeManager.IsDark);
            Preview.NavigateToString(html);
        }
        catch (Exception ex)
        {
            CrashLogger.Write(ex);
            PreviewErrorBorder.Visibility = Visibility.Visible;
            PreviewErrorMsg.Text = ex.Message;
        }
        return Task.CompletedTask;
    }

    // ── title bar ──────────────────────────────────────────────────────────────
    private void UpdateTitleBar()
    {
        var name = _filePath is not null ? Path.GetFileName(_filePath) : "Untitled";
        Title = _isModified ? $"• mark-dawn — {name}" : $"mark-dawn — {name}";
    }

    // ── status bar ─────────────────────────────────────────────────────────────
    private void UpdateStatusBar()
    {
        var caret = Editor.TextArea.Caret;
        TxtPosition.Text = $"Ln {caret.Line}  Col {caret.Column}";
        var words = Editor.Text
            .Split([' ', '\t', '\n', '\r'], StringSplitOptions.RemoveEmptyEntries).Length;
        TxtWordCount.Text = $"{words} word{(words == 1 ? "" : "s")}";
    }

    // ── file operations ────────────────────────────────────────────────────────
    public void OpenFile(string path)
    {
        try
        {
            Editor.Text  = File.ReadAllText(path);
            _filePath    = path;
            _isModified  = false;
            ModifiedBadge.Visibility = Visibility.Collapsed;
            TxtFilePath.Text = path;
            UpdateTitleBar();
            Dispatcher.BeginInvoke(new Action(() => Editor.Focus()), DispatcherPriority.Loaded);
        }
        catch (Exception ex)
        {
            CrashLogger.Write(ex);
            MessageBox.Show($"Could not open file:\n{ex.Message}", "Error",
                MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void SaveFile(string path)
    {
        File.WriteAllText(path, Editor.Text);
        _filePath   = path;
        _isModified = false;
        ModifiedBadge.Visibility = Visibility.Collapsed;
        TxtFilePath.Text = path;
        UpdateTitleBar();
    }

    private bool ConfirmDiscard()
    {
        if (!_isModified) return true;
        return MessageBox.Show("Discard unsaved changes?", "mark-dawn",
            MessageBoxButton.YesNo, MessageBoxImage.Warning) == MessageBoxResult.Yes;
    }

    // ── menu handlers ──────────────────────────────────────────────────────────
    private void New_Click(object s, RoutedEventArgs e)
    {
        if (!ConfirmDiscard()) return;
        Editor.Text              = "";
        _filePath                = null;
        _isModified              = false;
        ModifiedBadge.Visibility = Visibility.Collapsed;
        TxtFilePath.Text         = "Untitled";
        UpdateTitleBar();
        Editor.Focus();
    }

    private void Open_Click(object s, RoutedEventArgs e)
    {
        if (!ConfirmDiscard()) return;
        var dlg = new OpenFileDialog
        {
            Filter = "Markdown files (*.md;*.markdown)|*.md;*.markdown|All files (*.*)|*.*",
            Title  = "Open Markdown File"
        };
        if (dlg.ShowDialog() == true) OpenFile(dlg.FileName);
    }

    private void Save_Click(object s, RoutedEventArgs e)
    {
        if (_filePath is not null) { SaveFile(_filePath); return; }
        SaveAs_Click(s, e);
    }

    private void SaveAs_Click(object s, RoutedEventArgs e)
    {
        var dlg = new SaveFileDialog
        {
            Filter     = "Markdown files (*.md)|*.md|All files (*.*)|*.*",
            DefaultExt = ".md",
            FileName   = _filePath is not null ? Path.GetFileName(_filePath) : "Untitled.md"
        };
        if (dlg.ShowDialog() == true) SaveFile(dlg.FileName);
    }

    private void Undo_Click(object s, RoutedEventArgs e) => Editor.Undo();
    private void Redo_Click(object s, RoutedEventArgs e) => Editor.Redo();

    private void Find_Click(object s, RoutedEventArgs e)
    {
        _searchPanel.Open();
        Editor.Focus();
    }

    private void Exit_Click(object s, RoutedEventArgs e) => Close();

    private void Window_Closing(object s, System.ComponentModel.CancelEventArgs e)
    {
        if (!ConfirmDiscard()) e.Cancel = true;
    }

    private void Window_DragOver(object s, DragEventArgs e)
    {
        e.Effects = e.Data.GetDataPresent(DataFormats.FileDrop) ? DragDropEffects.Copy : DragDropEffects.None;
        e.Handled = true;
    }

    private void Window_Drop(object s, DragEventArgs e)
    {
        if (e.Data.GetData(DataFormats.FileDrop) is string[] files && files.Length > 0)
        {
            if (!ConfirmDiscard()) return;
            OpenFile(files[0]);
        }
    }

    private void RegisterAssociation_Click(object s, RoutedEventArgs e)
    {
        try
        {
            FileAssociation.Register();
            MessageBox.Show(".md files are now associated with mark-dawn.",
                "Done", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Registration failed. Try running as Administrator.\n\n{ex.Message}",
                "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    private void ForceDark_Click(object s, RoutedEventArgs e)
    {
        ThemeManager.ApplyTheme(true);
        ThemeManager.ApplyEditorTheme(Editor);
        _ = UpdatePreviewAsync();
    }

    private void ForceLight_Click(object s, RoutedEventArgs e)
    {
        ThemeManager.ApplyTheme(false);
        ThemeManager.ApplyEditorTheme(Editor);
        _ = UpdatePreviewAsync();
    }

    private void OpenLogs_Click(object s, RoutedEventArgs e)
    {
        var dir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Programs", "mark-dawn", "logs");
        Directory.CreateDirectory(dir);
        Process.Start("explorer.exe", dir);
    }

    private void About_Click(object s, RoutedEventArgs e) =>
        MessageBox.Show(
            "mark-dawn  v1.0\n\nA fast, minimal Markdown editor for Windows.\n\n" +
            "Stack: C# · WPF · WebView2 · AvalonEdit · Markdig",
            "About", MessageBoxButton.OK, MessageBoxImage.Information);

    // ── view toggles ───────────────────────────────────────────────────────────
    private void TogglePreview_Click(object s, RoutedEventArgs e)
    {
        _previewVisible   = !_previewVisible;
        ColPreview.Width  = _previewVisible ? new GridLength(1, GridUnitType.Star) : new GridLength(0);
        ColSplitter.Width = (_previewVisible && _editorVisible) ? new GridLength(5) : new GridLength(0);
        Preview.Visibility = _previewVisible ? Visibility.Visible : Visibility.Collapsed;
        if (_previewVisible) _ = UpdatePreviewAsync();
    }

    private void ToggleEditor_Click(object s, RoutedEventArgs e)
    {
        _editorVisible    = !_editorVisible;
        ColEditor.Width   = _editorVisible ? new GridLength(1, GridUnitType.Star) : new GridLength(0);
        ColSplitter.Width = (_previewVisible && _editorVisible) ? new GridLength(5) : new GridLength(0);
    }

    private void FocusMode_Click(object s, RoutedEventArgs e) => ToggleFocusMode();

    private void WordWrap_Click(object s, RoutedEventArgs e)
    {
        Editor.WordWrap = MenuWordWrap.IsChecked;
    }

    private void LineNumbers_Click(object s, RoutedEventArgs e)
    {
        Editor.ShowLineNumbers = MenuLineNumbers.IsChecked;
    }

    // ── proportional column resize ─────────────────────────────────────────────
    private void ContentGrid_SizeChanged(object sender, SizeChangedEventArgs e)
    {
        if (!e.WidthChanged) return;
        if (_editorVisible && _previewVisible &&
            ColEditor.Width.IsAbsolute && ColPreview.Width.IsAbsolute)
        {
            double editorW  = ColEditor.Width.Value;
            double previewW = ColPreview.Width.Value;
            double total    = editorW + previewW;
            if (total > 0)
            {
                double available = e.NewSize.Width - ColSplitter.Width.Value;
                if (available > 0)
                {
                    double ratio = editorW / total;
                    ColEditor.Width  = new GridLength(Math.Max(available * ratio,       0));
                    ColPreview.Width = new GridLength(Math.Max(available * (1 - ratio), 0));
                }
            }
        }
    }

    private void ToggleFocusMode()
    {
        if (WindowStyle == WindowStyle.None)
        {
            WindowStyle = WindowStyle.SingleBorderWindow;
            WindowState = WindowState.Normal;
        }
        else
        {
            WindowStyle = WindowStyle.None;
            WindowState = WindowState.Maximized;
        }
    }

    // ── formatting helpers ─────────────────────────────────────────────────────
    private void InsertWrap(string pre, string post, string placeholder = "text")
    {
        var sel    = Editor.SelectedText;
        var insert = sel.Length > 0 ? $"{pre}{sel}{post}" : $"{pre}{placeholder}{post}";
        var offset = Editor.SelectionStart;
        Editor.Document.Replace(offset, Editor.SelectionLength, insert);
        if (sel.Length == 0)
        {
            Editor.SelectionStart  = offset + pre.Length;
            Editor.SelectionLength = placeholder.Length;
        }
        Editor.Focus();
    }

    private void InsertLinePrefix(string prefix)
    {
        var line = Editor.Document.GetLineByOffset(Editor.CaretOffset);
        Editor.Document.Insert(line.Offset, prefix);
        Editor.Focus();
    }

    private void InsertBlock(string text, int caretBack = 0)
    {
        var offset = Editor.CaretOffset;
        Editor.Document.Insert(offset, text);
        if (caretBack > 0) Editor.CaretOffset = offset + text.Length - caretBack;
        Editor.Focus();
    }

    // ── toolbar click handlers ─────────────────────────────────────────────────
    private void Bold_Click   (object s, RoutedEventArgs e) => InsertWrap("**", "**", "bold text");
    private void Italic_Click (object s, RoutedEventArgs e) => InsertWrap("*",  "*",  "italic text");
    private void Strike_Click (object s, RoutedEventArgs e) => InsertWrap("~~", "~~", "strikethrough");
    private void Code_Click   (object s, RoutedEventArgs e) => InsertWrap("`",  "`",  "code");

    private void H1_Click(object s, RoutedEventArgs e) => InsertLinePrefix("# ");
    private void H2_Click(object s, RoutedEventArgs e) => InsertLinePrefix("## ");
    private void H3_Click(object s, RoutedEventArgs e) => InsertLinePrefix("### ");

    private void BulletList_Click (object s, RoutedEventArgs e) => InsertLinePrefix("- ");
    private void NumberList_Click (object s, RoutedEventArgs e) => InsertLinePrefix("1. ");
    private void Quote_Click      (object s, RoutedEventArgs e) => InsertLinePrefix("> ");

    private void HR_Click(object s, RoutedEventArgs e) => InsertBlock("\n\n---\n\n");

    private void Link_Click(object s, RoutedEventArgs e)
    {
        var sel = Editor.SelectedText;
        if (sel.Length > 0)
            InsertWrap("[", "](url)", sel);
        else
            InsertBlock("[link text](url)");
    }

    private void Image_Click(object s, RoutedEventArgs e) =>
        InsertBlock("![alt text](image-url)");

    private void CodeBlock_Click(object s, RoutedEventArgs e) =>
        InsertBlock("```\n\n```", 4);

    private void Table_Click(object s, RoutedEventArgs e) =>
        InsertBlock(
            "\n| Column 1 | Column 2 | Column 3 |\n" +
            "| -------- | -------- | -------- |\n" +
            "| Cell     | Cell     | Cell     |\n");
}

// ── minimal relay command ──────────────────────────────────────────────────────
file sealed class RelayCommand(Action<object?> execute) : ICommand
{
    public event EventHandler? CanExecuteChanged { add { } remove { } }
    public bool CanExecute(object? p) => true;
    public void Execute(object? p)    => execute(p);
}
