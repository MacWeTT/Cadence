import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain/dates';
import type { Backup, BackupHabit } from '@/lib/backup-types';
import { buildReport } from '@/server/report-model';
import fontkit from '@pdf-lib/fontkit';
import { FONT_SANS } from '@/server/report-fonts';
import { fitted } from '@/server/report-draw';
import { renderReportPdf, type ReportLabels } from '@/server/report-pdf';

const TODAY = '2026-10-12';

const labels: ReportLabels = {
  subtitle: 'Progress report',
  generated: 'Generated on 12 Oct 2026',
  heading: 'Habits of Manas',
  empty: 'No habits yet.',
  made: 'Made with Cadence',
  archived: 'Archived',
  tiles: { habits: 'Habits', checkIns: 'Check-ins', focus: 'Focus time', streak: 'Best streak' },
  stats: { current: 'Current streak', longest: 'Longest streak', rate30: 'Last 30 days', rate90: 'Last 90 days' },
  heat: { done: 'Done', missed: 'Missed' },
  streak: ({ count, unit }) => {
    return `${count} ${unit}s`;
  },
  schedule: ({ kind }) => {
    return kind;
  },
  checkIns: count => {
    return `${count} check-ins`;
  },
  focus: minutes => {
    return `${minutes} min of focus`;
  },
  duration: minutes => {
    return `${minutes} min`;
  },
  bestStreak: name => {
    return `on ${name}`;
  },
  pageOf: (page, total) => {
    return `Page ${page} of ${total}`;
  },
};

const habit = (name: string, over: Partial<BackupHabit> = {}): BackupHabit => {
  return {
    name,
    description: null,
    icon: '📖',
    color: 'moss',
    startDate: '2026-01-01',
    createdAt: null,
    links: [],
    archivedAt: null,
    schedules: [{ kind: 'daily', timesPerWeek: null, weekdays: null, effectiveFrom: '2026-01-01' }],
    ticks: Array.from({ length: 40 }, (_, i) => {
      return addDays(TODAY, -i * 2);
    }),
    pauses: [],
    focusSessions: [],
    ...over,
  };
};

const report = (habits: BackupHabit[]) => {
  const backup: Backup = {
    app: 'cadence',
    version: 1,
    exportedAt: '2026-10-12T08:00:00.000Z',
    profile: { name: 'Manas', timezone: 'UTC', weekStartsOn: 1 },
    habits,
  };

  return buildReport(backup, TODAY, 1);
};

const pages = async (bytes: Uint8Array) => {
  return (await PDFDocument.load(bytes)).getPageCount();
};

describe('renderReportPdf', () => {
  it('makes a real PDF, one page for a few habits', async () => {
    const bytes = await renderReportPdf(report([habit('Read'), habit('Run'), habit('Write')]), labels);

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(await pages(bytes)).toBe(1);
  });

  it('starts a new page when the habits no longer fit', async () => {
    const many = Array.from({ length: 9 }, (_, i) => {
      return habit(`Habit ${i + 1}`);
    });

    expect(await pages(await renderReportPdf(report(many), labels))).toBe(3);
  });

  it('is a single page when there are no habits', async () => {
    expect(await pages(await renderReportPdf(report([]), labels))).toBe(1);
  });

  it('copes with names the PDF fonts cannot draw, very long names, and habits with no streak', async () => {
    const odd = [
      habit('📖 Reading — दैनिक'),
      habit('A very long habit name '.repeat(8)),
      habit('Optional', {
        schedules: [{ kind: 'optional', timesPerWeek: null, weekdays: null, effectiveFrom: '2026-01-01' }],
      }),
      habit('Archived', {
        archivedAt: '2026-10-01T10:00:00Z',
        pauses: [{ archivedOn: '2026-10-01', restoredOn: null }],
      }),
    ];

    // Three cards fit under the summary; the fourth starts page two.
    expect(await pages(await renderReportPdf(report(odd), labels))).toBe(2);
  });
});

describe('fitted', () => {
  const font = async () => {
    const doc = await PDFDocument.create();

    doc.registerFontkit(fontkit);

    return doc.embedFont(FONT_SANS, { subset: true });
  };

  it('keeps text that already fits, at its size', async () => {
    const sans = await font();

    expect(fitted(sans, 'Read', 12, 200)).toEqual({ value: 'Read', size: 12 });
  });

  it('shrinks text down to its minimum before cutting it', async () => {
    const sans = await font();
    const { value, size } = fitted(sans, 'A fairly long habit name', 16, 100, 10);

    expect(size).toBeLessThan(16);
    expect(size).toBeGreaterThanOrEqual(10);
    expect(sans.widthOfTextAtSize(value, size)).toBeLessThanOrEqual(100);
  });

  it('cuts text that cannot fit even at its minimum, with an ellipsis, and never runs over', async () => {
    const sans = await font();

    for (const input of ['x'.repeat(500), 'Very long words '.repeat(40), '1,234,567,890 check-ins this year']) {
      const { value, size } = fitted(sans, input, 12, 80, 8);

      expect(sans.widthOfTextAtSize(value, size)).toBeLessThanOrEqual(80);
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('leaves out letters the font cannot draw, and shows a question mark when nothing is left', async () => {
    const sans = await font();

    expect(fitted(sans, 'Run 🏃 fast', 12, 500).value).toBe('Run fast');
    expect(fitted(sans, '📖', 12, 500).value).toBe('?');
    expect(fitted(sans, 'दैनिक', 12, 500).value).toBe('?');
  });
});
