'use client'
import { usePathname } from 'next/navigation'
import LeftDock from './LeftDock'
import BottomDock from './BottomDock'

const NO_LEFT_DOCK  = ['/pim-notes', '/notes']
const NO_SHELL      = ['/login']
const NO_CARD_WRAP  = ['/pim-notes', '/notes']  // pages that manage their own panel layout

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/'

  if (NO_SHELL.some(p => pathname.startsWith(p))) {
    return <>{children}</>
  }

  const showLeftDock = !NO_LEFT_DOCK.some(p => pathname.startsWith(p))
  const showCardWrap = !NO_CARD_WRAP.some(p => pathname.startsWith(p))

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="flex flex-col flex-1 overflow-hidden min-w-0"
        style={{ paddingLeft: showLeftDock ? 76 : 0 }}
      >
        {/* Card panel — pages that manage their own layout skip this */}
        {showCardWrap ? (
          <div className="flex-1 overflow-hidden min-h-0 p-2">
            <div
              className="h-full w-full rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              {children}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden min-h-0">
            {children}
          </div>
        )}
        <BottomDock />
      </div>

      {showLeftDock && <LeftDock />}
    </div>
  )
}
