'use client'
import { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export default function FaviconSwitcher() {
  const { theme } = useTheme()

  useEffect(() => {
    // Ensure all favicon link elements point to the correct logo.
    // The SSR <link rel="icon"> is set in layout metadata; this keeps it in sync
    // after client-side theme changes.
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach(el => {
      el.href = '/logo_new.png'
    })
    // Update PWA theme-color meta tag so the browser chrome matches the theme
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = theme === 'light' ? '#f4f6fb' : '#070b14'
  }, [theme])

  return null
}
