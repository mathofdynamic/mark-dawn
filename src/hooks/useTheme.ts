import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    // Get initial theme
    window.electronAPI.getSystemTheme().then(setIsDark)

    // Listen for system theme changes
    const cleanup = window.electronAPI.onThemeChanged(setIsDark)
    return cleanup
  }, [])

  const forceDark = () => {
    window.electronAPI.setThemeSource('dark')
    setIsDark(true)
  }

  const forceLight = () => {
    window.electronAPI.setThemeSource('light')
    setIsDark(false)
  }

  return { isDark, setIsDark, forceDark, forceLight }
}
