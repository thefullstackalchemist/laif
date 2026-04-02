'use client'
import { useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

export default function FaviconSwitcher() {
  const { theme } = useTheme()

  useEffect(() => {
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!favicon) return
    favicon.href = theme === 'light' ? '/logo-black.png' : '/logo-white.png'
  }, [theme])

  return null
}
