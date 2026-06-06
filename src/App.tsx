import { useState, useEffect, useRef, useCallback } from 'react'
import Split from 'split.js'
import Editor, { EditorHandle } from './components/Editor'
import Preview, { PreviewHandle } from './components/Preview'
import Toolbar from './components/Toolbar'
import StatusBar from './components/StatusBar'
import { useTheme } from './hooks/useTheme'
import { renderMarkdown } from './lib/markdown'

export default function App() {
  const { isDark, forceDark, forceLight } = useTheme()
  const editorRef = useRef<EditorHandle>(null)
  const previewRef = useRef<PreviewHandle>(null)

  // ── Scroll sync ──
  const [scrollLinked, setScrollLinked] = useState(true)
  const scrollLinkedRef = useRef(scrollLinked)
  scrollLinkedRef.current = scrollLinked
  const scrollSourceRef = useRef<'editor' | 'preview' | null>(null)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleEditorScroll = useCallback((topLine: number) => {
    if (!scrollLinkedRef.current) return
    if (scrollSourceRef.current === 'preview') return
    scrollSourceRef.current = 'editor'
    previewRef.current?.scrollToLine(topLine)
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(() => { scrollSourceRef.current = null }, 16)
  }, [])

  const handlePreviewScroll = useCallback((topLine: number) => {
    if (!scrollLinkedRef.current) return
    if (scrollSourceRef.current === 'editor') return
    scrollSourceRef.current = 'preview'
    editorRef.current?.scrollToLine(topLine)
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    scrollTimeoutRef.current = setTimeout(() => { scrollSourceRef.current = null }, 16)
  }, [])

  // ── State ──
  const [filePath, setFilePath] = useState<string | null>(null)
  const [content, setContent] = useState('')
  const [isModified, setIsModified] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(true)
  const [editorVisible, setEditorVisible] = useState(true)
  const [wordWrap, setWordWrap] = useState(true)
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorCol, setCursorCol] = useState(1)
  const [wordCount, setWordCount] = useState(0)
  const [previewHtml, setPreviewHtml] = useState('')

  // ── New settings state ──
  const [isRtl, setIsRtl] = useState(false)
  const [fontFamily, setFontFamily] = useState('Consolas')
  const [fontSize, setFontSize] = useState(14)

  // Refs for callbacks that need current state
  const contentRef = useRef(content)
  const filePathRef = useRef(filePath)
  const isModifiedRef = useRef(isModified)
  contentRef.current = content
  filePathRef.current = filePath
  isModifiedRef.current = isModified

  // ── Preview debounce ──
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePreview = useCallback((text: string) => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => {
      setPreviewHtml(renderMarkdown(text))
    }, 280)
  }, [])

  // ── Content change handler ──
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    setIsModified(true)

    // Word count
    const words = newContent.trim()
      ? newContent.trim().split(/\s+/).length
      : 0
    setWordCount(words)

    updatePreview(newContent)
  }, [updatePreview])

  // ── Cursor change handler ──
  const handleCursorChange = useCallback((line: number, col: number) => {
    setCursorLine(line)
    setCursorCol(col)
  }, [])

  // ── Title bar ──
  useEffect(() => {
    const name = filePath ? filePath.replace(/^.*[\\/]/, '') : 'Untitled'
    document.title = `${isModified ? '• ' : ''}mark-dawn — ${name}`
  }, [filePath, isModified])

  // ── Initial preview ──
  useEffect(() => {
    setPreviewHtml(renderMarkdown(content))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── File operations ──
  const confirmDiscard = useCallback(async () => {
    if (!isModifiedRef.current) return true
    return await window.electronAPI.confirmDiscard()
  }, [])

  const openFile = useCallback(async (path: string) => {
    const text = await window.electronAPI.readFile(path)
    editorRef.current?.setContent(text)
    setContent(text)
    setFilePath(path)
    setIsModified(false)
    setPreviewHtml(renderMarkdown(text))
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0)
    editorRef.current?.scrollToTop()
    editorRef.current?.focus()
  }, [])

  const handleNew = useCallback(async () => {
    if (!await confirmDiscard()) return
    editorRef.current?.setContent('')
    setContent('')
    setFilePath(null)
    setIsModified(false)
    setPreviewHtml(renderMarkdown(''))
    setWordCount(0)
    editorRef.current?.focus()
  }, [confirmDiscard])

  const handleOpen = useCallback(async () => {
    if (!await confirmDiscard()) return
    const path = await window.electronAPI.openFileDialog()
    if (path) await openFile(path)
  }, [confirmDiscard, openFile])

  const handleSave = useCallback(async () => {
    if (filePathRef.current) {
      await window.electronAPI.saveFile(filePathRef.current, contentRef.current)
      setIsModified(false)
    } else {
      // Save As
      const name = 'Untitled.md'
      const path = await window.electronAPI.saveFileDialog(name)
      if (path) {
        await window.electronAPI.saveFile(path, contentRef.current)
        setFilePath(path)
        setIsModified(false)
      }
    }
  }, [])

  const handleSaveAs = useCallback(async () => {
    const defaultName = filePathRef.current
      ? filePathRef.current.replace(/^.*[\\/]/, '')
      : 'Untitled.md'
    const path = await window.electronAPI.saveFileDialog(defaultName)
    if (path) {
      await window.electronAPI.saveFile(path, contentRef.current)
      setFilePath(path)
      setIsModified(false)
    }
  }, [])

  // ── Theme toggle ──
  const handleThemeToggle = useCallback(() => {
    if (isDark) forceLight()
    else forceDark()
  }, [isDark, forceDark, forceLight])

  // ── Menu action handler ──
  useEffect(() => {
    const cleanup = window.electronAPI.onMenuAction(async (action: string) => {
      switch (action) {
        case 'new': await handleNew(); break
        case 'open': await handleOpen(); break
        case 'save': await handleSave(); break
        case 'save-as': await handleSaveAs(); break
        case 'undo': editorRef.current?.undo(); break
        case 'redo': editorRef.current?.redo(); break
        case 'find': editorRef.current?.openSearch(); break
        case 'toggle-preview': setPreviewVisible(v => !v); break
        case 'toggle-editor': setEditorVisible(v => !v); break
        case 'toggle-focus-mode': window.electronAPI.toggleFocusMode(); break
        case 'toggle-word-wrap': setWordWrap(v => !v); break
        case 'toggle-line-numbers': setShowLineNumbers(v => !v); break
        case 'toggle-rtl': setIsRtl(v => !v); break
        case 'force-dark': forceDark(); break
        case 'force-light': forceLight(); break
        case 'open-logs': window.electronAPI.openLogs(); break
        case 'about': window.electronAPI.showAbout(); break
        case 'register-association': window.electronAPI.registerFileAssociation(); break
        case 'check-close':
          if (await confirmDiscard()) {
            window.electronAPI.closeWindow()
          }
          break
      }
    })
    return cleanup
  }, [handleNew, handleOpen, handleSave, handleSaveAs, forceDark, forceLight, confirmDiscard])

  // ── File opened from command line ──
  useEffect(() => {
    const cleanup = window.electronAPI.onFileOpened(async (path: string) => {
      await openFile(path)
    })
    return cleanup
  }, [openFile])

  // ── Drag and drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const path = (files[0] as any).path
      if (path && /\.(md|markdown)$/i.test(path)) {
        if (await confirmDiscard()) {
          await openFile(path)
        }
      }
    }
  }, [confirmDiscard, openFile])

  // ── Split.js ──
  const splitRef = useRef<Split.Instance | null>(null)
  const editorPaneRef = useRef<HTMLDivElement>(null)
  const previewPaneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editorVisible && previewVisible && editorPaneRef.current && previewPaneRef.current) {
      splitRef.current = Split([editorPaneRef.current, previewPaneRef.current], {
        sizes: [50, 50],
        minSize: 200,
        gutterSize: 5,
        cursor: 'col-resize',
      })
    }

    return () => {
      if (splitRef.current) {
        splitRef.current.destroy()
        splitRef.current = null
      }
    }
  }, [editorVisible, previewVisible])

  // Force preview update when toggling preview on
  useEffect(() => {
    if (previewVisible) {
      setPreviewHtml(renderMarkdown(contentRef.current))
    }
  }, [previewVisible])

  // ── Toolbar callbacks ──
  const onBold = () => editorRef.current?.insertWrap('**', '**', 'bold text')
  const onItalic = () => editorRef.current?.insertWrap('*', '*', 'italic text')
  const onStrike = () => editorRef.current?.insertWrap('~~', '~~', 'strikethrough')
  const onH1 = () => editorRef.current?.insertLinePrefix('# ')
  const onH2 = () => editorRef.current?.insertLinePrefix('## ')
  const onH3 = () => editorRef.current?.insertLinePrefix('### ')
  const onCode = () => editorRef.current?.insertWrap('`', '`', 'code')
  const onCodeBlock = () => editorRef.current?.insertBlock('```\n\n```', 4)
  const onBulletList = () => editorRef.current?.insertLinePrefix('- ')
  const onNumberList = () => editorRef.current?.insertLinePrefix('1. ')
  const onQuote = () => editorRef.current?.insertLinePrefix('> ')
  const onRule = () => editorRef.current?.insertBlock('\n\n---\n\n')
  const onTable = () => editorRef.current?.insertBlock(
    '\n| Column 1 | Column 2 | Column 3 |\n' +
    '| -------- | -------- | -------- |\n' +
    '| Cell     | Cell     | Cell     |\n'
  )
  const onLink = () => editorRef.current?.insertWrap('[', '](url)', 'link text')
  const onImage = () => editorRef.current?.insertBlock('![alt text](image-url)')

  return (
    <div
      className="app-root"
      data-theme={isDark ? 'dark' : 'light'}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Toolbar
        isDark={isDark}
        isRtl={isRtl}
        scrollLinked={scrollLinked}
        fontFamily={fontFamily}
        fontSize={fontSize}
        onBold={onBold}
        onItalic={onItalic}
        onStrike={onStrike}
        onH1={onH1}
        onH2={onH2}
        onH3={onH3}
        onLink={onLink}
        onImage={onImage}
        onCode={onCode}
        onCodeBlock={onCodeBlock}
        onBulletList={onBulletList}
        onNumberList={onNumberList}
        onQuote={onQuote}
        onRule={onRule}
        onTable={onTable}
        onFontFamilyChange={setFontFamily}
        onFontSizeChange={setFontSize}
        onRtlToggle={() => setIsRtl(v => !v)}
        onScrollLinkToggle={() => setScrollLinked(v => !v)}
        onThemeToggle={handleThemeToggle}
      />

      <div className="content-area">
        {editorVisible && (
          <div ref={editorPaneRef} className={`editor-pane ${previewVisible ? '' : 'editor-only'}`}>
            <Editor
              ref={editorRef}
              content={content}
              isDark={isDark}
              wordWrap={wordWrap}
              showLineNumbers={showLineNumbers}
              isRtl={isRtl}
              fontFamily={fontFamily}
              fontSize={fontSize}
              onChange={handleContentChange}
              onCursorChange={handleCursorChange}
              onScroll={handleEditorScroll}
            />
          </div>
        )}
        {!editorVisible && !previewVisible && (
          <div style={{ flex: 1 }} />
        )}
        {previewVisible && (
          <div ref={previewPaneRef} className={`preview-container ${editorVisible ? '' : 'preview-only'}`}>
            <Preview
              ref={previewRef}
              html={previewHtml}
              isDark={isDark}
              isRtl={isRtl}
              fontFamily={fontFamily}
              fontSize={fontSize}
              onScroll={handlePreviewScroll}
            />
          </div>
        )}
      </div>

      <StatusBar
        filePath={filePath}
        isModified={isModified}
        wordCount={wordCount}
        cursorLine={cursorLine}
        cursorCol={cursorCol}
      />
    </div>
  )
}
