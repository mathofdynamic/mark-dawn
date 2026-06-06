import { execSync } from 'child_process'
import { app } from 'electron'

export function registerFileAssociation() {
  if (process.platform !== 'win32') return

  const exePath = app.isPackaged
    ? process.execPath
    : process.execPath // In dev, this points to electron.exe

  const commands = [
    `reg add "HKCU\\Software\\Classes\\.md" /ve /d "MarkDawn.Markdown" /f`,
    `reg add "HKCU\\Software\\Classes\\MarkDawn.Markdown" /ve /d "Markdown File" /f`,
    `reg add "HKCU\\Software\\Classes\\MarkDawn.Markdown\\DefaultIcon" /ve /d "\\"${exePath}\\",0" /f`,
    `reg add "HKCU\\Software\\Classes\\MarkDawn.Markdown\\shell\\open\\command" /ve /d "\\"${exePath}\\" \\"%1\\"" /f`,
  ]

  for (const cmd of commands) {
    execSync(cmd, { stdio: 'ignore' })
  }
}
