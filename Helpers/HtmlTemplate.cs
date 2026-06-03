using Markdig;

namespace MarkDawn.Helpers;

internal static class HtmlTemplate
{
    private static readonly MarkdownPipeline Pipeline = new MarkdownPipelineBuilder()
        .UseAdvancedExtensions()
        .Build();

    public static string Build(string markdown, string? filePath, bool dark = true)
    {
        var body    = Markdown.ToHtml(markdown, Pipeline);
        var baseTag = filePath is not null
            ? $"<base href=\"file:///{filePath.Replace('\\', '/').TrimStart('/')}/\">"
            : "";

        // Colours driven by the dark parameter; also honour OS prefers-color-scheme
        // so the WebView2 respects system-level overrides even if the app overrides.
        var (bg, fg, link, codeBg, preBg, borderCol, blockquoteBorder, hColor, thBg, trAlt) =
            dark
            ? ("#1e1e1e", "#d4d4d4", "#4ec9b0", "#252526", "#1a1a1a", "#3c3c3c", "#569cd6", "#569cd6", "#2d2d2d", "#252526")
            : ("#ffffff", "#1e1e1e", "#0550ae", "#f0f4ff", "#f6f8fa", "#e0e0e0", "#0550ae", "#0550ae", "#f3f3f3", "#fafafa");

        return $$"""
            <!DOCTYPE html>
            <html lang="en" data-theme="{{(dark ? "dark" : "light")}}">
            <head>
              <meta charset="utf-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1"/>
              {{baseTag}}
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html { scroll-behavior: smooth; }

                body {
                  background:  {{bg}};
                  color:       {{fg}};
                  font-family: -apple-system, "Segoe UI Variable", "Segoe UI", Roboto, sans-serif;
                  font-size:   15px;
                  line-height: 1.8;
                  max-width:   800px;
                  margin:      0 auto;
                  padding:     32px 36px 72px;
                  -webkit-font-smoothing: antialiased;
                }

                /* ── Headings ── */
                h1, h2, h3, h4, h5, h6 {
                  color:         {{hColor}};
                  font-weight:   600;
                  line-height:   1.3;
                  margin-top:    1.8em;
                  margin-bottom: 0.5em;
                }
                h1 { font-size: 2em;    border-bottom: 1px solid {{borderCol}}; padding-bottom: 0.3em; }
                h2 { font-size: 1.5em;  border-bottom: 1px solid {{borderCol}}; padding-bottom: 0.25em; }
                h3 { font-size: 1.2em; }
                h4 { font-size: 1em;   color: {{fg}}; }

                /* ── Paragraph / text ── */
                p { margin: 0.75em 0; }

                a { color: {{link}}; text-decoration: none; }
                a:hover { text-decoration: underline; }

                strong { font-weight: 600; }
                em     { font-style: italic; }
                del    { opacity: 0.55; }

                /* ── Code ── */
                code {
                  background:    {{codeBg}};
                  border-radius: 4px;
                  font-family:   "Cascadia Code", "Cascadia Mono", Consolas, "Courier New", monospace;
                  font-size:     0.875em;
                  padding:       0.15em 0.45em;
                }
                pre {
                  background:    {{preBg}};
                  border:        1px solid {{borderCol}};
                  border-radius: 8px;
                  overflow-x:    auto;
                  padding:       16px 20px;
                  margin:        1em 0;
                }
                pre code {
                  background: transparent;
                  font-size:  0.9em;
                  padding:    0;
                }

                /* ── Blockquote ── */
                blockquote {
                  border-left: 4px solid {{blockquoteBorder}};
                  color:       {{fg}};
                  opacity:     0.75;
                  font-style:  italic;
                  margin:      1em 0;
                  padding:     0.5em 1.25em;
                }
                blockquote p { margin: 0; }

                /* ── Tables ── */
                table {
                  border-collapse: collapse;
                  margin:          1.2em 0;
                  width:           100%;
                  font-size:       0.95em;
                }
                th {
                  background:  {{thBg}};
                  font-weight: 600;
                  padding:     9px 14px;
                  text-align:  left;
                  border:      1px solid {{borderCol}};
                }
                td {
                  padding: 8px 14px;
                  border:  1px solid {{borderCol}};
                }
                tr:nth-child(even) td { background: {{trAlt}}; }

                /* ── Lists ── */
                ul, ol { padding-left: 1.75em; margin: 0.5em 0; }
                li { margin: 0.3em 0; }
                li input[type=checkbox] { margin-right: 0.5em; }
                .task-list-item {
                  list-style: none;
                  margin-left: -1.75em;
                  padding-left: 1.75em;
                }

                /* ── Images ── */
                img {
                  border-radius: 6px;
                  max-width: 100%;
                  display: block;
                  margin: 1em 0;
                }

                /* ── HR ── */
                hr {
                  border:     none;
                  border-top: 1px solid {{borderCol}};
                  margin:     2em 0;
                }

                /* ── Scrollbar (WebView2 / Chromium) ── */
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb {
                  background:    {{borderCol}};
                  border-radius: 4px;
                }
              </style>
            </head>
            <body>
            {{body}}
            </body>
            </html>
            """;
    }
}
