import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, undo, redo } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { searchKeymap, openSearchPanel } from '@codemirror/search'
import { tags } from '@lezer/highlight'
import '../styles/editor.css'

// ── Syntax highlight styles ──

const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: '#569CD6', fontWeight: 'bold' },
  { tag: tags.strong, color: '#CE9178', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#CE9178', fontStyle: 'italic' },
  { tag: tags.monospace, color: '#9CDCFE', backgroundColor: '#2A2A2A' },
  { tag: tags.link, color: '#4EC9B0' },
  { tag: tags.url, color: '#4EC9B0' },
  { tag: tags.quote, color: '#608B4E', fontStyle: 'italic' },
  { tag: tags.list, color: '#DCDCAA' },
  { tag: tags.strikethrough, color: '#808080' },
  { tag: tags.comment, color: '#6A9955', fontStyle: 'italic' },
  { tag: tags.meta, color: '#569CD6' },
  { tag: tags.processingInstruction, color: '#9CDCFE', backgroundColor: '#2A2A2A' },
])

const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: '#0550AE', fontWeight: 'bold' },
  { tag: tags.strong, color: '#953800', fontWeight: 'bold' },
  { tag: tags.emphasis, color: '#953800', fontStyle: 'italic' },
  { tag: tags.monospace, color: '#0067A3', backgroundColor: '#EEF2FF' },
  { tag: tags.link, color: '#067A6F' },
  { tag: tags.url, color: '#067A6F' },
  { tag: tags.quote, color: '#4B5563', fontStyle: 'italic' },
  { tag: tags.list, color: '#6639BA' },
  { tag: tags.strikethrough, color: '#888888' },
  { tag: tags.comment, color: '#5C7A29', fontStyle: 'italic' },
  { tag: tags.meta, color: '#0550AE' },
  { tag: tags.processingInstruction, color: '#0067A3', backgroundColor: '#EEF2FF' },
])

// ── Base editor themes (colors only, no font) ──

const darkEditorTheme = EditorView.theme({
  '&': { backgroundColor: '#1E1E1E', color: '#D4D4D4' },
  '.cm-cursor': { borderLeftColor: '#D4D4D4' },
  '.cm-gutters': { backgroundColor: '#1E1E1E', color: '#858585', borderRight: '1px solid #3C3C3C' },
  '.cm-activeLine': { backgroundColor: '#2A2A2A' },
  '.cm-activeLineGutter': { backgroundColor: '#2A2A2A' },
  '.cm-panels': { backgroundColor: '#252526', color: '#D4D4D4' },
  '.cm-panels input': { backgroundColor: '#3C3C3C', color: '#D4D4D4', border: '1px solid #555' },
  '.cm-panels button': { backgroundColor: '#3C3C3C', color: '#D4D4D4', border: '1px solid #555' },
  '.cm-search label': { color: '#D4D4D4' },
  '.cm-searchMatch': { backgroundColor: '#515C6A' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#264F78' },
  // Native selection styling (no drawSelection overlay)
  '.cm-content ::selection': { backgroundColor: '#264F78' },
  '.cm-content ::-moz-selection': { backgroundColor: '#264F78' },
  '.cm-line ::selection': { backgroundColor: '#264F78' },
  '.cm-line ::-moz-selection': { backgroundColor: '#264F78' },
}, { dark: true })

const lightEditorTheme = EditorView.theme({
  '&': { backgroundColor: '#FAFAFA', color: '#1E1E1E' },
  '.cm-cursor': { borderLeftColor: '#1E1E1E' },
  '.cm-gutters': { backgroundColor: '#FAFAFA', color: '#AAAAAA', borderRight: '1px solid #DCDCDC' },
  '.cm-activeLine': { backgroundColor: '#F0F0F0' },
  '.cm-activeLineGutter': { backgroundColor: '#F0F0F0' },
  '.cm-panels': { backgroundColor: '#F3F3F3', color: '#1E1E1E' },
  '.cm-panels input': { backgroundColor: '#FFFFFF', color: '#1E1E1E', border: '1px solid #DCDCDC' },
  '.cm-panels button': { backgroundColor: '#FFFFFF', color: '#1E1E1E', border: '1px solid #DCDCDC' },
  '.cm-search label': { color: '#1E1E1E' },
  '.cm-searchMatch': { backgroundColor: '#E8E8E8' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#ADD6FF' },
  // Native selection styling (no drawSelection overlay)
  '.cm-content ::selection': { backgroundColor: '#ADD6FF' },
  '.cm-content ::-moz-selection': { backgroundColor: '#ADD6FF' },
  '.cm-line ::selection': { backgroundColor: '#ADD6FF' },
  '.cm-line ::-moz-selection': { backgroundColor: '#ADD6FF' },
}, { dark: false })

// ── Helper: build a font theme ──

function buildFontTheme(fontFamily: string, fontSize: number) {
  // Wrap font name in quotes if it contains spaces, add generic fallback
  const quoted = fontFamily.includes(',') ? fontFamily : `"${fontFamily}"`
  const stack = `${quoted}, Consolas, "Courier New", monospace`
  return EditorView.theme({
    '.cm-content': {
      fontFamily: stack,
      fontSize: fontSize + 'px',
      caretColor: 'inherit',
    },
    '.cm-gutters': {
      fontSize: Math.max(fontSize - 1, 10) + 'px',
    },
  })
}

// ── Editor handle for parent ──

export interface EditorHandle {
  insertWrap: (prefix: string, suffix: string, placeholder: string) => void
  insertLinePrefix: (prefix: string) => void
  insertBlock: (text: string, caretBack?: number) => void
  undo: () => void
  redo: () => void
  openSearch: () => void
  setContent: (text: string) => void
  getContent: () => string
  focus: () => void
  scrollToTop: () => void
  scrollToLine: (line: number) => void
}

interface EditorProps {
  content: string
  isDark: boolean
  wordWrap: boolean
  showLineNumbers: boolean
  isRtl: boolean
  fontFamily: string
  fontSize: number
  onChange: (value: string) => void
  onCursorChange: (line: number, col: number) => void
  onScroll?: (topLine: number) => void
}

const Editor = forwardRef<EditorHandle, EditorProps>(({
  content, isDark, wordWrap, showLineNumbers, isRtl, fontFamily, fontSize, onChange, onCursorChange, onScroll
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const ignoreScrollRef = useRef(false)
  const onScrollRef = useRef(onScroll)
  onScrollRef.current = onScroll
  const themeCompartment = useRef(new Compartment())
  const highlightCompartment = useRef(new Compartment())
  const wrapCompartment = useRef(new Compartment())
  const lineNumCompartment = useRef(new Compartment())
  const dirCompartment = useRef(new Compartment())
  const fontCompartment = useRef(new Compartment())
  const onChangeRef = useRef(onChange)
  const onCursorChangeRef = useRef(onCursorChange)

  onChangeRef.current = onChange
  onCursorChangeRef.current = onCursorChange

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head
        const line = update.state.doc.lineAt(pos)
        onCursorChangeRef.current(line.number, pos - line.from + 1)
      }
    })

    const state = EditorState.create({
      doc: content,
      extensions: [
        themeCompartment.current.of(isDark ? darkEditorTheme : lightEditorTheme),
        highlightCompartment.current.of(
          syntaxHighlighting(isDark ? darkHighlightStyle : lightHighlightStyle)
        ),
        wrapCompartment.current.of(wordWrap ? EditorView.lineWrapping : []),
        lineNumCompartment.current.of(showLineNumbers ? lineNumbers() : []),
        dirCompartment.current.of(
          EditorView.editorAttributes.of({ dir: isRtl ? 'rtl' : 'ltr' })
        ),
        fontCompartment.current.of(buildFontTheme(fontFamily, fontSize)),
        // Bidi text support — fixes word selection for RTL scripts
        EditorView.perLineTextDirection.of(true),
        history(),
        highlightActiveLine(),
        highlightSpecialChars(),
        markdown({ codeLanguages: languages }),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
        ]),
        updateListener,
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    // Scroll sync: report top visible line number
    const scrollDOM = view.scrollDOM
    const handleScroll = () => {
      if (ignoreScrollRef.current) return
      try {
        const block = view.lineBlockAtHeight(scrollDOM.scrollTop)
        const line = view.state.doc.lineAt(block.from)
        // Compute fractional position within this block for smooth interpolation
        const frac = block.height > 0
          ? Math.max(0, Math.min(1, (scrollDOM.scrollTop - block.top) / block.height))
          : 0
        onScrollRef.current?.(line.number + frac)
      } catch {
        // Ignore errors during rapid scrolling
      }
    }
    scrollDOM.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      scrollDOM.removeEventListener('scroll', handleScroll)
      view.destroy()
      viewRef.current = null
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update theme
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: [
        themeCompartment.current.reconfigure(isDark ? darkEditorTheme : lightEditorTheme),
        highlightCompartment.current.reconfigure(
          syntaxHighlighting(isDark ? darkHighlightStyle : lightHighlightStyle)
        ),
      ],
    })
  }, [isDark])

  // Update word wrap
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: wrapCompartment.current.reconfigure(wordWrap ? EditorView.lineWrapping : []),
    })
  }, [wordWrap])

  // Update line numbers
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: lineNumCompartment.current.reconfigure(showLineNumbers ? lineNumbers() : []),
    })
  }, [showLineNumbers])

  // Update direction
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: dirCompartment.current.reconfigure(
        EditorView.editorAttributes.of({ dir: isRtl ? 'rtl' : 'ltr' })
      ),
    })
  }, [isRtl])

  // Update font
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: fontCompartment.current.reconfigure(buildFontTheme(fontFamily, fontSize)),
    })
  }, [fontFamily, fontSize])

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    insertWrap(prefix: string, suffix: string, placeholder: string) {
      const view = viewRef.current
      if (!view) return
      const { from, to } = view.state.selection.main
      const selected = view.state.sliceDoc(from, to)
      if (selected.length > 0) {
        view.dispatch({
          changes: { from, to, insert: prefix + selected + suffix },
          selection: { anchor: from + prefix.length, head: from + prefix.length + selected.length },
        })
      } else {
        const insert = prefix + placeholder + suffix
        view.dispatch({
          changes: { from, to, insert },
          selection: { anchor: from + prefix.length, head: from + prefix.length + placeholder.length },
        })
      }
      view.focus()
    },

    insertLinePrefix(prefix: string) {
      const view = viewRef.current
      if (!view) return
      const pos = view.state.selection.main.head
      const line = view.state.doc.lineAt(pos)
      view.dispatch({
        changes: { from: line.from, to: line.from, insert: prefix },
      })
      view.focus()
    },

    insertBlock(text: string, caretBack = 0) {
      const view = viewRef.current
      if (!view) return
      const pos = view.state.selection.main.head
      view.dispatch({
        changes: { from: pos, insert: text },
        selection: { anchor: pos + text.length - caretBack },
      })
      view.focus()
    },

    undo() {
      const view = viewRef.current
      if (!view) return
      undo(view)
    },

    redo() {
      const view = viewRef.current
      if (!view) return
      redo(view)
    },

    openSearch() {
      const view = viewRef.current
      if (!view) return
      openSearchPanel(view)
    },

    setContent(text: string) {
      const view = viewRef.current
      if (!view) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      })
    },

    getContent() {
      const view = viewRef.current
      if (!view) return ''
      return view.state.doc.toString()
    },

    focus() {
      viewRef.current?.focus()
    },

    scrollToTop() {
      const view = viewRef.current
      if (!view) return
      view.dispatch({
        selection: { anchor: 0 },
        scrollIntoView: true,
      })
    },

    scrollToLine(targetLine: number) {
      const view = viewRef.current
      if (!view) return
      const lineCount = view.state.doc.lines
      const lineNum = Math.max(1, Math.min(Math.floor(targetLine), lineCount))
      const frac = targetLine - lineNum

      const line = view.state.doc.line(lineNum)
      const block = view.lineBlockAt(line.from)

      let scrollTo = block.top
      // Interpolate with next line for smooth sub-line positioning
      if (frac > 0 && lineNum < lineCount) {
        const nextLine = view.state.doc.line(lineNum + 1)
        const nextBlock = view.lineBlockAt(nextLine.from)
        scrollTo += frac * (nextBlock.top - block.top)
      }

      ignoreScrollRef.current = true
      view.scrollDOM.scrollTop = scrollTo
      requestAnimationFrame(() => { ignoreScrollRef.current = false })
    },
  }))

  return <div ref={containerRef} className="editor-container" />
})

Editor.displayName = 'Editor'

export default Editor
