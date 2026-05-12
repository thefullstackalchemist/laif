import {
  Heart, Footprints, Moon, Flame, Activity, Wind, Droplets, Scale,
  TrendingUp, List, Brain, Users, Settings2,
  type LucideIcon,
} from 'lucide-react'

export interface SectionItem {
  id:        string
  icon:      LucideIcon
  label:     string
  /** '#anchor' scrolls within page; '/path' navigates */
  href:      string
  /** pathname prefix used to decide if the item is "active" */
  matchPath?: string
}

// ── Master nav list ────────────────────────────────────────────────────────────
// Add a new page here once → it appears in every page's sidebar automatically.

// Add a new page here once → it appears in every page's sidebar automatically.
// Journal is intentionally excluded — it lives in the bottom dock.
// Journal and Health are intentionally excluded — they live in the bottom dock.
export const ALL_NAV_ITEMS: SectionItem[] = [
  { id: 'agenda',   icon: List,      label: 'Agenda',    href: '/calendar?view=agenda', matchPath: '/calendar' },
  { id: 'memories', icon: Brain,     label: 'Memories',  href: '/memories',             matchPath: '/memories' },
  { id: 'contacts', icon: Users,     label: 'Contacts',  href: '/contacts',             matchPath: '/contacts' },
  { id: 'settings', icon: Settings2, label: 'Settings',  href: '/settings',             matchPath: '/settings' },
]

// ── Health sub-sections ────────────────────────────────────────────────────────

const HEALTH_SECTIONS: SectionItem[] = [
  { id: 'heart-rate',  icon: Heart,        label: 'Heart Rate',  href: '#heart-rate'  },
  { id: 'sleep',       icon: Moon,         label: 'Sleep',        href: '#sleep'        },
  { id: 'steps',       icon: Footprints,   label: 'Steps',        href: '#steps'        },
  { id: 'calories',    icon: Flame,        label: 'Calories',     href: '#calories'     },
  { id: 'hrv',         icon: Activity,     label: 'HRV',          href: '#hrv'          },
  { id: 'resting-hr',  icon: Wind,         label: 'Resting HR',   href: '#resting-hr'   },
  { id: 'spo2',        icon: Droplets,     label: 'SpO2',         href: '#spo2'         },
  { id: 'weight',      icon: Scale,        label: 'Weight',       href: '#weight'       },
  { id: 'workouts',    icon: TrendingUp,   label: 'Workouts',     href: '#workouts'     },
]

// ── Section menus per route ───────────────────────────────────────────────────

export const SECTION_MENUS: Record<string, SectionItem[]> = {
  '/':          ALL_NAV_ITEMS,
  '/health':    HEALTH_SECTIONS,
  '/memories':  ALL_NAV_ITEMS,
  '/calendar':  ALL_NAV_ITEMS,
  '/contacts':  ALL_NAV_ITEMS,
  '/settings':  ALL_NAV_ITEMS,
}

/** Resolve the active section menu for a given pathname */
export function getSectionMenu(pathname: string): SectionItem[] | null {
  return SECTION_MENUS[pathname] ?? null
}

/** True when a nav item should appear active for the given pathname */
export function isSectionItemActive(item: SectionItem, pathname: string): boolean {
  if (item.href.startsWith('#')) return false
  const target = item.matchPath ?? item.href.split('?')[0]
  return pathname.startsWith(target)
}
