import { useState, useEffect } from 'react'

const FALLBACK_FONTS = [
  'Arial',
  'Calibri',
  'Cambria',
  'Cascadia Code',
  'Cascadia Mono',
  'Comic Sans MS',
  'Consolas',
  'Constantia',
  'Courier New',
  'Georgia',
  'Impact',
  'Lucida Console',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
]

const SIZE_OPTIONS = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32]

interface ToolbarProps {
  isDark: boolean
  isRtl: boolean
  scrollLinked: boolean
  fontFamily: string
  fontSize: number
  onBold: () => void
  onItalic: () => void
  onStrike: () => void
  onH1: () => void
  onH2: () => void
  onH3: () => void
  onLink: () => void
  onImage: () => void
  onCode: () => void
  onCodeBlock: () => void
  onBulletList: () => void
  onNumberList: () => void
  onQuote: () => void
  onRule: () => void
  onTable: () => void
  onFontFamilyChange: (value: string) => void
  onFontSizeChange: (value: number) => void
  onRtlToggle: () => void
  onScrollLinkToggle: () => void
  onThemeToggle: () => void
}

export default function Toolbar({
  isDark, isRtl, scrollLinked, fontFamily, fontSize,
  onBold, onItalic, onStrike,
  onH1, onH2, onH3,
  onLink, onImage,
  onCode, onCodeBlock,
  onBulletList, onNumberList, onQuote,
  onRule, onTable,
  onFontFamilyChange, onFontSizeChange, onRtlToggle, onScrollLinkToggle, onThemeToggle,
}: ToolbarProps) {
  const [systemFonts, setSystemFonts] = useState<string[]>(FALLBACK_FONTS)

  // Load system fonts using the Local Font Access API
  useEffect(() => {
    async function loadFonts() {
      try {
        if ('queryLocalFonts' in window) {
          const fonts = await (window as any).queryLocalFonts()
          const families = new Set<string>()
          for (const font of fonts) {
            families.add(font.family)
          }
          const sorted = Array.from(families).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: 'base' })
          )
          if (sorted.length > 0) {
            setSystemFonts(sorted)
          }
        }
      } catch {
        // Permission denied or API unavailable — keep fallback list
      }
    }
    loadFonts()
  }, [])

  return (
    <div className="toolbar">
      {/* Formatting buttons */}
      <button className="tb-btn" onClick={onBold} title="Bold (Ctrl+B)" style={{ fontWeight: 'bold' }}>B</button>
      <button className="tb-btn" onClick={onItalic} title="Italic (Ctrl+I)" style={{ fontStyle: 'italic' }}>I</button>
      <button className="tb-btn" onClick={onStrike} title="Strikethrough">
        <span style={{ textDecoration: 'line-through' }}>S</span>
      </button>

      <span className="tb-sep" />

      <button className="tb-btn" onClick={onH1} title="Heading 1" style={{ fontWeight: 'bold', fontSize: '11px' }}>H1</button>
      <button className="tb-btn" onClick={onH2} title="Heading 2" style={{ fontWeight: 600, fontSize: '11px' }}>H2</button>
      <button className="tb-btn" onClick={onH3} title="Heading 3" style={{ fontSize: '11px' }}>H3</button>

      <span className="tb-sep" />

      <button className="tb-btn" onClick={onLink} title="Insert link">&#128279;</button>
      <button className="tb-btn" onClick={onImage} title="Insert image">&#128444;</button>

      <span className="tb-sep" />

      <button className="tb-btn tb-code" onClick={onCode} title="Inline code">`code`</button>
      <button className="tb-btn tb-code" onClick={onCodeBlock} title="Code block" style={{ fontSize: '11px' }}>```</button>

      <span className="tb-sep" />

      <button className="tb-btn" onClick={onBulletList} title="Bullet list">&#8226; List</button>
      <button className="tb-btn" onClick={onNumberList} title="Ordered list">1. List</button>
      <button className="tb-btn" onClick={onQuote} title="Blockquote">&#10078; Quote</button>

      <span className="tb-sep" />

      <button className="tb-btn" onClick={onRule} title="Horizontal rule">&#9472; Rule</button>
      <button className="tb-btn" onClick={onTable} title="Insert table">&#8862; Table</button>

      {/* Settings section — pushed to the right */}
      <div className="tb-settings">
        <select
          className="tb-select"
          value={fontFamily}
          onChange={e => onFontFamilyChange(e.target.value)}
          title="Font family"
        >
          {systemFonts.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <select
          className="tb-select tb-select-narrow"
          value={fontSize}
          onChange={e => onFontSizeChange(Number(e.target.value))}
          title="Font size"
        >
          {SIZE_OPTIONS.map(s => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>

        <button
          className={`tb-btn tb-toggle ${scrollLinked ? 'tb-active' : ''}`}
          onClick={onScrollLinkToggle}
          title={scrollLinked ? 'Scroll sync ON — click to unlink' : 'Scroll sync OFF — click to link'}
        >
          Sync
        </button>

        <button
          className={`tb-btn tb-toggle ${isRtl ? 'tb-active' : ''}`}
          onClick={onRtlToggle}
          title="Toggle RTL / LTR"
        >
          {isRtl ? 'RTL' : 'LTR'}
        </button>

        <button
          className="tb-btn tb-toggle"
          onClick={onThemeToggle}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? '☀' : '🌙'}
        </button>
      </div>
    </div>
  )
}
