import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHold } from '@scripts/desktop-hold.mjs';

let root: string;

const put = (path: string, text: string) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};

const read = (path: string): string => {
  return readFileSync(join(root, path), 'utf8');
};

const hold = () => {
  return createHold(root, {
    webOnly: ['api', 'circles', 'proxy.ts', 'missing'],
    swaps: [['page.tsx', 'page.desktop.tsx']],
  });
};

describe('the desktop build sets web-only files aside and always puts them back', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'hold-'));
    put('api/route.ts', 'api');
    put('circles/deep/page.tsx', 'circles');
    put('proxy.ts', 'proxy');
    put('page.tsx', 'web page');
    put('page.desktop.tsx', 'desktop page');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('moves the folders and files out, swaps the page in, and a restore brings everything back', () => {
    const held = hold();

    held.setAside();

    expect(existsSync(join(root, 'api'))).toBe(false);
    expect(existsSync(join(root, 'circles'))).toBe(false);
    expect(existsSync(join(root, 'proxy.ts'))).toBe(false);
    expect(read('page.tsx')).toBe('desktop page');

    held.restore();

    expect(read('api/route.ts')).toBe('api');
    expect(read('circles/deep/page.tsx')).toBe('circles');
    expect(read('proxy.ts')).toBe('proxy');
    expect(read('page.tsx')).toBe('web page');
    expect(existsSync(join(root, '.desktop-hold'))).toBe(false);
  });

  it('heals a build that was killed half way: a fresh run puts back what the dead one left aside', () => {
    hold().setAside(); // the process "dies" here, with nothing restored

    expect(existsSync(join(root, 'circles'))).toBe(false);

    hold().restore(); // the next run starts by restoring

    expect(read('circles/deep/page.tsx')).toBe('circles');
    expect(read('page.tsx')).toBe('web page');
    expect(existsSync(join(root, '.desktop-hold'))).toBe(false);
  });

  it('restores more than once without harm, and with nothing aside does nothing', () => {
    const held = hold();

    held.restore();
    held.setAside();
    held.restore();
    held.restore();

    expect(read('api/route.ts')).toBe('api');
    expect(read('page.tsx')).toBe('web page');
  });

  it('never overwrites a file that is back in place already: it stays aside and is reported', () => {
    const held = hold();

    held.setAside();
    put('proxy.ts', 'newer proxy made meanwhile');

    expect(held.restore()).toEqual(['proxy.ts']);
    expect(read('proxy.ts')).toBe('newer proxy made meanwhile');
    expect(readFileSync(join(root, '.desktop-hold', 'proxy.ts'), 'utf8')).toBe('proxy');
    expect(read('api/route.ts')).toBe('api');
  });
});
