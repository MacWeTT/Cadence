import { CalendarCheck, ChartColumn, House, ListChecks } from 'lucide-react';

// The same lists for the desktop build, which has no Circles (they need a server). It takes the place of `nav-links.ts`.
export const TOP_LINKS = [
  { href: '/today', name: 'today' },
  { href: '/habits', name: 'habits' },
  { href: '/progress', name: 'progress' },
] as const;

export const TAB_LINKS = [
  { href: '/', name: 'home', Icon: House },
  { href: '/today', name: 'today', Icon: CalendarCheck },
  { href: '/habits', name: 'habits', Icon: ListChecks },
  { href: '/progress', name: 'progress', Icon: ChartColumn },
] as const;
