'use client'
import { useRouter } from 'next/navigation'
import { Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function TopBarActions() {
  const { theme, toggle } = useTheme()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={toggle}
        className="btn-ghost p-1.5"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      </button>
      <button
        onClick={handleLogout}
        className="btn-ghost p-1.5"
        title="Sign out"
        style={{ color: 'var(--text-3)' }}
      >
        <LogOut size={14} />
      </button>
    </div>
  )
}
