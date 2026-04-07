'use client'
import { useState } from 'react'
import { Umbrella, Rss } from 'lucide-react'
import { cn } from '@/lib/utils'
import Sidebar from '@/components/layout/Sidebar'
import FloatingChat from '@/components/chat/FloatingChat'
import UmbrellaSettings from '@/components/umbrellas/UmbrellaSettings'
import RSSSettings from '@/components/dashboard/RSSSettings'
import type { CalView } from '@/components/calendar/CalendarView'

const SECTIONS = [
  { id: 'umbrellas', label: 'Umbrellas', icon: Umbrella },
  { id: 'rss',       label: 'RSS Feeds', icon: Rss       },
] as const

type SectionId = typeof SECTIONS[number]['id']

export default function SettingsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [calView, setCalView]                   = useState<CalView>('month')
  const [active, setActive]                     = useState<SectionId>('umbrellas')

  const counts = { events: 0, tasks: 0, reminders: 0 }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        currentView={calView}
        onViewChange={setCalView}
        counts={counts}
        onAddItem={() => {}}
      />

      {/* Settings submenu */}
      <div
        className="flex flex-col flex-shrink-0 h-full py-6 px-3"
        style={{
          width: 200,
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <p className="text-xs font-semibold tracking-widest px-3 mb-3" style={{ color: 'var(--text-3)' }}>
          SETTINGS
        </p>
        <nav className="space-y-0.5">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={cn(
                'sidebar-item w-full',
                active === s.id && 'active'
              )}
            >
              <s.icon size={15} className="flex-shrink-0" />
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-10">
          <div className="mb-8">
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>
              {SECTIONS.find(s => s.id === active)?.label}
            </h1>
          </div>

          {active === 'umbrellas' && <UmbrellaSettings />}
          {active === 'rss'       && <RSSSettings />}
        </div>
      </main>

      <FloatingChat onRefreshItems={() => {}} />
    </div>
  )
}
