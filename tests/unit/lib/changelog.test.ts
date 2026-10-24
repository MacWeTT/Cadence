import { describe, expect, it } from 'vitest';
import { groupLines, latestUpdate, lineOf, parseChangelog, splitReleases } from '@/lib/changelog';

const SOURCE = `# Changelog

Some words about versions that the page does not show.

## Planned

- **0.4** The cache-first data layer.
- **Later** Notifications, and \`start on login\`.

## Known issues

- The theme flashes when a tab is restored.

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
    ).toEqual(['Planned', 'Known issues', '0.3.5', '0.3.0']);
  });

  it('tells the Planned and Known issues sections from releases, and reads the date and note of a release', () => {
    expect(entries[0]).toMatchObject({ kind: 'planned', date: null, note: null });
    expect(entries[1]).toMatchObject({ kind: 'known', date: null, note: null });
    expect(entries[2]).toMatchObject({ kind: 'release', date: '2026-10-11', note: 'Smooth pages.' });
    expect(entries[3]).toMatchObject({ kind: 'release', date: null, note: null });
  });

  it('reads the bullets of a section', () => {
    expect(
      entries[2].items.map(item => {
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

const CURATED = `## Planned

- Something.

## Highlights 0.4

Instant pages and more.

- **Fast** pages.
- Ticks answer at once.

## 0.4.1 (2026-10-13)

A fix.

- Fixed a thing.

## 0.4.0 (2026-10-11)

Instant pages.

- Pages open instantly.
- Ticks answer at once.
- A tick shows everywhere.
- A fourth thing.

## 0.3.6 (2026-10-10)

Say hello.

- A contact form.
- Appearance themes.

## 0.3.0 (2026-10-09)

The first version.

- Home dashboard.
`;

const UNCURATED = `## 0.2.0 (2026-10-01)

Note.

- a
- b
- c
- d
`;

describe('parseChangelog, highlights', () => {
  const entries = parseChangelog(CURATED);

  it('reads a Highlights section with its headline and bullets', () => {
    expect(entries[1]).toMatchObject({ kind: 'highlights', title: 'Highlights 0.4', note: 'Instant pages and more.' });
    expect(entries[1].items).toHaveLength(2);
  });
});

describe('lineOf', () => {
  it('is the first two numbers of a version', () => {
    expect(lineOf('0.8.4')).toBe('0.8');
    expect(lineOf('0.10.0')).toBe('0.10');
    expect(lineOf('1.0.2')).toBe('1.0');
  });
});

describe('groupLines', () => {
  const lines = groupLines(parseChangelog(CURATED));

  it('makes one group per minor line, newest first, with its releases newest first', () => {
    expect(
      lines.map(({ line }) => {
        return line;
      }),
    ).toEqual(['0.4', '0.3']);
    expect(
      lines[0].releases.map(({ title }) => {
        return title;
      }),
    ).toEqual(['0.4.1', '0.4.0']);
  });

  it('spans from the oldest release to the newest of the line, and keeps the newest date', () => {
    expect(lines[0]).toMatchObject({ from: '0.4.0', to: '0.4.1', date: '2026-10-13' });
    expect(lines[1]).toMatchObject({ from: '0.3.0', to: '0.3.6', date: '2026-10-10' });
  });

  it('uses the curated headline and highlights when the changelog has them', () => {
    expect(lines[0].headline).toBe('Instant pages and more.');
    expect(lines[0].highlights).toHaveLength(2);
  });

  it('falls back to the first release of the line when nothing is curated: its note and first three bullets', () => {
    expect(lines[1].headline).toBe('The first version.');
    expect(lines[1].highlights).toHaveLength(1);

    const more = groupLines(parseChangelog(UNCURATED));

    expect(more[0].highlights).toHaveLength(3);
  });

  it('leaves Planned, Known issues and Highlights out of the groups', () => {
    expect(
      lines.flatMap(({ releases }) => {
        return releases.map(({ kind }) => {
          return kind;
        });
      }),
    ).toEqual(['release', 'release', 'release', 'release']);
  });
});

describe('latestUpdate', () => {
  const log = (...lines: string[]) => {
    return parseChangelog(lines.join(String.fromCharCode(10)));
  };

  it('is the newest release when it is a fix on top of a version (1.0.1 after 1.0.0)', () => {
    const update = latestUpdate(
      log('## 1.0.1 (2026-10-24)', '', 'Fixes.', '', '- A fix.', '', '## 1.0.0 (2026-10-23)', '', '- The first.'),
    );

    expect(update?.title).toBe('1.0.1');
  });

  it('is nothing when the newest release is a version of its own (1.0.0, or 0.9.0): its line card says it all', () => {
    expect(latestUpdate(log('## 1.0.0 (2026-10-23)', '', '- The first.'))).toBeNull();
    expect(
      latestUpdate(log('## 0.9.0 (2026-10-20)', '', '- A feature.', '', '## 0.8.5 (2026-10-18)', '', '- A fix.')),
    ).toBeNull();
  });

  it('skips the sections that are not releases, and is nothing for an empty file', () => {
    expect(latestUpdate(log('## Planned', '', '- Later.', '', '## 1.0.2 (2026-10-25)', '', '- A fix.'))?.title).toBe(
      '1.0.2',
    );
    expect(latestUpdate(log(''))).toBeNull();
  });
});

describe('splitReleases', () => {
  const lines = () => {
    return groupLines(
      parseChangelog(
        [
          '## 1.0.1 (2026-10-24)',
          '',
          '- A fix.',
          '',
          '## 1.0.0 (2026-10-23)',
          '',
          '- The first.',
          '',
          '## 0.8.5 (2026-10-18)',
          '',
          '- A fix.',
          '',
          '## 0.7.0 (2026-10-12)',
          '',
          '- Focus.',
        ].join(String.fromCharCode(10)),
      ),
    );
  };

  it('keeps the versions from 1.0 on as releases, and the 0.x ones as pre-releases, newest first', () => {
    const { releases, preReleases } = splitReleases(lines());

    expect(
      releases.map(({ line }) => {
        return line;
      }),
    ).toEqual(['1.0']);
    expect(
      preReleases.map(({ line }) => {
        return line;
      }),
    ).toEqual(['0.8', '0.7']);
  });

  it('has no pre-releases to show when there are none, and none as releases before 1.0', () => {
    expect(splitReleases([]).preReleases).toEqual([]);
    expect(splitReleases(lines().slice(1)).releases).toEqual([]);
  });
});
