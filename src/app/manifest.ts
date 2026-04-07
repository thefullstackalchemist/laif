import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PIM — Your personal assistant',
    short_name: 'PIM',
    description: 'Manage events, tasks, reminders and notes — all in one premium workspace.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0b13',
    theme_color: '#6929D4',
    orientation: 'any',
    icons: [
      { src: '/logo_new.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/logo_new.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
