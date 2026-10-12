// Draws the PDF report. Kept free of `server-only` so it can be unit-tested; it only needs the numbers (report-model.ts)
// and the words (`ReportLabels`, built by the route from the message files).
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Streak } from '@/domain/streaks';
import type { Schedule } from '@/domain/types';
import { PALETTE } from '@/lib/palette';
import {
  CLAY,
  INK,
  LINE,
  MISSED,
  MOSS,
  MUTED,
  NONE,
  PAPER,
  SURFACE,
  hex,
  rounded,
  safe,
  right,
  text,
} from '@/server/report-draw';
import { FONT_DISPLAY, FONT_SANS, FONT_SANS_BOLD } from '@/server/report-fonts';
import type { HeatCell, Report, ReportHabit } from '@/server/report-model';

/** Every word the PDF shows. Numbers are passed to the functions; nothing is hard-coded English here. */
export interface ReportLabels {
  subtitle: string;
  generated: string;
  heading: string;
  empty: string;
  made: string;
  archived: string;
  tiles: { habits: string; checkIns: string; focus: string; streak: string };
  stats: { current: string; longest: string; rate30: string; rate90: string };
  heat: { done: string; missed: string };
  streak: (streak: Streak) => string;
  schedule: (schedule: Schedule) => string;
  checkIns: (count: number) => string;
  focus: (minutes: number) => string;
  /** A length of time on its own, for the summary tile ("5 h 20 m"). */
  duration: (minutes: number) => string;
  bestStreak: (name: string) => string;
  pageOf: (page: number, total: number) => string;
}

const W = 595.28;
const H = 841.89;
const M = 44;
const INNER = W - 2 * M;
const CARD_H = 144;
const GAP = 12;

interface Fonts {
  display: PDFFont;
  sans: PDFFont;
  bold: PDFFont;
}

const newPage = (doc: PDFDocument): PDFPage => {
  const page = doc.addPage([W, H]);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAPER });

  return page;
};

const cell = (kind: HeatCell, color: string) => {
  return kind === 'done' ? hex(color) : kind === 'missed' ? MISSED : NONE;
};

const drawHeat = (page: PDFPage, habit: ReportHabit, x: number, top: number) => {
  const { color: key, heat } = habit;
  const color = PALETTE.light[key];

  heat.forEach((week, col) => {
    week.forEach((kind, row) => {
      if (kind !== 'future') {
        page.drawRectangle({
          x: x + col * 5.6,
          y: top - (row + 1) * 5.6,
          width: 4.6,
          height: 4.6,
          color: cell(kind, color),
        });
      }
    });
  });
};

const drawCard = (page: PDFPage, fonts: Fonts, labels: ReportLabels, habit: ReportHabit, top: number) => {
  const { display, sans, bold } = fonts;
  const { name, color: key, schedule, archived, current, longest, rate30, rate90, ticks, focusMinutes } = habit;
  const { stats: statLabels, heat: legend, streak } = labels;
  const { current: currentLabel, longest: longestLabel, rate30: rate30Label, rate90: rate90Label } = statLabels;
  const { done, missed } = legend;
  const color = PALETTE.light[key];
  const edge = M + INNER - 16;
  const column = 92;

  // The colour shows as a band down the left edge, under a card of the page's surface colour.
  rounded(page, { x: M, top, width: INNER, height: CARD_H, radius: 9 }, { color: hex(color) });
  rounded(
    page,
    { x: M + 5, top, width: INNER - 5, height: CARD_H, radius: 9 },
    { color: SURFACE, borderColor: LINE, borderWidth: 0.75 },
  );
  page.drawCircle({ x: M + 34, y: top - 30, size: 12, color: hex(color) });

  const initial = (
    [...name.trim()].find(char => {
      return /\p{L}|\p{N}/u.test(char) && safe(bold, char) === char;
    }) ?? '•'
  ).toUpperCase();

  page.drawText(initial, {
    x: M + 34 - bold.widthOfTextAtSize(initial, 11) / 2,
    y: top - 34,
    font: bold,
    size: 11,
    color: rgb(1, 1, 1),
  });
  text(page, name, M + 54, top - 28, { font: display, size: 15, width: INNER - 54 - 110, min: 11 });
  text(page, labels.schedule(schedule), M + 54, top - 41, {
    font: sans,
    size: 9,
    width: INNER - 54 - 20,
    color: MUTED,
  });

  if (archived) {
    right(page, labels.archived, edge, top - 28, { font: sans, size: 8.5, width: 90 });
  }

  const stats = [
    [currentLabel, current ? streak(current) : '–'],
    [longestLabel, longest ? streak(longest) : '–'],
    [rate30Label, rate30 === null ? '–' : `${rate30}%`],
    [rate90Label, rate90 === null ? '–' : `${rate90}%`],
  ];

  stats.forEach(([label, value], index) => {
    const x = M + 20 + index * column;

    text(page, value, x, top - 70, { font: display, size: 16, width: column - 8, min: 10 });
    text(page, label, x, top - 82, { font: sans, size: 8, width: column - 8, color: MUTED });
  });
  right(page, labels.checkIns(ticks), edge, top - 66, { font: sans, size: 9, width: 106, min: 7 });
  right(page, labels.focus(focusMinutes), edge, top - 79, { font: sans, size: 9, width: 106, min: 7 });

  drawHeat(page, habit, M + 20, top - 98);
  [
    [done, hex(color)],
    [missed, MISSED],
  ].forEach(([label, swatch], index) => {
    const x = M + 20 + 52 * 5.6 + 14 + index * 70;

    page.drawRectangle({ x, y: top - 111, width: 5, height: 5, color: swatch as Color });
    text(page, label as string, x + 8, top - 111, { font: sans, size: 7.5, width: 56, color: MUTED });
  });
};

const drawHeader = (page: PDFPage, fonts: Fonts, labels: ReportLabels, report: Report) => {
  const { display, sans } = fonts;
  const { subtitle, generated, heading, tiles: tileLabels, streak, bestStreak, duration } = labels;
  const { habits, totals } = report;
  const { habits: habitsLabel, checkIns, focus, streak: streakLabel } = tileLabels;
  const { habits: habitCount, ticks, focusMinutes } = totals;
  const edge = M + INNER;
  const wordmark = display.widthOfTextAtSize('cadence', 26);

  page.drawText('cadence', { x: M, y: H - M - 18, font: display, size: 26, color: INK });
  page.drawText('.', { x: M + wordmark, y: H - M - 18, font: display, size: 26, color: CLAY });
  right(page, subtitle, edge, H - M - 8, { font: sans, size: 10, width: 250 });
  right(page, generated, edge, H - M - 21, { font: sans, size: 9, width: 250 });
  text(page, heading, M, H - M - 56, { font: display, size: 20, width: INNER, min: 13 });

  const [best] = habits
    .filter(({ current }) => {
      return current !== null && current.count > 0;
    })
    .toSorted((a, b) => {
      return (b.current?.count ?? 0) - (a.current?.count ?? 0);
    });
  const tiles = [
    [habitsLabel, String(habitCount), ''],
    [checkIns, String(ticks), ''],
    [focus, duration(focusMinutes), ''],
    [streakLabel, best?.current ? streak(best.current) : '–', best ? bestStreak(best.name) : ''],
  ];
  const width = (INNER - 30) / 4;
  const y = H - M - 138;

  tiles.forEach(([label, value, note], index) => {
    const x = M + index * (width + 10);

    rounded(
      page,
      { x, top: y + 62, width, height: 62, radius: 8 },
      { color: SURFACE, borderColor: LINE, borderWidth: 0.75 },
    );
    text(page, value, x + 10, y + 34, { font: display, size: 19, width: width - 20, min: 10, color: MOSS });
    text(page, label, x + 10, y + 21, { font: sans, size: 8, width: width - 20, color: MUTED });

    if (note) {
      text(page, note, x + 10, y + 9, { font: sans, size: 7.5, width: width - 20, color: MUTED });
    }
  });
};

/** One report: a summary, then each habit as a card with its numbers and a year of days. Returns the PDF's bytes. */
export const renderReportPdf = async (report: Report, labels: ReportLabels): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();

  doc.registerFontkit(fontkit);

  const fonts: Fonts = {
    display: await doc.embedFont(FONT_DISPLAY, { subset: true }),
    sans: await doc.embedFont(FONT_SANS, { subset: true }),
    bold: await doc.embedFont(FONT_SANS_BOLD, { subset: true }),
  };

  doc.setTitle('Cadence');
  doc.setProducer('Cadence');
  doc.setCreator('Cadence');

  const { habits } = report;
  const { empty, made, pageOf } = labels;
  const { sans } = fonts;
  let page = newPage(doc);

  drawHeader(page, fonts, labels, report);

  if (habits.length === 0) {
    text(page, empty, M, H - M - 190, { font: sans, size: 11, width: INNER, color: MUTED });
  }

  let top = H - M - 154;

  for (const habit of habits) {
    if (top - CARD_H < M + 24) {
      page = newPage(doc);
      top = H - M;
    }

    drawCard(page, fonts, labels, habit, top);
    top -= CARD_H + GAP;
  }

  const pages = doc.getPages();

  pages.forEach((each, index) => {
    text(each, made, M, 26, { font: sans, size: 8, width: 250, color: MUTED });
    right(each, pageOf(index + 1, pages.length), M + INNER, 26, { font: sans, size: 8, width: 150 });
  });

  return doc.save();
};
