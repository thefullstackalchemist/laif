import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PIM — Your personal assistant',
    short_name: 'PIM',
    description: 'Manage events, tasks, reminders and notes — all in one premium workspace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f6fb',
    theme_color: '#6366f1',
    orientation: 'any',
    icons: [
      { src: '/logo_new.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/logo_new.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
