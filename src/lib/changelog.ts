/** A piece of a bullet: plain text, **bold** or `code`. The page draws each kind itself, so no raw HTML is needed. */
export interface Inline {
  kind: 'text' | 'bold' | 'code';
  text: string;
}

/**
 * One `##` section of CHANGELOG.md: a release (with its date and note), the Planned list, the Known issues list, or the
 * hand-written highlights of a minor line (`## Highlights 0.8`, a headline and a few bullets for its card).
 */
export interface ChangelogEntry {
  title: string;
  /** `YYYY-MM-DD`, from a heading like `## 0.3.5 (2026-10-11)`. */
  date: string | null;
  kind: 'release' | 'planned' | 'known' | 'highlights';
  /** A sentence or two between the heading and the bullets. */
  note: string | null;
  items: Inline[][];
}

const HEADING = /^## (.+?)(?: \((\d{4}-\d{2}-\d{2})\))?$/;
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`)/;

const parseInline = (line: string): Inline[] => {
  return line
    .split(INLINE)
    .filter(part => {
      return part !== '';
    })
    .map((part): Inline => {
      if (part.startsWith('**')) {
        return { kind: 'bold', text: part.slice(2, -2) };
      }

      if (part.startsWith('`')) {
        return { kind: 'code', text: part.slice(1, -1) };
      }

      return { kind: 'text', text: part };
    });
};

const kindOf = (title: string): ChangelogEntry['kind'] => {
  const name = title.toLowerCase();

  if (name === 'planned') {
    return 'planned';
  }

  if (name === 'known issues') {
    return 'known';
  }

  return name.startsWith('highlights ') ? 'highlights' : 'release';
};

/** Reads CHANGELOG.md into its sections. Anything before the first `##` heading is ignored. */
export const parseChangelog = (source: string): ChangelogEntry[] => {
  const entries: ChangelogEntry[] = [];

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = HEADING.exec(line);

    if (heading) {
      const [, title, date] = heading;

      entries.push({ title, date: date ?? null, kind: kindOf(title), note: null, items: [] });
      continue;
    }

    const current = entries.at(-1);

    if (!current || line === '') {
      continue;
    }

    const { items, kind, note } = current;

    if (line.startsWith('- ')) {
      items.push(parseInline(line.slice(2)));
    } else if ((kind === 'release' || kind === 'highlights') && items.length === 0) {
      current.note = note ? `${note} ${line}` : line;
    }
  }

  return entries;
};

/** `0.8.4` belongs to the line `0.8`. */
export const lineOf = (version: string): string => {
  return version.split('.').slice(0, 2).join('.');
};

/** A minor line with everything it shipped: the card on the What's new page. */
export interface ChangelogLine {
  line: string;
  /** The releases of the line, newest first. */
  releases: ChangelogEntry[];
  from: string;
  to: string;
  /** The date of the newest release. */
  date: string | null;
  headline: string | null;
  highlights: Inline[][];
}

const FALLBACK_HIGHLIGHTS = 3;

/**
 * Groups the releases by minor line, newest first (the file's order). A line's headline and highlights are the ones
 * written under `## Highlights x.y`; without them, the first release of the line stands in for it.
 */
export const groupLines = (entries: ChangelogEntry[]): ChangelogLine[] => {
  const curated = new Map<string, ChangelogEntry>();
  const groups = new Map<string, ChangelogEntry[]>();

  for (const entry of entries) {
    const { kind, title } = entry;

    if (kind === 'highlights') {
      curated.set(title.slice('highlights '.length), entry);
    } else if (kind === 'release') {
      const line = lineOf(title);

      groups.set(line, [...(groups.get(line) ?? []), entry]);
    }
  }

  return [...groups.entries()].map(([line, releases]) => {
    const { title: from, note, items } = releases.at(-1) as ChangelogEntry;
    const { title: to, date } = releases[0];
    const { note: headline, items: highlights } = curated.get(line) ?? {
      note,
      items: items.slice(0, FALLBACK_HIGHLIGHTS),
    };

    return { line, releases, from, to, date, headline, highlights };
  });
};

/**
 * The newest release when it is a fix on top of a version (1.0.1 after 1.0.0), for the "Latest update" card on the front
 * page; nothing when it is a version of its own (1.0.0), which its line card already shows.
 */
export const latestUpdate = (entries: ChangelogEntry[]): ChangelogEntry | null => {
  const newest = entries.find(({ kind }) => {
    return kind === 'release';
  });

  return newest && Number(newest.title.split('.')[2] ?? 0) > 0 ? newest : null;
};

/**
 * The versions from 1.0 on are the releases; the 0.x ones, before 1.0, are the pre-releases, which the What's new page
 * keeps on a page of their own. Both keep the order they came in (newest first).
 */
export const splitReleases = (lines: ChangelogLine[]): { releases: ChangelogLine[]; preReleases: ChangelogLine[] } => {
  const isPre = ({ line }: ChangelogLine) => {
    return line.startsWith('0.');
  };

  return {
    releases: lines.filter(line => {
      return !isPre(line);
    }),
    preReleases: lines.filter(isPre),
  };
};
