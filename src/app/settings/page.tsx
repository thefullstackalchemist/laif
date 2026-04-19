'use client'
import { useState } from 'react'
import { Umbrella, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import FloatingChat from '@/components/chat/FloatingChat'
import UmbrellaSettings from '@/components/umbrellas/UmbrellaSettings'
import TopBarActions from '@/components/layout/TopBarActions'
import type { CalView } from '@/components/calendar/CalendarView'

const SECTIONS = [
  { id: 'umbrellas', label: 'Umbrellas', icon: Umbrella },
] as const

type SectionId = typeof SECTIONS[number]['id']

export default function SettingsPage() {
  const [active, setActive] = useState<SectionId>('umbrellas')

  return (
    <div className="flex flex-1 overflow-hidden">

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
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 flex items-center gap-2 px-6 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Settings2 size={14} style={{ color: 'var(--accent-light)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Settings</span>
          <div className="ml-auto">
            <TopBarActions />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-10 py-10">
          <div className="mb-8">
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>
              {SECTIONS.find(s => s.id === active)?.label}
            </h1>
          </div>

          {active === 'umbrellas' && <UmbrellaSettings />}
        </div>
        </div>
      </main>

      <FloatingChat onRefreshItems={() => {}} />
    </div>
  )

}
