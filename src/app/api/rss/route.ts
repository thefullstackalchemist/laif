import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

function getText(block: string, tag: string): string {
  // Try CDATA first, then plain text
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const cdata = cdataRe.exec(block)
  if (cdata) return cdata[1].trim()
  const plain = plainRe.exec(block)
  return plain ? plain[1].trim() : ''
}

function parseRSS(xml: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = []
  const itemRe = /<item[\s\S]*?<\/item>/g
  let match
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[0]
    const title = getText(block, 'title').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    const description = getText(block, 'description').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').slice(0, 180).trim()
    // <link> in RSS is often between tags without wrapping — special handling
    const linkMatch = block.match(/<link>([^<]+)<\/link>/) || block.match(/<link[^>]+href="([^"]+)"/)
    const link = linkMatch ? linkMatch[1].trim() : getText(block, 'guid')
    items.push({
      title,
      link,
      description: description + (description.length >= 180 ? '…' : ''),
      pubDate: getText(block, 'pubDate') || getText(block, 'published') || '',
      source: sourceName,
    })
    if (items.length >= 25) break
  }
  return items
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const name = searchParams.get('name') || 'Feed'

  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LaifRSS/1.0)' },
      next: { revalidate: 300 }, // cache 5 min
    })
    if (!res.ok) throw new Error(`Upstream ${res.status}`)
    const xml = await res.text()
    const items = parseRSS(xml, name)
    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json({ error: String(err), items: [] }, { status: 502 })
  }
}
