'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { List, CalendarDays, Brain, Users, Settings2, type LucideIcon } from 'lucide-react'

interface NavItem {
  href:  string
  icon:  LucideIcon
  label: string
  match: (p: string) => boolean
}

const NAV: NavItem[] = [
  { href: '/calendar?view=agenda', icon: List,        label: 'Agenda',   match: () => false },
  { href: '/calendar?view=month',  icon: CalendarDays, label: 'Calendar', match: p => p === '/calendar' },
  { href: '/memories',             icon: Brain,        label: 'Memories', match: p => p === '/memories' },
  { href: '/contacts',             icon: Users,        label: 'Contacts', match: p => p === '/contacts' },
  { href: '/settings',             icon: Settings2,    label: 'Settings', match: p => p === '/settings' },
]

function Tooltip({ label }: { label: string }) {
  return (
    <motion.span
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0  }}
      exit={{ opacity: 0,   x: -4  }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      style={{
        position:   'absolute',
        left:       'calc(100% + 12px)',
        top:        '50%',
        transform:  'translateY(-50%)',
        background: 'var(--card)',
        border:     '1px solid var(--border)',
        color:      'var(--text-1)',
        boxShadow:  'var(--card-shadow)',
        borderRadius: 8,
        padding:    '3px 10px',
        fontSize:   12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex:     110,
      }}
    >
      {label}
    </motion.span>
  )
}

function DockBtn({
  href, label, active, delay, children,
}: {
  href: string; label: string; active: boolean; delay: number
  children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <AnimatePresence>{hovered && <Tooltip label={label} />}</AnimatePresence>

      <motion.div
        initial={{ x: -18, opacity: 0 }}
        animate={{ x: 0,   opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay }}
        whileTap={{ scale: 0.91 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ borderRadius: '50%' }}
      >
        <Link
          href={href}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          42,
            height:         42,
            borderRadius:   '50%',
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
            boxShadow: active ? '0 0 0 3px var(--accent-glow)' : 'none',
            transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
          }}
        >
          {children}
        </Link>
      </motion.div>
    </div>
  )
}

function HomeBtn({ active, delay }: { active: boolean; delay: number }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <AnimatePresence>{hovered && <Tooltip label="Home" />}</AnimatePresence>

      <motion.div
        initial={{ x: -18, opacity: 0 }}
        animate={{ x: 0,   opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay }}
        whileTap={{ scale: 0.91 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ borderRadius: '50%' }}
      >
        <Link
          href="/"
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          42,
            height:         42,
            borderRadius:   '50%',
            overflow:       'hidden',
            background: active
              ? 'rgba(255,255,255,0.15)'
              : hovered
                ? 'rgba(99,102,241,0.14)'
                : 'var(--dock-btn-bg)',
            border: `1.5px solid ${
              active  ? 'rgba(255,255,255,0.25)' :
              hovered ? 'rgba(99,102,241,0.35)' :
                        'var(--dock-btn-border)'
            }`,
            transition: 'background 0.18s ease, border-color 0.18s ease',
          }}
        >
          <Image src="/logo_new.png" alt="Home" width={26} height={26} unoptimized style={{ objectFit: 'contain' }} />
        </Link>
      </motion.div>
    </div>
  )
}

export default function LeftDock() {
  const pathname = usePathname()

  return (
    <div
      style={{
        position:  'fixed',
        left:      14,
        top:       '50%',
        transform: 'translateY(-50%)',
        zIndex:    50,
      }}
    >
      <motion.div
        initial={{ x: -36, opacity: 0 }}
        animate={{ x: 0,   opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.05 }}
        style={{
          display:              'flex',
          flexDirection:        'column',
          alignItems:           'center',
          gap:                  10,
          padding:              '14px 11px',
          borderRadius:         32,
          background:           'var(--dock-bg)',
          backdropFilter:       'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border:               '1px solid var(--dock-border)',
          boxShadow:            'var(--dock-shadow)',
        }}
      >
        <HomeBtn active={pathname === '/'} delay={0} />

        <div style={{ width: 26, height: 1, background: 'var(--dock-border)' }} />

        {NAV.map((item, i) => (
          <DockBtn
            key={item.href}
            href={item.href}
            label={item.label}
            active={item.match(pathname)}
            delay={0.04 + i * 0.04}
          >
            <item.icon size={17} />
          </DockBtn>
        ))}
      </motion.div>
    </div>
  )
}
