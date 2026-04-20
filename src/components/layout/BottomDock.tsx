'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, BookOpen, StickyNote, NotebookPen, type LucideIcon } from 'lucide-react'

interface DockItemDef {
  label: string
  icon:  LucideIcon
  href:  string
  match: (p: string) => boolean
}

const MODES: DockItemDef[] = [
  {
    label: 'Productivity',
    icon:  LayoutDashboard,
    href:  '/',
    match: p => !p.startsWith('/pim-notes') && !p.startsWith('/notes') && !p.startsWith('/journal') && p !== '/login',
  },
  {
    label: 'PKMS',
    icon:  BookOpen,
    href:  '/pim-notes',
    match: p => p.startsWith('/pim-notes'),
  },
  {
    label: 'Journal',
    icon:  NotebookPen,
    href:  '/journal',
    match: p => p.startsWith('/journal'),
  },
  {
    label: 'Notes',
    icon:  StickyNote,
    href:  '/notes',
    match: p => p.startsWith('/notes'),
  },
]

function DockButton({
  item, active, index, onClick,
}: {
  item:    DockItemDef
  active:  boolean
  index:   number
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const { icon: Icon, label } = item

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.span
            key="tip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0,   y: 3 }}
            transition={{ duration: 0.1 }}
            style={{
              position:   'absolute',
              bottom:     'calc(100% + 10px)',
              background: 'var(--card)',
              border:     '1px solid var(--border)',
              color:      'var(--text-1)',
              boxShadow:  'var(--card-shadow)',
              borderRadius: 6,
              padding:    '2px 8px',
              fontSize:   12,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex:     70,
            }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      <motion.button
        style={{
          width:          44,
          height:         44,
          borderRadius:   '50%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          background: active
            ? 'var(--accent)'
            : hovered
              ? 'rgba(99,102,241,0.14)'
              : 'var(--dock-btn-bg)',
          border: `1.5px solid ${
            active  ? 'rgba(255,255,255,0.25)' :
            hovered ? 'rgba(99,102,241,0.35)' :
                      'var(--dock-btn-border)'
          }`,
          color: active ? '#fff' : hovered ? 'var(--accent)' : 'var(--text-2)',
          cursor:    'pointer',
          flexShrink: 0,
          boxShadow:  active ? '0 0 0 3px var(--accent-glow)' : 'none',
          transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
        }}
        onClick={onClick}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={()   => setHovered(false)}
        whileTap={{ scale: 0.9 }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.05 + index * 0.06 }}
      >
        <Icon size={18} />
      </motion.button>
    </div>
  )
}

export default function BottomDock() {
  const pathname = usePathname() ?? '/'
  const router   = useRouter()

  return (
    <div className="flex justify-center flex-shrink-0" style={{ paddingBottom: 14, paddingTop: 4 }}>
      <motion.div
        className="flex items-center"
        style={{
          gap:                  12,
          padding:              '10px 18px',
          borderRadius:         28,
          background:           'var(--dock-bg)',
          backdropFilter:       'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border:               '1px solid var(--dock-border)',
          boxShadow:            'var(--dock-shadow)',
        }}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.04 }}
      >
        {MODES.map((item, i) => (
          <DockButton
            key={item.href}
            item={item}
            active={item.match(pathname)}
            index={i}
            onClick={() => router.push(item.href)}
          />
        ))}
      </motion.div>
    </div>
  )
}
