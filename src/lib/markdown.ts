import { marked } from 'marked'

// Configure marked with GFM
marked.setOptions({
  gfm: true,
  breaks: false,
})

/**
 * Render markdown to HTML with data-line attributes on block elements
 * for line-based scroll synchronization.
 */
export function renderMarkdown(markdown: string): string {
  const tokens = marked.lexer(markdown)
  const links = (tokens as any).links || {}

  let line = 1
  let html = ''

  for (const token of tokens) {
    const startLine = line
    // Advance line counter by counting newlines in this token's raw text
    const raw = token.raw || ''
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '\n') line++
    }

    if (token.type === 'space') continue

    // Render this single token (preserve links context for reference-style links)
    const batch = [token] as any
    batch.links = links
    const blockHtml = marked.parser(batch) as string

    // Inject data-line attribute into the first opening HTML tag
    html += blockHtml.replace(/^<(\w+)/, `<$1 data-line="${startLine}"`)
  }

  return html
}

interface PreviewOptions {
  isDark: boolean
  isRtl?: boolean
  fontFamily?: string
  fontSize?: number
}

export function buildPreviewHtml(bodyHtml: string, options: PreviewOptions): string {
  const { isDark, isRtl = false, fontFamily, fontSize } = options

  const [bg, fg, link, codeBg, preBg, borderCol, blockquoteBorder, hColor, thBg, trAlt] =
    isDark
      ? ['#1e1e1e', '#d4d4d4', '#4ec9b0', '#252526', '#1a1a1a', '#3c3c3c', '#569cd6', '#569cd6', '#2d2d2d', '#252526']
      : ['#ffffff', '#1e1e1e', '#0550ae', '#f0f4ff', '#f6f8fa', '#e0e0e0', '#0550ae', '#0550ae', '#f3f3f3', '#fafafa']

  const dirAttr = isRtl ? ' dir="rtl"' : ''
  const directionCss = isRtl ? 'direction: rtl; text-align: right;' : ''

  // Use custom font if provided, otherwise default
  const defaultFont = '-apple-system, "Segoe UI Variable", "Segoe UI", Roboto, sans-serif'
  const fontFamilyCss = fontFamily
    ? `"${fontFamily}", ${defaultFont}`
    : defaultFont
  const fontSizeCss = fontSize ? `${fontSize}px` : '15px'

  return `<!DOCTYPE html>
<html lang="en"${dirAttr} data-theme="${isDark ? 'dark' : 'light'}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background:  ${bg};
      color:       ${fg};
      font-family: ${fontFamilyCss};
      font-size:   ${fontSizeCss};
      line-height: 1.8;
      max-width:   800px;
      margin:      0 auto;
      padding:     32px 36px 72px;
      -webkit-font-smoothing: antialiased;
      ${directionCss}
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      color:         ${hColor};
      font-weight:   600;
      line-height:   1.3;
      margin-top:    1.8em;
      margin-bottom: 0.5em;
    }
    h1 { font-size: 2em;    border-bottom: 1px solid ${borderCol}; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em;  border-bottom: 1px solid ${borderCol}; padding-bottom: 0.25em; }
    h3 { font-size: 1.2em; }
    h4 { font-size: 1em;   color: ${fg}; }

    /* Paragraph / text */
    p { margin: 0.75em 0; }

    a { color: ${link}; text-decoration: none; }
    a:hover { text-decoration: underline; }

    strong { font-weight: 600; }
    em     { font-style: italic; }
    del    { opacity: 0.55; }

    /* Code */
    code {
      background:    ${codeBg};
      border-radius: 4px;
      font-family:   "Cascadia Code", "Cascadia Mono", Consolas, "Courier New", monospace;
      font-size:     0.875em;
      padding:       0.15em 0.45em;
    }
    pre {
      background:    ${preBg};
      border:        1px solid ${borderCol};
      border-radius: 8px;
      overflow-x:    auto;
      padding:       16px 20px;
      margin:        1em 0;
      direction:     ltr;
      text-align:    left;
    }
    pre code {
      background: transparent;
      font-size:  0.9em;
      padding:    0;
    }

    /* Blockquote */
    blockquote {
      border-${isRtl ? 'right' : 'left'}: 4px solid ${blockquoteBorder};
      color:       ${fg};
      opacity:     0.75;
      font-style:  italic;
      margin:      1em 0;
      padding:     0.5em 1.25em;
    }
    blockquote p { margin: 0; }

    /* Tables */
    table {
      border-collapse: collapse;
      margin:          1.2em 0;
      width:           100%;
      font-size:       0.95em;
    }
    th {
      background:  ${thBg};
      font-weight: 600;
      padding:     9px 14px;
      text-align:  ${isRtl ? 'right' : 'left'};
      border:      1px solid ${borderCol};
    }
    td {
      padding: 8px 14px;
      border:  1px solid ${borderCol};
    }
    tr:nth-child(even) td { background: ${trAlt}; }

    /* Lists */
    ul, ol { padding-${isRtl ? 'right' : 'left'}: 1.75em; margin: 0.5em 0; }
    li { margin: 0.3em 0; }
    li input[type=checkbox] { margin-${isRtl ? 'left' : 'right'}: 0.5em; }
    .task-list-item {
      list-style: none;
      margin-${isRtl ? 'right' : 'left'}: -1.75em;
      padding-${isRtl ? 'right' : 'left'}: 1.75em;
    }

    /* Images */
    img {
      border-radius: 6px;
      max-width: 100%;
      display: block;
      margin: 1em 0;
    }

    /* HR */
    hr {
      border:     none;
      border-top: 1px solid ${borderCol};
      margin:     2em 0;
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background:    ${borderCol};
      border-radius: 4px;
    }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`
}
