import { describe, expect, it } from 'vitest';
import { escapeFormula, parseCsv, stringifyCsv, unescapeFormula } from '@/lib/csv';

describe('stringifyCsv', () => {
  it('joins cells with commas and rows with Windows line ends', () => {
    expect(
      stringifyCsv([
        ['a', 'b'],
        ['1', '2'],
      ]),
    ).toBe('a,b\r\n1,2\r\n');
  });

  it('quotes a cell with a comma, a quote or a line break, and doubles its quotes', () => {
    expect(stringifyCsv([['a,b', 'say "hi"', 'two\nlines']])).toBe('"a,b","say ""hi""","two\nlines"\r\n');
  });

  it('leaves empty cells empty', () => {
    expect(stringifyCsv([['', 'x', '']])).toBe(',x,\r\n');
  });
});

describe('parseCsv', () => {
  it('reads what stringifyCsv wrote, whatever is inside the cells', () => {
    const rows = [
      ['name', 'note'],
      ['Read, daily', 'say "hi"'],
      ['Two\nlines', '🌱'],
      ['', ''],
    ];

    expect(parseCsv(stringifyCsv(rows))).toEqual(rows);
  });

  it('accepts Unix and Windows line ends, and a missing final line end', () => {
    expect(parseCsv('a,b\n1,2\r\n3,4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('ignores a byte order mark and blank lines at the end', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('keeps an empty final cell', () => {
    expect(parseCsv('a,b\n1,')).toEqual([
      ['a', 'b'],
      ['1', ''],
    ]);
  });

  it('refuses a quote that is never closed', () => {
    expect(() => {
      return parseCsv('a,"b\n1,2');
    }).toThrow();
  });
});

describe('the spreadsheet formula guard', () => {
  it('puts an apostrophe before text a spreadsheet would run as a formula', () => {
    expect(escapeFormula('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(escapeFormula('+1')).toBe("'+1");
    expect(escapeFormula('-1')).toBe("'-1");
    expect(escapeFormula('@cmd')).toBe("'@cmd");
  });

  it('leaves ordinary text alone', () => {
    expect(escapeFormula('Read')).toBe('Read');
    expect(escapeFormula('')).toBe('');
  });

  it('takes the apostrophe off again, only where the guard put it', () => {
    expect(unescapeFormula("'=SUM(A1)")).toBe('=SUM(A1)');
    expect(unescapeFormula("'quoted")).toBe("'quoted");
    expect(unescapeFormula('Read')).toBe('Read');
  });
});
