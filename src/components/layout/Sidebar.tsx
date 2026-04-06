'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, StickyNote, Plus, LogOut, Brain, Sun, Moon, Users, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import type { CalView } from '@/components/calendar/CalendarView'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  currentView: CalView
  onViewChange: (v: CalView) => void
  counts: { events: number; tasks: number; reminders: number }
  onAddItem: () => void
}

export default function Sidebar({ collapsed, onToggle, currentView, onViewChange, counts, onAddItem }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const total = counts.events + counts.tasks + counts.reminders

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col h-full flex-shrink-0 overflow-hidden"
      style={{ borderRight: '1px solid var(--sidebar-border)', background: 'var(--surface)' }}
    >
      {/* Brand */}
      <div className={cn('flex items-center pt-5 pb-4', collapsed ? 'justify-center px-3' : 'gap-3 px-4')}>
        <Image
          src="/logo_new.png"
          alt="laif"
          width={42}
          height={42}
          unoptimized
          className="flex-shrink-0 object-contain"
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
              className="text-xs leading-tight"
              style={{ color: 'var(--text-3)' }}
            >
              a real assistant
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Add button */}
      <div className={cn('mb-4', collapsed ? 'px-3' : 'px-4')}>
        <button
          onClick={onAddItem}
          className={cn(
            'flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-medium text-white transition-all duration-150 active:scale-95',
            collapsed ? 'px-0' : 'px-3'
          )}
          style={{ background: 'var(--btn-primary-bg)' }}
        >
          <Plus size={15} />
          {!collapsed && <span>Add item</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        <div style={{ height: 1, background: 'var(--border)', margin: '2px 4px 6px' }} />

        {/* Agenda link */}
        <button
          onClick={() => onViewChange('agenda')}
          className={cn('sidebar-item w-full', currentView === 'agenda' && pathname === '/' && 'active', collapsed && 'justify-center px-0')}
        >
          <List size={16} className="flex-shrink-0" />
          {!collapsed && <span>Agenda</span>}
        </button>

        {/* Calendar link */}
        <button
          onClick={() => onViewChange(currentView === 'agenda' ? 'month' : currentView)}
          className={cn('sidebar-item w-full', pathname === '/' && currentView !== 'agenda' && 'active', collapsed && 'justify-center px-0')}
        >
          <Calendar size={16} className="flex-shrink-0" />
          {!collapsed && <span>Calendar</span>}
        </button>

        {/* Notes link */}
        <Link
          href="/notes"
          className={cn('sidebar-item w-full', pathname === '/notes' && 'active', collapsed && 'justify-center px-0')}
        >
          <StickyNote size={16} className="flex-shrink-0" />
          {!collapsed && <span>Post-its</span>}
        </Link>

        {/* Memories link */}
        <Link
          href="/memories"
          className={cn('sidebar-item w-full', pathname === '/memories' && 'active', collapsed && 'justify-center px-0')}
        >
          <Brain size={16} className="flex-shrink-0" />
          {!collapsed && <span>Memories</span>}
        </Link>

        {/* Contacts link */}
        <Link
          href="/contacts"
          className={cn('sidebar-item w-full', pathname === '/contacts' && 'active', collapsed && 'justify-center px-0')}
        >
          <Users size={16} className="flex-shrink-0" />
          {!collapsed && <span>Contacts</span>}
        </Link>
      </nav>

      {/* Stats */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-4 pb-3 space-y-1.5"
          >
            <p className="text-xs font-medium tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>OVERVIEW</p>
            {[
              { label: 'Events',    count: counts.events,    color: '#5b8ded' },
              { label: 'Tasks',     count: counts.tasks,     color: '#34d399' },
              { label: 'Reminders', count: counts.reminders, color: '#fbbf24' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-xs" style={{ color: 'var(--text-2)' }}>{label}</span>
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{count}</span>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Total</span>
              <span className="text-xs font-bold" style={{ color: 'var(--text-1)' }}>{total}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme toggle + Logout */}
      <div className={cn('pb-4', collapsed ? 'px-3' : 'px-4')}>
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className={cn('sidebar-item w-full mb-1', collapsed && 'justify-center px-0')}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun size={15} className="flex-shrink-0" />
            : <Moon size={15} className="flex-shrink-0" />
          }
          {!collapsed && (
            <span className="text-xs">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn('sidebar-item w-full', collapsed && 'justify-center px-0')}
          style={{ color: 'var(--text-3)' }}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs">Sign out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-colors"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          color: 'var(--text-2)',
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  )
}
