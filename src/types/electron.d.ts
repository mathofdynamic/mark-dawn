export interface ElectronAPI {
  openFileDialog: () => Promise<string | null>
  saveFileDialog: (defaultName: string) => Promise<string | null>
  readFile: (path: string) => Promise<string>
  saveFile: (path: string, content: string) => Promise<void>
  confirmDiscard: () => Promise<boolean>
  toggleFocusMode: () => Promise<void>
  closeWindow: () => Promise<void>
  openLogs: () => Promise<void>
  showAbout: () => Promise<void>
  getSystemTheme: () => Promise<boolean>
  setThemeSource: (source: 'dark' | 'light' | 'system') => Promise<void>
  registerFileAssociation: () => Promise<void>
  onMenuAction: (callback: (action: string) => void) => () => void
  onThemeChanged: (callback: (isDark: boolean) => void) => () => void
  onFileOpened: (callback: (filePath: string) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
