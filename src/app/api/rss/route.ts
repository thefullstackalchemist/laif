import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
}

function getText(block: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i')
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const cdata = cdataRe.exec(block)
  if (cdata) return cdata[1].trim()
  const plain = plainRe.exec(block)
  return plain ? plain[1].replace(/<[^>]+>/g, '').trim() : ''
}

function getAttr(block: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i')
  const m = re.exec(block)
  return m ? m[1].trim() : ''
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function parseRSS(xml: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = []
  const itemRe = /<item[\s\S]*?<\/item>/g
  let match
  while ((match = itemRe.exec(xml)) !== null) {
    const block = match[0]
    const title = decode(getText(block, 'title'))
    const desc  = stripHtml(getText(block, 'description')).slice(0, 200)
    const linkM = block.match(/<link>([^<]+)<\/link>/) || block.match(/<link[^>]+href="([^"]+)"/)
    const link  = linkM ? linkM[1].trim() : getText(block, 'guid')
    const pub   = getText(block, 'pubDate') || getText(block, 'dc:date') || ''
    items.push({ title, link, description: desc + (desc.length >= 200 ? '…' : ''), pubDate: pub, source: sourceName })
    if (items.length >= 25) break
  }
  return items
}

function parseAtom(xml: string, sourceName: string): RSSItem[] {
  const items: RSSItem[] = []
  const entryRe = /<entry[\s\S]*?<\/entry>/g
  let match
  while ((match = entryRe.exec(xml)) !== null) {
    const block = match[0]
    const title = decode(getText(block, 'title'))
    const raw   = getText(block, 'summary') || getText(block, 'content')
    const desc  = stripHtml(raw).slice(0, 200)
    const link  = getAttr(block, 'link', 'href') || getText(block, 'id')
    const pub   = getText(block, 'published') || getText(block, 'updated') || ''
    items.push({ title, link, description: desc + (desc.length >= 200 ? '…' : ''), pubDate: pub, source: sourceName })
    if (items.length >= 25) break
  }
  return items
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url  = searchParams.get('url')
  const name = searchParams.get('name') || 'Feed'

  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LaifRSS/1.0)' },
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`Upstream ${res.status}`)
    const xml = await res.text()
    const items = xml.includes('<entry') ? parseAtom(xml, name) : parseRSS(xml, name)
    return NextResponse.json({ items })
  } catch (err) {
    return NextResponse.json({ error: String(err), items: [] }, { status: 502 })
  }
}
