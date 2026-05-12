'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getSectionMenu, isSectionItemActive, type SectionItem } from '@/lib/section-menus'

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ label }: { label: string }) {
  return (
    <div
      style={{
        position: 'absolute', left: 'calc(100% + 12px)', top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none', userSelect: 'none', zIndex: 110,
      }}
    >
      <motion.span
        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        style={{
          display: 'block', background: 'var(--card)', border: '1px solid var(--border)',
          color: 'var(--text-1)', boxShadow: 'var(--card-shadow)', borderRadius: 8,
          padding: '3px 10px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
        }}
      >
        {label}
      </motion.span>
    </div>
  )
}

// ── Shared button style ───────────────────────────────────────────────────────

function btnStyle(active: boolean, hovered: boolean) {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 42, height: 42, borderRadius: '50%',
    background: active ? 'var(--accent)' : hovered ? 'rgba(99,102,241,0.14)' : 'var(--dock-btn-bg)',
    border: `1.5px solid ${active ? 'rgba(255,255,255,0.25)' : hovered ? 'rgba(99,102,241,0.35)' : 'var(--dock-btn-border)'}`,
    color: active ? '#fff' : hovered ? 'var(--accent)' : 'var(--text-2)',
    boxShadow: active ? '0 0 0 3px var(--accent-glow)' : 'none',
    transition: 'background 0.18s ease, border-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
  } as React.CSSProperties
}

// ── Dock button — navigation link ─────────────────────────────────────────────

function DockBtn({ href, label, active, delay, children }: {
  href: string; label: string; active: boolean; delay: number; children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      initial={{ x: -18, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, delay }}
      whileTap={{ scale: 0.91 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', borderRadius: '50%' }}
    >
      <AnimatePresence>{hovered && <Tooltip label={label} />}</AnimatePresence>
      <Link href={href} style={btnStyle(active, hovered)}>{children}</Link>
    </motion.div>
  )
}

// ── Dock button — scroll-to anchor ────────────────────────────────────────────

function AnchorBtn({ anchor, label, active, delay, children }: {
  anchor: string; label: string; active: boolean; delay: number; children: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)

  function scrollTo() {
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <motion.div
      initial={{ x: -18, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, delay }}
      whileTap={{ scale: 0.91 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', borderRadius: '50%' }}
    >
      <AnimatePresence>{hovered && <Tooltip label={label} />}</AnimatePresence>
      <button onClick={scrollTo} style={{ ...btnStyle(active, hovered), cursor: 'pointer' }}>
        {children}
      </button>
    </motion.div>
  )
}

// ── Home / logo button ────────────────────────────────────────────────────────

function HomeBtn({ active, delay }: { active: boolean; delay: number }) {
  const [hovered, setHovered] = useState(false)
  return (
    <motion.div
      initial={{ x: -18, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, delay }}
      whileTap={{ scale: 0.91 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', borderRadius: '50%' }}
    >
      <AnimatePresence>{hovered && <Tooltip label="Home" />}</AnimatePresence>
      <Link
        href="/"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
          background: active ? 'rgba(255,255,255,0.15)' : hovered ? 'rgba(99,102,241,0.14)' : 'var(--dock-btn-bg)',
          border: `1.5px solid ${active ? 'rgba(255,255,255,0.25)' : hovered ? 'rgba(99,102,241,0.35)' : 'var(--dock-btn-border)'}`,
          transition: 'background 0.18s ease, border-color 0.18s ease',
        }}
      >
        <Image src="/logo_new.png" alt="Home" width={26} height={26} unoptimized style={{ objectFit: 'contain' }} />
      </Link>
    </motion.div>
  )
}

// ── Section item renderer ─────────────────────────────────────────────────────

function SectionBtn({ item, active, delay }: { item: SectionItem; active: boolean; delay: number }) {
  const Icon = item.icon
  const isAnchor = item.href.startsWith('#')

  if (isAnchor) {
    return (
      <AnchorBtn anchor={item.href.slice(1)} label={item.label} active={active} delay={delay}>
        <Icon size={17} />
      </AnchorBtn>
    )
  }
  return (
    <DockBtn href={item.href} label={item.label} active={active} delay={delay}>
      <Icon size={17} />
    </DockBtn>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ width: 26, height: 1, background: 'var(--dock-border)' }} />
}

// ── Main dock ─────────────────────────────────────────────────────────────────

export default function LeftDock() {
  const pathname = usePathname()
  const sections = getSectionMenu(pathname)

  return (
    <div style={{ position: 'fixed', left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 50 }}>
      <motion.div
        initial={{ x: -36, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.05 }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 10, padding: '14px 11px', borderRadius: 32,
          background: 'var(--dock-bg)', backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid var(--dock-border)', boxShadow: 'var(--dock-shadow)',
        }}
      >
        <HomeBtn active={pathname === '/'} delay={0} />

        {sections && (
          <>
            <Divider />
            {sections.map((item, i) => (
              <SectionBtn
                key={item.id}
                item={item}
                active={isSectionItemActive(item, pathname)}
                delay={0.04 + i * 0.03}
              />
            ))}
          </>
        )}
      </motion.div>
    </div>
  )
}
