import { CalendarCheck, ChartColumn, House, ListChecks, Users } from 'lucide-react';

/** The pages in the top bar. The desktop build swaps this file for `nav-links.desktop.ts`, which has no Circles. */
export const TOP_LINKS = [
  { href: '/today', name: 'today' },
  { href: '/habits', name: 'habits' },
  { href: '/progress', name: 'progress' },
  { href: '/circles', name: 'circles' },
] as const;

/** The pages in the phone tab bar. */
export const TAB_LINKS = [
  { href: '/', name: 'home', Icon: House },
  { href: '/today', name: 'today', Icon: CalendarCheck },
  { href: '/habits', name: 'habits', Icon: ListChecks },
  { href: '/progress', name: 'progress', Icon: ChartColumn },
  { href: '/circles', name: 'circles', Icon: Users },
] as const;
