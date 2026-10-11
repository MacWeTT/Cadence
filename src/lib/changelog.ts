/** A piece of a bullet: plain text, **bold** or `code`. The page draws each kind itself, so no raw HTML is needed. */
export interface Inline {
  kind: 'text' | 'bold' | 'code';
  text: string;
}

/** One `##` section of CHANGELOG.md: a release (with its date and note) or the Planned list. */
export interface ChangelogEntry {
  title: string;
  /** `YYYY-MM-DD`, from a heading like `## 0.3.5 (2026-10-11)`. */
  date: string | null;
  planned: boolean;
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

/** Reads CHANGELOG.md into its sections. Anything before the first `##` heading is ignored. */
export const parseChangelog = (source: string): ChangelogEntry[] => {
  const entries: ChangelogEntry[] = [];

  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = HEADING.exec(line);

    if (heading) {
      const [, title, date] = heading;

      entries.push({ title, date: date ?? null, planned: title.toLowerCase() === 'planned', note: null, items: [] });
      continue;
    }

    const current = entries.at(-1);

    if (!current || line === '') {
      continue;
    }

    if (line.startsWith('- ')) {
      current.items.push(parseInline(line.slice(2)));
    } else if (!current.planned && current.items.length === 0) {
      current.note = current.note ? `${current.note} ${line}` : line;
    }
  }

  return entries;
};
