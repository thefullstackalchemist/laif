'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Sun, Moon, Plus, LayoutDashboard } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import AddItemModal from '@/components/modals/AddItemModal'
import FloatingChat from '@/components/chat/FloatingChat'
import ClockWidget from '@/components/dashboard/ClockWidget'
import DaySummaryWidget from '@/components/dashboard/DaySummaryWidget'
import MiniCalendarWidget from '@/components/dashboard/MiniCalendarWidget'
import WeatherWidget from '@/components/dashboard/WeatherWidget'
import RSSFeedWidget from '@/components/dashboard/RSSFeedWidget'
import { useItems } from '@/hooks/useItems'
import { useTheme } from '@/contexts/ThemeContext'
import type { AnyItem } from '@/types'

function BentoCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-2xl p-5 overflow-hidden ${className}`}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { items, loading, silentRefresh, addItem, updateItem, deleteItem } = useItems()
  const { theme, toggle } = useTheme()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const counts = {
    events:    items.filter(i => i.type === 'event').length,
    tasks:     items.filter(i => i.type === 'task').length,
    reminders: items.filter(i => i.type === 'reminder').length,
  }

  async function handleAddItem(type: AnyItem['type'], data: Record<string, unknown>) {
    await addItem(type, data as Parameters<typeof addItem>[1])
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        currentView="agenda"
        onViewChange={() => router.push('/calendar')}
        counts={counts}
        onAddItem={() => setModalOpen(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Page header */}
        <div
          className="flex items-center gap-3 px-6 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <LayoutDashboard size={15} style={{ color: 'var(--accent-light)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>laif</span>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>— your day, at a glance</span>
          {loading && (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin ml-1"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          )}
        </div>

        {/* Bento grid */}
        <div className="flex-1 overflow-auto p-5">
          <div
            className="h-full"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 14,
              minHeight: 480,
              maxHeight: 800,
            }}
          >
            {/* Clock — top left */}
            <BentoCard style={{ gridColumn: '1', gridRow: '1' }}>
              <ClockWidget />
            </BentoCard>

            {/* Mini calendar — top center */}
            <BentoCard style={{ gridColumn: '2', gridRow: '1' }}>
              <MiniCalendarWidget items={items} />
            </BentoCard>

            {/* RSS Feed — right, spans both rows */}
            <BentoCard style={{ gridColumn: '3', gridRow: '1 / 3', display: 'flex', flexDirection: 'column' }}>
              <RSSFeedWidget />
            </BentoCard>

            {/* Day summary — bottom left */}
            <BentoCard style={{ gridColumn: '1', gridRow: '2' }}>
              <DaySummaryWidget items={items} />
            </BentoCard>

            {/* Weather — bottom center */}
            <BentoCard style={{ gridColumn: '2', gridRow: '2' }}>
              <WeatherWidget />
            </BentoCard>
          </div>
        </div>
      </main>

      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddItem}
      />

      <FloatingChat onRefreshItems={silentRefresh} />
    </div>
  )
}
