import { CalendarCheck, ChartColumn, House, ListChecks, Users } from 'lucide-react';

// The same lists for the desktop build. Circles needs a server, so it is there but switched off (`soon`) and says it is coming
// to the app. It takes the place of `nav-links.ts`.
export const TOP_LINKS = [
  { href: '/today', name: 'today' },
  { href: '/habits', name: 'habits' },
  { href: '/progress', name: 'progress' },
  { href: '/circles', name: 'circles', soon: true },
] as const;

export const TAB_LINKS = [
  { href: '/', name: 'home', Icon: House },
  { href: '/today', name: 'today', Icon: CalendarCheck },
  { href: '/habits', name: 'habits', Icon: ListChecks },
  { href: '/progress', name: 'progress', Icon: ChartColumn },
  { href: '/circles', name: 'circles', Icon: Users, soon: true },
] as const;
