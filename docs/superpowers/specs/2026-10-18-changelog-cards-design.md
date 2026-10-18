# What's new as cards (0.8.5), design

Status: approved in conversation, written here for the record. Version: 0.8.5. One PR. The page will be revamped further later (pagination, every version, jump to a version).

## Purpose

The What's new page was one long list with a section for every release, and it grows with every patch. It should say what matters at a glance, and keep the detail one click away.

## The page

- `/changelog` (What's new): Coming soon, Known issues (when there are any), then **one big card for each minor line** (0.8, 0.7, ...), newest first, then a **See every change** link.
- A line card has the line (`Version 0.8`), the date of its newest release, the span (`Versions 0.8.0 to 0.8.5`), a headline, a few highlights, and a link **All 0.8 changes**. A line with a single release shows `Version 0.7.0`.
- The **newest line is the featured card**: bigger, with the accent colour, and it also shows the notes of its latest release in full (`Latest: 0.8.5`), so a small patch shows up without a card of its own.
- `/changelog/all` (Every change): every release in full, newest first, as the old page showed them, with a link back. The line card's link goes to the newest release of that line on this page (`#changelog-0.8.5`).

## Where the words come from

`CHANGELOG.md` stays the one place everything is written (public, features only, nothing internal). Each line has a hand-written section, written when the line starts and kept short:

```
## Highlights 0.8

A headline sentence.

- A few bullets, features only.
```

A line without one (an old line, or a forgotten one) falls back to its first release: that release's note and its first three bullets. Planned and Known issues are unchanged. The unseen-version dot on the footer link is unchanged: it clears when `/changelog` is opened.

## Code

- `src/lib/changelog.ts`: `parseChangelog` reads a `Highlights x.y` section (kind `highlights`, its headline in `note`); `lineOf` and `groupLines` build the lines.
- `ChangelogLineCard` for the cards; `ChangelogEntryCard` (the old card) for Planned, Known issues and the all-changes page; `InlineText` shared by both.
- Text in `locales/en/changelog.json`.

## Tests

- Unit: the highlights section, `lineOf`, `groupLines` (grouping, spans, dates, curated and fallback, what is left out).
- e2e: the cards and the featured card's latest notes, no card for a patch, See every change and back, the line card link, and the unseen dot.
