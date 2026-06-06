import { useMemo, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { buildPreviewHtml } from '../lib/markdown'
import '../styles/preview.css'

export interface PreviewHandle {
  scrollToLine: (line: number) => void
}

interface PreviewProps {
  html: string
  isDark: boolean
  isRtl: boolean
  fontFamily: string
  fontSize: number
  onScroll?: (topLine: number) => void
}

/** Read all data-line anchors from the iframe document */
function getAnchors(doc: Document): { line: number; top: number }[] {
  const elements = doc.querySelectorAll('[data-line]')
  const anchors: { line: number; top: number }[] = []
  for (let i = 0; i < elements.length; i++) {
    anchors.push({
      line: parseInt(elements[i].getAttribute('data-line') || '0'),
      top: (elements[i] as HTMLElement).offsetTop,
    })
  }
  return anchors
}

const Preview = forwardRef<PreviewHandle, PreviewProps>(({ html, isDark, isRtl, fontFamily, fontSize, onScroll }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const ignoreScrollRef = useRef(false)
  const onScrollRef = useRef(onScroll)
  onScrollRef.current = onScroll

  const srcDoc = useMemo(
    () => buildPreviewHtml(html, { isDark, isRtl, fontFamily, fontSize }),
    [html, isDark, isRtl, fontFamily, fontSize]
  )

  // Attach scroll listener to iframe content after it loads
  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const doc = iframe.contentWindow.document
    const handleScroll = () => {
      if (ignoreScrollRef.current) return

      const scrollTop = doc.documentElement.scrollTop
      const anchors = getAnchors(doc)
      if (anchors.length === 0) return

      // Find the anchor at or just above the scroll position
      let beforeIdx = -1
      for (let i = 0; i < anchors.length; i++) {
        if (anchors[i].top <= scrollTop + 40) beforeIdx = i
        else break
      }

      if (beforeIdx === -1) {
        onScrollRef.current?.(1)
        return
      }

      if (beforeIdx >= anchors.length - 1) {
        onScrollRef.current?.(anchors[beforeIdx].line)
        return
      }

      // Interpolate between the two bracketing anchors
      const before = anchors[beforeIdx]
      const after = anchors[beforeIdx + 1]
      const range = after.top - before.top
      if (range > 0) {
        const t = Math.max(0, Math.min(1, (scrollTop + 40 - before.top) / range))
        onScrollRef.current?.(before.line + t * (after.line - before.line))
      } else {
        onScrollRef.current?.(before.line)
      }
    }

    iframe.contentWindow.addEventListener('scroll', handleScroll, { passive: true })
  }, [])

  useImperativeHandle(ref, () => ({
    scrollToLine(targetLine: number) {
      const iframe = iframeRef.current
      if (!iframe?.contentWindow) return
      const doc = iframe.contentWindow.document

      const anchors = getAnchors(doc)
      if (anchors.length === 0) return

      // Find bracketing anchors for the target line
      let beforeIdx = -1
      for (let i = 0; i < anchors.length; i++) {
        if (anchors[i].line <= targetLine) beforeIdx = i
        else break
      }

      let scrollTo: number
      if (beforeIdx === -1) {
        scrollTo = 0
      } else if (beforeIdx >= anchors.length - 1) {
        scrollTo = anchors[beforeIdx].top
      } else {
        const before = anchors[beforeIdx]
        const after = anchors[beforeIdx + 1]
        const lineRange = after.line - before.line
        const t = lineRange > 0
          ? Math.max(0, Math.min(1, (targetLine - before.line) / lineRange))
          : 0
        scrollTo = before.top + t * (after.top - before.top)
      }

      // Offset by body padding for natural alignment
      scrollTo = Math.max(0, scrollTo - 32)

      ignoreScrollRef.current = true
      doc.documentElement.scrollTop = scrollTo
      requestAnimationFrame(() => { ignoreScrollRef.current = false })
    },
  }))

  return (
    <iframe
      ref={iframeRef}
      className="preview-frame"
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      title="Markdown Preview"
      onLoad={handleLoad}
    />
  )
})

Preview.displayName = 'Preview'

export default Preview
