import { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { registerFileAssociation } from './fileAssociation'

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    height: 840,
    minWidth: 680,
    minHeight: 440,
    icon: join(app.getAppPath(), 'icon.ico'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  // Grant Local Font Access permission for system font enumeration
  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'local-fonts') {
      callback(true)
    } else {
      callback(false)
    }
  })

  win.once('ready-to-show', () => {
    win!.show()

    // Check for command-line file argument
    const args = process.argv.slice(app.isPackaged ? 1 : 2)
    const filePath = args.find(a => /\.(md|markdown)$/i.test(a))
    if (filePath) {
      win!.webContents.send('file-opened', filePath)
    }
  })

  // Close guard: check for unsaved changes
  win.on('close', (e) => {
    e.preventDefault()
    win!.webContents.send('menu-action', 'check-close')
  })

  buildMenu()

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }
}

function buildMenu() {
  const isMac = process.platform === 'darwin'
  const send = (action: string) => {
    win?.webContents.send('menu-action', action)
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '&File',
      submenu: [
        { label: '&New', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: '&Open...', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { type: 'separator' },
        { label: '&Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Save &As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('save-as') },
        { type: 'separator' },
        { label: 'Register .md Association', click: () => send('register-association') },
        { type: 'separator' },
        { label: 'E&xit', click: () => send('check-close') },
      ],
    },
    {
      label: '&Edit',
      submenu: [
        { label: '&Undo', accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
        { label: '&Redo', accelerator: 'CmdOrCtrl+Y', click: () => send('redo') },
        { type: 'separator' },
        { label: '&Find...', accelerator: 'CmdOrCtrl+F', click: () => send('find') },
      ],
    },
    {
      label: '&View',
      submenu: [
        { label: 'Toggle &Preview', accelerator: 'F5', click: () => send('toggle-preview') },
        { label: 'Toggle &Editor', accelerator: 'F6', click: () => send('toggle-editor') },
        { label: '&Focus Mode', accelerator: 'F11', click: () => send('toggle-focus-mode') },
        { type: 'separator' },
        { label: '&Word Wrap', accelerator: 'Alt+Z', click: () => send('toggle-word-wrap') },
        { label: 'Show Line &Numbers', click: () => send('toggle-line-numbers') },
        { label: '&RTL Mode', click: () => send('toggle-rtl') },
        { type: 'separator' },
        { label: '&Dark Theme', click: () => send('force-dark') },
        { label: '&Light Theme', click: () => send('force-light') },
      ],
    },
    {
      label: '&Help',
      submenu: [
        { label: 'Open &Log Folder', click: () => send('open-logs') },
        { type: 'separator' },
        { label: '&About mark-dawn', click: () => send('about') },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ── IPC Handlers ──

ipcMain.handle('dialog:open-file', async () => {
  const result = await dialog.showOpenDialog(win!, {
    filters: [
      { name: 'Markdown files', extensions: ['md', 'markdown'] },
      { name: 'All files', extensions: ['*'] },
    ],
    title: 'Open Markdown File',
    properties: ['openFile'],
  })
  if (result.canceled) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:save-file', async (_e, defaultName: string) => {
  const result = await dialog.showSaveDialog(win!, {
    filters: [
      { name: 'Markdown files', extensions: ['md'] },
      { name: 'All files', extensions: ['*'] },
    ],
    defaultPath: defaultName,
  })
  if (result.canceled) return null
  return result.filePath
})

ipcMain.handle('file:read', async (_e, filePath: string) => {
  return readFileSync(filePath, 'utf-8')
})

ipcMain.handle('file:save', async (_e, filePath: string, content: string) => {
  writeFileSync(filePath, content, 'utf-8')
})

ipcMain.handle('dialog:confirm-discard', async () => {
  const result = await dialog.showMessageBox(win!, {
    type: 'warning',
    buttons: ['Yes', 'No'],
    title: 'mark-dawn',
    message: 'Discard unsaved changes?',
  })
  return result.response === 0
})

ipcMain.handle('window:toggle-focus-mode', () => {
  if (!win) return
  if (win.isFullScreen()) {
    win.setFullScreen(false)
  } else {
    win.setFullScreen(true)
  }
})

ipcMain.handle('window:close', () => {
  if (win) {
    win.removeAllListeners('close')
    win.close()
  }
})

ipcMain.handle('shell:open-logs', () => {
  const logsDir = join(app.getPath('userData'), 'logs')
  shell.openPath(logsDir)
})

ipcMain.handle('dialog:about', async () => {
  await dialog.showMessageBox(win!, {
    type: 'info',
    title: 'About',
    message: 'mark-dawn  v1.0',
    detail: 'A fast, minimal Markdown editor for Windows.\n\nStack: TypeScript · Electron · React · CodeMirror 6 · marked',
  })
})

ipcMain.handle('theme:get-system', () => {
  return nativeTheme.shouldUseDarkColors
})

ipcMain.handle('theme:set-source', (_e, source: 'dark' | 'light' | 'system') => {
  nativeTheme.themeSource = source
})

ipcMain.handle('file-association:register', async () => {
  try {
    registerFileAssociation()
    await dialog.showMessageBox(win!, {
      type: 'info',
      title: 'Done',
      message: '.md files are now associated with mark-dawn.',
    })
  } catch (err: any) {
    await dialog.showMessageBox(win!, {
      type: 'error',
      title: 'Error',
      message: `Registration failed. Try running as Administrator.\n\n${err.message}`,
    })
  }
})

// Theme change notification
nativeTheme.on('updated', () => {
  win?.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors)
})

// ── App lifecycle ──

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
