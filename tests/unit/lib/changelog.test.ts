import { describe, expect, it } from 'vitest';
import { parseChangelog } from '@/lib/changelog';

const SOURCE = `# Changelog

Some words about versions that the page does not show.

## Planned

- **0.4** The cache-first data layer.
- **Later** Notifications, and \`start on login\`.

## 0.3.5 (2026-10-11)

Smooth pages.

- Pages slide in.
- The footer stays put.

## 0.3.0

- The first version.
`;

describe('parseChangelog', () => {
  const entries = parseChangelog(SOURCE);

  it('reads each ## section as an entry, in order, and ignores what comes before the first one', () => {
    expect(
      entries.map(e => {
        return e.title;
      }),
    ).toEqual(['Planned', '0.3.5', '0.3.0']);
  });

  it('marks the Planned section, and reads the date and the note of a release', () => {
    expect(entries[0]).toMatchObject({ planned: true, date: null, note: null });
    expect(entries[1]).toMatchObject({ planned: false, date: '2026-10-11', note: 'Smooth pages.' });
    expect(entries[2]).toMatchObject({ planned: false, date: null, note: null });
  });

  it('reads the bullets of a section', () => {
    expect(
      entries[1].items.map(item => {
        return item.map(part => {
          return part.text;
        });
      }),
    ).toEqual([['Pages slide in.'], ['The footer stays put.']]);
  });

  it('splits **bold** and `code` out of a bullet, so the page can show them without raw HTML', () => {
    expect(entries[0].items[0]).toEqual([
      { kind: 'bold', text: '0.4' },
      { kind: 'text', text: ' The cache-first data layer.' },
    ]);
    expect(entries[0].items[1]).toEqual([
      { kind: 'bold', text: 'Later' },
      { kind: 'text', text: ' Notifications, and ' },
      { kind: 'code', text: 'start on login' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('gives an empty list for an empty file', () => {
    expect(parseChangelog('')).toEqual([]);
  });
});
