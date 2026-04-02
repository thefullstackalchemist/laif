'use client'
import React from 'react'

/**
 * Lightweight markdown renderer for AI chat messages.
 * Handles: **bold**, *italic*, `code`, bullet lists, numbered lists, blank-line paragraphs.
 * No external dependencies.
 */

// ── Inline formatting ─────────────────────────────────────────────────────────

function renderInline(text: string): React.ReactNode[] {
  // Split on **bold**, *italic*, `code` — process left to right
  const parts: React.ReactNode[] = []
  // Combined regex: **bold** | *italic* | `code`
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))

    if (m[0].startsWith('**')) {
      parts.push(<strong key={m.index} className="font-semibold">{m[2]}</strong>)
    } else if (m[0].startsWith('*')) {
      parts.push(<em key={m.index}>{m[3]}</em>)
    } else {
      parts.push(
        <code key={m.index}
          className="px-1 py-0.5 rounded text-xs font-mono"
          style={{ background: 'rgba(255,255,255,0.1)', color: 'inherit' }}
        >{m[4]}</code>
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ── Block-level parser ────────────────────────────────────────────────────────

type Block =
  | { kind: 'p';    lines: string[] }
  | { kind: 'ul';   items: string[] }
  | { kind: 'ol';   items: string[] }

function parseBlocks(text: string): Block[] {
  const rawLines = text.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < rawLines.length) {
    const line = rawLines[i]

    // Blank line — skip
    if (!line.trim()) { i++; continue }

    // Bullet list: lines starting with -/*/• (optionally indented)
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = []
      while (i < rawLines.length && /^\s*[-*•]\s+/.test(rawLines[i])) {
        items.push(rawLines[i].replace(/^\s*[-*•]\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ul', items })
      continue
    }

    // Numbered list: lines starting with digit.
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < rawLines.length && /^\s*\d+\.\s+/.test(rawLines[i])) {
        items.push(rawLines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ol', items })
      continue
    }

    // Paragraph: collect consecutive non-blank, non-list lines
    const lines: string[] = []
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !/^\s*[-*•]\s+/.test(rawLines[i]) &&
      !/^\s*\d+\.\s+/.test(rawLines[i])
    ) {
      lines.push(rawLines[i])
      i++
    }
    if (lines.length) blocks.push({ kind: 'p', lines })
  }

  return blocks
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MarkdownMessage({ content }: { content: string }) {
  const blocks = parseBlocks(content)

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        if (block.kind === 'ul') {
          return (
            <ul key={bi} className="space-y-0.5 pl-1">
              {block.items.map((item, ii) => (
                <li key={ii} className="flex items-start gap-1.5">
                  <span className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'currentColor', opacity: 0.5 }} />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          )
        }
        if (block.kind === 'ol') {
          return (
            <ol key={bi} className="space-y-0.5 pl-1">
              {block.items.map((item, ii) => (
                <li key={ii} className="flex items-start gap-2">
                  <span className="flex-shrink-0 font-semibold opacity-50 text-xs mt-0.5">{ii + 1}.</span>
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ol>
          )
        }
        // paragraph — join lines with space (soft wrap)
        return (
          <p key={bi}>
            {renderInline(block.lines.join(' '))}
          </p>
        )
      })}
    </div>
  )
}
