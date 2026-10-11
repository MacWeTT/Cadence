# 0.6.3: every page fits phones and tablets, design

Status: built, awaiting review.

## Breakpoints

Phone: under 640 px (Tailwind `sm`). Tablet and up: 640 px and wider, where the layout is the desktop one (a phone on its side, 844 px, counts as a tablet). Nothing changes above 640 px except the footer, which now mirrors the top bar.

## What changes on a phone

- **Navigation:** the links move from the top bar (which was wider than the screen and made every page scroll sideways) to a bar at the foot of the screen: Home, Today, Habits, Progress, with icons, within thumb's reach and at least 44 px tall. The top bar keeps the logo, the theme button and the account menu. The layout keeps clear of the home indicator and notch (`viewport-fit=cover`, `env(safe-area-inset-*)`).
- **Footer:** a card with the wordmark, the tagline, the links and the credits. From 640 px up it is a bar like the top bar: logo, credits, links.
- **Pages:** tighter margins; Today, Home, Habits and Progress rows wrap long names instead of cutting them off, with the streak, schedule and rate under the name; the Home header and banner stack; the year heatmap keeps readable squares and scrolls sideways, starting at the latest weeks.
- **Dialogs:** fit the screen (also on its side) and scroll when they are taller than it.
- **Touch:** checkboxes, buttons, inputs, chips and menu buttons are about 44 px to hit.

## Tests

`e2e/responsive.spec.ts`: no page scrolls sideways at 320, 390, 844 x 390 and 768 px (all eight pages, with long habit names and every kind of habit); the tab bar on phones and the top-bar links on tablets; the tab links are at least 44 px tall; the habit dialog stays inside the screen in both orientations.

## Not included

A different layout for tablets (they get the desktop layout), and per-device testing on real phones (checked in Chromium at those sizes).
