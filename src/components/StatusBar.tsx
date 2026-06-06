interface StatusBarProps {
  filePath: string | null
  isModified: boolean
  wordCount: number
  cursorLine: number
  cursorCol: number
}

export default function StatusBar({ filePath, isModified, wordCount, cursorLine, cursorCol }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-left">
        <span className="status-filepath">{filePath || 'Untitled'}</span>
        {isModified && (
          <span className="status-modified">modified</span>
        )}
      </div>
      <div className="status-right">
        <span className="status-words">{wordCount} word{wordCount === 1 ? '' : 's'}</span>
        <span className="status-divider">|</span>
        <span className="status-position">Ln {cursorLine}  Col {cursorCol}</span>
      </div>
    </div>
  )
}
