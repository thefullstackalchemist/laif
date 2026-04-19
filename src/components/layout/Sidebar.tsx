'use client'
import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, StickyNote, Brain, Users, List, LayoutDashboard, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalView } from '@/components/calendar/CalendarView'
import NotesSection from '@/components/notes/NotesSection'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  currentView: CalView
  onViewChange: (v: CalView) => void
  counts: { events: number; tasks: number; reminders: number }
  onAddItem: () => void
}

export default function Sidebar({ collapsed, onToggle, currentView, onViewChange }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

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
          alt="PIM"
          width={42}
          height={42}
          unoptimized
          className="flex-shrink-0 object-contain"
        />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
            >
              <span className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-1)' }}>PIM</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        <div style={{ height: 1, background: 'var(--border)', margin: '2px 4px 6px' }} />

        <Link
          href="/"
          className={cn('sidebar-item w-full', pathname === '/' && 'active', collapsed && 'justify-center px-0')}
        >
          <LayoutDashboard size={16} className="flex-shrink-0" />
          {!collapsed && <span>Home</span>}
        </Link>

        <button
          onClick={() => { onViewChange('agenda'); router.push('/calendar') }}
          className={cn('sidebar-item w-full', pathname === '/calendar' && currentView === 'agenda' && 'active', collapsed && 'justify-center px-0')}
        >
          <List size={16} className="flex-shrink-0" />
          {!collapsed && <span>Agenda</span>}
        </button>

        <button
          onClick={() => { onViewChange(currentView === 'agenda' ? 'month' : currentView); router.push('/calendar') }}
          className={cn('sidebar-item w-full', pathname === '/calendar' && currentView !== 'agenda' && 'active', collapsed && 'justify-center px-0')}
        >
          <Calendar size={16} className="flex-shrink-0" />
          {!collapsed && <span>Calendar</span>}
        </button>

        <Link
          href="/notes"
          className={cn('sidebar-item w-full', pathname === '/notes' && 'active', collapsed && 'justify-center px-0')}
        >
          <StickyNote size={16} className="flex-shrink-0" />
          {!collapsed && <span>Post-its</span>}
        </Link>

        <Link
          href="/memories"
          className={cn('sidebar-item w-full', pathname === '/memories' && 'active', collapsed && 'justify-center px-0')}
        >
          <Brain size={16} className="flex-shrink-0" />
          {!collapsed && <span>Memories</span>}
        </Link>

        <Link
          href="/contacts"
          className={cn('sidebar-item w-full', pathname === '/contacts' && 'active', collapsed && 'justify-center px-0')}
        >
          <Users size={16} className="flex-shrink-0" />
          {!collapsed && <span>Contacts</span>}
        </Link>

        <Link
          href="/settings"
          className={cn('sidebar-item w-full', pathname === '/settings' && 'active', collapsed && 'justify-center px-0')}
        >
          <Settings2 size={16} className="flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* Notes filesystem tree */}
        <Suspense fallback={null}>
          <NotesSection collapsed={collapsed} />
        </Suspense>
      </nav>

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
