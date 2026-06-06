import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFileDialog: () => ipcRenderer.invoke('dialog:open-file'),
  saveFileDialog: (defaultName: string) => ipcRenderer.invoke('dialog:save-file', defaultName),
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('file:save', path, content),
  confirmDiscard: () => ipcRenderer.invoke('dialog:confirm-discard'),

  // Window
  toggleFocusMode: () => ipcRenderer.invoke('window:toggle-focus-mode'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Shell
  openLogs: () => ipcRenderer.invoke('shell:open-logs'),

  // Dialogs
  showAbout: () => ipcRenderer.invoke('dialog:about'),

  // Theme
  getSystemTheme: () => ipcRenderer.invoke('theme:get-system'),
  setThemeSource: (source: 'dark' | 'light' | 'system') => ipcRenderer.invoke('theme:set-source', source),

  // File association
  registerFileAssociation: () => ipcRenderer.invoke('file-association:register'),

  // Event listeners
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action)
    ipcRenderer.on('menu-action', handler)
    return () => ipcRenderer.removeListener('menu-action', handler)
  },
  onThemeChanged: (callback: (isDark: boolean) => void) => {
    const handler = (_event: any, isDark: boolean) => callback(isDark)
    ipcRenderer.on('theme-changed', handler)
    return () => ipcRenderer.removeListener('theme-changed', handler)
  },
  onFileOpened: (callback: (filePath: string) => void) => {
    const handler = (_event: any, filePath: string) => callback(filePath)
    ipcRenderer.on('file-opened', handler)
    return () => ipcRenderer.removeListener('file-opened', handler)
  },
})
