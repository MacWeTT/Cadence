/** A small CSV reader and writer (RFC 4180): quotes, commas and line breaks inside a cell, no dependency. */

const NEEDS_QUOTES = /[",\r\n]/;

const cell = (value: string): string => {
  return NEEDS_QUOTES.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
};

/** Rows to text, with Windows line ends, which spreadsheets expect. */
export const stringifyCsv = (rows: string[][]): string => {
  return rows
    .map(row => {
      return `${row.map(cell).join(',')}\r\n`;
    })
    .join('');
};

/** Text to rows. Throws when a quote is never closed. A byte order mark and blank lines at the end are ignored. */
export const parseCsv = (input: string): string[][] => {
  const text = input.startsWith('﻿') ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let index = 0;

  const endRow = () => {
    row.push(field);
    rows.push(row);
    row = [];
    field = '';
  };

  while (index < text.length) {
    const char = text[index];

    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') {
        index += 1;
      }

      endRow();
    } else {
      field += char;
    }

    index += 1;
  }

  if (quoted) {
    throw new Error('Unclosed quote');
  }

  if (field !== '' || row.length > 0) {
    endRow();
  }

  // Blank lines (a lone empty cell) carry nothing.
  return rows.filter(({ length, 0: first }) => {
    return length > 1 || first !== '';
  });
};

const FORMULA_START = /^[=+\-@]/;

/** A spreadsheet runs a cell that starts with = + - or @ as a formula: an apostrophe in front makes it plain text. */
export const escapeFormula = (value: string): string => {
  return FORMULA_START.test(value) ? `'${value}` : value;
};

/** Undoes `escapeFormula`, and only that: an apostrophe not followed by one of the four characters stays. */
export const unescapeFormula = (value: string): string => {
  return value.startsWith("'") && FORMULA_START.test(value.slice(1)) ? value.slice(1) : value;
};
