'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'

const DEFAULT_CODE = `flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Do something]
    B -->|No| D[End]
    C --> D`

let _mid = 0

interface Props {
  content: string
  onChange: (text: string) => void
}

export default function MermaidEditor({ content, onChange }: Props) {
  const [code,  setCode]  = useState(content || DEFAULT_CODE)
  const [error, setError] = useState<string | null>(null)
  const [zoom,  setZoom]  = useState(1)

  const zoomRef    = useRef(1)
  // Natural pixel size from the SVG viewBox — set after each successful render
  const natRef     = useRef<{ w: number; h: number } | null>(null)
  // Container ref for measuring available width (stable across renders)
  const containerRef = useRef<HTMLDivElement>(null)
  // SVG holder — ALWAYS in DOM so renderDiagram can always write to it
  const svgHolderRef = useRef<HTMLDivElement>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Init mermaid ───────────────────────────────────────────────────────────
  useEffect(() => {
    mermaid.initialize({
      startOnLoad:   false,
      theme:         'dark',
      securityLevel: 'loose',
      fontFamily:    'ui-sans-serif, system-ui, sans-serif',
      darkMode:      true,
      themeVariables: {
        primaryColor:        '#6366f1',
        primaryTextColor:    '#e2e8f0',
        primaryBorderColor:  '#4f46e5',
        lineColor:           '#94a3b8',
        secondaryColor:      '#1e293b',
        tertiaryColor:       '#0f172a',
        background:          '#0f172a',
        mainBkg:             '#1e293b',
        nodeBorder:          '#4f46e5',
        clusterBkg:          '#1e293b',
        titleColor:          '#e2e8f0',
        edgeLabelBackground: '#1e293b',
        nodeTextColor:       '#e2e8f0',
      },
    })
  }, [])

  // ── Apply zoom to current SVG ──────────────────────────────────────────────
  // Uses pixel sizes derived from viewBox so zoom is always precise.
  // zoom=1 → scale so the diagram fits the container width (no upscaling beyond 1×).
  const applyZoom = useCallback((z: number) => {
    const svg = svgHolderRef.current?.querySelector<SVGSVGElement>('svg')
    const nat = natRef.current
    const ctr = containerRef.current
    if (!svg || !nat) return

    // At z=1 we want "fit to container width" — never upscale a small diagram
    const availW    = ctr ? ctr.clientWidth - 32 : nat.w   // 32 = left+right padding
    const fitW      = Math.min(nat.w, availW)
    const fitH      = nat.h * (fitW / nat.w)
    const displayW  = fitW  * z
    const displayH  = fitH  * z

    svg.style.width    = `${Math.round(displayW)}px`
    svg.style.height   = `${Math.round(displayH)}px`
    svg.style.maxWidth = 'none'
    svg.style.display  = 'block'
  }, [])

  // ── Render mermaid SVG ─────────────────────────────────────────────────────
  const renderDiagram = useCallback(async (src: string) => {
    const holder = svgHolderRef.current
    if (!holder) return
    const id = `mm${++_mid}`
    try {
      const { svg } = await mermaid.render(id, src)
      if (!svgHolderRef.current) return          // unmounted while awaiting
      holder.innerHTML = svg
      const svgEl = holder.querySelector<SVGSVGElement>('svg')
      if (svgEl) {
        // Read natural dimensions from viewBox before stripping attributes
        const vb = svgEl.getAttribute('viewBox')?.trim().split(/\s+/).map(Number)
        if (vb && vb.length >= 4 && vb[2] > 0 && vb[3] > 0) {
          natRef.current = { w: vb[2], h: vb[3] }
        } else {
          // Fallback: use mermaid's own width/height attributes
          natRef.current = {
            w: parseFloat(svgEl.getAttribute('width')  || '400'),
            h: parseFloat(svgEl.getAttribute('height') || '300'),
          }
        }
        // Strip mermaid's hardcoded size (attrs + inline style)
        svgEl.removeAttribute('width')
        svgEl.removeAttribute('height')
        svgEl.style.maxWidth = 'none'
        applyZoom(zoomRef.current)
      }
      setError(null)
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : String(e)
      const msg = raw.split('\n').find(l => l.trim() && !l.includes(' at ')) ?? raw.split('\n')[0]
      setError(msg)
      // Leave the last good SVG in place — don't blank the preview on every keystroke error
    }
  }, [applyZoom])

  // Debounced re-render on every code change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => renderDiagram(code), 400)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [code, renderDiagram])

  // ── Zoom helpers ───────────────────────────────────────────────────────────
  function changeZoom(next: number) {
    const z = Math.min(5, Math.max(0.25, next))
    zoomRef.current = z
    setZoom(z)
    applyZoom(z)
  }

  // Ctrl/⌘ + wheel
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      changeZoom(zoomRef.current + (e.deltaY < 0 ? 0.15 : -0.15))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, []) // eslint-disable-line

  function handleChange(val: string) {
    setCode(val)
    onChange(val)
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Code panel ─────────────────────────────────────────────────────── */}
      <div style={{
        width: '38%', minWidth: 200,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
      }}>
        <div style={{
          padding: '5px 12px', borderBottom: '1px solid var(--border)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
          color: 'var(--text-3)', userSelect: 'none',
        }}>
          MERMAID
        </div>
        <textarea
          value={code}
          onChange={e => handleChange(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            padding: '14px 16px',
            fontFamily: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
            fontSize: 12.5, lineHeight: 1.65, color: 'var(--text-2)',
            resize: 'none', tabSize: 4,
          }}
        />
      </div>

      {/* ── Preview panel ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header + zoom controls */}
        <div style={{
          padding: '3px 10px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--text-3)', flex: 1, userSelect: 'none',
          }}>
            PREVIEW
          </span>
          <button onClick={() => changeZoom(zoom - 0.25)} title="Zoom out"
            style={{ padding: '3px 5px', borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
            <ZoomOut size={13} />
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 38, textAlign: 'center', userSelect: 'none' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => changeZoom(zoom + 0.25)} title="Zoom in"
            style={{ padding: '3px 5px', borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
            <ZoomIn size={13} />
          </button>
          <button onClick={() => changeZoom(1)} title="Fit to panel"
            style={{ padding: '3px 5px', borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-3)', display: 'flex', alignItems: 'center', marginLeft: 2 }}>
            <Maximize2 size={12} />
          </button>
        </div>

        {/* Scrollable preview body */}
        <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: 16 }}>

          {/* Error banner — shown on top of last good preview */}
          {error && (
            <div style={{
              marginBottom: 12, padding: '8px 12px', borderRadius: 8,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#f87171', fontSize: 11.5,
              fontFamily: 'ui-monospace, monospace', lineHeight: 1.5,
              wordBreak: 'break-word',
            }}>
              <span style={{ fontWeight: 600 }}>Syntax error — </span>{error}
            </div>
          )}

          {/* SVG holder is ALWAYS in the DOM — never conditionally unmounted */}
          <div ref={svgHolderRef} />
        </div>
      </div>
    </div>
  )
}
