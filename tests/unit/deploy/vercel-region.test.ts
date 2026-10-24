import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('where the site runs', () => {
  it('keeps the server code in Tokyo (hnd1), next to the Supabase database, so each database call is a short hop', () => {
    const { regions } = JSON.parse(readFileSync('vercel.json', 'utf8')) as { regions: string[] };

    expect(regions).toEqual(['hnd1']);
  });
});
