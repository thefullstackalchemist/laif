'use client'
import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import FloatingChat from '@/components/chat/FloatingChat'
import UmbrellaSettings from '@/components/umbrellas/UmbrellaSettings'
import RSSSettings from '@/components/dashboard/RSSSettings'
import type { CalView } from '@/components/calendar/CalendarView'

export default function SettingsPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [calView, setCalView]                   = useState<CalView>('month')

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

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          <div className="mb-8">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Settings</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Manage your workspace</p>
          </div>

          <UmbrellaSettings />
          <RSSSettings />
        </div>
      </main>

      <FloatingChat onRefreshItems={() => {}} />
    </div>
  )
}
